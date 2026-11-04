"use client";

import { ArrowLeft, AtSign, BookOpen, Hash, Paperclip, Plus, Search, SendHorizontal, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CourseCover } from "@/components/CourseCard";
import { Markdown } from "@/components/Markdown";
import { Avatar, Button, Input, Label, Modal, Spinner, Textarea } from "@/components/ui";
import type { CourseSummary, Group, GroupMessage } from "@/lib/schemas";
import { useI18n, type Lang } from "@/lib/i18n";
import { toUser, useProfile } from "@/lib/user";
import { cn, timeAgo } from "@/lib/utils";

type GroupRow = Group & { messageCount: number; lastMessage: GroupMessage | null };
const EMOJIS = ["💬", "🧪", "📚", "🎯", "🧮", "🌍", "🎨", "💻", "🎵", "⚽", "🧠", "📝"];

const locale = (lang: Lang) => (lang === "bn" ? "bn-BD" : undefined);
function dayLabel(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return lang === "bn" ? "আজ" : "Today";
  if (d.toDateString() === y.toDateString()) return lang === "bn" ? "গতকাল" : "Yesterday";
  return d.toLocaleDateString(locale(lang), { weekday: "long", month: "short", day: "numeric" });
}
const timeOf = (iso: string, lang: Lang) => new Date(iso).toLocaleTimeString(locale(lang), { hour: "numeric", minute: "2-digit" });

function GroupsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const profile = useProfile();
  const { t: tr, lang } = useI18n();
  const groupId = search.get("g");

  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSent = useRef(0);

  const loadGroups = useCallback(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);
  useEffect(loadGroups, [loadGroups]);

  // Desktop: auto-select first group
  useEffect(() => {
    if (!groupId && groups?.length && window.matchMedia("(min-width: 768px)").matches) {
      router.replace(`/groups?g=${groups[0].id}`);
    }
  }, [groupId, groups, router]);

  // Load history + subscribe to realtime stream
  useEffect(() => {
    if (!groupId) return;
    setMessages(null);
    setTyping({});
    let cancelled = false;
    fetch(`/api/groups/${groupId}/messages`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: GroupMessage[]) => !cancelled && setMessages(m))
      .catch(() => !cancelled && setMessages([]));

    // Serverless-friendly realtime: poll messages + typing every 2s.
    const poll = async () => {
      try {
        const [mr, tr_] = await Promise.all([
          fetch(`/api/groups/${groupId}/messages`, { cache: "no-store" }),
          fetch(`/api/groups/${groupId}/typing`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (mr.ok) {
          const list = (await mr.json()) as GroupMessage[];
          setMessages((prev) => {
            if (!prev) return list;
            const seen = new Set(prev.map((x) => x.id));
            const fresh = list.filter((x) => !seen.has(x.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          const last = list[list.length - 1];
          if (last) {
            setGroups((gs) =>
              gs?.map((g) => (g.id === last.groupId && g.lastMessage?.id !== last.id ? { ...g, lastMessage: last, messageCount: list.length } : g)) ?? gs,
            );
          }
        }
        if (tr_.ok) {
          const list = (await tr_.json()) as { userId: string; name: string }[];
          setTyping(Object.fromEntries(list.map((t) => [t.userId, { name: t.name, until: Date.now() + 5000 }])));
        }
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    const timer = setInterval(poll, 2000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
      setConnected(false);
    };
  }, [groupId]);

  // Expire typing indicators
  useEffect(() => {
    const id = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const entries = Object.entries(t).filter(([, v]) => v.until > now);
        return entries.length === Object.keys(t).length ? t : Object.fromEntries(entries);
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const group = groups?.find((g) => g.id === groupId) ?? null;
  const othersTyping = Object.entries(typing)
    .filter(([k]) => k !== profile?.id)
    .map(([, v]) => v.name);

  async function post(body: { text: string; courseId?: string }) {
    if (!profile || !groupId) return;
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: toUser(profile), ...body }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to send");
    const m = (await res.json()) as GroupMessage;
    setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await post({ text: t });
    } catch (e) {
      setText(t);
      toast.error(e instanceof Error ? tr(e.message) : tr("Failed to send"));
    }
  }

  function onType(v: string) {
    setText(v);
    if (!profile || !groupId || Date.now() - lastTypingSent.current < 2500 || !v.trim()) return;
    lastTypingSent.current = Date.now();
    fetch(`/api/groups/${groupId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, name: profile.name }),
    }).catch(() => {});
  }

  const rendered = useMemo(() => {
    if (!messages) return null;
    const out: { day?: string; msg: GroupMessage; head: boolean }[] = [];
    let lastDay = "";
    messages.forEach((m, i) => {
      const day = dayLabel(m.createdAt, lang);
      const prev = messages[i - 1];
      const head =
        !prev || prev.authorId !== m.authorId || day !== lastDay || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60000 || m.kind === "share";
      out.push({ day: day !== lastDay ? day : undefined, msg: m, head });
      lastDay = day;
    });
    return out;
  }, [messages, lang]);

  const filtered = groups?.filter((g) => g.name.toLowerCase().includes(filter.toLowerCase())) ?? [];

  return (
    <div className="flex h-full">
      {/* Group list */}
      <aside className={cn("w-full shrink-0 flex-col border-r border-border bg-bg md:flex md:w-80", groupId ? "hidden" : "flex")}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{tr("Group chat")}</h1>
            <p className="text-xs text-muted">{tr("Collaborate with fellow tutors")}</p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={() => setCreating(true)} aria-label={tr("New group")}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tr("Find a group")} className="h-9 pl-9 text-[13px]" />
          </div>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {groups === null ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : (
            filtered.map((g) => {
              const active = g.id === groupId;
              const lm = g.lastMessage;
              return (
                <button
                  key={g.id}
                  onClick={() => router.push(`/groups?g=${g.id}`)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition",
                    active ? "bg-surface shadow-sm ring-1 ring-border" : "hover:bg-surface-2",
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl ring-1 ring-border">{g.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{tr(g.name)}</span>
                      {lm ? <span className="shrink-0 text-[11px] text-subtle">{timeAgo(lm.createdAt, lang)}</span> : null}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {lm ? (
                        <>
                          <span className="font-medium text-text/80">{lm.authorName.split(" ")[0]}:</span>{" "}
                          {lm.kind === "share" ? `📘 ${tr("shared {s}", { s: lm.courseTitle ?? "" })}` : lm.text}
                        </>
                      ) : (
                        tr(g.description)
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section className={cn("min-w-0 flex-1 flex-col", groupId ? "flex" : "hidden md:flex")}>
        {!group ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            {groups === null ? (
              <Spinner />
            ) : (
              <div>
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Users className="size-7" />
                </div>
                <h2 className="font-semibold">{tr("Pick a group")}</h2>
                <p className="mt-1 text-sm text-muted">{tr("Choose a group on the left to start chatting.")}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
              <button aria-label={tr("Back")} onClick={() => router.push("/groups")} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 md:hidden">
                <ArrowLeft className="size-4" />
              </button>
              <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-lg ring-1 ring-border">{group.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Hash className="size-3.5 text-subtle" />
                  <span className="truncate">{tr(group.name)}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate text-xs text-muted">
                  <span className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-subtle")} />
                  {connected ? tr("Live") : tr("Connecting…")} · {tr(group.description)}
                </div>
              </div>
              <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted sm:flex">
                <Sparkles className="size-3.5 text-accent" /> {tr("Mention @ai for help")}
              </div>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-6">
                {rendered === null ? (
                  <div className="grid place-items-center py-20">
                    <Spinner />
                  </div>
                ) : rendered.length === 0 ? (
                  <div className="py-16 text-center animate-fade-up">
                    <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-surface-2 text-3xl ring-1 ring-border">{group.emoji}</div>
                    <h2 className="text-lg font-semibold">{tr("Welcome to #{s}", { s: tr(group.name) })}</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                      {tr("This is the start of the conversation. Say hello, share a course, or ask @ai for a lesson idea.")}
                    </p>
                  </div>
                ) : (
                  rendered.map(({ day, msg, head }) => {
                    const mine = msg.authorId === profile?.id;
                    const ai = msg.kind === "ai";
                    return (
                      <div key={msg.id}>
                        {day ? (
                          <div className="my-5 flex items-center gap-3 text-[11px] font-medium text-subtle">
                            <span className="h-px flex-1 bg-border" />
                            {day}
                            <span className="h-px flex-1 bg-border" />
                          </div>
                        ) : null}
                        <div className={cn("group flex gap-3 rounded-xl px-2 py-0.5 transition hover:bg-surface-2/60", head ? "mt-3 pt-1.5" : "")}>
                          <div className="w-9 shrink-0">
                            {head ? (
                              ai ? (
                                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#f59e0b] text-white">
                                  <Sparkles className="size-4" />
                                </span>
                              ) : (
                                <Avatar name={msg.authorName} color={msg.authorColor} size={36} />
                              )
                            ) : (
                              <span className="block pt-1 text-right text-[10px] text-subtle opacity-0 group-hover:opacity-100">{timeOf(msg.createdAt, lang)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {head ? (
                              <div className="flex items-baseline gap-2">
                                <span className={cn("text-sm font-semibold", ai && "text-accent")}>
                                  {msg.authorName}
                                  {mine ? <span className="ml-1 font-normal text-subtle">{tr("(you)")}</span> : null}
                                </span>
                                {ai ? <span className="rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent">AI</span> : null}
                                <span className="text-[11px] text-subtle">{timeOf(msg.createdAt, lang)}</span>
                              </div>
                            ) : null}
                            {msg.kind === "share" ? (
                              <div className="mt-1.5 max-w-sm">
                                {msg.text ? <p className="mb-2 text-[14.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p> : null}
                                <Link href={`/courses/${msg.courseId}`} className="block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-md">
                                  <CourseCover seed={msg.courseTitle ?? "course"} className="h-16" />
                                  <div className="flex items-center gap-3 p-3">
                                    <BookOpen className="size-4 shrink-0 text-accent" />
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold">{msg.courseTitle}</div>
                                      <div className="text-xs text-muted">{tr("Open course →")}</div>
                                    </div>
                                  </div>
                                </Link>
                              </div>
                            ) : ai ? (
                              <Markdown className="text-[14.5px]">{msg.text}</Markdown>
                            ) : (
                              <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
                                {msg.text.split(/(@(?:ai|vector)\b)/gi).map((part, i) =>
                                  /^@(ai|vector)$/i.test(part) ? (
                                    <span key={i} className="rounded bg-accent-soft px-1 font-medium text-accent">
                                      {part}
                                    </span>
                                  ) : (
                                    part
                                  ),
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {othersTyping.length ? (
                  <div className="mt-3 flex items-center gap-2 px-2 text-xs text-muted animate-fade-in">
                    <span className="flex gap-0.5">
                      <span className="typing-dot size-1.5 rounded-full bg-subtle" />
                      <span className="typing-dot size-1.5 rounded-full bg-subtle" />
                      <span className="typing-dot size-1.5 rounded-full bg-subtle" />
                    </span>
                    {tr(othersTyping.length > 1 ? "{names} are typing…" : "{names} is typing…", { names: othersTyping.slice(0, 3).join(", ") })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 px-4 pt-1 pb-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-sm transition focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10"
              >
                <Button type="button" variant="ghost" size="icon-sm" className="mb-1" onClick={() => setSharing(true)} aria-label={tr("Share a course")} title={tr("Share a course")}>
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mb-1"
                  title={tr("Ask AI")}
                  aria-label={tr("Mention AI")}
                  onClick={() => {
                    setText((t) => (/@ai\b/i.test(t) ? t : `@ai ${t}`));
                    taRef.current?.focus();
                  }}
                >
                  <AtSign className="size-4" />
                </Button>
                <textarea
                  ref={taRef}
                  rows={1}
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={tr("Message #{s}", { s: tr(group.name) })}
                  className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[14.5px] placeholder:text-subtle focus:outline-none"
                  aria-label={tr("Message")}
                  maxLength={4000}
                />
                <Button type="submit" size="icon" className="size-9" disabled={!text.trim()} aria-label={tr("Send")}>
                  <SendHorizontal className="size-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </section>

      <CreateGroupModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(g) => {
          setCreating(false);
          loadGroups();
          router.push(`/groups?g=${g.id}`);
        }}
      />
      <ShareCourseModal
        open={sharing}
        onClose={() => setSharing(false)}
        onPick={async (c) => {
          setSharing(false);
          try {
            await post({ text: "", courseId: c.id });
          } catch (e) {
            toast.error(e instanceof Error ? tr(e.message) : tr("Could not share"));
          }
        }}
      />
    </div>
  );
}

function CreateGroupModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (g: Group) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold">{t("Create a group")}</h2>
      <p className="mt-1 text-sm text-muted">{t("A space for a department, a cohort, or a project.")}</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const res = await fetch("/api/groups", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, description, emoji }),
            });
            if (!res.ok) throw new Error();
            onCreated(await res.json());
            setName("");
            setDescription("");
          } catch {
            toast.error(t("Could not create group"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <Label>{t("Icon")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                onClick={() => setEmoji(em)}
                className={cn("grid size-9 cursor-pointer place-items-center rounded-lg text-lg transition", emoji === em ? "bg-accent-soft ring-2 ring-accent" : "bg-surface-2 hover:bg-surface-3")}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="g-name">{t("Name")}</Label>
          <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Year 11 Maths Team")} maxLength={60} autoFocus />
        </div>
        <div>
          <Label htmlFor="g-desc" hint={t("Optional")}>{t("Description")}</Label>
          <Textarea id="g-desc" className="min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
            {t("Create group")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShareCourseModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (c: CourseSummary) => void }) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [q, setQ] = useState("");
  const { t } = useI18n();
  useEffect(() => {
    if (open)
      fetch("/api/courses")
        .then((r) => r.json())
        .then(setCourses);
  }, [open]);
  const list = (courses ?? []).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <h2 className="text-lg font-semibold">{t("Share a course")}</h2>
      <Input className="mt-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search your library…")} autoFocus />
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {courses === null ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {t("No courses yet")}.{" "}
            <Link href="/courses/new" className="text-accent">
              {t("Create one")}
            </Link>
          </p>
        ) : (
          list.map((c) => (
            <button key={c.id} onClick={() => onPick(c)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface-2">
              <span className="size-10 shrink-0 overflow-hidden rounded-lg">
                <CourseCover seed={c.subject} className="h-full" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.title}</span>
                <span className="block text-xs text-muted">
                  {t(c.level)} · {t("{n} lessons", { n: c.lessonCount })}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

export default function Page() {
  return (
    <Suspense>
      <GroupsPage />
    </Suspense>
  );
}
