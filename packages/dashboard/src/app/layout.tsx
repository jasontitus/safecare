import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeCare Admin Dashboard",
  description: "Mutual Aid Delivery System - Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
