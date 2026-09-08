import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "PropertyOS — Broker Operating System",
  description: "Branded pages for residential, commercial and land listings. Share properties on WhatsApp and organise captured enquiries in one workspace.",
  keywords: ["real estate", "property marketing", "broker platform", "WhatsApp properties"],
  openGraph: {
    title: "PropertyOS — Broker Operating System",
    description: "Your real estate business, online. Branded property pages, WhatsApp sharing and enquiry management for independent brokers.",
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
