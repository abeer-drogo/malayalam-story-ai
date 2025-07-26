import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function CharacterEditor({ bookId }) {
  const [characters, setCharacters] = useState([]);
  const [newCharacter, setNewCharacter] = useState({ name: "", nickname: "", role: "" });

  useEffect(() => {
    fetchCharacters();
  }, [bookId]);

  async function fetchCharacters() {
    const { data } = await supabase
      .from("characters")
      .select("id, name, nickname, role")
      .eq("book_id", bookId)
      .order("id", { ascending: true });

    setCharacters(data || []);
  }

  async function updateCharacter(id, field, value) {
    await supabase.from("characters").update({ [field]: value }).eq("id", id);
    fetchCharacters();
  }

  async function deleteCharacter(id) {
    await supabase.from("characters").delete().eq("id", id);
    fetchCharacters();
  }

  async function addCharacter() {
    const { name, nickname, role } = newCharacter;
    if (!name.trim()) return;

    await supabase.from("characters").insert([
      {
        book_id: bookId,
        name: name.trim(),
        nickname: nickname.trim(),
        role: role.trim(),
        connections: [],
      }
    ]);

    setNewCharacter({ name: "", nickname: "", role: "" });
    fetchCharacters();
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-4">👥 Character Editor</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-300 text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Nickname</th>
              <th className="border px-3 py-2 text-left">Role</th>
              <th className="border px-3 py-2 text-left w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((char) => (
              <tr key={char.id}>
                <td className="border px-3 py-1">
                  <input
                    value={char.name || ""}
                    onChange={(e) => updateCharacter(char.id, "name", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="Name"
                  />
                </td>
                <td className="border px-3 py-1">
                  <input
                    value={char.nickname || ""}
                    onChange={(e) => updateCharacter(char.id, "nickname", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="Nickname"
                  />
                </td>
                <td className="border px-3 py-1">
                  <input
                    value={char.role || ""}
                    onChange={(e) => updateCharacter(char.id, "role", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="Role"
                  />
                </td>
                <td className="border px-3 py-1 text-center">
                  <button
                    onClick={() => deleteCharacter(char.id)}
                    className="text-red-600 hover:underline"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}

            {/* Add new character row */}
            <tr className="bg-blue-50">
              <td className="border px-3 py-1">
                <input
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Name"
                />
              </td>
              <td className="border px-3 py-1">
                <input
                  value={newCharacter.nickname}
                  onChange={(e) => setNewCharacter({ ...newCharacter, nickname: e.target.value })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Nickname"
                />
              </td>
              <td className="border px-3 py-1">
                <input
                  value={newCharacter.role}
                  onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Role"
                />
              </td>
              <td className="border px-3 py-1 text-center">
                <button
                  onClick={addCharacter}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
