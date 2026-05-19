/**
 * Unlock-after-restart regression test.
 *
 * Guards the dek_canary bytea round-trip bug: the canary column is TEXT
 * (holding bytea's `\xHEX...` text representation). Reading it as a JS string
 * and re-binding via `::bytea` mangles the ciphertext, so the SAME DEK that
 * just wrote the canary is rejected on every subsequent unlock — i.e. every
 * time the backend restarts and the in-memory DEK is wiped.
 *
 * Assumes a clean DB at the API_URL host. The first call writes a fresh
 * canary with TEST_DEK; the second call validates against it (the regression
 * path). The wrong-DEK call confirms validation still rejects mismatches.
 */
import { expect, test } from "@playwright/test";

const API = process.env.API_URL || "http://localhost:3001";
const TEST_DEK = process.env.SAFECARE_TEST_DEK || "1".repeat(64);
const WRONG_DEK = "2".repeat(64);

test.describe("Setup unlock", () => {
  test("the same DEK keeps working across calls (canary bytea round-trip)", async ({ request }) => {
    const first = await request.post(`${API}/api/setup/unlock`, { data: { dek: TEST_DEK } });
    expect(first.status(), "first unlock should write the canary and succeed").toBe(200);

    const second = await request.post(`${API}/api/setup/unlock`, { data: { dek: TEST_DEK } });
    expect(
      second.status(),
      "second unlock with the SAME DEK must succeed — this is the regression",
    ).toBe(200);

    const wrong = await request.post(`${API}/api/setup/unlock`, { data: { dek: WRONG_DEK } });
    expect(wrong.status(), "a different DEK must still be rejected").toBe(403);

    const stillRight = await request.post(`${API}/api/setup/unlock`, { data: { dek: TEST_DEK } });
    expect(
      stillRight.status(),
      "the original DEK should still validate after a rejected attempt",
    ).toBe(200);
  });
});
