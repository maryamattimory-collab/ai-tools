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

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
}

app.post("/api/generate", async (req,res)=>{

  try{

    const {mode,prompt} = req.body;

    let fullPrompt="";

    if(mode==="infographic"){
      fullPrompt=`
Buat konsep infografis Instagram carousel.

Topik:
${prompt}

Format:

JUDUL
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CTA
`;
    }

    else if(mode==="tiktok"){
      fullPrompt=`
Buat TikTok carousel storytelling.

Topik:
${prompt}

Format:

Hook
Slide 1
Slide 2
Slide 3
Slide 4
Slide 5
Closing
`;
    }

    else if(mode==="leonardo"){
      fullPrompt=`
Buat prompt gambar Leonardo AI.

Topik:
${prompt}

Format:

PROMPT
NEGATIVE PROMPT
STYLE
`;
    }

    else if(mode==="veo"){
      fullPrompt=`
Buat prompt video cinematic untuk generator video seperti Veo.

Topik:
${prompt}

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
`;
    }

    const text = await callGemini(fullPrompt);

    res.json({
      success:true,
      text
    });

  }catch(err){

    res.status(500).json({
      success:false,
      error:err.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("AI Studio Pro aktif di port",PORT);
});
