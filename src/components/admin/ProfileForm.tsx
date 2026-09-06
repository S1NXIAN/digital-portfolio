"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Save, UserRound, X } from "lucide-react";
import type { ProfileData, SocialLink } from "@/types/portfolio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "./lib";
import { Field } from "./ManagerStates";

const SOCIAL_ICONS = [
  "Github",
  "Linkedin",
  "Twitter",
  "Mail",
  "Youtube",
  "Globe",
  "Link",
  "Rss",
  "MessageSquare",
] as const;

interface FormState {
  name: string;
  headline: string;
  bio: string;
  motto: string;
  email: string;
  location: string;
  availability: string;
  githubUsername: string;
  resumeUrl: string;
  yearsExperience: number;
  rotatingWords: string; // one per line
  photoUrl: string;
  socials: SocialLink[];
}

/** Build editable form state from the API profile object. */
function hydrateForm(p: ProfileData): FormState {
  return {
    name: p.name ?? "",
    headline: p.headline ?? "",
    bio: p.bio ?? "",
    motto: p.motto ?? "",
    email: p.email ?? "",
    location: p.location ?? "",
    availability: p.availability ?? "",
    githubUsername: p.githubUsername ?? "",
    resumeUrl: p.resumeUrl ?? "",
    yearsExperience: typeof p.yearsExperience === "number" ? p.yearsExperience : 0,
    rotatingWords: Array.isArray(p.rotatingWords) ? p.rotatingWords.join("\n") : "",
    photoUrl: p.photoUrl ?? "",
    socials: Array.isArray(p.socials)
      ? p.socials.map((s) => ({
          label: s.label ?? "",
          url: s.url ?? "",
          icon: s.icon || "Globe",
        }))
      : [],
  };
}

export default function ProfileForm() {
  const { data, isLoading, isError, refetch } = useQuery<{ profile: ProfileData }>({
    queryKey: ["admin", "profile"],
    queryFn: () => api<{ profile: ProfileData }>("/api/admin/profile"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">Could not load the profile.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const profile = data?.profile;
  if (!profile) return null;
  return <ProfileEditor key={profile.id} profile={profile} />;
}

function ProfileEditor({ profile }: { profile: ProfileData }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() => hydrateForm(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: (payload: Partial<ProfileData>) =>
      api<{ profile: ProfileData }>("/api/admin/profile", { method: "PUT", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "profile"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Profile saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.headline.trim()) next.headline = "Headline is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    save.mutate({
      name: form.name.trim(),
      headline: form.headline.trim(),
      bio: form.bio,
      motto: form.motto,
      email: form.email.trim(),
      location: form.location,
      availability: form.availability,
      githubUsername: form.githubUsername.trim(),
      resumeUrl: form.resumeUrl.trim(),
      yearsExperience: Math.max(0, Math.round(form.yearsExperience || 0)),
      rotatingWords: form.rotatingWords
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      photoUrl: form.photoUrl,
      socials: form.socials.map((s) => ({
        label: s.label.trim(),
        url: s.url.trim(),
        icon: s.icon,
      })),
    });
  };

  const onPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read that file");
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => toast.error("That file is not a valid image");
      img.onload = () => {
        const max = 512;
        const scale = Math.max(max / img.width, max / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = max;
        canvas.height = max;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Could not process the image");
          return;
        }
        ctx.drawImage(img, (max - w) / 2, (max - h) / 2, w, h); // cover, center-crop
        set("photoUrl", canvas.toDataURL("image/jpeg", 0.85));
        toast.success("Photo ready — remember to save");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateSocial = (i: number, patch: Partial<SocialLink>) =>
    set(
      "socials",
      form.socials.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );

  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Photo */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Photo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Square crop, scaled to 512×512 JPEG. Shown in the hero and about sections.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-border">
            {form.photoUrl ? (
              <AvatarImage src={form.photoUrl} alt="Profile photo preview" />
            ) : null}
            <AvatarFallback>
              <UserRound className="size-8 text-muted-foreground" aria-hidden />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
              aria-label="Upload profile photo"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden />
              Upload photo
            </Button>
            {form.photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => set("photoUrl", "")}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Basics */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="pf-name" error={errors.name}>
            <Input
              id="pf-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Alex Carter"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Headline" htmlFor="pf-headline" error={errors.headline}>
            <Input
              id="pf-headline"
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="Backend engineer & systems tinkerer"
              aria-invalid={Boolean(errors.headline)}
            />
          </Field>
          <Field label="Email" htmlFor="pf-email" error={errors.email}>
            <Input
              id="pf-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="alex@example.com"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Location" htmlFor="pf-location">
            <Input
              id="pf-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Berlin, Germany"
            />
          </Field>
          <Field label="Availability" htmlFor="pf-availability">
            <Input
              id="pf-availability"
              value={form.availability}
              onChange={(e) => set("availability", e.target.value)}
              placeholder="Open to freelance work"
            />
          </Field>
          <Field label="GitHub username" htmlFor="pf-github">
            <Input
              id="pf-github"
              value={form.githubUsername}
              onChange={(e) => set("githubUsername", e.target.value)}
              placeholder="octocat"
            />
          </Field>
          <Field label="Resume URL" htmlFor="pf-resume">
            <Input
              id="pf-resume"
              value={form.resumeUrl}
              onChange={(e) => set("resumeUrl", e.target.value)}
              placeholder="https://…/resume.pdf"
            />
          </Field>
          <Field label="Years of experience" htmlFor="pf-years">
            <Input
              id="pf-years"
              type="number"
              min={0}
              max={70}
              value={form.yearsExperience}
              onChange={(e) =>
                set("yearsExperience", e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </Field>
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">About</h2>
        <div className="mt-4 space-y-4">
          <Field label="Bio" htmlFor="pf-bio">
            <Textarea
              id="pf-bio"
              rows={5}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="A short story about what you build and why."
            />
          </Field>
          <Field label="Motto" htmlFor="pf-motto">
            <Textarea
              id="pf-motto"
              rows={2}
              value={form.motto}
              onChange={(e) => set("motto", e.target.value)}
              placeholder="Ship small, ship often."
            />
          </Field>
          <Field
            label="Rotating words"
            htmlFor="pf-rotating"
            hint="One word or phrase per line — they rotate in the hero."
          >
            <Textarea
              id="pf-rotating"
              rows={3}
              value={form.rotatingWords}
              onChange={(e) => set("rotatingWords", e.target.value)}
              placeholder={"backend systems\nopen source\ndistributed tooling"}
            />
          </Field>
        </div>
      </section>

      {/* Socials */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Social links</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Rendered as icon links across the site.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("socials", [...form.socials, { label: "", url: "", icon: "Globe" }])
            }
          >
            <Plus className="size-4" aria-hidden />
            Add social
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {form.socials.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No social links yet.
            </p>
          ) : (
            form.socials.map((social, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border bg-background/40 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto]"
              >
                <Input
                  value={social.label}
                  onChange={(e) => updateSocial(i, { label: e.target.value })}
                  placeholder="Label"
                  aria-label={`Social ${i + 1} label`}
                />
                <Input
                  value={social.url}
                  onChange={(e) => updateSocial(i, { url: e.target.value })}
                  placeholder="https://…"
                  aria-label={`Social ${i + 1} URL`}
                />
                <Select
                  value={social.icon}
                  onValueChange={(v) => updateSocial(i, { icon: v })}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label={`Social ${i + 1} icon`}
                  >
                    <SelectValue placeholder="Icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="justify-self-end text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    set(
                      "socials",
                      form.socials.filter((_, idx) => idx !== i)
                    )
                  }
                  aria-label={`Remove social ${i + 1}`}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden />
              Save
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
