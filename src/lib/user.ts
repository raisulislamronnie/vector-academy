"use client";
import { useSyncExternalStore } from "react";
import type { User } from "./schemas";

export interface Profile extends User {
  subject: string;
}

const KEY = "va.profile";
const listeners = new Set<() => void>();
let cached: Profile | null | undefined;

function read(): Profile | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function saveProfile(p: Profile) {
  cached = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
  listeners.forEach((l) => l());
}

export function clearProfile() {
  cached = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** undefined while hydrating on the server, null when no profile yet. */
export function useProfile(): Profile | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export const AVATAR_COLORS = ["#ea580c", "#0ea5a4", "#f97316", "#2563eb", "#db2777", "#16a34a", "#ca8a04", "#7c3aed"];

export function toUser(p: Profile): User {
  return { id: p.id, name: p.name, color: p.color };
}
