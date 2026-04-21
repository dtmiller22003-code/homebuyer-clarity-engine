import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homebuyer Clarity Engine",
  description: "Internal mortgage pre-qualification and lead routing dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
