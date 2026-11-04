"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { AVATAR_COLORS, saveProfile, useProfile, type Profile } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar, Button, Input, Label, Modal } from "./ui";
import { Logo } from "./Logo";

export function ProfileForm({ initial, onDone }: { initial?: Profile | null; onDone?: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [color, setColor] = useState(initial?.color ?? AVATAR_COLORS[0]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        saveProfile({
          id: initial?.id ?? crypto.randomUUID(),
          name: name.trim().slice(0, 60),
          subject: subject.trim().slice(0, 80),
          color,
        });
        onDone?.();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
        <Avatar name={name || "?"} color={color} size={48} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{name || t("Your name")}</div>
          <div className="truncate text-sm text-muted">{subject || t("Your subject")}</div>
        </div>
      </div>
      <div>
        <Label htmlFor="pf-name">{t("Display name")}</Label>
        <Input id="pf-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Ms. Rahman")} maxLength={60} />
      </div>
      <div>
        <Label htmlFor="pf-subject" hint={t("Optional")}>{t("What do you teach?")}</Label>
        <Input id="pf-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("e.g. A-Level Physics")} maxLength={80} />
      </div>
      <div>
        <Label>{t("Avatar colour")}</Label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={t("Colour {c}", { c })}
              onClick={() => setColor(c)}
              className={cn(
                "size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-surface transition",
                color === c ? "ring-2 ring-text" : "hover:scale-110",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!name.trim()}>
        {initial ? t("Save profile") : t("Enter the studio")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

/** First-visit onboarding. Identity is stored locally (no passwords). */
export function IdentityGate() {
  const profile = useProfile();
  const { t } = useI18n();
  if (profile !== null) return null;
  return (
    <Modal open>
      <div className="mb-6">
        <Logo />
        <h2 className="mt-6 font-display text-3xl leading-tight">
          {t("Welcome, tutor")} <Sparkles className="inline size-5 text-accent" />
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t("Set up your profile to start building courses with AI and chatting with other tutors.")}
        </p>
      </div>
      <ProfileForm />
    </Modal>
  );
}
