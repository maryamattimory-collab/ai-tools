import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum diisi di Railway Variables");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Error dari Gemini");
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respon dari Gemini.";
}

app.get("/", (req, res) => {
  res.send("AI Studio Pro aktif");
});

app.post("/api/gemini-chat", async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Prompt kosong" });
    }

    let finalPrompt = "";

    if (mode === "infographic") {
      finalPrompt = `Buat konsep infografis carousel.

Topik:
${message}

Format:
JUDUL
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CTA`;
    } else if (mode === "tiktok") {
      finalPrompt = `Buat TikTok carousel storytelling.

Topik:
${message}

Format:
HOOK
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CLOSING`;
    } else if (mode === "leonardo") {
      finalPrompt = `Buat prompt Leonardo AI.

Topik:
${message}

Format:
PROMPT
NEGATIVE PROMPT
STYLE NOTES`;
    } else if (mode === "veo") {
      finalPrompt = `Buat prompt cinematic untuk Veo.

Topik:
${message}

Format:
JUDUL VIDEO
SCENE 1
SCENE 2
SCENE 3
SCENE 4
CAMERA
LIGHTING
MOOD
NEGATIVE PROMPT`;
    } else if (mode === "analyze_video") {
      finalPrompt = `Analisa video referensi berikut.

Instruksi user:
${message}

Buat output:
1. Ringkasan isi video
2. Storyboard per scene
3. Prompt Veo cinematic per scene
4. Angle kamera, lighting, dan mood per scene
5. Caption TikTok`;
    } else if (mode === "combine_photos") {
      finalPrompt = `Gabungkan beberapa foto berikut menjadi konsep visual.

Instruksi user:
${message}

Buat output:
1. Konsep visual utama
2. Komposisi
3. Lighting
4. Mood
5. Prompt Leonardo AI
6. Caption`;
    } else {
      finalPrompt = message;
    }

    const text = await callGemini(finalPrompt);

    res.json({
      success: true,
      text
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server aktif di port ${PORT}`);
});
