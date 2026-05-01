import type { Metadata } from "next";
import { DM_Mono, Libre_Baskerville } from "next/font/google";

import "./globals.css";

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "READER — Phase One",
  description: "Reading companion for Dr. Courtney Houchen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${libre.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
