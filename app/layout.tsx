import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Falco — Ephemeral Shared File & Message Rooms",
  description:
    "Let your files take a safe flight. Share files and rich messages with one URL and a 4-digit code. Zero cloud tracking, auto-deleting in hours.",
  openGraph: {
    title: "Falco — Ephemeral Shared File & Message Rooms",
    description:
      "Let your files take a safe flight. Share files and rich messages with one URL and a 4-digit code.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-[#1e293b] selection:bg-[#fed766]/40 selection:text-[#1e293b]">
        {children}
      </body>
    </html>
  );
}
