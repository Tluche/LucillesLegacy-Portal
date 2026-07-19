import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Lucille's Legacy Client Portal",
  description: "A secure client portal for Lucille's Legacy financial services clients.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lucille's Legacy"
  },
  icons: {
    icon: "/lucilles-legacy-logo.png",
    apple: "/lucilles-legacy-logo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#6d3fb5"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
