import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

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
    <html lang="en" className="h-full font-sans" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
