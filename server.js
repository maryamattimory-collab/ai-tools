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
const MODEL = "gemini-1.5-flash";

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
parts:[{text:prompt}]
}
]
})
}
)

const data=await response.json()

return data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)

}

app.post("/api/generate-infographic", async (req,res)=>{

try{

const {topic}=req.body

const result=await callGemini(`
Buat konsep infografis Instagram carousel.

Topik:
${topic}

Format:

JUDUL
SLIDE 1
SLIDE 2
SLIDE 3
SLIDE 4
SLIDE 5
CTA
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

app.post("/api/generate-tiktok-carousel", async (req,res)=>{

try{

const {topic}=req.body

const result=await callGemini(`
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
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

app.post("/api/generate-leonardo-prompt", async (req,res)=>{

try{

const {topic}=req.body

const result=await callGemini(`
Buat prompt Leonardo AI.

Topik:
${topic}

Style:
soft pastel 3D cartoon semi chibi cinematic lighting
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

app.post("/api/generate-veo-prompt", async (req,res)=>{

try{

const {topic}=req.body

const result=await callGemini(`
Buat prompt video cinematic untuk Veo.

Topik:
${topic}
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

app.post("/api/merge-photos", async (req,res)=>{

try{

const {userPrompt}=req.body

const result=await callGemini(`
User mengupload beberapa foto.

Instruksi:
${userPrompt}

Buat:
1 konsep visual
2 komposisi
3 lighting
4 mood
5 prompt leonardo
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

app.post("/api/analyze-video", async (req,res)=>{

try{

const {prompt}=req.body

const result=await callGemini(`
Analisa video.

Instruksi:
${prompt}

Buat:
1 ringkasan video
2 storyboard scene
3 prompt leonardo
4 prompt veo
5 voice over
`)

res.json({success:true,text:result})

}catch(err){

res.status(500).json({error:err.message})

}

})

const PORT=process.env.PORT||3000

app.listen(PORT,()=>{

console.log("AI Studio Pro running on port",PORT)

})
