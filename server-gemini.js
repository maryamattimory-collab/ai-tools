import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import multer from "multer";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";

async function callGemini(messages) {

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
              { text: messages }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!data.candidates) {
    return "Tidak ada respon dari Gemini.";
  }

  return data.candidates[0].content.parts[0].text;
}
async function runModeTool(mode, promptText) {

  if (mode === "infographic") {
    const result = await callGemini(`
Buat konsep infografis dari topik berikut:

${promptText}

Format output:
JUDUL INFOGRAFIS:
...

SLIDE 1:
...

SLIDE 2:
...

SLIDE 3:
...

SLIDE 4:
...

SLIDE 5:
...

CTA:
...
`);
    return result;
  }

  if (mode === "tiktok") {
    const result = await callGemini(`
Buat TikTok carousel dari topik berikut:

${promptText}

Format output:
HOOK:
...

SLIDE 1:
...

SLIDE 2:
...

SLIDE 3:
...

SLIDE 4:
...

SLIDE 5:
...

CLOSING:
...
`);
    return result;
  }

  if (mode === "leonardo") {
    const result = await callGemini(`
Buat prompt Leonardo AI dari topik berikut:

${promptText}

Gunakan style:
soft pastel 3D cartoon, semi chibi, cinematic lighting, emotional storytelling

Format output:
PROMPT:
...

NEGATIVE PROMPT:
...

STYLE NOTES:
...
`);
    return result;
  }

  if (mode === "veo") {
    const result = await callGemini(`
Buat prompt video cinematic untuk Veo dari topik berikut:

${promptText}

Format output:
JUDUL VIDEO:
...

KONSEP:
...

SCENE 1:
...

SCENE 2:
...

SCENE 3:
...

SCENE 4:
...

CAMERA:
...

LIGHTING:
...

MOOD:
...

NEGATIVE PROMPT:
...
`);
    return result;
  }

  if (mode === "analyze_video") {
    const result = await callGemini(`
User mengunggah video referensi.

Instruksi user:
${promptText}

Buat output:
1. Ringkasan isi video
2. Storyboard per scene
3. Prompt Leonardo AI per scene
4. Prompt Veo cinematic per scene
5. Script voice over
6. Caption TikTok
`);
    return result;
  }

  if (mode === "combine_photos") {
    const result = await callGemini(`
User mengunggah beberapa foto.

Instruksi user:
${promptText}

Buat output:
1. Konsep visual utama
2. Komposisi gabungan
3. Lighting
4. Mood
5. Prompt Leonardo AI
6. Prompt Veo cinematic
7. Caption konten
`);
    return result;
  }

  return "Mode tidak dikenali.";
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Studio Pro Gemini Bridge Aktif",
    model: MODEL,
    apiKey: GEMINI_API_KEY ? "Terkonfigurasi" : "Belum ada"
  });
});

app.post("/api/gemini-chat", async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message kosong."
      });
    }

    const result = await runModeTool(mode || "infographic", message);

    res.json({
      success: true,
      mode: mode || "infographic",
      result: {
        text: result
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/api/analyze-video-upload", upload.single("video"), async (req, res) => {
  try {
    const promptText = req.body.prompt || "Analisa video ini";

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File video tidak ditemukan."
      });
    }

    const result = await runModeTool("analyze_video", `${promptText}

Nama file video: ${req.file.originalname}
Ukuran file: ${req.file.size} bytes`);

    res.json({
      success: true,
      mode: "analyze_video",
      result: {
        text: result
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/api/combine-photos-upload", upload.array("photos", 10), async (req, res) => {
  try {
    const promptText = req.body.prompt || "Gabungkan foto-foto ini";

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "File foto tidak ditemukan."
      });
    }

    const fileNames = req.files.map((f, i) => `${i + 1}. ${f.originalname}`).join("\n");

    const result = await runModeTool("combine_photos", `${promptText}

Daftar foto:
${fileNames}`);

    res.json({
      success: true,
      mode: "combine_photos",
      result: {
        text: result
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Gemini Bridge berjalan di port " + PORT);
});
