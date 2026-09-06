import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const profile = await db.profile.findUnique({ where: { id: "main" } });
    if (profile) {
      return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
        title: `${profile.name} — ${profile.headline}`,
        description: profile.motto || profile.bio,
        icons: { icon: "/avatar.png" },
        openGraph: {
          title: `${profile.name} — ${profile.headline}`,
          description: profile.motto || profile.bio,
          images: [profile.photoUrl.startsWith("/") ? profile.photoUrl : "/avatar.png"],
          type: "website",
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
