import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import { Nav, BottomNav } from "@/components/Nav";
import "./globals.css";
import { ClipCoach } from "@/components/ClipCoach";

export const metadata: Metadata = {
  title: "LIV8 Clippers — Find the Moment. Make Your Move.",
  description:
    "Find popular YouTube videos and breakout livestreams, prepare clips, explore paid campaigns and learn the clipping workflow.",
  applicationName: "LIV8 Clippers",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LIV8 Clippers" }
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <BottomNav />
        <ClipCoach />
      </body>
    </html>
  );
}
