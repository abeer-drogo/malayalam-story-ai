import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, partId } = req.body;

  // 🔍 Fetch book and chapter data
  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
  const { data: chapter } = await supabase.from("chapters").select("*").eq("id", partId).single();

  if (!book || !chapter) return res.status(404).json({ error: "Missing data" });

  // 🧠 Prompt to Gemini
  const prompt = `
Generate part ${chapter.part_number} of a Malayalam story.

Premise: ${book.premise}
Tone: ${book.tone || "Informal"}
POV: ${book.pov}
Theme: ${book.theme}
Dialogue Style: ${book.dialogue_style}
Setting: ${book.setting}
Part Summary: ${chapter.summary}
Writing Style: ${chapter.personality ? `Make it ${chapter.personality}` : "Default style"}

Rules:
- Output strictly in Malayalam
- 1000–1200 words
- Start and end with dialogue
- 60–70% should be spoken dialogue
- Use a cliffhanger ending
`;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  const content = await result.response.text();

  await supabase.from("chapters").update({ content }).eq("id", partId);

  res.status(200).json({ content });
}
