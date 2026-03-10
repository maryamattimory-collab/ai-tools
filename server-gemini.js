const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 8081;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAIN_TOOL_URL =
  process.env.MAIN_TOOL_URL || "https://ai-tools-production-5cad.up.railway.app";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

async function callGeminiWithTools(message) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "generate_infographic",
                description: "Buat konsep infografis dari sebuah topik.",
                parameters: {
                  type: "object",
                  properties: {
                    topic: {
                      type: "string",
                      description: "Topik infografis",
                    },
                    platform: {
                      type: "string",
                      description: "Platform output, misalnya Instagram",
                    },
                    style: {
                      type: "string",
                      description: "Gaya desain, misalnya Modern",
                    },
                    extraPrompt: {
                      type: "string",
                      description: "Instruksi tambahan",
                    },
                  },
                  required: ["topic"],
                },
              },
              {
                name: "analyze_video",
                description: "Analisa video referensi menjadi scene-by-scene prompt.",
                parameters: {
                  type: "object",
                  properties: {
                    prompt: {
                      type: "string",
                      description: "Instruksi analisa video",
                    },
                    language: {
                      type: "string",
                      description: "Bahasa output",
                    },
                    style: {
                      type: "string",
                      description: "Style visual",
                    },
                  },
                },
              },
              {
                name: "merge_photos",
                description: "Gabungkan beberapa foto menjadi satu konsep visual cinematic.",
                parameters: {
                  type: "object",
                  properties: {
                    userPrompt: {
                      type: "string",
                      description: "Instruksi visual tambahan",
                    },
                  },
                },
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini API Error");
  }

  return data;
}

async function runTool(functionCall) {
  const fn = functionCall.name;
  const args = functionCall.args || {};

  if (fn === "generate_infographic") {
    const res = await fetch(`${MAIN_TOOL_URL}/api/generate-infographic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: args.topic || "",
        platform: args.platform || "Instagram",
        style: args.style || "Modern",
        extraPrompt: args.extraPrompt || "",
      }),
    });

    return await res.json();
  }

  if (fn === "analyze_video") {
    return {
      success: false,
      message:
        "Fitur analyze_video butuh upload video file, jadi belum cocok untuk chat text-only.",
    };
  }

  if (fn === "merge_photos") {
    return {
      success: false,
      message:
        "Fitur merge_photos butuh upload gambar, jadi belum cocok untuk chat text-only.",
    };
  }

  return {
    success: false,
    message: `Tool ${fn} tidak dikenali.`,
  };
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Studio Pro Gemini Bridge Aktif",
    model: MODEL,
    apiKey: API_KEY ? "Terkonfigurasi" : "Belum ada",
    mainToolUrl: MAIN_TOOL_URL,
  });
});

app.post("/api/gemini-chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message kosong." });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY tidak ditemukan." });
    }

    const firstPass = await callGeminiWithTools(message);
    const part = firstPass?.candidates?.[0]?.content?.parts?.[0];

    if (!part?.functionCall) {
      const normalText =
        firstPass?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") ||
        "Tidak ada hasil.";
      return res.json({
        success: true,
        mode: "normal",
        result: normalText,
      });
    }

    const toolResult = await runTool(part.functionCall);

    return res.json({
      success: true,
      mode: "tool",
      tool: part.functionCall.name,
      args: part.functionCall.args || {},
      result: toolResult,
    });
  } catch (err) {
    console.error("Gemini Bridge Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gemini Bridge berjalan di port ${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Main Tool URL: ${MAIN_TOOL_URL}`);
});
