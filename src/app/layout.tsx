import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Plate — Weekly Meal Planner",
  description: "AI-powered weekly meal plans delivered straight to your supermarket cart.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-secondary">
        <ThemeProvider />
        <div className="mx-auto max-w-[430px] min-h-screen relative bg-surface-secondary">
          {children}
        </div>
      </body>
    </html>
  );
}
