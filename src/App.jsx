import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "./supabaseClient";
import BooksDashboard from "./components/BooksDashboard";
import BookDetail from "./components/BookDetail";
import StoryPartPage from "./components/StoryPartPage";
import Sidebar from "./components/Sidebar";

function App() {
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // 'login' or 'signup'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError("Invalid credentials");
    } else {
      setUserId(data.user.id);
      setError("");
    }
  }

  async function handleSignup() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setError("");
      alert("✅ Sign up successful! Please check your email to confirm.");
    }
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full space-y-4">
          <h1 className="text-xl font-bold text-center">
            {mode === "login" ? "🔐 Login" : "🆕 Create Account"}
          </h1>

          <input
            className="border p-2 w-full rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border p-2 w-full rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white py-2 w-full rounded hover:bg-blue-700"
            onClick={mode === "login" ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Signing up..."
              : mode === "login"
              ? "Login"
              : "Sign Up"}
          </button>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <p className="text-sm text-gray-600 text-center">
            {mode === "login" ? (
              <>
                Don’t have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-blue-600 hover:underline"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-blue-600 hover:underline"
                >
                  Login
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 w-full min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<BooksDashboard userId={userId} />} />
          <Route path="/book/:bookId" element={<BookDetail />} />
          <Route path="/book/:bookId/story" element={<StoryPartPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
