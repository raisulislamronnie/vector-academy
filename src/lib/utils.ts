export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const PALETTES = [
  { from: "#ea580c", to: "#f59e0b", soft: "#fff1e6" },
  { from: "#f97316", to: "#fb7185", soft: "#ffeee6" },
  { from: "#c2410c", to: "#f97316", soft: "#ffedd5" },
  { from: "#d97706", to: "#facc15", soft: "#fef6d8" },
  { from: "#ea580c", to: "#e11d48", soft: "#ffe9e6" },
  { from: "#b45309", to: "#f59e0b", soft: "#fdf1dc" },
  { from: "#fb923c", to: "#f43f5e", soft: "#fff0ea" },
  { from: "#9a3412", to: "#ea580c", soft: "#fde8dc" },
];

export function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function courseTheme(seed: string) {
  return PALETTES[hash(seed.toLowerCase()) % PALETTES.length];
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string, lang: "en" | "bn" = "en") {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const bn = lang === "bn";
  const n = (v: number) => (bn ? String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : String(v));
  if (s < 45) return bn ? "এইমাত্র" : "just now";
  if (s < 3600) return bn ? `${n(Math.round(s / 60))} মিনিট আগে` : `${Math.round(s / 60)}m ago`;
  if (s < 86400) return bn ? `${n(Math.round(s / 3600))} ঘণ্টা আগে` : `${Math.round(s / 3600)}h ago`;
  if (s < 604800) return bn ? `${n(Math.round(s / 86400))} দিন আগে` : `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(bn ? "bn-BD" : undefined, { month: "short", day: "numeric" });
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "export";
}

/** Reads an NDJSON response stream, invoking onEvent per line. */
export async function readNdjson<T = Record<string, unknown>>(res: Response, onEvent: (e: T) => void) {
  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as T);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as T);
}
