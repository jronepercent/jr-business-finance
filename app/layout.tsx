import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProfitLens",
  description: "เว็บแอพติดตามกำไรจริง เงินสดจริง และเงินค้างของหลายธุรกิจ",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
