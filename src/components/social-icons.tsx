"use client";

import {
  Github,
  Linkedin,
  Twitter,
  Mail,
  Youtube,
  Globe,
  Link as LinkIcon,
  Rss,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Github,
  LinkedIn: Linkedin,
  Linkedin,
  Twitter,
  X: Twitter,
  Mail,
  Youtube,
  Globe,
  Link: LinkIcon,
  Rss,
  MessageSquare,
};

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Globe;
  return <Icon className={className} aria-hidden />;
}
