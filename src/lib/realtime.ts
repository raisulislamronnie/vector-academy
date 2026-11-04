import "server-only";
import { redis } from "./db";

/**
 * Ephemeral "who is typing" state for group chat. Stored in Redis (with a TTL)
 * when configured, otherwise in process memory. Clients poll it.
 */
export interface TypingEntry {
  userId: string;
  name: string;
}

const mem = new Map<string, Map<string, { name: string; until: number }>>();
const AI_TTL = 60;
const USER_TTL = 4;
const key = (groupId: string) => `vector-academy:typing:${groupId}`;

export async function setTyping(groupId: string, userId: string, name: string, on: boolean) {
  const ttl = userId === "vector-ai" ? AI_TTL : USER_TTL;
  const r = redis();
  if (r) {
    if (on) {
      await r.set(`${key(groupId)}:${userId}`, name, { ex: ttl });
    } else {
      await r.del(`${key(groupId)}:${userId}`);
    }
    return;
  }
  const m = mem.get(groupId) ?? new Map();
  mem.set(groupId, m);
  if (on) m.set(userId, { name, until: Date.now() + ttl * 1000 });
  else m.delete(userId);
}

export async function getTyping(groupId: string): Promise<TypingEntry[]> {
  const r = redis();
  if (r) {
    const prefix = `${key(groupId)}:`;
    const keys: string[] = [];
    let cursor: string | number = 0;
    do {
      const [next, batch]: [string | number, string[]] = await r.scan(cursor, { match: `${prefix}*`, count: 100 });
      cursor = next;
      keys.push(...batch);
    } while (String(cursor) !== "0");
    if (!keys.length) return [];
    const names = await r.mget<(string | null)[]>(...keys);
    return keys.flatMap((k, i) => (names[i] ? [{ userId: k.slice(prefix.length), name: names[i]! }] : []));
  }
  const m = mem.get(groupId);
  if (!m) return [];
  const now = Date.now();
  const out: TypingEntry[] = [];
  for (const [userId, v] of m) {
    if (v.until > now) out.push({ userId, name: v.name });
    else m.delete(userId);
  }
  return out;
}
