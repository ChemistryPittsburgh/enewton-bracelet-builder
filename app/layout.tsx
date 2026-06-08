import type { Metadata } from "next";
import { Playfair_Display, Inter, Square_Peg } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";

const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display", display: 'swap' });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const squarePeg = Square_Peg({ subsets: ["latin"], variable: "--font-square-peg", weight: ['400'], display: 'swap' });

export const metadata: Metadata = {
  title: "eNewton | Bracelet Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable} ${squarePeg.variable}`}>
      <body className="font-regular bg-neutral-50 text-neutral-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}