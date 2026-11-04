import "server-only";
import { randomUUID } from "crypto";
import type { ChatBlock, ChatMessage } from "./chat-types";
import { FinishReason, type Content, type FunctionCall, type Part } from "@google/genai";
import { GEMINI_TOOLS, TOOL_LABELS, runTool, type ToolName } from "./chat-tools";
import { saveConversation, type Conversation } from "./db";
import { GeminiBlockedError, attemptGuard, getGemini, withModelFallback } from "./gemini";
import type { Send } from "./ndjson";

/** Text-only rebuild of Gemini history from the display log (older conversations). */
function fromDisplayLog(messages: ChatMessage[]): Content[] {
  const out: Content[] = [];
  for (const m of messages) {
    const text =
      typeof m.content === "string"
        ? m.content
        : (m.content ?? [])
            .filter((b) => b.type === "text")
            .map((b) => (b.type === "text" ? b.text : ""))
            .join("\n");
    if (!text.trim()) continue;
    out.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }
  return out;
}

/**
 * Runs one chat turn on Gemini with function calling. The user message is
 * already appended to conversation.messages by the caller.
 */
export async function runGeminiChat(opts: {
  conversation: Conversation;
  message: string;
  system: string;
  author: string;
  send: Send;
  signal: AbortSignal;
  maxSteps: number;
}) {
  const { conversation, send, signal } = opts;
  if (!conversation.gemini) {
    conversation.gemini = fromDisplayLog(conversation.messages.slice(0, -1));
  }
  conversation.gemini.push({ role: "user", parts: [{ text: opts.message }] });

  for (let step = 0; step < opts.maxSteps; step++) {
    // If a model fails mid-reply, the client drops this step's partial output and we retry on the next model.
    send({ type: "step_start" });
    const history = conversation.gemini;
    const { parts, calls, text, finish } = await withModelFallback(
      async (model) => {
        const guard = attemptGuard(signal, 40000);
        try {
          // Keep every part (incl. thought signatures) for replay; build the display log alongside.
          const parts: Part[] = [];
          const calls: (FunctionCall & { id: string; hadId: boolean })[] = [];
          let text = "";
          let textStarted = false;
          let finish: FinishReason | undefined;
          const stream = await getGemini().models.generateContentStream({
            model,
            contents: history,
            config: {
              systemInstruction: opts.system,
              tools: GEMINI_TOOLS,
              maxOutputTokens: 32000,
              thinkingConfig: { includeThoughts: true },
              abortSignal: guard.signal,
            },
          });

          for await (const chunk of stream) {
            guard.alive();
            const cand = chunk.candidates?.[0];
            if (cand?.finishReason) finish = cand.finishReason;
            for (const part of cand?.content?.parts ?? []) {
              const prev = parts[parts.length - 1];
              if (part.thought && part.text) {
                send({ type: "thinking", text: part.text });
              } else if (part.text) {
                if (!textStarted) {
                  send({ type: "text_start" });
                  textStarted = true;
                }
                send({ type: "text", text: part.text });
                text += part.text;
              }
              if (part.functionCall) {
                calls.push({
                  ...part.functionCall,
                  id: part.functionCall.id ?? `gcall_${randomUUID()}`,
                  hadId: !!part.functionCall.id,
                });
              }
              // Merge plain streamed text fragments; keep anything carrying a signature or a call intact.
              if (
                prev &&
                part.text !== undefined &&
                prev.text !== undefined &&
                !part.thoughtSignature &&
                !prev.thoughtSignature &&
                !!part.thought === !!prev.thought &&
                !part.functionCall &&
                !prev.functionCall
              ) {
                prev.text += part.text;
              } else {
                parts.push({ ...part });
              }
            }
          }
          return { parts, calls, text, finish };
        } catch (err) {
          throw guard.wrap(err);
        } finally {
          guard.done();
        }
      },
      () => send({ type: "retry" }),
    );

    if (parts.length) conversation.gemini.push({ role: "model", parts });
    const display: ChatBlock[] = [];
    if (text) display.push({ type: "text", text });
    for (const c of calls) display.push({ type: "tool_use", id: c.id, name: c.name ?? "", input: c.args ?? {} });
    if (display.length) conversation.messages.push({ role: "assistant", content: display });
    await saveConversation(conversation);

    if (finish === FinishReason.MAX_TOKENS) {
      if (calls.length) send({ type: "notice", text: "The response was cut off before a tool could run. Please retry." });
      return;
    }
    if (finish && finish !== FinishReason.STOP && !calls.length && !text) {
      throw new GeminiBlockedError("Vector couldn't help with that request. Try rephrasing it.");
    }
    if (!calls.length) return;

    const results = await Promise.all(
      calls.map(async (c) => {
        const name = c.name ?? "";
        send({ type: "tool_start", id: c.id, name, label: TOOL_LABELS[name as ToolName] ?? name, input: c.args ?? {} });
        const outcome = await runTool(
          name,
          c.args ?? {},
          opts.author,
          (p) => send({ type: "tool_progress", id: c.id, chars: p.chars, label: p.label }),
          signal,
        );
        send({ type: "tool_end", id: c.id, name, ok: !outcome.isError, content: outcome.content });
        return { call: c, name, outcome };
      }),
    );

    conversation.gemini.push({
      role: "user",
      parts: results.map(({ call, name, outcome }) => {
        let payload: unknown = outcome.content;
        try {
          payload = JSON.parse(outcome.content);
        } catch {}
        return {
          functionResponse: {
            ...(call.hadId ? { id: call.id } : {}),
            name,
            response: outcome.isError ? { error: outcome.content } : { output: payload },
          },
        };
      }),
    });
    conversation.messages.push({
      role: "user",
      content: results.map(({ call, outcome }) => ({
        type: "tool_result" as const,
        tool_use_id: call.id,
        content: outcome.content,
        is_error: outcome.isError,
      })),
    });
    await saveConversation(conversation);
  }
}

/** After an interrupted turn, answer any unanswered function calls so history stays valid. */
export function repairGeminiHistory(conv: Conversation) {
  const last = conv.gemini?.[conv.gemini.length - 1];
  if (!last || last.role !== "model") return;
  const pending = (last.parts ?? []).filter((p) => p.functionCall);
  if (!pending.length) return;
  conv.gemini!.push({
    role: "user",
    parts: pending.map((p) => ({
      functionResponse: {
        ...(p.functionCall!.id ? { id: p.functionCall!.id } : {}),
        name: p.functionCall!.name ?? "",
        response: { error: "Tool run was interrupted" },
      },
    })),
  });
}
