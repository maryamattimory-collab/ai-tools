import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

async function callGemini(parts) {

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
            parts
          }
        ]
      })
    }
  );

  const data = await response.json();

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
}






/* ===========================
   INFOGRAPHIC GENERATOR
=========================== */

app.post("/api/generate-infographic", async (req, res) => {

  try {

    const { topic } = req.body;

    const result = await callGemini([
      {
        text: `
Buat konsep infografis Instagram carousel.

Topik:
${topic}

Output harus berisi:

JUDUL
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CTA

Gunakan bahasa Indonesia.
        `
      }
    ]);

    res.json({
      success: true,
      text: result
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});







/* ===========================
   TIKTOK CAROUSEL GENERATOR
=========================== */

app.post("/api/generate-tiktok-carousel", async (req, res) => {

  try {

    const { topic } = req.body;

    const result = await callGemini([
      {
        text: `
Buat TikTok carousel storytelling.

Topik:
${topic}

Format:

Hook
Slide 1
Slide 2
Slide 3
Slide 4
Slide 5
Closing

Gunakan bahasa santai.
        `
      }
    ]);

    res.json({
      success: true,
      text: result
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});







/* ===========================
   LEONARDO PROMPT GENERATOR
=========================== */

app.post("/api/generate-leonardo-prompt", async (req, res) => {

  try {

    const { topic } = req.body;

    const result = await callGemini([
      {
        text: `
Buat prompt gambar Leonardo AI.

Topik:
${topic}

Gunakan gaya:

soft pastel
3D cartoon
semi chibi
cinematic lighting
Pixar style

Format:

PROMPT
NEGATIVE PROMPT
STYLE
        `
      }
    ]);

    res.json({
      success: true,
      text: result
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});







/* ===========================
   VEO VIDEO PROMPT GENERATOR
=========================== */

app.post("/api/generate-veo-prompt", async (req, res) => {

  try {

    const { topic } = req.body;

    const result = await callGemini([
      {
        text: `
Buat prompt video cinematic untuk generator video seperti Veo.

Topik:
${topic}

Output format:

JUDUL VIDEO

SCENE 1
SCENE 2
SCENE 3
SCENE 4

STYLE
CAMERA
LIGHTING
MOOD
NEGATIVE PROMPT
        `
      }
    ]);

    res.json({
      success: true,
      text: result
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});







/* ===========================
   ANALYZE VIDEO
=========================== */

app.post("/api/analyze-video", async (req, res) => {

  res.json({
    success: false,
    message: "Analyze video membutuhkan upload video."
  });

});







/* ===========================
   SERVER START
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("AI Studio Pro API aktif di port", PORT);

});

