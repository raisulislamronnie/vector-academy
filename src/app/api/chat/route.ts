import type { ChatBlock } from "@/lib/chat-types";
import { z } from "zod";
import { friendlyError } from "@/lib/errors";
import { getConversation, newId, saveConversation, type Conversation } from "@/lib/db";
import { ndjsonResponse } from "@/lib/ndjson";
import { UserSchema } from "@/lib/schemas";
import { repairGeminiHistory, runGeminiChat } from "@/lib/gemini-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SYSTEM = `You are Vector, the AI teaching assistant inside Vector Academy — a studio where tutors make teaching material.

You help tutors with ANY subject and level: courses, slide decks, MCQ quizzes, assignments, rubrics, explanations and feedback.

Pick the tool that matches EXACTLY what the tutor asked for. Never create things they didn't ask for.
- Slides / presentation / deck: create_slides. Do NOT create a course first.
- Quiz / MCQs / test questions: create_quiz. Do NOT create a course first.
- Assignments / homework / project brief: create_assignments. Do NOT create a course first.
- A course, unit, curriculum or syllabus: create_course. Only then, if they also asked for slides/quiz/assignments for that course, use generate_slides / generate_quiz / generate_assignments with the new courseId.
- Material for a course that already exists ("my course", "that course", a courseId): generate_slides / generate_quiz / generate_assignments. Use list_courses if you need the courseId.
Fill topic, audience (grade) and language from the tutor's message; use sensible defaults instead of asking, unless the topic itself is missing.

If a tool returns an error, say plainly that it failed and why, and offer to try again. Never claim something was created when the tool failed.
After a tool succeeds, give a short, warm summary (a few lines) and suggest one next step. The chat already shows the slides/quiz/assignments with download buttons (PDF, Word, PowerPoint), so don't paste the content back.
For quick asks (explain a concept, a couple of questions inline, feedback on a lesson idea) answer directly in Markdown without tools.
Be concise, practical and encouraging.`;

const BodySchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1).max(20000),
  user: UserSchema,
  lang: z.enum(["en", "bn"]).optional(),
});

const MAX_STEPS = 8;

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { message, user, lang } = parsed.data;

  let conv: Conversation | null = parsed.data.conversationId
    ? await getConversation(parsed.data.conversationId)
    : null;
  if (conv && conv.ownerId !== user.id) return Response.json({ error: "Not found" }, { status: 404 });
  if (!conv) {
    const now = new Date().toISOString();
    conv = {
      id: newId(),
      title: message.replace(/\s+/g, " ").slice(0, 60),
      ownerId: user.id,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  const conversation = conv;

  return ndjsonResponse(request, async (send, signal) => {
    send({ type: "conversation", id: conversation.id, title: conversation.title });
    conversation.messages.push({ role: "user", content: message });
    await saveConversation(conversation);

    try {
      await runGeminiChat({ conversation, message, system: lang === "bn" ? `${SYSTEM}\n\nThe tutor is using the Bangla interface. Reply in Bangla (বাংলা) unless they write in another language or ask otherwise. When you create a course, slides, quiz or assignment, set its language to Bangla unless they ask for English.` : SYSTEM, author: user.name, send, signal, maxSteps: MAX_STEPS });
      send({ type: "done" });
    } catch (err) {
      repairGeminiHistory(conversation);
      await repairDanglingToolUse(conversation);
      if (signal.aborted) return;
      console.error("[chat]", err);
      send({ type: "error", message: friendlyError(err) });
    }
  });
}

/** Keep history valid: every tool_use must be answered before the next user turn. */
async function repairDanglingToolUse(conv: Conversation) {
  const last = conv.messages[conv.messages.length - 1];
  if (!last || last.role !== "assistant" || typeof last.content === "string") return;
  const pending = last.content.filter((b): b is Extract<ChatBlock, { type: "tool_use" }> => b.type === "tool_use");
  if (!pending.length) return;
  conv.messages.push({
    role: "user",
    content: pending.map((tu) => ({
      type: "tool_result" as const,
      tool_use_id: tu.id,
      content: "ERROR: tool run was interrupted",
      is_error: true,
    })),
  });
  await saveConversation(conv);
}
