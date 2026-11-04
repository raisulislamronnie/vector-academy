import "server-only";
import { ApiError } from "@google/genai";
import { GeminiBlockedError } from "./gemini";

/** Turns any AI/backend error into a short message safe to show tutors. */
export function friendlyError(err: unknown): string {
  if (err instanceof GeminiBlockedError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message))
      return "AI API key is invalid. Check GEMINI_API_KEY in .env.local and restart the server.";
    if (err.status === 401 || err.status === 403) return "AI API key is missing or not allowed to use this model.";
    if (err.status === 404) return "AI model not found. Check GEMINI_MODEL in .env.local.";
    if (err.status === 429) return "AI rate limit or quota reached. Wait a moment and retry.";
    if (err.status >= 500) return "The AI service is temporarily unavailable. Please retry.";
    return `AI request failed (${err.status}). Please retry.`;
  }
  if (err instanceof Error && /api key|apiKey/i.test(err.message))
    return "AI API key is missing. Set GEMINI_API_KEY in .env.local and restart the server.";
  if (err instanceof TypeError && /fetch/i.test(err.message)) return "Could not reach the AI service. Check your network connection.";
  return err instanceof Error ? err.message : "Unexpected error";
}
