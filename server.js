const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(express.static(__dirname));

async function callGemini(parts) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY tidak ditemukan.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini API Error");
  }

  const textParts = data?.candidates?.[0]?.content?.parts || [];
  return textParts.map((p) => p.text || "").join("\n").trim();
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Studio Pro Backend Aktif",
    model: MODEL,
    apiKey: API_KEY ? "Terkonfigurasi" : "Belum ada",
  });
});

// =============================
// 1. GABUNGKAN FOTO
// =============================
app.post("/api/merge-photos", async (req, res) => {
  try {
    const { images, userPrompt } = req.body;

    if (!images || !Array.isArray(images) || images.length < 2) {
      return res.status(400).json({ error: "Minimal upload 2 foto." });
    }

    const parts = [];

    for (const img of images) {
      if (!img || !img.mimeType || !img.data) {
        return res.status(400).json({ error: "Format gambar tidak valid." });
      }

      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    parts.push({
      text: `
Kamu adalah AI Visual Prompt Creator.

Gabungkan semua foto ini menjadi satu konsep visual utuh.

Format output:

JUDUL KONSEP:
...

PROMPT UTAMA:
...

NEGATIVE PROMPT:
...

GAYA VISUAL:
...

KOMPOSISI:
...

LIGHTING:
...

CAMERA:
...

CATATAN TAMBAHAN:
...

Instruksi tambahan:
${userPrompt || ""}
      `,
    });

    const result = await callGemini(parts);

    res.json({
      success: true,
      text: result,
    });
  } catch (err) {
    console.error("Merge Photos Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// 2. ANALISA VIDEO
// =============================
app.post("/api/analyze-video", async (req, res) => {
  try {
    const { videoBase64, mimeType, prompt, language, style } = req.body;

    if (!videoBase64 || !mimeType) {
      return res.status(400).json({ error: "Video kosong atau mimeType tidak ada." });
    }

    const parts = [
      {
        inlineData: {
          mimeType,
          data: videoBase64,
        },
      },
      {
        text: `
Kamu adalah AI Video Scene Analyzer.

Analisa video ini dan pecah menjadi beberapa scene penting.

Gunakan format berikut:

SCENE #1
DURASI:
...

MASTER PROMPT:
...

CAMERA:
...

LIGHTING:
...

AMBIENCE:
...

VOICE OVER:
...

NEGATIVE PROMPT:
...

SCENE #2
...

Bahasa output:
${language || "Bahasa Indonesia"}

Style visual:
${style || "Cinematic"}

Instruksi tambahan:
${prompt || ""}
        `,
      },
    ];

    const result = await callGemini(parts);

    res.json({
      success: true,
      text: result,
    });
  } catch (err) {
    console.error("Analyze Video Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// 3. GENERATOR INFOGRAFIS
// =============================
app.post("/api/generate-infographic", async (req, res) => {
  try {
    const { topic, platform, style, extraPrompt } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topik kosong." });
    }

    const parts = [
      {
        text: `
Kamu adalah AI Infographic Creator.

Buat konsep infografis dari topik:
"${topic}"

Format output:

JUDUL INFOGRAFIS:
...

TARGET AUDIENCE:
...

PLATFORM:
${platform || "Instagram"}

GAYA DESAIN:
${style || "Modern"}

WARNA UTAMA:
...

STRUKTUR KONTEN:
1.
2.
3.
4.

LAYOUT VISUAL:
...

PROMPT INFOGRAFIS:
...

NEGATIVE PROMPT:
...

CTA:
...

Instruksi tambahan:
${extraPrompt || ""}
        `,
      },
    ];

    const result = await callGemini(parts);

    res.json({
      success: true,
      text: result,
    });
  } catch (err) {
    console.error("Infographic Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {

  console.log("Server berjalan di port " + PORT);
  console.log("Model: " + MODEL);
});

