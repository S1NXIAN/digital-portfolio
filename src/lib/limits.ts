/**
 * Central content limits — mirrored by zod schemas (server truth) and
 * maxLength attributes (client guardrails) so a runaway paste can never
 * reach the database, balloon the public payload, or explode layout.
 */
export const LIMITS = {
  // profile
  name: 60,
  headline: 80,
  bio: 5000,
  motto: 200,
  location: 60,
  email: 120,
  availability: 80,
  githubUsername: 40,
  resumeUrl: 300,
  /** Photo is stored as a data URL after the cropper — ~3 MB of base64. */
  photoUrl: 3_000_000,
  rotatingWordsCount: 12,
  rotatingWord: 40,
  socialsCount: 8,
  socialLabel: 40,
  socialUrl: 300,
  socialIcon: 40,

  // skills
  skillName: 60,
  skillCategory: 40,
  skillIcon: 300,

  // experience
  company: 80,
  role: 80,
  period: 40,
  experienceDescription: 5000,
  tech: 300,

  // repos
  repoName: 100,
  repoDescription: 500,
  repoUrl: 300,
  language: 40,
  topics: 300,

  // knowledge
  knowledgeTitle: 100,
  knowledgeDescription: 1000,
  knowledgeCategory: 40,
  knowledgeIcon: 60,

  // settings / auth
  passcode: 100,
  githubToken: 200,

  // collections — hard ceilings so the reorder transaction, the admin UI and
  // the public page all stay fast no matter what
  maxSkills: 300,
  maxRepos: 400,
  maxKnowledge: 200,
  maxExperiences: 100,
  /** Reorder batch size ceiling. */
  maxReorderIds: 500,
} as const;

/** Max request body bytes accepted by admin write endpoints. */
export const MAX_BODY_BYTES = 4_500_000; // covers the 3MB photo data URL with headroom
