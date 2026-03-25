const express = require("express");
const multer = require("multer");
const fs = require("fs");
const app = express();

// ===========================
// MIDDLEWARE
// ===========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Batasi upload video agar tidak crash Railway
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // max 50MB
});

// Dummy function untuk call Gemini (ganti dengan implementasi AI-mu)
async function callGeminiWithVideo(buffer, mimetype, prompt) {
  // Simulasi response AI
  return `Hasil AI untuk prompt: ${prompt} (video length: ${buffer.length} bytes)`;
}

async function callGemini(prompt, mode) {
  return `Hasil AI untuk prompt: ${prompt} (mode: ${mode})`;
}

// ===========================
// API GENERATE
// ===========================
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, mode } = req.body;
    if(!prompt) return res.status(400).json({success:false,error:"Prompt kosong"});
    const text = await callGemini(prompt, mode);
    res.json({success:true,text,selectedMode:mode});
  } catch(err) {
    console.error("ERROR /api/generate:", err);
    res.status(500).json({success:false,error:err.message});
  }
});

// ===========================
// API ANALYZE VIDEO
// ===========================
app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({success:false,error:"Upload video dulu"});

    const prompt = req.body.prompt || "Analisa video ini";
    let modeType = req.body.mode || "storytelling"; // default kalau frontend gak kirim

    let finalPrompt = "";
    if(modeType === "storytelling") {
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

    // 🔹 Gunakan temp file untuk aman (opsional)
    const tmpPath = `/tmp/${Date.now()}_${req.file.originalname}`;
    fs.writeFileSync(tmpPath, req.file.buffer);
    const text = await callGeminiWithVideo(fs.readFileSync(tmpPath), req.file.mimetype, finalPrompt);
    fs.unlinkSync(tmpPath);

    res.json({success:true,modeType,text});
  } catch(err) {
    console.error("ERROR /api/analyze-video:", err);
    if(!res.headersSent) res.status(500).json({success:false,error:err.message});
  }
});

// ===========================
// START SERVER
// ===========================
const PORT = process.env.PORT || 3000;
app.listen(PORT,"0.0.0.0",()=>console.log("SERVER RUNNING DI PORT " + PORT));
