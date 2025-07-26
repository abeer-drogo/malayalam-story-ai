import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { toPng } from "html-to-image";
import { supabase } from "../supabaseClient";

export default function ExportDocx({ bookId }) {
  async function generateDocx() {
    const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
    const { data: chapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("part_number");
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("book_id", bookId);

    const doc = new Document();

    // 📘 Book info
    doc.addSection({
      children: [
        new Paragraph({ text: book.name, heading: HeadingLevel.HEADING_1 }),
        new Paragraph(`Theme: ${book.theme}`),
        new Paragraph(`Genres: ${book.genres?.join(", ")}`),
        new Paragraph(""),
      ],
    });

    // 🧭 Character map image (convert #charMap to PNG and embed)
    const svgElement = document.getElementById("charMap");
    if (svgElement) {
      const dataUrl = await toPng(svgElement);
      const imageBuffer = await fetch(dataUrl).then((res) => res.arrayBuffer());

      doc.addSection({
        children: [
          new Paragraph({ text: "Character Map", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [new TextRun("🔽 (See visual in exported file)")],
          }),
          {
            children: [],
            headers: [],
            footers: [],
            background: undefined,
            margins: undefined,
            properties: {},
            images: [{ data: imageBuffer, transformation: { width: 600, height: 400 } }],
          },
        ],
      });
    }

    // 🔢 Chapter summaries + content
    chapters.forEach((ch) => {
      doc.addSection({
        children: [
          new Paragraph({
            text: `Part ${ch.part_number}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `Summary: ${ch.summary}`,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: (ch.edited_content || ch.content || "⛔ No content"),
          }),
        ],
      });
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${book.name || "story"}.docx`);
  }

  return (
    <button
      onClick={generateDocx}
      className="mt-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      📄 Export Story as DOCX
    </button>
  );
}
