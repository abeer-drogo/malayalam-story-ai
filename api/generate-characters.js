import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { bookId } = req.body;

  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
  if (!book) return res.status(404).json({ error: "Book not found" });

  const prompt = `
Based on this Malayalam story premise:
"${book.premise}"

Generate a list of 4-6 characters with:
- Name
- Nickname (if any)
- Role (e.g. Protagonist, Friend, Villain)
- One-line relationships with others (e.g. Hari is Rekha's brother)

Respond in this JSON format:
[
  { "name": "", "nickname": "", "role": "", "connections": ["", ""] },
  ...
]
Output in JSON only.
`;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  const json = JSON.parse(await result.response.text());

  const inserts = json.map((char) => ({
    ...char,
    book_id: bookId,
    connections: char.connections || [],
  }));

  await supabase.from("characters").insert(inserts);
  res.status(200).json({ characters: inserts });
}
