// Shared types between frontend and API

export interface SocialLink {
  label: string;
  url: string;
  icon: string; // lucide icon name
}

export interface ProfileData {
  id: string;
  name: string;
  headline: string;
  bio: string;
  motto: string;
  photoUrl: string;
  location: string;
  email: string;
  resumeUrl: string;
  yearsExperience: number;
  availability: string;
  githubUsername: string;
  socials: SocialLink[];
  rotatingWords: string[];
  updatedAt: string;
}

export interface SkillData {
  id: string;
  name: string;
  category: string;
  order: number;
  /** "" = auto-match from name · "https://…" = custom URL · otherwise a dashboardicons.com slug */
  icon: string;
}

export interface ExperienceData {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string;
  tech: string;
  current: boolean;
  order: number;
}

export interface RepoData {
  id: string;
  name: string;
  description: string;
  url: string;
  language: string;
  /** comma-separated topic tags */
  topics: string;
  stars: number;
  forks: number;
  featured: boolean;
  order: number;
}

export interface KnowledgeData {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  order: number;
}

export interface ContributionData {
  date: string; // YYYY-MM-DD
  count: number;
  note?: string;
}

export interface PortfolioResponse {
  profile: ProfileData;
  skills: SkillData[];
  experiences: ExperienceData[];
  repos: RepoData[];
  knowledge: KnowledgeData[];
  contributions: ContributionData[];
}

export type AdminEntity = "skills" | "experiences" | "repos" | "knowledge";
