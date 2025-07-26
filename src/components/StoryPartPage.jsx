// components/StoryPartPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import StoryPartEditor from "./StoryPartEditor";

export default function StoryPartPage() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);

  useEffect(() => {
    async function fetchBook() {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

      if (!error) setBook(data);
      else console.error("❌ Failed to load book metadata", error);
    }

    fetchBook();
  }, [bookId]);

  if (!book) return <div className="p-6">📚 Loading book data…</div>;

  return <StoryPartEditor book={book} />;
}
