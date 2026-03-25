import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();

/* ===========================
   UPLOAD
=========================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

/* ===========================
   PATH
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
   ENV
=========================== */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/* ===========================
   GEMINI TEXT
=========================== */
async function callGeminiText(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

/* ===========================
   GEMINI VIDEO
=========================== */
async function callGeminiWithVideo(buffer, mimeType, prompt) {
  const base64 = buffer.toString("base64");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64
                }
              },
              { text: prompt }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

/* ===========================
   ROOT (DEBUG VERSION)
=========================== */
app.get("/", (req, res) => {
  res.send("AI Studio Pro 🚀 VERSION STORYTELLING AKTIF");
});

/* ===========================
   GENERATE
=========================== */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const text = await callGeminiText(prompt);

    res.json({
      success: true,
      text
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ===========================
   ANALYZE VIDEO (FINAL FIX)
=========================== */
app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Upload video dulu"
      });
    }

    const prompt = req.body.prompt || "Analisa video ini";
    
    // 🔥 DEBUG LOG
    console.log("BODY:", req.body);

    // 🔥 AMBIL MODE
    let modeType = req.body.modeType;

    // 🔥 AUTO FIX (kalau frontend gak kirim)
    if (!modeType) {
      modeType = "storytelling"; // 👉 default paksa biar keliatan
    }

    console.log("MODE TERPAKAI:", modeType);

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
    console.error("ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ===========================
   START
=========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER RUNNING DI PORT " + PORT);
});
