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
;   } else {   finalPrompt = 
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

