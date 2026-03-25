import express from "express";

import cors from "cors";

import path from "path";

import multer from "multer";

import { fileURLToPath } from "url";

const app = express();

const upload = multer({

storage: multer.memoryStorage(),

limits: {

fileSize: 100 * 1024 * 1024

}

});

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

app.use(cors());

app.use(express.json({ limit: "20mb" }));

app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/* ===========================

GEMINI HELPERS

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

async function detectBestMode(message) {

const modePrompt = `

Tentukan mode tool terbaik untuk permintaan user berikut.

Pilihan mode yang valid hanya salah satu dari:

infographic

tiktok

leonardo

veo

analyze_video


Aturan:

Jika user meminta konten carousel infografis → infographic

Jika user meminta carousel TikTok / slide storytelling → tiktok

Jika user meminta prompt gambar Leonardo → leonardo

Jika user meminta prompt video Veo → veo

Jika user meminta analisa video → analyze_video


Balas HANYA dengan salah satu nama mode di atas.

Jangan beri penjelasan tambahan.

Permintaan user:

${message}

`;

const result = await callGeminiText(modePrompt);

return result.trim().toLowerCase();

}

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



let finalMode = mode;



if (!finalMode || finalMode === "auto") {

  finalMode = await detectBestMode(prompt);

}



if (finalMode === "analyze_video") {

  return res.json({

    success: true,

    selectedMode: finalMode,

    text: "Mode Analyze Video membutuhkan upload file video. Silakan pilih mode Analyze Video lalu upload video."

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

console.error("SERVER ERROR /api/generate:", err);

res.status(500).json({

  success: false,

  error: err.message

});

}

});

app.post("/api/analyze-video", upload.single("video"), async (req, res) => {

try {

if (!req.file) {

  return res.status(400).json({

    success: false,

    error: "File video tidak ditemukan."

  });

}



const prompt = req.body.prompt || "Analisa video ini scene by scene.";



const finalPrompt = `

Analisa video ini berdasarkan isi visual aslinya.

Instruksi user:

${prompt}

Buat output:

1. Ringkasan isi video


2. Storyboard per scene


3. Prompt Veo cinematic per scene


4. Angle kamera, lighting, dan mood per scene


5. Caption TikTok



`;

const text = await callGeminiWithVideo(

  req.file.buffer,

  req.file.mimetype,

  finalPrompt

);



res.json({

  success: true,

  selectedMode: "analyze_video",

  text

});

} catch (err) {

console.error("SERVER ERROR /api/analyze-video:", err);

res.status(500).json({

  success: false,

  error: err.message

});

}

});

/* ===========================

SERVER START

=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

console.log("AI Studio Pro aktif di port " + PORT);

});
