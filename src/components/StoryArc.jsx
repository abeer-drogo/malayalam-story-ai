import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function StoryArc({ bookId, prompt }) {
  const [parts, setParts] = useState([]);
  const [numParts, setNumParts] = useState(5); // default
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    fetchArc();
  }, [bookId]);

  async function fetchArc() {
    const { data, error } = await supabase
      .from("story_arcs")
      .select("*")
      .eq("book_id", bookId)
      .order("part_number", { ascending: true });

    if (error) {
      console.error("Error fetching arc:", error);
    } else {
      setParts(data);
      setNumParts(data.length || 5);
    }
  }

  async function handleSetParts() {
    if (!bookId || !numParts || isNaN(numParts)) return;
    setSaving(true);

    try {
      // Clear existing arcs for fresh setup
      await supabase.from("story_arcs").delete().eq("book_id", bookId);

      // Create new part arcs with empty title/summary
      const newParts = Array.from({ length: numParts }, (_, i) => ({
        book_id: bookId,
        part_number: i + 1,
        title: "",
        summary: ""
      }));

      const { error } = await supabase.from("story_arcs").insert(newParts);
      if (error) {
        console.error("Insert error:", error);
      } else {
        await fetchArc();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="font-semibold">📚 Number of Parts</label>
        <input
          type="number"
          value={isNaN(numParts) ? "" : numParts}
          onChange={(e) => setNumParts(parseInt(e.target.value) || 0)}
          className="w-20 p-1 border rounded"
          min={1}
        />
        <button
          className="bg-indigo-600 text-white px-3 py-1 rounded"
          onClick={handleSetParts}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Parts"}
        </button>
      </div>
      
    </div>
  );
}
