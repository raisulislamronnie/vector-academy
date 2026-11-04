"use client";

import {
  BookOpen,
  ChevronRight,
  Home,
  LayoutDashboard,
  Menu as MenuIcon,
  MessagesSquare,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  PlusCircle,
  Settings2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useProfile } from "@/lib/user";
import { cn } from "@/lib/utils";
import { IdentityGate, ProfileForm } from "./IdentityGate";
import { LanguageToggle } from "./LanguageToggle";
import { Logo, LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, Button, Modal } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Assistant", icon: Sparkles, badge: "AI" },
  { href: "/courses/new", label: "Create course", icon: PlusCircle },
  { href: "/courses", label: "Course library", icon: BookOpen },
  { href: "/groups", label: "Group chat", icon: MessagesSquare },
];

function isActive(pathname: string, href: string) {
  if (href === "/courses") return pathname.startsWith("/courses") && pathname !== "/courses/new";
  if (href === "/courses/new") return pathname === href;
  return pathname.startsWith(href);
}

function titleFor(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/chat")) return "AI Assistant";
  if (pathname === "/courses/new") return "Create course";
  if (pathname.startsWith("/courses/")) return "Course";
  if (pathname.startsWith("/courses")) return "Course library";
  if (pathname.startsWith("/groups")) return "Group chat";
  return "";
}

const SIDEBAR_KEY = "va.sidebar";

/** Hover label for icon-only rail items. */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-lg bg-[#1c1917] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

/** One-button theme switch for the collapsed rail: light, dark, system. */
function ThemeCycle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const order = ["light", "dark", "system"] as const;
  const current = mounted ? ((theme as (typeof order)[number]) ?? "system") : "system";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={() => setTheme(order[(order.indexOf(current) + 1) % order.length])}
      aria-label={t("Theme: {mode}", { mode: t(current[0].toUpperCase() + current.slice(1)) })}
      className="group relative mx-auto grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text"
    >
      <Icon className="size-[18px]" />
      <Tip>{t("Theme: {mode}", { mode: t(current[0].toUpperCase() + current.slice(1)) })}</Tip>
    </button>
  );
}

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const profile = useProfile();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-5")}>
        <Link href="/dashboard" onClick={onNavigate} aria-label={t("Dashboard")}>
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
      </div>

      <div className={cn("pt-2", collapsed ? "px-2" : "px-3")}>
        <Link href="/chat" onClick={onNavigate} className="group relative block" aria-label={t("New with AI")}>
          <Button className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")} size="md" tabIndex={-1}>
            <Plus className="size-4" /> {collapsed ? null : t("New with AI")}
          </Button>
          {collapsed ? <Tip>{t("New with AI")}</Tip> : null}
        </Link>
      </div>

      <nav className={cn("mt-5 flex-1 space-y-1", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <div className="mx-auto mb-2 h-px w-8 bg-border" />
        ) : (
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">{t("Workspace")}</div>
        )}
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-label={collapsed ? t(label) : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl py-2.5 text-[14px] font-medium transition",
                collapsed ? "justify-center px-0" : "px-3",
                active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {active ? (
                <span className={cn("absolute top-2 bottom-2 w-1 rounded-r-full bg-accent", collapsed ? "-left-2" : "-left-3")} />
              ) : null}
              <Icon className={cn("size-[18px]", active ? "text-accent" : "text-subtle group-hover:text-text")} />
              {collapsed ? (
                <>
                  {badge ? <span className="absolute top-1.5 right-2.5 size-1.5 rounded-full bg-accent" /> : null}
                  <Tip>{t(label)}</Tip>
                </>
              ) : (
                t(label)
              )}
              {!collapsed && badge ? (
                <span className="ml-auto rounded-full bg-gradient-to-r from-[#ea580c] to-[#f59e0b] px-1.5 py-px text-[10px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <Link
          href="/"
          onClick={onNavigate}
          aria-label={collapsed ? t("Home page") : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl py-2.5 text-[14px] font-medium text-muted transition hover:bg-surface-2 hover:text-text",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <Home className="size-[18px] text-subtle" /> {collapsed ? <Tip>{t("Home page")}</Tip> : t("Home page")}
        </Link>
      </nav>

      {collapsed ? (
        <div className="space-y-2 p-2 pb-3">
          <ThemeCycle />
          {profile ? (
            <button
              onClick={() => setEditing(true)}
              aria-label={t("Your profile")}
              className="group relative mx-auto grid cursor-pointer place-items-center rounded-full transition hover:ring-4 hover:ring-accent/15"
            >
              <Avatar name={profile.name} color={profile.color} size={36} />
              <Tip>{profile.name}</Tip>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <div className="relative overflow-hidden rounded-2xl bg-[#1c1917] p-4 text-white">
            <div className="absolute -top-8 -right-8 size-24 rounded-full bg-[#ea580c]/60 blur-2xl" />
            <div className="absolute -bottom-10 left-6 size-20 rounded-full bg-[#f59e0b]/40 blur-2xl" />
            <div className="relative">
              <Sparkles className="size-4 text-[#fdba74]" />
              <div className="mt-2 text-[13px] font-semibold">{t("Try asking Vector")}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {t("“Build a 6-week GCSE Biology course with slides and a quiz.”")}
              </p>
              <Link
                href="/chat"
                onClick={onNavigate}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white"
              >
                {t("Open assistant")} <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <ThemeToggle />
          {profile ? (
            <button
              onClick={() => setEditing(true)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border p-2 text-left transition hover:bg-surface-2"
            >
              <Avatar name={profile.name} color={profile.color} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{profile.name}</span>
                <span className="block truncate text-xs text-subtle">{profile.subject || t("Tutor")}</span>
              </span>
              <Settings2 className="size-4 text-subtle" />
            </button>
          ) : null}
        </div>
      )}
      <Modal open={editing} onClose={() => setEditing(false)}>
        <h2 className="mb-5 font-display text-xl">{t("Your profile")}</h2>
        <ProfileForm initial={profile} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false); // user's preference
  const [override, setOverride] = useState<boolean | null>(null); // manual toggle on an auto-collapse page
  const pathname = usePathname();
  const profile = useProfile();
  const { t } = useI18n();
  useEffect(() => {
    setOpen(false);
    setOverride(null);
  }, [pathname]);
  // Chat needs room: the sidebar collapses there automatically and comes back elsewhere.
  const autoCollapse = pathname.startsWith("/chat");
  const collapsed = override ?? (autoCollapse ? true : saved);

  useEffect(() => {
    try {
      setSaved(localStorage.getItem(SIDEBAR_KEY) === "collapsed");
    } catch {}
  }, []);
  const toggleSidebar = useCallback(() => {
    const next = !collapsed;
    if (autoCollapse) {
      setOverride(next); // only for this visit; keep the saved preference
      return;
    }
    setSaved(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
    } catch {}
  }, [collapsed, autoCollapse]);
  // Ctrl/Cmd + B toggles the sidebar (desktop), or opens/closes the drawer (mobile).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) toggleSidebar();
        else setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
  const title = t(titleFor(pathname));

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside
        className={cn(
          "relative z-30 hidden shrink-0 border-r border-border bg-surface transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-[260px] overflow-hidden",
        )}
      >
        <div className={cn("h-full", collapsed ? "w-[72px] overflow-visible" : "w-[260px] overflow-x-hidden overflow-y-auto")}>
          <SidebarContent collapsed={collapsed} />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#1c1917]/30 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-border bg-surface shadow-lg animate-fade-up">
            <button
              aria-label={t("Close menu")}
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label={t("Open menu")}
              onClick={() => setOpen(true)}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>
            <button
              onClick={toggleSidebar}
              aria-label={collapsed ? t("Show sidebar") : t("Hide sidebar")}
              aria-pressed={!collapsed}
              title={`${collapsed ? t("Show sidebar") : t("Hide sidebar")} (Ctrl + B)`}
              className="hidden size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text lg:grid"
            >
              {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            </button>
            <span className="mx-1 hidden h-5 w-px bg-border lg:block" />
            <Link href="/dashboard" className="lg:hidden">
              <Logo withText={false} />
            </Link>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-subtle">{t("Studio")}</span>
              <ChevronRight className="size-3.5 text-subtle" />
              <span className="font-semibold">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link href="/courses/new" className="hidden sm:block">
              <Button variant="outline" size="sm">
                <PlusCircle className="size-3.5" /> {t("New course")}
              </Button>
            </Link>
            {profile ? <Avatar name={profile.name} color={profile.color} size={32} /> : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <IdentityGate />
    </div>
  );
}
