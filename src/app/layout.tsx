import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisualMap",
  description: "An image-first visual knowledge map prototype."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
