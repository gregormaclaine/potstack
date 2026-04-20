import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import PostHogProvider from "@/components/PostHogProvider";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { SettingsProvider, type CurrencyCode } from "@/contexts/SettingsContext";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PotStack",
  description: "Track your poker sessions and stats",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  let initialSettings = { curvedCharts: true, currency: "GBP" as CurrencyCode };

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settingsCurvedCharts: true, settingsCurrency: true },
    });
    if (user) {
      initialSettings = {
        curvedCharts: user.settingsCurvedCharts,
        currency: user.settingsCurrency as CurrencyCode,
      };
    }
  }

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <SessionProvider>
          <PostHogProvider>
            <SettingsProvider initialSettings={initialSettings}>
              <Navbar />
              {children}
              <ImpersonationBanner />
            </SettingsProvider>
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
