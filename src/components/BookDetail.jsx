import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import CharacterEditor from "./CharacterEditor";
import StoryArc from "./StoryArc";
import StoryPartEditor from "./StoryPartEditor";

export default function BookDetail() {
  const navigate = useNavigate(); 
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [savedFields, setSavedFields] = useState({
    prompt: false,
    setting: false,
    genres: false,
    pov: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  async function fetchBook() {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (!error) {
      setBook(data);
    } else {
      console.error("Error fetching book:", error);
    }
  }

  function handleChange(field, value) {
    setBook((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSavedFields((prev) => ({
      ...prev,
      [field]: false,
    }));
  }

  async function updateBookName() {
    const { error } = await supabase
      .from("books")
      .update({ name: book.name })
      .eq("id", bookId);

    if (error) {
      console.error("❌ Failed to update name:", error);
    } else {
      console.log("✅ Book name updated!");
    }
  }

  function handleGenreToggle(genre) {
    const currentGenres = book.genres || [];
    const updatedGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];

    setBook((prev) => ({
      ...prev,
      genres: updatedGenres,
    }));

    setSavedFields((prev) => ({
      ...prev,
      genres: false,
    }));
  }

  function handleSaveMetadata() {
    saveMetadata();
    setSavedFields({
      prompt: true,
      setting: true,
      genres: true,
      pov: true,
    });
  }

  async function saveMetadata() {
    const { error } = await supabase
      .from("books")
      .update({
        prompt: book.prompt,
        genres: book.genres,
        setting: book.setting,
        theme: book.theme,
        pov: book.pov,
        dialogue_style: book.dialogue_style,
      })
      .eq("id", bookId);

    if (error) {
      console.error("❌ Failed to save metadata:", error);
    } else {
      console.log("✅ Saved metadata!");
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${book.id}-${Date.now()}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage
      .from("covers")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("covers")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("books")
      .update({ cover_url: publicUrl })
      .eq("id", book.id);

    if (updateError) {
      console.error("Failed to update cover URL:", updateError.message);
    } else {
      alert("✅ Cover updated!");
      fetchBook();
    }
  }

  async function generateCharacters() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Gemini API Key is missing.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${apiKey}`;
    const promptText = `Given the following Malayalam story prompt, list 3 characters with name, nickname, role, and who they are connected to. Output ONLY a JSON array of objects. Each object must have the following keys: 'name', 'nickname', 'role', and 'connections' (as an array of strings). Output must be valid JSON. No explanation or formatting.\n\nPrompt: "${book.prompt}"`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(`API call failed: ${response.status} - ${JSON.stringify(errorJson)}`);
      }

      setProgress(30);
      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("No text in Gemini response.");

      const match = rawText.match(/\[\s*{[\s\S]*?}\s*]/);
      if (!match) throw new Error("Response does not contain valid JSON array.");
      const characterData = JSON.parse(match[0]);

      await supabase.from("characters").delete().eq("book_id", bookId);

      let inserted = 0;
      for (const char of characterData) {
        await supabase.from("characters").insert({
          book_id: bookId,
          name: char.name,
          nickname: char.nickname,
          role: char.role,
          connections: char.connections,
        });
        inserted++;
        setProgress(30 + (inserted * 20));
      }

      console.log("✅ Characters added!");
      setProgress(100);
      fetchBook();
    } catch (err) {
      console.error("❌ Character generation error:", err.message);
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  }

  if (!book) return <div className="p-6">📖 Loading book...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        📖
        <input
          type="text"
          value={book.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="border-b border-gray-300 px-2 py-1 text-xl w-full"
        />
        <button
          onClick={() => updateBookName()}
          className="border text-white text-sm px-2 py-1 rounded bg-blue-600 hover:bg-blue-700"
        >
          💾
        </button>
      </h1>

      <section className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">🖼 Change Book Cover</h2>
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt="Book Cover"
            className="w-48 h-48 object-cover rounded border"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="mt-2"
        />
      </section>

      <section className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">📌 Prompt / Idea</h2>
        <textarea
          value={book.prompt || ""}
          onChange={(e) => handleChange("prompt", e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={4}
        />
        {savedFields.prompt && <p className="text-green-600 text-sm">✅ Saved</p>}
      </section>

      <section className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">🎭 Genres</h2>
        <div className="flex flex-wrap gap-4">
          {["Romance", "Thriller", "Sci-Fi", "Fantasy", "Mystery", "Family", "Horror", "Drama"].map((genre) => (
            <label key={genre} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(book.genres || []).includes(genre)}
                onChange={() => handleGenreToggle(genre)}
              />
              {genre}
            </label>
          ))}
        </div>
        {savedFields.genres && <p className="text-green-600 text-sm">✅ Saved</p>}
      </section>

      <section className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">🌍 Setting / World</h2>
        <textarea
          value={book.setting || ""}
          onChange={(e) => handleChange("setting", e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={3}
        />
        {savedFields.setting && <p className="text-green-600 text-sm">✅ Saved</p>}
      </section>

      <section className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold">👁 Point of View (POV)</h2>
        <select
          value={book.pov || ""}
          onChange={(e) => handleChange("pov", e.target.value)}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">-- Select POV --</option>
          <option value="First Person">First Person</option>
          <option value="Third Person Limited">Third Person Limited</option>
          <option value="Omniscient">Omniscient</option>
        </select>
        {savedFields.pov && <p className="text-green-600 text-sm">✅ Saved</p>}
      </section>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSaveMetadata}
          disabled={isGenerating}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          💾 Save Book Metadata
        </button>
        <button
          onClick={generateCharacters}
          disabled={isGenerating}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isGenerating ? "⚙️ Generating..." : "⚡ Generate Characters"}
        </button>
      </div>

      {isGenerating && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <CharacterEditor bookId={bookId} />

      <button
        onClick={() => navigate(`/book/${bookId}/story`)}
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        ✍️ Go to Story Parts
      </button>
    </div>
  );
}
