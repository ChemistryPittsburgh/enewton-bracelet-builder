import type { Metadata } from "next";
import { Open_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "eNewton | Bracelet Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${openSans.variable} ${playfair.variable}`}>
      <body className="font-regular bg-neutral-50 text-neutral-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}