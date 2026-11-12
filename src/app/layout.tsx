import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scout-Up — Presenze e Uscite",
  description:
    "Registro digitale per unità scout italiane: uscite, presenze e dashboard per capi, genitori e ragazzi.",
  applicationName: "Scout-Up",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Scout-Up",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
