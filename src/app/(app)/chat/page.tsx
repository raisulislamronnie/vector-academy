"use client";

import {
  ArrowUp,
  BookOpen,
  ClipboardList,
  History,
  ListChecks,
  Check,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquarePen,
  Presentation,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Spinner } from "@/components/ui";
import { TOOL_LABELS, parseToolResult, toItems, type Item, type Part } from "@/lib/chat-display";
import { bnNum, useI18n } from "@/lib/i18n";
import { toUser, useProfile } from "@/lib/user";
import { cn, readNdjson } from "@/lib/utils";

interface ConvSummary {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
  kind?: string;
  count?: number;
}

const KIND_ICON: Record<string, { icon: typeof BookOpen; tint: string }> = {
  course: { icon: BookOpen, tint: "bg-[#fff1e6] text-[#ea580c]" },
  slides: { icon: Presentation, tint: "bg-[#fef3c7] text-[#b45309]" },
  quiz: { icon: ListChecks, tint: "bg-[#e6f7ef] text-[#12a46f]" },
  assignments: { icon: ClipboardList, tint: "bg-[#ffe9e6] text-[#e11d48]" },
  chat: { icon: MessageCircle, tint: "bg-surface-2 text-muted" },
};

function groupByDate(list: ConvSummary[]) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const day = 86400000;
  const groups: { label: string; items: ConvSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of list) {
    const t = startOfDay(new Date(c.updatedAt));
    const i = t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : t >= today - 30 * day ? 3 : 4;
    groups[i].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}

function shortTime(iso: string, lang: "en" | "bn") {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  const loc = lang === "bn" ? "bn-BD" : undefined;
  if (diff < 60) return lang === "bn" ? "এখন" : "now";
  if (diff < 3600) return lang === "bn" ? `${bnNum(Math.floor(diff / 60))} মি.` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
  if (diff < 7 * 86400) return d.toLocaleDateString(loc, { weekday: "short" });
  return d.toLocaleDateString(loc, { month: "short", day: "numeric" });
}

const STARTERS = [
  { icon: BookOpen, title: "Build a full course", prompt: "Create a 5-module beginner course on Personal Finance for university students." },
  { icon: Presentation, title: "Make a slide deck", prompt: "Make a 10-slide deck on the Water Cycle for Grade 6." },
  { icon: ListChecks, title: "Write an MCQ quiz", prompt: "Write a 15-question mixed-difficulty MCQ quiz on SQL basics." },
  { icon: ClipboardList, title: "Design assignments", prompt: "Create 3 A-Level Psychology assignments on memory, with rubrics." },
];

const QUICK = [
  { icon: BookOpen, label: "Course", template: "Create a course on " },
  { icon: Presentation, label: "Slides", template: "Make a 10-slide deck on " },
  { icon: ListChecks, label: "Quiz", template: "Write a 10-question MCQ quiz on " },
  { icon: ClipboardList, label: "Assignment", template: "Create 2 assignments with rubrics on " },
];

type StreamEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text_start" }
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_start"; id: string; name: string; label: string; input: Record<string, unknown> }
  | { type: "tool_progress"; id: string; chars: number; label: string }
  | { type: "tool_end"; id: string; name: string; ok: boolean; content: string }
  | { type: "notice"; text: string }
  | { type: "error"; message: string }
  | { type: "step_start" }
  | { type: "retry" }
  | { type: "done" }
  | { type: "ping" };

function ChatPage() {
  const router = useRouter();
  const search = useSearchParams();
  const profile = useProfile();
  const { t, lang } = useI18n();
  const convId = search.get("c");

  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);
  const activeConvRef = useRef<string | null>(null);
  const autoSent = useRef(false);
  const stepMarkRef = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem("va.chatList") === "hidden") setHistoryOpen(false);
    } catch {}
  }, []);
  const toggleHistory = (open: boolean) => {
    setHistoryOpen(open);
    try {
      localStorage.setItem("va.chatList", open ? "shown" : "hidden");
    } catch {}
  };

  const loadConvs = useCallback(() => {
    if (!profile) return;
    fetch(`/api/conversations?userId=${profile.id}`)
      .then((r) => r.json())
      .then(setConvs)
      .catch(() => {});
  }, [profile]);
  useEffect(loadConvs, [loadConvs]);

  // Load selected conversation (unless it's the one we're streaming into)
  useEffect(() => {
    if (!profile) return;
    if (!convId) {
      if (!streaming) setItems([]);
      activeConvRef.current = null;
      return;
    }
    if (activeConvRef.current === convId) return;
    activeConvRef.current = convId;
    setLoadingConv(true);
    fetch(`/api/conversations/${convId}?userId=${profile.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(toItems(d.messages)))
      .catch(() => {
        toast.error(t("Conversation not found"));
        router.replace("/chat");
      })
      .finally(() => setLoadingConv(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, profile]);

  // Auto-scroll while streaming if user is near the bottom
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current && items.length) el.scrollTop = el.scrollHeight;
  }, [items]);

  // Autosize composer
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [input]);

  const patchAssistant = (fn: (parts: Part[]) => Part[]) =>
    setItems((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = { ...last, parts: fn(last.parts) };
      return next;
    });

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || streaming || !profile) return;
      setInput("");
      stickRef.current = true;
      setItems((prev) => [
        ...prev,
        { id: `u${Date.now()}`, role: "user", text: message },
        { id: `a${Date.now()}`, role: "assistant", parts: [] },
      ]);
      setStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeConvRef.current, message, user: toUser(profile), lang }),
          signal: ac.signal,
        });
        await readNdjson<StreamEvent>(res, (e) => {
          switch (e.type) {
            case "conversation":
              if (activeConvRef.current !== e.id) {
                activeConvRef.current = e.id;
                router.replace(`/chat?c=${e.id}`, { scroll: false });
              }
              break;
            case "step_start":
              setItems((prev) => {
                const last = prev[prev.length - 1];
                stepMarkRef.current = last?.role === "assistant" ? last.parts.length : 0;
                return prev;
              });
              break;
            case "retry":
              // Model failed mid-reply; the server retries on another model, so drop this step's partial output.
              patchAssistant((parts) => parts.slice(0, stepMarkRef.current));
              break;
            case "thinking":
              patchAssistant((parts) => {
                const last = parts[parts.length - 1];
                if (last?.type === "thinking" && !last.done) return [...parts.slice(0, -1), { ...last, text: last.text + e.text }];
                return [...parts, { type: "thinking", text: e.text, done: false }];
              });
              break;
            case "text_start":
              patchAssistant((parts) => [...parts.map((p) => (p.type === "thinking" ? { ...p, done: true } : p)), { type: "text", text: "" }]);
              break;
            case "text":
              patchAssistant((parts) => {
                const last = parts[parts.length - 1];
                if (last?.type === "text") return [...parts.slice(0, -1), { ...last, text: last.text + e.text }];
                return [...parts, { type: "text", text: e.text }];
              });
              break;
            case "tool_start":
              patchAssistant((parts) => [
                ...parts.map((p) => (p.type === "thinking" ? { ...p, done: true } : p)),
                {
                  type: "tool",
                  id: e.id,
                  name: e.name,
                  label: TOOL_LABELS[e.name] ?? e.label,
                  input: e.input,
                  status: "running",
                  chars: 0,
                  progressLabel: "",
                },
              ]);
              break;
            case "tool_progress":
              patchAssistant((parts) => parts.map((p) => (p.type === "tool" && p.id === e.id ? { ...p, chars: e.chars, progressLabel: e.label } : p)));
              break;
            case "tool_end": {
              const r = parseToolResult(e.content);
              patchAssistant((parts) =>
                parts.map((p) =>
                  p.type === "tool" && p.id === e.id
                    ? { ...p, status: e.ok ? "done" : "error", result: r.meta, error: e.ok ? undefined : r.error }
                    : p,
                ),
              );
              if (e.ok && e.name !== "list_courses") toast.success(t(e.name === "create_course" ? "Course saved to your library" : "Material generated"));
              break;
            }
            case "notice":
              patchAssistant((parts) => [...parts, { type: "notice", text: e.text, tone: "warning" }]);
              break;
            case "error":
              patchAssistant((parts) => [...parts, { type: "notice", text: e.message, tone: "error" }]);
              break;
          }
        });
      } catch (err) {
        if (!ac.signal.aborted) {
          patchAssistant((parts) => [...parts, { type: "notice", text: err instanceof Error ? err.message : t("Something went wrong"), tone: "error" }]);
        }
      } finally {
        patchAssistant((parts) =>
          parts.map((p) =>
            p.type === "thinking" ? { ...p, done: true } : p.type === "tool" && p.status === "running" ? { ...p, status: "error", error: t("Stopped") } : p,
          ),
        );
        setStreaming(false);
        abortRef.current = null;
        loadConvs();
        taRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streaming, profile, router, loadConvs, lang, t],
  );

  // ?q= from dashboard: auto-send (or prefill with &draft=1)
  useEffect(() => {
    const q = search.get("q");
    if (!q || autoSent.current || !profile) return;
    autoSent.current = true;
    if (search.get("draft")) {
      setInput(q);
      router.replace("/chat");
      setTimeout(() => taRef.current?.focus(), 50);
    } else {
      router.replace("/chat");
      send(q);
    }
  }, [search, profile, send, router]);

  const newChat = () => {
    if (streaming) abortRef.current?.abort();
    activeConvRef.current = null;
    setItems([]);
    router.push("/chat");
    setShowHistory(false);
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const removeConv = async (id: string) => {
    if (!profile) return;
    await fetch(`/api/conversations/${id}?userId=${profile.id}`, { method: "DELETE" });
    setConvs((c) => c.filter((x) => x.id !== id));
    if (id === convId) newChat();
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? convs.filter((c) => `${c.title} ${c.preview ?? ""}`.toLowerCase().includes(q)) : convs;
  const groups = groupByDate(filtered);

  const history = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <div className="font-display text-lg leading-none">{t("Chats")}</div>
          <div className="mt-1 text-[11px] text-subtle">
            {t(convs.length === 1 ? "{n} conversation" : "{n} conversations", { n: convs.length })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={newChat}
            aria-label={t("New chat")}
            title={t("New chat")}
            className="grid size-8 cursor-pointer place-items-center rounded-lg bg-accent text-accent-fg shadow-sm transition hover:brightness-110"
          >
            <SquarePen className="size-4" />
          </button>
          <button
            onClick={() => toggleHistory(false)}
            aria-label={t("Hide chat list")}
            title={t("Hide chat list")}
            className="hidden size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text md:grid"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search chats")}
            aria-label={t("Search chats")}
            className="h-9 w-full rounded-xl border border-border bg-surface pr-8 pl-8.5 text-[13px] placeholder:text-subtle transition focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          />
          {query ? (
            <button
              aria-label={t("Clear search")}
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-text"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {convs.length === 0 ? (
          <div className="mx-2 mt-6 rounded-2xl border border-dashed border-border-strong p-5 text-center">
            <div className="mx-auto grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <MessageCircle className="size-5" />
            </div>
            <div className="mt-3 text-sm font-semibold">{t("No chats yet")}</div>
            <p className="mt-1 text-xs text-muted">{t("Your conversations with Vector will appear here.")}</p>
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-subtle">{t("No chats match “{q}”.", { q: query })}</p>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mt-2 first:mt-0">
              <div className="sticky top-0 z-10 bg-bg/95 px-2.5 pt-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase backdrop-blur">
                {t(g.label)}
              </div>
              <div className="space-y-0.5">
                {g.items.map((c) => {
                  const active = c.id === convId;
                  const k = KIND_ICON[c.kind ?? "chat"] ?? KIND_ICON.chat;
                  const Icon = k.icon;
                  const confirming = confirmId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl p-2 transition",
                        active ? "bg-surface shadow-sm ring-1 ring-accent/30" : "hover:bg-surface-2",
                      )}
                    >
                      {active ? <span className="absolute top-2.5 bottom-2.5 -left-2 w-1 rounded-r-full bg-accent" /> : null}
                      <button
                        onClick={() => {
                          setConfirmId(null);
                          router.push(`/chat?c=${c.id}`);
                          setShowHistory(false);
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                      >
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", k.tint)}>
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={cn("truncate text-[13px]", active ? "font-semibold text-text" : "font-medium")}>{c.title}</span>
                            <span className="ml-auto shrink-0 text-[10.5px] text-subtle tabular-nums group-hover:invisible">
                              {shortTime(c.updatedAt, lang)}
                            </span>
                          </span>
                          <span className="block truncate text-[11.5px] text-muted">{c.preview || t("No reply yet")}</span>
                        </span>
                      </button>
                      {confirming ? (
                        <div className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-lg bg-surface pl-2 shadow-sm ring-1 ring-danger/30 animate-fade-in">
                          <span className="text-[11px] font-medium text-danger">{t("Delete?")}</span>
                          <button
                            aria-label={t("Confirm delete")}
                            onClick={() => removeConv(c.id)}
                            className="grid size-7 cursor-pointer place-items-center rounded-md bg-danger text-white hover:brightness-110"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            aria-label={t("Cancel delete")}
                            onClick={() => setConfirmId(null)}
                            className="grid size-7 cursor-pointer place-items-center rounded-md text-muted hover:bg-surface-2"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          aria-label={t("Delete {s}", { s: c.title })}
                          onClick={() => setConfirmId(c.id)}
                          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const empty = items.length === 0 && !loadingConv;

  return (
    <div className="flex h-full">
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-border bg-bg transition-[width] duration-300 ease-out md:block",
          historyOpen ? "w-72" : "w-0 border-r-0",
        )}
      >
        <div className="h-full w-72">{history}</div>
      </aside>

      {showHistory ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-bg shadow-lg animate-fade-up">
            <button aria-label={t("Close")} onClick={() => setShowHistory(false)} className="absolute top-4 right-3 grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2">
              <X className="size-4" />
            </button>
            <div className="pt-10">{history}</div>
          </div>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Floating controls (no header bar): mobile history/new chat, and re-open the chat list on desktop. */}
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex gap-1.5">
          <button
            aria-label={t("Chat history")}
            onClick={() => setShowHistory(true)}
            className="pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-xl border border-border bg-surface/90 text-muted shadow-sm backdrop-blur transition hover:text-text md:hidden"
          >
            <History className="size-4" />
          </button>
          <button
            aria-label={t("New chat")}
            onClick={newChat}
            className="pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-xl border border-border bg-surface/90 text-muted shadow-sm backdrop-blur transition hover:text-text md:hidden"
          >
            <SquarePen className="size-4" />
          </button>
          {!historyOpen ? (
            <button
              aria-label={t("Show chat list")}
              title={t("Show chat list")}
              onClick={() => toggleHistory(true)}
              className="pointer-events-auto hidden size-9 cursor-pointer place-items-center rounded-xl border border-border bg-surface/90 text-muted shadow-sm backdrop-blur transition hover:text-text md:grid"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          ) : null}
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {loadingConv ? (
            <div className="grid h-full place-items-center">
              <Spinner />
            </div>
          ) : empty ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-10">
              <div className="text-center animate-fade-up">
                <div className="mx-auto mb-5 grid size-14 animate-float place-items-center rounded-2xl bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#f59e0b] text-white shadow-lg">
                  <Sparkles className="size-7" />
                </div>
                <h1 className="font-display text-4xl tracking-tight">{t("How can I help you teach?")}</h1>
                <p className="mt-2 text-muted">{t("Ask for a course, slide deck, MCQ quiz or assignment on any subject.")}</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {STARTERS.map(({ icon: Icon, title, prompt }, i) => (
                  <button
                    key={title}
                    onClick={() => send(t(prompt))}
                    className="group cursor-pointer rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md animate-fade-up"
                    style={{ animationDelay: `${100 + i * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="size-4 text-accent" /> {t(title)}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t(prompt)}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-7 px-4 pt-16 pb-8 md:pt-8">
              {items.map((it, idx) => (
                <ChatMessage key={it.id} item={it} profile={profile} streaming={streaming && idx === items.length - 1} />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-2 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className={cn(
              "mx-auto max-w-3xl rounded-[22px] border bg-surface shadow-[0_8px_30px_-12px_rgb(28_25_23/0.18)] transition",
              "focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_12%,transparent),0_8px_30px_-12px_rgb(28_25_23/0.18)]",
              streaming ? "border-accent/40" : "border-border",
            )}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={streaming ? t("Vector is working… you can type your next message") : t("Ask Vector to create a course, slides, quiz or assignment…")}
              className="block max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed placeholder:text-subtle focus:outline-none focus-visible:outline-none"
              aria-label={t("Message")}
            />
            <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [mask-image:linear-gradient(90deg,black_80%,transparent)] [scrollbar-width:none] sm:[mask-image:none]">
                {QUICK.map(({ icon: Icon, label, template: en }) => ({ Icon, label, template: t(en) })).map(({ Icon, label, template }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setInput(template);
                      requestAnimationFrame(() => {
                        const ta = taRef.current;
                        ta?.focus();
                        ta?.setSelectionRange(template.length, template.length);
                      });
                    }}
                    className={cn(
                      "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      input.startsWith(template.trim())
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-border text-muted hover:border-border-strong hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon className="size-3.5" /> {t(label)}
                  </button>
                ))}
              </div>
              <span className="hidden shrink-0 items-center gap-1 pr-1 text-[11px] text-subtle sm:inline-flex">
                <kbd className="rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">Enter</kbd> {t("send")}
                <span className="mx-0.5">·</span>
                <kbd className="rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">Shift + Enter</kbd> {t("new line")}
              </span>
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label={t("Stop generating")}
                  className="group relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-text text-bg transition hover:opacity-85"
                >
                  <span className="absolute inset-0 animate-ping rounded-xl bg-accent/30" />
                  <Square className="relative size-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || !profile}
                  aria-label={t("Send")}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-gradient-to-br from-[#ea580c] to-[#f59e0b] text-white shadow-[0_6px_16px_-6px_rgb(234_88_12/0.8)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:from-surface-3 disabled:to-surface-3 disabled:text-subtle disabled:shadow-none"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-subtle">
            {t("Vector can make mistakes. Review generated material before teaching.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
