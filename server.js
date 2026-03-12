import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
            parts: [
              { text: prompt }
            ]
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

function buildPrompt(mode, prompt) {
  if (mode === "infographic") {
    return `
Buat konsep infografis Instagram carousel.

Topik:
${prompt}

Format output:

JUDUL
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CTA
`;
  }

  if (mode === "tiktok") {
    return `
Buat TikTok carousel storytelling.

Topik:
${prompt}

Format output:

HOOK
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CLOSING
`;
  }

  if (mode === "leonardo") {
    return `
Buat prompt Leonardo AI.

Topik:
${prompt}

Format output:

PROMPT
NEGATIVE PROMPT
STYLE NOTES
`;
  }

  if (mode === "veo") {
    return `
Buat prompt video cinematic untuk Veo.

Topik:
${prompt}

Format output:

JUDUL VIDEO
SCENE 1
SCENE 2
SCENE 3
SCENE 4
CAMERA
LIGHTING
MOOD
NEGATIVE PROMPT
`;
  }

  return prompt;
}

app.get("/", (req, res) => {
  res.send("AI Studio Pro aktif");
});

app.post("/api/generate", async (req, res) => {
  try {
    const { mode, prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Prompt kosong"
      });
    }

    const fullPrompt = buildPrompt(mode, prompt);
    const text = await callGemini(fullPrompt);

    res.json({
      success: true,
      text
    });
  } catch (err) {
    console.error("SERVER ERROR /api/generate:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("AI Studio Pro aktif di port " + PORT);
});
