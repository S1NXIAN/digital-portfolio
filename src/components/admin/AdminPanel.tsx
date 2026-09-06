"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain,
  CalendarDays,
  Briefcase,
  Eye,
  FolderGit2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "./lib";
import ProfileForm from "./ProfileForm";
import SkillsManager from "./SkillsManager";
import ExperienceManager from "./ExperienceManager";
import RepoManager from "./RepoManager";
import KnowledgeManager from "./KnowledgeManager";
import ContributionsManager from "./ContributionsManager";
import SettingsForm from "./SettingsForm";

interface TabDef {
  value: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "skills", label: "Skills", icon: Zap },
  { value: "experiences", label: "Experience", icon: Briefcase },
  { value: "repos", label: "Repos", icon: FolderGit2 },
  { value: "knowledge", label: "Knowledge", icon: Brain },
  { value: "contributions", label: "Contributions", icon: CalendarDays },
  { value: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const session = useQuery<{ authed: boolean }>({
    queryKey: ["admin", "session"],
    queryFn: () => api<{ authed: boolean }>("/api/admin/session"),
    staleTime: 0,
  });

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader onExit={onExit} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Tabs defaultValue="profile" className="gap-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-none gap-1.5"
              >
                <tab.icon className="size-4" aria-hidden />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsManager />
          </TabsContent>
          <TabsContent value="experiences">
            <ExperienceManager />
          </TabsContent>
          <TabsContent value="repos">
            <RepoManager />
          </TabsContent>
          <TabsContent value="knowledge">
            <KnowledgeManager />
          </TabsContent>
          <TabsContent value="contributions">
            <ContributionsManager />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsForm />
          </TabsContent>
        </Tabs>
      </main>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Enter your passcode.");
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
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
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
            <Input
              id="admin-passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-passcode-error" : undefined}
            />
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
      </div>
    </div>
  );
}
