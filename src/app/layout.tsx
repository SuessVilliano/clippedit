import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { Nav, BottomNav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Clipped It — Livestream Intelligence",
  description:
    "Real-time cross-platform intelligence for livestream culture. Detect breakout streams, the most-clipped moments, and emerging stories across Twitch and Kick before the leaderboards catch up.",
  applicationName: "Clipped It",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Clipped It" }
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <Nav />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
