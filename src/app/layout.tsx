// ===========================================
// Root Layout - Main App Layout
// ===========================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// App metadata
export const metadata: Metadata = {
  title: {
    default: "CodeLink ServiceHub",
    template: "%s | CodeLink ServiceHub",
  },
  description: "SaaS Customer Support & Warranty Claim Management System",
  keywords: [
    "warranty management",
    "customer support",
    "claim management",
    "service center",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
