/* ===========================
   SERVER.JS FINAL (FULL MODE)
=========================== */

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // untuk chat.html, css, js

// ===========================
// UTILITY FUNCTION (FAKE GEMINI CALL)
// ===========================
async function callGemini(prompt) {
  // placeholder: ganti dengan panggilan AI nyata
  return `Hasil AI untuk prompt:\n${prompt}`;
}

async function callGeminiWithVideo(videoBuffer, mimetype, prompt) {
  // placeholder: ganti dengan panggilan AI video nyata
  return `Hasil AI untuk video dengan prompt:\n${prompt}`;
}

// ===========================
// ENDPOINT GENERATE (SEMUA MODE)
// ===========================
app.post("/api/generate", async (req, res) => {
  try {
    const { mode, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt kosong" });
    }

    // Mode auto = Gemini pilih tool
    let selectedMode = mode || "auto";

    // Logika sederhana: bisa dikembangkan sesuai AI nyata
    let finalPrompt = "";
    switch (selectedMode) {
      case "infographic":
        finalPrompt = `Buat infografis dari topik:\n${prompt}`;
        break;
      case "tiktok":
        finalPrompt = `Buat TikTok carousel cinematic:\n${prompt}`;
        break;
      case "leonardo":
        finalPrompt = `Buat prompt Leonardo T2I/I2V cinematic:\n${prompt}`;
        break;
      case "veo":
        finalPrompt = `Buat prompt Veo cinematic scene by scene:\n${prompt}`;
        break;
      case "analyze_video":
        // Fallback jika user lewat endpoint generate, minta pakai endpoint analyze-video
        finalPrompt = `Analisa video (user pakai generate endpoint secara tidak sengaja):\n${prompt}`;
        break;
      case "auto":
      default:
        finalPrompt = `Auto mode: AI pilih tool sesuai prompt:\n${prompt}`;
    }

    const text = await callGemini(finalPrompt);

    res.json({
      success: true,
      selectedMode,
      text
    });

  } catch (err) {
    console.error("ERROR /api/generate:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ===========================
// ENDPOINT ANALYZE VIDEO
// ===========================
app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Upload video dulu"
      });
    }

    const prompt = req.body.prompt || "Analisa video ini";

    // ambil modeType dari frontend, fallback storytelling
    let modeType = req.body.modeType || "storytelling";

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
4. Script voice over baru
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
      modeType,
      text
    });

  } catch (err) {
    console.error("ERROR /api/analyze-video:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ===========================
// START SERVER
// ===========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER RUNNING DI PORT " + PORT);
});
