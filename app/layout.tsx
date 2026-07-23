import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getSiteUrl } from "@/lib/site-url";
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
  metadataBase: new URL(getSiteUrl()),
  title:
    "VoltPilot — Estimating & Proposals for Residential & Commercial Electrical Contractors",
  description:
    "Estimating and proposal software built for residential and commercial electrical contractors. Create accurate estimates, professional proposals, and win more profitable jobs.",
  openGraph: {
    title: "VoltPilot — AI Proposal & Estimating Software for Electrical Contractors",
    description:
      "Create accurate estimates, professional proposals, and win more profitable jobs with AI-assisted workflows.",
    siteName: "VoltPilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltPilot — Estimating & Proposals for Electrical Contractors",
    description:
      "Estimating and proposal software built for residential and commercial electrical contractors.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
