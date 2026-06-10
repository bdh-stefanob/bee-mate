import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "BDD Automation — Authoring Portal",
  description: "Gherkin authoring tool for QA automation",
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
        <nav className="border-b px-6 py-3 flex gap-6 items-center bg-background">
          <span className="font-semibold text-sm mr-4">BDD Portal</span>
          <Link href="/" className="text-sm hover:underline">
            Catalog
          </Link>
          <Link href="/editor" className="text-sm hover:underline">
            Editor
          </Link>
          <Link href="/features" className="text-sm hover:underline">
            Features
          </Link>
        </nav>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
