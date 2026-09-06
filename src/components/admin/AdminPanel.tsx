"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Briefcase,
  Brain,
  CalendarDays,
  Eye,
  EyeOff,
  FolderGit2,
  Gauge,
  Loader2,
  Lock,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "./lib";
import ProfileForm from "./ProfileForm";
import SkillsManager from "./SkillsManager";
import ExperienceManager from "./ExperienceManager";
import RepoManager from "./RepoManager";
import KnowledgeManager from "./KnowledgeManager";
import ContributionsManager from "./ContributionsManager";
import SettingsForm from "./SettingsForm";
import OverviewTab from "./OverviewTab";

interface TabDef {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ADMIN_TABS: TabDef[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Content health and system status at a glance",
    icon: Gauge,
  },
  { value: "profile", label: "Profile", description: "Identity, bio, socials and photo", icon: User },
  { value: "skills", label: "Skills", description: "Powers the stack marquee and skill bars", icon: Zap },
  {
    value: "experiences",
    label: "Experience",
    description: "Positions on the career timeline",
    icon: Briefcase,
  },
  {
    value: "repos",
    label: "Repos",
    description: "Showcased repositories with stars and topics",
    icon: FolderGit2,
  },
  {
    value: "knowledge",
    label: "Knowledge",
    description: "“What I know / care about” cards",
    icon: Brain,
  },
  {
    value: "contributions",
    label: "Contributions",
    description: "GitHub heatmap, sync schedule and notes",
    icon: CalendarDays,
  },
  {
    value: "settings",
    label: "Settings",
    description: "Passcode and console preferences",
    icon: SettingsIcon,
  },
];

function parseHashTab(): string {
  const hash = window.location.hash;
  if (!hash.startsWith("#admin")) return "overview";
  const tab = hash.replace(/^#admin\/?/, "").split(/[?#]/)[0];
  return ADMIN_TABS.some((t) => t.value === tab) ? tab : "overview";
}

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const session = useQuery<{ authed: boolean }>({
    queryKey: ["admin", "session"],
    queryFn: () => api<{ authed: boolean }>("/api/admin/session"),
    staleTime: 0,
  });

  const [tab, setTab] = useState<string>(() =>
    typeof window === "undefined" ? "overview" : parseHashTab()
  );

  const navigate = useCallback((next: string) => {
    setTab(next);
    history.replaceState(null, "", `#admin/${next}`);
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.startsWith("#admin")) setTab(parseHashTab());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // keep the hash in sync when landing on bare #admin (runs once on mount)
  useEffect(() => {
    if (!window.location.hash.startsWith("#admin/")) {
      history.replaceState(null, "", `#admin/overview`);
    }
  }, []);

  if (session.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">Checking session…</span>
        </div>
      </div>
    );
  }

  if (!session.data?.authed) {
    return <LoginScreen />;
  }

  const activeTab = ADMIN_TABS.find((t) => t.value === tab) ?? ADMIN_TABS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader onExit={onExit} />
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 lg:py-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block" aria-label="Admin sections">
          <nav className="sticky top-20 space-y-1" aria-label="Admin navigation">
            {ADMIN_TABS.map((t) => {
              const active = t.value === tab;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => navigate(t.value)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{t.label}</span>
                  {active ? (
                    <motion.span
                      layoutId="admin-nav-dot"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                </button>
              );
            })}
            <Separator className="my-3" />
            <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">
              Changes publish to the live site immediately.
            </p>
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Mobile tab strip */}
          <div
            className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden"
            role="tablist"
            aria-label="Admin sections"
          >
            {ADMIN_TABS.map((t) => {
              const active = t.value === tab;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigate(t.value)}
                  className={`flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-3.5" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>

          <header className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">{activeTab.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeTab.description}</p>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "overview" ? (
                <OverviewTab onNavigate={navigate} />
              ) : tab === "profile" ? (
                <ProfileForm />
              ) : tab === "skills" ? (
                <SkillsManager />
              ) : tab === "experiences" ? (
                <ExperienceManager />
              ) : tab === "repos" ? (
                <RepoManager />
              ) : tab === "knowledge" ? (
                <KnowledgeManager />
              ) : tab === "contributions" ? (
                <ContributionsManager />
              ) : (
                <SettingsForm />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AdminHeader({ onExit }: { onExit: () => void }) {
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api("/api/admin/login", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "session"] });
      toast.success("Logged out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logout failed");
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <h1 className="truncate text-base font-semibold tracking-tight">
            Admin Console
          </h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Owner mode
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onExit}>
            <Eye className="size-4" aria-hidden />
            View site
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            disabled={loggingOut}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Log out"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function LoginScreen() {
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Enter your passcode.");
      setShakeKey((k) => k + 1);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: { passcode: passcode.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "session"] });
      toast.success("Welcome back");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setShakeKey((k) => k + 1);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        key={shakeKey}
        initial={shakeKey ? { x: 0 } : false}
        animate={shakeKey ? { x: [0, -9, 8, -6, 4, 0] } : undefined}
        transition={{ duration: 0.42, ease: "easeInOut" }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Admin Console</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the owner passcode to manage your portfolio.
            </p>
          </div>
        </div>
        <Separator className="my-5" />
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="admin-passcode">Passcode</Label>
            <div className="relative">
              <Input
                id="admin-passcode"
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus
                className="pr-10"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-passcode-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
              >
                {showPasscode ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            {error ? (
              <p id="admin-passcode-error" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Default passcode: admin123 — change it in Settings after first login.
        </p>
      </motion.div>
    </div>
  );
}
