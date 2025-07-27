import { useEffect, useState } from "react";
import { supabase } from "/src/supabaseClient.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function generateWithGemini(prompt) {
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.9,
        topK: 40,
      },
    }),
  });

  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Gemini API Error";
}

export default function StoryPartEditor({ totalParts = 50, book }) {
  const [parts, setParts] = useState([]);
  const [activeRange, setActiveRange] = useState([0, 5]);
  const [loadingParts, setLoadingParts] = useState({});
  const [generationProgress, setGenerationProgress] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);

  const savePart = async (part) => {
    const record = {
      book_id: book.id,
      part_number: part.part_number,
      summary: part.summary,
      content: part.content,
      created_at: new Date().toISOString(),
    };
  
    if (part.id) {
      record.id = part.id;
    }
  
    const { data, error } = await supabase
      .from("story_parts")
      .upsert([record], {
        onConflict: ["book_id", "part_number"],
      })
      .select();
  
    if (error) {
      console.error("❌ Supabase save error:", error);
    } else if (data?.[0]) {
      setParts((prev) =>
        prev.map((p) =>
          p.part_number === part.part_number
            ? { ...p, id: data[0].id, saved: true }
            : p
        )
      );
    }
  };
  
  useEffect(() => {
    if (!book?.id) return;
    const loadSavedParts = async () => {
      const { data, error } = await supabase
        .from("story_parts")
        .select("*")
        .eq("book_id", book.id)
        .order("part_number");

      if (error) {
        console.error("❌ Supabase load error:", error);
        return;
      }

      const loadedParts = Array.from({ length: totalParts }, (_, i) => {
        const found = data.find((p) => p.part_number === i + 1);
        return found
          ? { ...found, editing: false }
          : {
              id: undefined,
              part_number: i + 1,
              summary: "",
              content: "",
              editing: false,
              saved: false,
            };
      });

      setParts(loadedParts);
    };

    loadSavedParts();
  }, [book?.id, totalParts]);

  useEffect(() => {
    if (parts.length > 0 && book && initialLoading) {
      generateInitialSummaries(book);
    }
  }, [parts.length, activeRange, book, initialLoading]);

  const clearAllSummaries = async () => {
    const { error } = await supabase
      .from("story_parts")
      .update({ summary: "" })
      .eq("book_id", book.id);
  
    if (error) {
      console.error("❌ Failed to clear summaries:", error.message);
    } else {
      console.log("✅ All summaries cleared.");
  
      // Clear local state and regenerate
      const refreshed = parts.map((p) => ({
        ...p,
        summary: "",
        saved: false,
      }));
  
      setParts(refreshed);
      setInitialLoading(true); // ⏳ show spinner
    }
  };

  const generateInitialSummaries = async (book) => {
    const updated = [...parts];

    try {
      for (let i = activeRange[0]; i < activeRange[1]; i++) {
        if (!updated[i]?.summary) {
          const prompt = `
          Generate a concise summary (maximum 200 words) of part ${i + 1} from a commercial fiction series in Malayalam.

          Story Context:
          - Premise: ${book.prompt}
          - Genres: ${book.genres?.join(", ") || "Not specified"}
          - Setting: ${book.setting || "Not specified"}
          - Theme: ${book.theme || "Not specified"}
          - Point of View: ${book.pov || "Not specified"}
          - Dialogue Style: ${book.dialogue_style || "Not specified"}

          Instructions:
          Language & Tone: Use informal, natural, and conversational Malayalam. Maintain the same accessible and engaging tone as the story parts themselves.
          Conciseness: Be direct and to the point. Focus on the most crucial plot developments, character actions, key events and significant emotional shifts.
          Clarity: Ensure the summary is easy to understand, even for someone who hasn't read the full part. Avoid ambiguity.
          Conflict: The summary should contain a key conflict which drives the part towards the end.
          Key Information: Include:
            - Main events that occurred.
            - Major character decisions or revelations.
            - The outcome or cliffhanger at the end of the part.
          No Spoilers for Future Parts: Only summarize what happened within the specified part.
          No Dialogue: The summary should be purely narrative, without direct dialogue quotes.
          No Personal Opinions: Stick to objective summarization of the plot.
          Only return the summary — no explanations or formatting.
          `.trim();

          const summary = await generateWithGemini(prompt);
          updated[i].summary = summary;
          await savePart(updated[i]);
        }
      }

      setParts(updated);
    } catch (err) {
      console.error("❌ Summary generation error:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleEdit = (index) => {
    const updated = [...parts];
    updated[index].editing = !updated[index].editing;
    setParts(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = value;
    setParts(updated);
  };

  async function generateStory(index) {
    const updated = [...parts];
    const summary = updated[index].summary;
    let fullStoryAccumulated = "";
    let currentWordCount = 0;
    const targetWordCount = 1100;
    const chunkSize = 400;

    setLoadingParts((prev) => ({ ...prev, [index]: true }));
    setGenerationProgress((prev) => ({ ...prev, [index]: { done: 0, total: Math.ceil(targetWordCount / chunkSize) } }));

    while (currentWordCount < targetWordCount) {
      const prompt = `
      Generate a detailed and fully fleshed-out story part for a commercial fiction series in Malayalam.
      The overall story part ${index + 1} is based on the following summary: "${summary}"

      Key Requirements:

         - Language & Tone: Use informal, natural, and conversational Malayalam. Avoid overly formal or classic literary language. Aim for a style accessible to a general audience who enjoy commercial fiction.
         - Narrative Style:
            - Emotional Depth: Include rich emotional narration, allowing the reader to deeply connect with the characters' feelings, thoughts, and internal conflicts.
            - Character Interaction: Prioritize high use of dialogue that feels authentic and natural. Show character relationships and development through their conversations.
            - Pacing: Maintain a good pace, balancing descriptive passages with action and dialogue.
            - Climax/Cliffhanger: The part must end on a cliffhanger to entice the reader for the next installment.
            - No Summarizing: Do not summarize events; describe them as they happen.

          - Content:
            - Beginning & End: Must begin and end with dialogue.
            - Originality: Do not plagiarize.
            - Context: Ensure the story flows logically from previous parts 

      Current story so far:
      "${fullStoryAccumulated}"

      Continue the story. Generate approximately ${chunkSize} words.
      `.trim();

      try {
        const newStorySegment = await generateWithGemini(prompt);
        fullStoryAccumulated += (fullStoryAccumulated ? "\n\n" : "") + newStorySegment;
        currentWordCount = fullStoryAccumulated.split(/\s+/).length;
        setGenerationProgress((prev) => ({
          ...prev,
          [index]: {
            ...prev[index],
            done: prev[index].done + 1,
          },
        }));
        await new Promise((res) => setTimeout(res, 500));
      } catch (err) {
        console.error(`❌ Story generation failed:`, err);
        break;
      }
    }

    updated[index].content = fullStoryAccumulated;
    updated[index].saved = false;
    setParts(updated);
    setLoadingParts((prev) => ({ ...prev, [index]: false }));
  }

  const visibleParts = parts.slice(activeRange[0], activeRange[1]);
  const handleNext = () => {
    if (activeRange[1] < totalParts) {
      setActiveRange(([start, end]) => [end, Math.min(end + 5, totalParts)]);
    }
  };
  const handlePrev = () => {
    if (activeRange[0] > 0) {
      setActiveRange(([start, end]) => [Math.max(0, start - 5), start]);
    }
  };

  return (
    <div className="relative">
      {initialLoading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-700 text-lg font-semibold">Generating summaries...</p>
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="text-lg font-semibold mb-2">
            Showing parts {activeRange[0] + 1} to {activeRange[1]}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => clearAllSummaries(book.id)}
            className="text-sm text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-100"
          >
            🔄 Reset All Summaries
          </button>
        </div>

        {visibleParts.map((part, index) => {
          const realIndex = activeRange[0] + index;

          return (
            <div key={realIndex} className="border p-6 rounded-xl bg-white shadow-sm mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Part {realIndex + 1}</h2>
                <span className="text-sm text-gray-500">
                  {part.saved ? "✅ Saved" : part.editing ? "📝 Editing…" : "📄 Ready"}
                </span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Summary (Malayalam)</label>
                {!part.editing ? (
                  <div className="bg-gray-50 p-3 rounded border text-gray-800 whitespace-pre-wrap font-serif">
                    {part.summary}
                  </div>
                ) : (
                  <textarea
                    value={part.summary}
                    onChange={(e) => handleChange(realIndex, "summary", e.target.value)}
                    onBlur={() => savePart(parts[realIndex])}
                    className="w-full border px-3 py-2 rounded font-serif"
                    rows={4}
                  />
                )}
              </div>

              <div className="flex justify-end gap-4">
                {!part.editing ? (
                  <button
                    onClick={() => toggleEdit(realIndex)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ✏️ Edit
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      toggleEdit(realIndex);
                      savePart(parts[realIndex]);
                    }}
                    className="text-sm text-green-600 hover:underline"
                  >
                    💾 Save
                  </button>
                )}

                {loadingParts[realIndex] ? (
                  <div className="w-40">
                    <button
                      disabled
                      className="text-sm bg-indigo-400 text-white px-4 py-2 rounded w-full cursor-wait"
                    >
                      ⏳ Generating...
                    </button>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                        style={{
                          width: `${(generationProgress[realIndex]?.done / generationProgress[realIndex]?.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateStory(realIndex)}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    ✨ Develop
                  </button>
                )}
              </div>

              {part.content && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Full Story (Malayalam)</label>
                  <textarea
                    value={part.content}
                    onChange={(e) => handleChange(realIndex, "content", e.target.value)}
                    className="w-full border px-3 py-2 rounded font-serif whitespace-pre-wrap"
                    rows={10}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        savePart(parts[realIndex]);
                        handleChange(realIndex, "saved", true);
                      }}
                      disabled={part.saved}
                      className={`px-4 py-2 rounded text-white ${
                        part.saved ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {part.saved ? "✅ Saved" : "💾 Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrev}
            disabled={activeRange[0] === 0}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            ◀️ Previous
          </button>

          <button
            onClick={handleNext}
            disabled={activeRange[1] >= totalParts}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Next ▶️
          </button>

          <div className="mt-4 flex justify-center items-center gap-2">
            <label htmlFor="pageSelect" className="text-sm text-gray-600">
              Jump to:
            </label>
            <select
              id="pageSelect"
              value={activeRange[0]}
              onChange={(e) => {
                const start = parseInt(e.target.value);
                const end = Math.min(start + 5, totalParts);
                setActiveRange([start, end]);
              }}
              className="border px-2 py-1 rounded text-sm"
            >
              {Array.from({ length: Math.ceil(totalParts / 5) }).map((_, i) => {
                const start = i * 5 + 1;
                const end = Math.min(start + 4, totalParts);
                return (
                  <option key={i} value={i * 5}>
                    Parts {start} – {end}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
