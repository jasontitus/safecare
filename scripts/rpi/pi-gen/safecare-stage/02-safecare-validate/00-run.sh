#!/bin/bash -e
# SafeCare pi-gen validation stage
#
# Walks every Exec* directive in the safecare-*.service unit files copied
# into ${ROOTFS_DIR}/etc/systemd/system/ and asserts each absolute-path
# binary exists in the rootfs. Catches at build time the kind of failure
# we shipped twice in a row on real hardware:
#
#   v0.4.2 — service ran `/usr/bin/rfkill` but rfkill wasn't installed
#   v0.4.3 — rfkill package added but the unit still pointed at
#            /usr/bin/rfkill when Debian Trixie puts the binary in /usr/sbin
#
# Both failed first-boot with status=203/EXEC. systemd-analyze verify
# would have flagged the missing path on a running system, but here we
# don't have a running rootfs yet — so do the check ourselves.

SVC_DIR="${ROOTFS_DIR}/etc/systemd/system"
shopt -s nullglob
SERVICES=("${SVC_DIR}"/safecare-*.service)
shopt -u nullglob

if [ "${#SERVICES[@]}" -eq 0 ]; then
	echo "[validate] no safecare-*.service files found in ${SVC_DIR}" >&2
	exit 1
fi

MISSING=()

for svc in "${SERVICES[@]}"; do
	# Extract absolute paths from Exec* directives. systemd allows leading
	# `-`, `@`, `:`, `!`, `+` prefix characters on the executable; strip
	# them before checking. Only the first whitespace-delimited token is
	# the executable; the rest are args.
	while IFS= read -r path; do
		[ -z "$path" ] && continue
		# Skip non-absolute paths — systemd would reject these at parse
		# time anyway, but the grep below is conservative.
		case "$path" in /*) ;; *) continue ;; esac

		if [ ! -e "${ROOTFS_DIR}${path}" ]; then
			MISSING+=("$(basename "$svc"): $path")
		fi
	done < <(
		grep -hE '^Exec(Start|StartPre|StartPost|Stop|StopPre|StopPost|Reload|Condition)=' "$svc" \
			| sed -E 's/^Exec[A-Za-z]+=//' \
			| sed -E 's/^[-@:!+]+//' \
			| awk '{print $1}'
	)
done

if [ "${#MISSING[@]}" -gt 0 ]; then
	echo "[validate] systemd units reference paths that don't exist in the rootfs:" >&2
	for m in "${MISSING[@]}"; do
		echo "  - $m" >&2
	done
	echo "" >&2
	echo "[validate] Add the missing package to 00-safecare-packages/00-packages," >&2
	echo "[validate] or fix the path in the .service file to match where the package" >&2
	echo "[validate] actually installs the binary (e.g. /usr/sbin vs /usr/bin)." >&2
	exit 1
fi

echo "[validate] all safecare-*.service Exec paths exist in rootfs"
