import type { Metadata } from "next";
import { Inter, Square_Peg, Italiana } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { LOGO_SRC } from "@/lib/constants";

const italiana = Italiana({ subsets: ["latin"], variable: "--font-italiana", display: 'swap', weight: ['400'] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const squarePeg = Square_Peg({ subsets: ["latin"], variable: "--font-square-peg", weight: ['400'], display: 'swap' });

export const metadata: Metadata = {
  title: 'eNewton | Internal Bracelet Builder',
  description: 'Internal tool to build 3D eNewton Bracelets',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${squarePeg.variable} ${italiana.variable}`}>
      <body className="font-regular bg-neutral-50 text-neutral-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}