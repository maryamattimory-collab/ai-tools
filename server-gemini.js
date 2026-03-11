import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const MAIN_TOOL_URL =
  process.env.MAIN_TOOL_URL ||
  "https://ai-tools-production-5cad.up.railway.app";

async function callGeminiWithTools(message) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
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
                text: message
              }
            ]
          }
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "generate_infographic",
                description: "Generate infographic content",
                parameters: {
                  type: "object",
                  properties: {
                    topic: { type: "string" }
                  },
                  required: ["topic"]
                }
              },
              {
                name: "generate_tiktok_carousel",
                description: "Generate TikTok carousel",
                parameters: {
                  type: "object",
                  properties: {
                    topic: { type: "string" }
                  },
                  required: ["topic"]
                }
              },
              {
                name: "generate_leonardo_prompt",
                description: "Generate Leonardo AI prompt",
                parameters: {
                  type: "object",
                  properties: {
                    topic: { type: "string" }
                  },
                  required: ["topic"]
                }
              },
              {
                name: "generate_veo_prompt",
                description: "Generate Veo cinematic prompt",
                parameters: {
                  type: "object",
                  properties: {
                    topic: { type: "string" }
                  },
                  required: ["topic"]
                }
              },
              {
                name: "analyze_video",
                description: "Analyze reference video",
                parameters: {
                  type: "object",
                  properties: {
                    prompt: { type: "string" }
                  }
                }
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  return data;
}

async function runTool(functionCall) {

  let fn = functionCall.name;
  const args = functionCall.args || {};
  const mode = args.mode || "";

  if (mode === "veo") fn = "generate_veo_prompt";
if (mode === "leonardo") fn = "generate_leonardo_prompt";
if (mode === "tiktok") fn = "generate_tiktok_carousel";
if (mode === "infographic") fn = "generate_infographic";
if (mode === "analyze_video") fn = "analyze_video";
if (mode === "combine_photos") fn = "combine_photos";
  if (fn === "generate_infographic") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/generate-infographic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: args.topic || args.prompt || ""
      })
    });

    return await res.json();
  }

  if (fn === "generate_tiktok_carousel") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/generate-tiktok-carousel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: args.topic || args.prompt || ""
      })
    });

    return await res.json();
  }

  if (fn === "generate_leonardo_prompt") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/generate-leonardo-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: args.topic || args.prompt || ""
      })
    });

    return await res.json();
  }

  if (fn === "generate_veo_prompt") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/generate-veo-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: args.topic || args.prompt || ""
      })
    });

    return await res.json();
  }

  if (fn === "analyze_video") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/analyze-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: args.prompt || ""
      })
    });

    return await res.json();
  }

  return {
    success: false,
    message: `Tool ${fn} tidak dikenali`
  };
}

app.post("/api/gemini-chat", async (req, res) => {

  try {

    const { message } = req.body;

    const firstPass = await callGeminiWithTools(message);

    const part =
      firstPass?.candidates?.[0]?.content?.parts?.[0];

    if (!part) {
      return res.json({
        success: false,
        result: "Tidak ada respon"
      });
    }

    if (part.functionCall) {

      const toolResult = await runTool(part.functionCall);

      return res.json({
        success: true,
        tool: part.functionCall.name,
        result: toolResult
      });

    }

    return res.json({
      success: true,
      result: part.text
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

app.listen(PORT, () => {

  console.log("Gemini bridge running on port", PORT);

});
