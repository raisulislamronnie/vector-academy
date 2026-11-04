import "server-only";
import { ApiError, FinishReason, GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";

/** Gemini model; override with GEMINI_MODEL in .env.local. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/** Tried in order when a model is overloaded or rate limited. */
export const GEMINI_MODELS = [
  ...new Set([
    GEMINI_MODEL,
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
  ]),
];

/** No first chunk within the deadline: treat the model as stalled and move on. */
export class StallError extends Error {}

function isTransient(err: unknown) {
  return err instanceof StallError || (err instanceof ApiError && [404, 429, 500, 503, 504].includes(err.status));
}

/**
 * Abort signal for one attempt: follows the caller's signal, and also aborts
 * after `ms` without a chunk (idle timeout). Call `done()` when the attempt ends.
 */
export function attemptGuard(user: AbortSignal | undefined, ms = 60000) {
  const ac = new AbortController();
  let stalled = false;
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      ac.abort();
    }, ms);
  };
  arm();
  const signal = user ? AbortSignal.any([user, ac.signal]) : ac.signal;
  return {
    signal,
    /** Call on every chunk; the attempt is abandoned after `ms` of silence. */
    alive: arm,
    done: () => clearTimeout(timer),
    /** Maps `err` to StallError when the guard (not the user) aborted. */
    wrap(err: unknown): unknown {
      return stalled && !user?.aborted ? new StallError("Model stopped responding") : err;
    },
  };
}

/**
 * Runs `attempt` on each model in GEMINI_MODELS until one succeeds, going
 * through the list `rounds` times. Falls through only on transient errors
 * (busy, rate limited, stalled); `onRetry` runs before the next attempt.
 */
export async function withModelFallback<T>(
  attempt: (model: string) => Promise<T>,
  onRetry?: (model: string) => void,
  rounds = 2,
): Promise<T> {
  let lastErr: unknown;
  for (let round = 0; round < rounds; round++) {
    if (round > 0) await new Promise((r) => setTimeout(r, 2500));
    for (const model of GEMINI_MODELS) {
      try {
        return await attempt(model);
      } catch (err) {
        lastErr = err;
        if (!isTransient(err)) throw err;
        console.warn(
          `[gemini] ${model} unavailable (${err instanceof ApiError ? err.status : "no response"}), trying next model`,
        );
        onRetry?.(model);
      }
    }
  }
  throw lastErr;
}

let client: GoogleGenAI | null = null;
export function getGemini(): GoogleGenAI {
  if (!client)
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      // Fail fast on a busy model so withModelFallback can move to the next one.
      httpOptions: { retryOptions: { attempts: 2, initialDelay: 1 } },
    });
  return client;
}

export class GeminiBlockedError extends Error {}

/** Throws a clear error for finish reasons that mean the output is unusable. */
export function checkFinish(reason: FinishReason | undefined) {
  if (reason === FinishReason.MAX_TOKENS) {
    throw new Error("The output was too long and got cut off. Try fewer modules or a lighter depth.");
  }
  if (
    reason === FinishReason.SAFETY ||
    reason === FinishReason.PROHIBITED_CONTENT ||
    reason === FinishReason.BLOCKLIST ||
    reason === FinishReason.SPII ||
    reason === FinishReason.RECITATION
  ) {
    throw new GeminiBlockedError("The AI declined to generate this material. Try rephrasing the subject or focus.");
  }
}

export function jsonSchemaOf(schema: z.ZodType, io: "input" | "output" = "output") {
  const json = z.toJSONSchema(schema, { io }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Streams a JSON-schema-constrained response; returns the validated object. */
export async function geminiStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  onText?: (fullText: string) => void;
  signal?: AbortSignal;
}): Promise<z.infer<S>> {
  const { text, finish } = await withModelFallback(async (model) => {
    const guard = attemptGuard(opts.signal, 90000);
    try {
      const stream = await getGemini().models.generateContentStream({
        model,
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchemaOf(opts.schema),
          maxOutputTokens: 65536,
          abortSignal: guard.signal,
        },
      });
      let text = "";
      let finish: FinishReason | undefined;
      for await (const chunk of stream) {
        guard.alive();
        const cand = chunk.candidates?.[0];
        for (const part of cand?.content?.parts ?? []) {
          if (part.text && !part.thought) text += part.text;
        }
        if (cand?.finishReason) finish = cand.finishReason;
        opts.onText?.(text);
      }
      return { text, finish };
    } catch (err) {
      throw guard.wrap(err);
    } finally {
      guard.done();
    }
  });
  checkFinish(finish);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The AI returned malformed output. Please retry.");
  }
  const parsed = opts.schema.safeParse(raw);
  if (!parsed.success) throw new Error("The AI's output did not match the expected format. Please retry.");
  return parsed.data;
}

/** Single non-streaming text reply. */
export async function geminiText(system: string, prompt: string): Promise<string> {
  const res = await withModelFallback((model) =>
    getGemini().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: system, maxOutputTokens: 4000 },
    }),
  );
  checkFinish(res.candidates?.[0]?.finishReason);
  return (res.text ?? "").trim();
}

export type GeminiContent = Content;
