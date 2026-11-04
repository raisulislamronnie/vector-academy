import "server-only";
import { friendlyError } from "./errors";
import { addGroupMessage, listGroupMessages } from "./db";
import { bus, groupChannel } from "./bus";
import { geminiText } from "./gemini";
import type { Group } from "./schemas";

export const AI_AUTHOR = { id: "vector-ai", name: "Vector AI", color: "#ea580c" };

const SYSTEM = `You are Vector AI, a helpful teaching assistant participating in a group chat of tutors on Vector Academy.
Someone mentioned you (@ai or @vector). Reply to the latest mention in context of the conversation.
Keep it conversational and concise (usually under 150 words), use Markdown sparingly. You can suggest lesson ideas, explain concepts, draft quick questions, or give teaching tips.
If someone wants a full course, slides, quiz or assignments, tell them to ask in the AI Assistant tab, or use Create Course.`;

/** Generates an AI reply to the group's recent conversation and broadcasts it. */
export async function replyInGroup(group: Group) {
  const channel = groupChannel(group.id);
  bus.emit(channel, { type: "typing", name: AI_AUTHOR.name, on: true });
  let text: string;
  try {
    const history = await listGroupMessages(group.id, 30);
    const transcript = history
      .map((m) =>
        m.kind === "share"
          ? `${m.authorName} shared the course "${m.courseTitle}"${m.text ? `: ${m.text}` : ""}`
          : `${m.authorName}: ${m.text}`,
      )
      .join("\n");
    const prompt = `Group: ${group.emoji} ${group.name} — ${group.description}\n\n<transcript>\n${transcript}\n</transcript>\n\nWrite your reply.`;
    text = (await geminiText(SYSTEM, prompt)) || "🤔";
  } catch (err) {
    console.error("[group-ai]", err);
    text = `⚠️ ${friendlyError(err)}`;
  }
  const msg = await addGroupMessage({
    groupId: group.id,
    authorId: AI_AUTHOR.id,
    authorName: AI_AUTHOR.name,
    authorColor: AI_AUTHOR.color,
    kind: "ai",
    text,
  });
  bus.emit(channel, { type: "typing", name: AI_AUTHOR.name, on: false });
  bus.emit(channel, { type: "message", message: msg });
}
