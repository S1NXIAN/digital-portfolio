"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "./lib";
import { Field } from "./ManagerStates";

export default function SettingsForm() {
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const change = useMutation({
    mutationFn: (payload: { currentPasscode: string; newPasscode: string }) =>
      api<{ ok: boolean }>("/api/admin/settings", { method: "PUT", body: payload }),
    onSuccess: () => {
      toast.success("Passcode updated");
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmNew("");
      setErrors({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!currentPasscode) next.current = "Enter your current passcode";
    if (newPasscode.length < 4) next.new = "New passcode must be at least 4 characters";
    else if (newPasscode !== confirmNew) next.confirm = "Passcodes do not match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    change.mutate({ currentPasscode, newPasscode });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="size-4 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Change admin passcode</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Used to sign in to this console.
            </p>
          </div>
        </div>
        <Separator className="my-5" />
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Current passcode" htmlFor="settings-current" error={errors.current}>
            <Input
              id="settings-current"
              type="password"
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.current)}
            />
          </Field>
          <Field label="New passcode" htmlFor="settings-new" error={errors.new}>
            <Input
              id="settings-new"
              type="password"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.new)}
            />
          </Field>
          <Field label="Confirm new passcode" htmlFor="settings-confirm" error={errors.confirm}>
            <Input
              id="settings-confirm"
              type="password"
              value={confirmNew}
              onChange={(e) => setConfirmNew(e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update passcode"
              )}
            </Button>
          </div>
        </form>
      </section>

      <section className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          The passcode is stored server-side and never exposed to the client. After a successful
          login, an httpOnly admin cookie keeps you signed in for <strong>7 days</strong>. If you
          change the passcode here, future sign-ins will require the new value — the current
          session stays valid.
        </p>
      </section>
    </div>
  );
}
