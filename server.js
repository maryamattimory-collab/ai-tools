const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Supaya file seperti index.html, css, js bisa dibuka langsung
app.use(express.static(__dirname));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(parts) {
  if (!API_KEY) {
    throw new Error("API KEY tidak ditemukan di file .env");
  }

  await sleep(3000);

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

// Halaman utama: tampilkan index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Cek kesehatan server
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Studio Backend Aktif",
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

    if (!images || images.length < 2) {
      return res.status(400).json({ error: "Minimal 2 foto." });
    }

    const parts = [];

    for (const img of images) {
      if (!img || !img.mimeType || !img.data) {
        return res.status(400).json({
          error: "Format gambar tidak valid.",
        });
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
    const { topic, platform, style, audience, extraPrompt } = req.body;

    if (!topic) {
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

Audience:
${audience || "Umum"}

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
  console.log(`🚀 Server berjalan di http://0.0.0.0:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
});
