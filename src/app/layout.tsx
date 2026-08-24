import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#080a0d",
          color: "#f4f6f8",
          fontFamily: "Inter, ui-sans-serif, system-ui"
        }}
      >
        {children}
      </body>
    </html>
  );
}
