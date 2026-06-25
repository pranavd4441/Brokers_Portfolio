import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropertyOS — Broker Operating System",
  description: "Create premium property landing pages, share via WhatsApp, and track every lead — all in under 60 seconds.",
  keywords: ["real estate", "property marketing", "broker platform", "WhatsApp properties"],
  openGraph: {
    title: "PropertyOS — Broker Operating System",
    description: "Create premium property landing pages and share via WhatsApp in under 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#07090f] text-[#f0f4ff]">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
