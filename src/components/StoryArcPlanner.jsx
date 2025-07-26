import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ChapterEditor from "./ChapterEditor";

const [activeEditor, setActiveEditor] = useState(null); // partId of currently edited chapter
const [selectedParts, setSelectedParts] = useState([]);
const [loadingPartIds, setLoadingPartIds] = useState([]);


export default function StoryArcPlanner({ bookId }) {
  const [parts, setParts] = useState([]);
  const [numParts, setNumParts] = useState(5);

  useEffect(() => {
    fetchParts();
  }, [bookId]);

  async function fetchParts() {
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("part_number");
    setParts(data || []);
  }

  async function generatePartSkeletons() {
    let newParts = [];
    for (let i = 1; i <= numParts; i++) {
      newParts.push({ part_number: i, summary: `Part ${i} summary`, book_id: bookId });
    }
    const { error } = await supabase.from("chapters").insert(newParts);
    if (!error) fetchParts();
  }

  async function updateSummary(id, summary) {
    await supabase.from("chapters").update({ summary }).eq("id", id);
    fetchParts();
  }

  async function generateSelectedParts() {
    setLoadingPartIds([...selectedParts]);
  
    for (const partId of selectedParts) {
      await fetch("/api/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, partId }),
      });
    }
  
    setLoadingPartIds([]);
    setSelectedParts([]);
    fetchParts(); // refresh summaries + content
  }  

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📈 Story Arc Planner</h2>

      {parts.length === 0 && (
        <div className="mb-4">
          <label className="block mb-1">Number of parts:</label>
          <input
            type="number"
            value={numParts}
            min={1}
            onChange={(e) => setNumParts(parseInt(e.target.value))}
            className="border p-2 rounded w-24 mr-2"
          />
          <button
            onClick={generatePartSkeletons}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ Generate Outline
          </button>
        </div>
      )}
        async function generateChapter(partId) {
        const response = await fetch("/api/generate-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId, partId }),
        });

        const data = await response.json();
        if (data.content) alert("✅ Chapter generated!");
        else alert("❌ Generation failed.");
        }

        {parts.map((part) => (
          <div key={part.id} className="mb-6 border p-4 rounded bg-white shadow">
            <label className="block font-semibold mb-1">Part {part.part_number}</label>
            <textarea
              className="w-full border p-2 rounded mb-2"
              value={part.summary}
              onChange={(e) => updateSummary(part.id, e.target.value)}
            />
          <input
            type="checkbox"
            checked={selectedParts.includes(part.id)}
            onChange={(e) => {
              setSelectedParts((prev) =>
                e.target.checked
                  ? [...prev, part.id]
                  : prev.filter((id) => id !== part.id)
              );
            }}
            className="mr-2"
          />
          
          <label className="font-semibold flex items-center space-x-2">
            <span>Part {part.part_number}</span>
            {loadingPartIds.includes(part.id) && (
              <svg
                className="animate-spin h-4 w-4 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
          </label>


            <label className="text-sm block">Personality</label>
            <select
              className="mb-2 p-2 border rounded w-full"
              value={part.personality || ""}
              onChange={async (e) => {
                await supabase.from("chapters").update({ personality: e.target.value }).eq("id", part.id);
                fetchParts(); // refresh UI
              }}
            >
              <option value="">Default</option>
              <option value="poetic">Poetic</option>
              <option value="sarcastic">Sarcastic</option>
              <option value="descriptive">Descriptive</option>
              <option value="fast-paced">Fast-paced</option>
              <option value="philosophical">Philosophical</option>
            </select>
            
            <button
              onClick={() => setSelectedParts(parts.map((p) => p.id))}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Select All
            </button>

            <button
              onClick={generateSelectedParts}
              disabled={selectedParts.length === 0}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              ⚡ Generate Selected ({selectedParts.length})
            </button>

            <button
              onClick={() => generateChapter(part.id)}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              🚀 Generate Chapter
            </button>

            <button
              onClick={() => setActiveEditor(part.id)}
              className="ml-2 bg-yellow-500 text-white px-4 py-2 rounded"
            >
              ✏️ Edit Chapter
            </button>

            {activeEditor === part.id && (
              <div className="mt-4">
                <ChapterEditor partId={part.id} />
              </div>
            )}
          </div>
        ))}

    </div>
  );
}
