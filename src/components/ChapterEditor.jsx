import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ChapterEditor({ partId }) {
  const [chapter, setChapter] = useState(null);
  const [edited, setEdited] = useState("");

  useEffect(() => {
    fetchChapter();
  }, [partId]);

  async function fetchChapter() {
    const { data } = await supabase.from("chapters").select("*").eq("id", partId).single();
    setChapter(data);
    setEdited(data?.edited_content || data?.content || "");
  }

  async function saveEdit() {
    await supabase.from("chapters").update({ edited_content: edited }).eq("id", partId);
    alert("✅ Saved!");
  }

  if (!chapter) return <p>Loading…</p>;

  return (
    <div className="p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">✍️ Part {chapter.part_number} – Editor</h2>
      <textarea
        className="w-full h-96 border p-3 rounded font-mono leading-relaxed"
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
      />
      <button
        onClick={saveEdit}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        💾 Save
      </button>
    </div>
  );
}
