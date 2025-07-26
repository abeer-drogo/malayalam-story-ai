// src/components/Sidebar.jsx
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate(0); // reload to trigger login
  }

  const currentPath = location.pathname;
  const active = (path) =>
    currentPath.startsWith(path)
      ? "bg-blue-100 text-blue-800 font-semibold"
      : "text-gray-700 hover:text-blue-600";

  return (
    <aside className="w-64 h-screen fixed top-0 left-0 bg-white border-r shadow px-4 py-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-6">💡 വെളിച്ചം AI</h2>

        <nav className="space-y-2">
          <Link to="/" className={`block px-3 py-2 rounded ${active("/")}`}>
            📚 My Books
          </Link>

          {bookId && (
            <>
              <Link
                to={`/book/${bookId}`}
                className={`block px-3 py-2 rounded ${active(`/book/${bookId}`)}`}
              >
                ✍️ Book Details
              </Link>
              <Link
                to={`/book/${bookId}/story`}
                className={`block px-3 py-2 rounded ${active(`/book/${bookId}/story`)}`}
              >
                📖 Story Parts
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="text-sm text-gray-500 border-t pt-4">
        {userEmail && <div className="mb-2">🔓 {userEmail}</div>}
        <button
          onClick={handleLogout}
          className="text-red-600 hover:underline text-sm"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
