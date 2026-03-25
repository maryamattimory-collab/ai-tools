const express=require("express");
const multer=require("multer");
const app=express();
const upload=multer();

// Middleware JSON
app.use(express.json());

// ===========================
// GENERATE GENERAL
// ===========================
app.post("/api/generate",async(req,res)=>{
  try{
    const {mode,prompt}=req.body;
    // 🔥 DEBUG
    console.log("GENERATE:",mode,prompt);
    // Contoh dummy response
    res.json({
      success:true,
      selectedMode:mode,
      text:`Ini hasil AI untuk mode ${mode} dengan prompt:\n${prompt}`
    });
  }catch(err){
    res.status(500).json({success:false,error:err.message});
  }
});

// ===========================
// ANALYZE VIDEO (FINAL FIX)
// ===========================
app.post("/api/analyze-video",upload.single("video"),async(req,res)=>{
  try{
    if(!req.file){return res.status(400).json({success:false,error:"Upload video dulu"});}
    const prompt=req.body.prompt||"Analisa video ini";
    console.log("BODY:",req.body);

    let modeType=req.body.mode;
    if(!modeType){modeType="storytelling";}

    console.log("MODE TERPAKAI:",modeType);

    let finalPrompt="";
    if(modeType==="storytelling"){
      finalPrompt=`
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
    }else{
      finalPrompt=`
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

    // 🔥 Dummy callGemini
    const text=`[SIMULASI GEMINI] Analisis video selesai.\nPrompt yang digunakan:\n${finalPrompt}`;

    res.json({success:true,modeType,text});
  }catch(err){
    console.error("ERROR:",err);
    res.status(500).json({success:false,error:err.message});
  }
});

// ===========================
// START SERVER
// ===========================
const PORT=process.env.PORT||3000;
app.listen(PORT,"0.0.0.0",()=>{console.log("SERVER RUNNING DI PORT "+PORT);});
