import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function BooksDashboard({ userId }) {
  const [books, setBooks] = useState([]);
  const [newBookName, setNewBookName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    const { data: booksData, error } = await supabase
      .from("books")
      .select(`
        *,
        story_parts (
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && booksData) {
      const booksWithMeta = booksData.map((book) => {
        const partCount = book.story_parts.length;
        const lastUpdated = book.story_parts.reduce(
          (latest, part) =>
            new Date(part.created_at) > new Date(latest)
              ? part.created_at
              : latest,
          book.created_at
        );

        return {
          ...book,
          partCount,
          lastUpdated,
        };
      });

      setBooks(booksWithMeta);
    }
  }

  async function createBook() {
    const { data: user } = await supabase.auth.getUser();
    if (!newBookName || !user?.user?.id) return;

    let coverUrl = "";

    if (coverFile) {
      const fileExt = coverFile.name.split(".").pop();
      const filePath = `covers/${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(filePath, coverFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        const { data: publicUrl } = supabase.storage
          .from("book-covers")
          .getPublicUrl(filePath);
        coverUrl = publicUrl.publicUrl;
      }
    }

    await supabase.from("books").insert([
      {
        name: newBookName,
        user_id: user.user.id,
        cover_url: coverUrl,
      },
    ]);

    setNewBookName("");
    setCoverFile(null);
    fetchBooks();
  }

  async function handleDeleteBook(bookId) {
    const confirmed = window.confirm("Are you sure you want to delete this book?");
    if (!confirmed) return;

    const { error } = await supabase.from("books").delete().eq("id", bookId);

    if (error) {
      alert("❌ Failed to delete book");
      console.error(error);
    } else {
      fetchBooks();
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📚 Your Books</h1>

      <div className="flex flex-col sm:flex-row sm:items-center mb-6 space-y-2 sm:space-y-0 sm:space-x-4">
        <input
          type="text"
          placeholder="Enter book name"
          value={newBookName}
          onChange={(e) => setNewBookName(e.target.value)}
          className="border p-2 rounded w-full max-w-sm"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files[0])}
          className="w-full max-w-xs"
        />
        <button
          onClick={createBook}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Create New Book
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {books.map((book) => (
          <div
            key={book.id}
            className="relative bg-white rounded-xl shadow hover:shadow-md transition border border-gray-200"
          >
            <div onClick={() => navigate(`/book/${book.id}`)} className="cursor-pointer">
              <div className="h-40 rounded-t-xl overflow-hidden">
                {book.cover_url ? (
                  <img
                    src={`${book.cover_url}?t=${new Date().getTime()}`} // avoid cache
                    alt={book.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="bg-yellow-100 w-full h-full flex items-center justify-center text-6xl">
                    📁
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 truncate">
                  {book.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  🧩 {book.partCount} parts
                </p>
                <p className="text-sm text-gray-400">
                  🕒 {new Date(book.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Delete button */}
            <button
              className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded hover:bg-red-200"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBook(book.id);
              }}
            >
              🗑 Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
