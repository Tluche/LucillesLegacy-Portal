import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucille's Legacy Client Portal",
  description: "A secure client portal for Lucille's Legacy financial services clients."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
