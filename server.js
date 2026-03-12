import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { fileURLToPath } from "url";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

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
- infographic
- tiktok
- leonardo
- veo
- analyze_video
- combine_photos
- model_product_cinematic

Aturan:
- Jika user meminta konten carousel infografis → infographic
- Jika user meminta carousel TikTok / slide storytelling → tiktok
- Jika user meminta prompt gambar Leonardo → leonardo
- Jika user meminta prompt video Veo → veo
- Jika user meminta analisa video → analyze_video
- Jika user meminta gabungkan foto / collage foto / satukan beberapa foto → combine_photos
- Jika user meminta gabungkan model dan produk menjadi foto iklan / cinematic / ads / commercial → model_product_cinematic

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

  if (mode === "combine_photos") {
    return `Gabungkan beberapa foto berikut menjadi konsep visual.

Instruksi user:
${message}

Buat output:
1. Konsep visual utama
2. Komposisi
3. Lighting
4. Mood
5. Prompt Leonardo AI
6. Caption`;
  }

  return message;
}

/* ===========================
   PHOTO COLLAGE HELPER
=========================== */

async function createPhotoCollage(files) {
  const count = files.length;

  if (count < 2) {
    throw new Error("Minimal upload 2 foto.");
  }

  const tileWidth = 512;
  const tileHeight = 512;

  let columns = 2;
  let rows = Math.ceil(count / columns);

  if (count === 2) {
    columns = 2;
    rows = 1;
  }

  if (count === 3 || count === 4) {
    columns = 2;
    rows = 2;
  }

  const canvasWidth = columns * tileWidth;
  const canvasHeight = rows * tileHeight;

  const composites = [];

  for (let i = 0; i < count; i++) {
    const file = files[i];

    const resized = await sharp(file.buffer)
      .resize(tileWidth, tileHeight, {
        fit: "cover",
        position: "centre"
      })
      .png()
      .toBuffer();

    const left = (i % columns) * tileWidth;
    const top = Math.floor(i / columns) * tileHeight;

    composites.push({
      input: resized,
      left,
      top
    });
  }

  const output = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  return output;
}

/* ===========================
   REPLICATE HELPERS
=========================== */

function fileBufferToDataUrl(buffer, mimeType) {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

async function runReplicateModelProductCinematic(modelFile, productFile, userPrompt) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN belum diisi di Railway Variables");
  }

  const modelImage = fileBufferToDataUrl(modelFile.buffer, modelFile.mimetype);
  const productImage = fileBufferToDataUrl(productFile.buffer, productFile.mimetype);

  const prompt = userPrompt && userPrompt.trim()
    ? userPrompt
    : "Create a premium cinematic advertising photo. Put the model and the product naturally in one elegant composition. Luxury lighting, high-end commercial photography, realistic skin tones, professional background, clean product presentation.";

  const response = await fetch(
    "https://api.replicate.com/v1/models/flux-kontext-apps/multi-image-kontext-max/predictions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait=60"
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          image_1: modelImage,
          image_2: productImage
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.title || "Gagal memanggil Replicate");
  }

  if (data.status === "failed") {
    throw new Error(data?.error || "Prediksi Replicate gagal");
  }

  const output = data.output;

  if (Array.isArray(output) && output.length > 0) {
    return output[0];
  }

  if (typeof output === "string") {
    return output;
  }

  throw new Error("Replicate tidak mengembalikan gambar");
}

/* ===========================
   ROUTES
=========================== */

app.get("/", (req, res) => {
  res.send("AI Studio Pro aktif");
});

app.post("/api/gemini-chat", async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Prompt kosong"
      });
    }

    let finalMode = mode;

    if (!finalMode || finalMode === "auto") {
      finalMode = await detectBestMode(message);
    }

    if (finalMode === "analyze_video") {
      return res.json({
        success: true,
        selectedMode: finalMode,
        text: "Mode analyze_video membutuhkan upload video asli. Silakan pilih mode Analyze Video dan upload file video."
      });
    }

    if (finalMode === "combine_photos") {
      return res.json({
        success: true,
        selectedMode: finalMode,
        text: "Mode combine_photos membutuhkan upload minimal 2 foto. Silakan pilih mode Gabungkan Foto lalu upload file."
      });
    }

    if (finalMode === "model_product_cinematic") {
      return res.json({
        success: true,
        selectedMode: finalMode,
        text: "Mode model_product_cinematic membutuhkan upload foto model dan foto produk. Silakan pilih mode Model + Produk Cinematic lalu upload file."
      });
    }

    const finalPrompt = buildPromptByMode(finalMode, message);
    const text = await callGeminiText(finalPrompt);

    res.json({
      success: true,
      selectedMode: finalMode,
      text
    });
  } catch (err) {
    console.error("SERVER ERROR /api/gemini-chat:", err);
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

app.post("/api/combine-photos-image", upload.array("photos", 4), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Minimal upload 2 foto."
      });
    }

    const imageBuffer = await createPhotoCollage(req.files);

    res.set("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (err) {
    console.error("SERVER ERROR /api/combine-photos-image:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/api/model-product-cinematic", upload.fields([
  { name: "modelImage", maxCount: 1 },
  { name: "productImage", maxCount: 1 }
]), async (req, res) => {
  try {
    const modelImage = req.files?.modelImage?.[0];
    const productImage = req.files?.productImage?.[0];
    const prompt = req.body.prompt || "";

    if (!modelImage || !productImage) {
      return res.status(400).json({
        success: false,
        error: "Foto model dan foto produk wajib diupload."
      });
    }

    const imageUrl = await runReplicateModelProductCinematic(
      modelImage,
      productImage,
      prompt
    );

    res.json({
      success: true,
      selectedMode: "model_product_cinematic",
      imageUrl
    });
  } catch (err) {
    console.error("SERVER ERROR /api/model-product-cinematic:", err);
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
  console.log(`AI Studio Pro API aktif di port ${PORT}`);
});
