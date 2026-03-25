import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();

/* ===========================
   UPLOAD SETUP
=========================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

/* ===========================
   PATH SETUP
=========================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===========================
   MIDDLEWARE
=========================== */
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

/* ===========================
   ENV CONFIG
=========================== */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/* ===========================
   GEMINI TEXT
=========================== */
async function callGeminiText(prompt) {
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

/* ===========================
   GEMINI VIDEO
=========================== */
async function callGeminiWithVideo(videoBuffer, mimeType, prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum diisi di Railway Variables");
  }

  const base64Video = videoBuffer.toString("base64");

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
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Video
                }
              },
              {
                text: prompt
              }
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

/* ===========================
   AUTO MODE DETECTOR
=========================== */
async function detectBestMode(message) {
  const modePrompt = `
Tentukan mode tool terbaik untuk permintaan user berikut.

Pilihan:
- infographic
- tiktok
- leonardo
- veo
- analyze_video

Balas hanya salah satu.

User:
${message}
`;

  const result = await callGeminiText(modePrompt);
  return result.trim().toLowerCase();
}

/* ===========================
   PROMPT BUILDER
=========================== */
function buildPromptByMode(mode, message) {

  if (mode === "infographic") {
    return `Buat konsep infografis carousel.

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
  }

  if (mode === "tiktok") {
    return `Buat TikTok carousel storytelling.

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
  }

  if (mode === "leonardo") {
    return `Buat prompt Leonardo AI.

Topik:
${message}

Format:
PROMPT
NEGATIVE PROMPT
STYLE NOTES`;
  }

  if (mode === "veo") {
    return `Buat prompt cinematic untuk Veo.

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
  }

  return message;
}

/* ===========================
   ROUTES
=========================== */

app.get("/", (req, res) => {
  res.send("AI Studio Pro aktif 🚀");
});

/* ===========================
   GENERATE TEXT
=========================== */

app.post("/api/generate", async (req, res) => {
  try {
    const { mode, prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Prompt kosong"
      });
    }

    let finalMode = mode;

    if (!finalMode || finalMode === "auto") {
      finalMode = await detectBestMode(prompt);
    }

    if (finalMode === "analyze_video") {
      return res.json({
        success: true,
        selectedMode: finalMode,
        text: "Mode ini butuh upload video."
      });
    }

    const fullPrompt = buildPromptByMode(finalMode, prompt);
    const text = await callGeminiText(fullPrompt);

    res.json({
      success: true,
      selectedMode: finalMode,
      text
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ===========================
   ANALYZE VIDEO (FINAL UPGRADE)
=========================== */

app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File video tidak ditemukan."
      });
    }

    const prompt = req.body.prompt || "Analisa video ini scene by scene.";
    const modeType = req.body.modeType || "original";

    let finalPrompt = "";

    if (modeType === "storytelling") {

      finalPrompt = `
User ingin membuat ulang cerita dari video (bukan meniru).

Instruksi:
${prompt}

Output:
1. Ide cerita baru
2. Storyboard storytelling
3. Hook kuat
4. Voice over baru
5. Prompt Veo cinematic
6. Caption TikTok
`;

    } else {

      finalPrompt = `
Analisa video sesuai alur asli.

Instruksi:
${prompt}

Output:
1. Ringkasan video
2. Storyboard asli
3. Prompt Veo per scene
4. Camera, lighting, mood
5. Caption
`;

    }

    const text = await callGeminiWithVideo(
      req.file.buffer,
      req.file.mimetype,
      finalPrompt
    );

    res.json({
      success: true,
      selectedMode: "analyze_video",
      modeType,
      text
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ===========================
   START SERVER
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
