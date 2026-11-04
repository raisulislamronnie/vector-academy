import "server-only";
import { EventEmitter } from "events";

/** Process-wide pub/sub for realtime group chat (single server instance). */
const g = globalThis as unknown as { __vaBus?: EventEmitter };
export const bus: EventEmitter = g.__vaBus ?? (g.__vaBus = new EventEmitter());
bus.setMaxListeners(1000);

export const groupChannel = (groupId: string) => `group:${groupId}`;
