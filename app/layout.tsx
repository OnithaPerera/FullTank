import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FullTank | Live Fuel Availability & Queues in Sri Lanka",
  description: "Check crowdsourced, real-time petrol and diesel availability, plus queue lengths across the Western Province, Sri Lanka.",
  keywords: "fuel sri lanka, petrol availability colombo, diesel queue sri lanka, fulltank app, ceypetco, lioc, sinopec",
  openGraph: {
    title: "FullTank | Live Fuel Map",
    description: "Check crowdsourced, real-time petrol and diesel availability across Sri Lanka.",
    url: "https://fulltank.vercel.app",
    siteName: "FullTank",
    locale: "en_LK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FullTank | Live Fuel Map Sri Lanka",
    description: "Real-time, crowdsourced fuel availability and queue tracker.",
  },
  verification: {
    google: 'S-3LACDHk6lspiAlJum5hoynIWUO80qHpgfRPtGII5w',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}