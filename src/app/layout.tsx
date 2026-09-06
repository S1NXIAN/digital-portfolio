import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { db } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const profile = await db.profile.findUnique({ where: { id: "main" } });
    if (profile) {
      const title = `${profile.name} — ${profile.headline}`;
      const description = profile.motto || profile.bio || "Personal portfolio";
      return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
        title,
        description,
        applicationName: `${profile.name} — Portfolio`,
        keywords: [
          profile.name,
          profile.headline,
          "portfolio",
          "software engineer",
          "developer",
          ...(Array.isArray(profile.rotatingWords)
            ? (profile.rotatingWords as string[]).slice(0, 5)
            : []),
        ].filter((k): k is string => Boolean(k)),
        authors: [{ name: profile.name }],
        icons: { icon: "/avatar.png" },
        robots: { index: true, follow: true },
        openGraph: {
          title,
          description,
          images: [profile.photoUrl.startsWith("/") ? profile.photoUrl : "/avatar.png"],
          type: "website",
        },
        twitter: {
          card: "summary",
          title,
          description,
          images: [profile.photoUrl.startsWith("/") ? profile.photoUrl : "/avatar.png"],
        },
      };
    }
  } catch {
    // DB not ready — fall through to defaults
  }
  return {
    title: "Portfolio — Software Engineer",
    description: "Personal portfolio: stack, skills, experience, repos & GitHub activity.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
