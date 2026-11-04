"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Modal, Spinner, Textarea } from "@/components/ui";
import type { Group } from "@/lib/schemas";
import { toUser, useProfile } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ShareDialog({ open, onClose, courseId, courseTitle }: { open: boolean; onClose: () => void; courseId: string; courseTitle: string }) {
  const router = useRouter();
  const profile = useProfile();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((g: Group[]) => {
        setGroups(g);
        setSel((s) => s ?? g[0]?.id ?? null);
      });
  }, [open]);

  async function share() {
    if (!sel || !profile) return;
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${sel}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: toUser(profile), text: note.trim(), courseId }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Shared to group"));
      onClose();
      router.push(`/groups?g=${sel}`);
    } catch {
      toast.error(t("Could not share"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold">{t("Share to a group")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t("Post “{s}” so other tutors can open it.", { s: courseTitle })}
      </p>
      <div className="mt-5 max-h-64 space-y-1.5 overflow-y-auto">
        {groups === null ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : (
          groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSel(g.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition",
                sel === g.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2",
              )}
            >
              <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-lg">{g.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{g.name}</span>
                <span className="block truncate text-xs text-muted">{g.description}</span>
              </span>
            </button>
          ))
        )}
      </div>
      <Textarea className="mt-4 min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add a note (optional)…")} maxLength={1000} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button onClick={share} loading={sending} disabled={!sel}>
          {!sending && <Send className="size-4" />} {t("Share")}
        </Button>
      </div>
    </Modal>
  );
}
