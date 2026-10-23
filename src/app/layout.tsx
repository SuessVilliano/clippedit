import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { Nav, BottomNav } from "@/components/Nav";
import "./globals.css";
import { ClipCoach } from "@/components/ClipCoach";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Elevate Clippers — Find the Moment. Make Your Move.",
  description:
    "Find popular YouTube videos and breakout livestreams, prepare clips, explore paid campaigns and learn the clipping workflow.",
  applicationName: "Elevate Clippers",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Elevate Clippers" }
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
        <ClipCoach />
      </body>
    </html>
  );
}
