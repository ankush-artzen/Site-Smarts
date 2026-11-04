import type { Metadata } from "next";
import { Figtree, Outfit } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Site Smarts",
    template: "%s · Site Smarts",
  },
  description:
    "Site Smarts by Solarshed — solar site monitoring, production insights, and operations in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
