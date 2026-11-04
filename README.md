# Vector Academy

AI course studio for tutors, built with Next.js 16 and Google Gemini (`gemini-3.8-flash` by default).

## Features
- **Landing page** at `/`. The studio app lives at `/dashboard`, `/chat`, `/courses` and `/groups`.
- **AI Assistant**: a streaming chat. Ask it to build a course on any subject, then slides, an MCQ quiz or assignments. It uses tools to generate and save the material. Conversations are saved.
- **Course builder**: a guided form with live progress. It produces objectives, modules, full lesson notes, takeaways, activities, a glossary and resources.
- **Slides**: an in-browser deck viewer with a fullscreen present mode, speaker notes and **PowerPoint (.pptx)** export.
- **MCQ quiz**: an interactive practice mode with scoring, an answer key with explanations, and student and answer-key exports.
- **Assignments**: instructions, deliverables and weighted rubrics.
- **Downloads**: PDF and Word (.docx) for the full course book, quizzes, assignments and slide handouts.
- **Group chat**: realtime (SSE) tutor groups. You can share courses into a group, mention `@ai` to get a reply from Gemini, and see typing indicators.
- A white theme by default (dark theme optional), a responsive layout and a local tutor profile. Fonts: Plus Jakarta Sans for body text, Bricolage Grotesque for headings, JetBrains Mono for code.

## Setup
```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```
Production: `npm run build && npm start`.

## Gemini setup
- Set `GEMINI_API_KEY` in `.env.local` (get a key at https://aistudio.google.com/apikey). Restart the server after changing it.
- `GEMINI_MODEL` changes the main model.
- If a model is busy, rate limited or stalls, the app automatically tries the next one: gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash, gemini-flash-latest, gemini-3.5-flash-lite.

## Notes
- Data is stored in `data/db.json`, a single-instance JSON store. Realtime chat uses an in-process event bus. To run several instances, swap in Postgres plus Redis pub/sub (`src/lib/db.ts`, `src/lib/bus.ts`).
- Identity is a local profile with no passwords. Add real auth (for example Auth.js) before you deploy publicly.
- PDF export uses the standard PDF fonts, which cover only Latin script. For courses in non-Latin languages, use Word export.

## Structure
```
src/app            page.tsx = landing, (app)/ = studio pages, api/ = API routes (chat, courses, generate, groups, SSE stream)
src/lib            Gemini client, generators (structured outputs), chat tools, DB, exporters
src/components     UI kit, shell, chat, course tabs (slides/quiz/assignments)
```
