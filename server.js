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

async function callGemini(prompt){

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        contents:[
          {
            role:"user",
            parts:[
              { text: prompt }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if(data.error){
    console.log(data.error);
    return "Error dari Gemini: " + data.error.message;
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respon dari Gemini.";
}

app.post("/api/gemini-chat", async (req,res)=>{

  try{

    const {message,mode} = req.body;

    if(!message){
      return res.json({text:"Prompt kosong"});
    }

    let finalPrompt = "";

    if(mode === "infographic"){
      finalPrompt = `Buat konsep infografis carousel:

${message}

Format:
Judul
Slide 1
Slide 2
Slide 3
Slide 4
Slide 5
CTA`;
    }

    else if(mode === "tiktok"){
      finalPrompt = `Buat TikTok carousel storytelling:

${message}

Format:
Hook
Slide 1
Slide 2
Slide 3
Slide 4
Slide 5
Closing`;
    }

    else if(mode === "leonardo"){
      finalPrompt = `Buat prompt Leonardo AI:

${message}

Style:
soft pastel
3D cartoon
cinematic lighting

Format:
PROMPT
NEGATIVE PROMPT`;
    }

    else if(mode === "veo"){
      finalPrompt = `Buat prompt video cinematic Veo:

${message}

Format:
Scene 1
Scene 2
Scene 3
Scene 4
Camera
Lighting
Mood`;
    }

    else if(mode === "analyze_video"){
      finalPrompt = `Analisa video berikut:

${message}

Buat:
1 Ringkasan
2 Scene by scene
3 Prompt Veo
4 Kamera + lighting`;
    }

    else if(mode === "combine_photos"){
      finalPrompt = `Gabungkan foto berikut menjadi konsep visual:

${message}

Buat:
1 Konsep visual
2 Lighting
3 Prompt Leonardo
4 Caption`;
    }

    const result = await callGemini(finalPrompt);

    res.json({
      success:true,
      text:result
    });

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("Server aktif di port",PORT);
});
