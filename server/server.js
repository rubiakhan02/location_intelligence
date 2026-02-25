import express from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
].filter(Boolean);
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (ai) {
  console.log("GoogleGenAI initialized");
} else {
  console.log("No API key provided; running with fallback responses");
}

const store = new Map(); // id -> request state
const inputKeyMap = new Map(); // normalized input key -> id

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    city: { type: Type.STRING },
    sector: { type: Type.STRING },
    overallScore: { type: Type.NUMBER },
    label: { type: Type.STRING },
    breakdown: {
      type: Type.OBJECT,
      properties: {
        connectivity: { type: Type.NUMBER },
        healthcare: { type: Type.NUMBER },
        education: { type: Type.NUMBER },
        retail: { type: Type.NUMBER },
        employment: { type: Type.NUMBER },
      },
      required: ["connectivity", "healthcare", "education", "retail", "employment"],
    },
    infrastructure: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          distance: { type: Type.NUMBER },
        },
        required: ["name", "category", "distance"],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ["city", "sector", "overallScore", "label", "breakdown", "infrastructure", "summary"],
};

const MATCH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isAmbiguous: { type: Type.BOOLEAN },
    suggestedCities: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["isAmbiguous", "suggestedCities"],
};

const VALIDATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reason: { type: Type.STRING },
  },
  required: ["isValid", "reason"],
};

const normalize = (value) => (value || "").trim();
const getInputKey = (city, sector) =>
  `${normalize(city).toLowerCase()}::${normalize(sector).toLowerCase()}`;

const stableSeed = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647;
};

const generateContentWithModelFallback = async (buildRequest) => {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      return await ai.models.generateContent(buildRequest(model));
    } catch (error) {
      const message = String(error?.message || "");
      const isModelNotFound = message.includes("not found") || message.includes("NOT_FOUND");
      if (!isModelNotFound) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError || new Error("No compatible Gemini model found.");
};

const clampScore = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const ACCURATE_LANDMARK_DATA_UNAVAILABLE =
  "Accurate landmark data not available for this exact location.";

const normalizeCategory = (value) => {
  const v = (value || "").trim().toLowerCase();
  if (v === "metro") return "Metro";
  if (v === "hospital") return "Hospital";
  if (v === "school") return "School";
  if (v === "mall") return "Mall";
  if (v === "park") return "Park";
  return "Office";
};

const isGenericLandmarkName = (name) => {
  const normalized = (name || "").trim().toLowerCase();
  if (!normalized) return true;
  return [
    "express link metro",
    "city wellness center",
    "global international school",
    "unnamed infrastructure",
  ].includes(normalized);
};

const isObviouslyGibberish = (value) => {
  const text = normalize(value);
  if (!text || text.length < 2) return true;
  if (/[0-9]{5,}/.test(text)) return true;
  if (/[^a-zA-Z0-9\s,.'-]/.test(text)) return true;
  if (/([a-zA-Z])\1{3,}/.test(text)) return true;

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return true;
  if (!/[aeiouAEIOU]/.test(letters) && letters.length > 4) return true;

  return false;
};

const fallbackAnalysis = (city, sector) => ({
  city: city || "Unknown Indian City",
  sector: sector || "General District",
  overallScore: 88.5,
  label: "High Growth",
  breakdown: {
    connectivity: 92,
    healthcare: 85,
    education: 88,
    retail: 82,
    employment: 90,
  },
  infrastructure: [],
  summary: ACCURATE_LANDMARK_DATA_UNAVAILABLE,
});

const computeLabel = (overallScore) => {
  if (overallScore >= 90) return "Excellent";
  if (overallScore >= 82) return "High Growth";
  if (overallScore >= 74) return "Good";
  return "Emerging";
};

const normalizeAnalysis = (raw, city, sector) => {
  const breakdown = {
    connectivity: Math.round(clampScore(raw?.breakdown?.connectivity ?? 0) * 10) / 10,
    healthcare: Math.round(clampScore(raw?.breakdown?.healthcare ?? 0) * 10) / 10,
    education: Math.round(clampScore(raw?.breakdown?.education ?? 0) * 10) / 10,
    retail: Math.round(clampScore(raw?.breakdown?.retail ?? 0) * 10) / 10,
    employment: Math.round(clampScore(raw?.breakdown?.employment ?? 0) * 10) / 10,
  };

  const overallScore =
    Math.round(
      clampScore(
        breakdown.connectivity * 0.25 +
        breakdown.healthcare * 0.15 +
        breakdown.education * 0.15 +
        breakdown.retail * 0.15 +
        breakdown.employment * 0.15,
      ) * 10,
    ) / 10;

  const infrastructure = (raw?.infrastructure || [])
    .map((item) => ({
      name: (item?.name || "").trim(),
      category: normalizeCategory(item?.category || ""),
      distance: Math.round(Math.max(0, Number(item?.distance) || 0) * 100) / 100,
    }))
    .filter((item) => Boolean(item.name) && !isGenericLandmarkName(item.name))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 8);

  return {
    city: raw?.city || city,
    sector: raw?.sector || sector,
    overallScore,
    label: computeLabel(overallScore),
    breakdown,
    infrastructure,
    summary:
      infrastructure.length === 0
        ? ACCURATE_LANDMARK_DATA_UNAVAILABLE
        : (raw?.summary ||
          "This Indian location demonstrates strong appreciation potential driven by connectivity, services, and employment access."),
  };
};

const validateInput = async (city, sector, key) => {
  if (isObviouslyGibberish(city) || isObviouslyGibberish(sector)) {
    return { isValid: false, reason: "Invalid input. Enter a valid city and locality." };
  }

  if (!ai) return { isValid: true, reason: "Validation skipped (no API key)." };

  try {
    const response = await generateContentWithModelFallback((model) => ({
      model,
      contents: `Validate this INDIA real-estate input.
City: "${city}"
Locality: "${sector}"
Rules:
1. Accept minor spelling mistakes and typos.
2. Reject only clear gibberish/random/non-place input.
3. Return JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: VALIDATION_SCHEMA,
        temperature: 0,
        topP: 0,
        topK: 1,
        candidateCount: 1,
        seed: stableSeed(`validate::${key}`),
      },
    }));

    const parsed = JSON.parse(response.text || '{"isValid": true, "reason": "Valid input"}');
    return {
      isValid: Boolean(parsed.isValid),
      reason: parsed.reason || (parsed.isValid ? "Valid input." : "Invalid input."),
    };
  } catch (error) {
    console.error("Validation error:", error);
    return { isValid: true, reason: "Validation unavailable, proceeding." };
  }
};

const detectAmbiguity = async (city, sector, key) => {
  if (!ai) return { isAmbiguous: false, suggestedCities: [] };

  const query = `${sector} ${city}`.trim();
  const response = await generateContentWithModelFallback((model) => ({
    model,
    contents: `Determine if "${query}" is ambiguous within INDIA only.
If this locality can refer to multiple Indian cities, return isAmbiguous true with suggestedCities.
If specific enough, return isAmbiguous false.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: MATCH_SCHEMA,
      temperature: 0,
      topP: 0,
      topK: 1,
      candidateCount: 1,
      seed: stableSeed(`match::${key}`),
    },
  }));

  return JSON.parse(response.text || '{"isAmbiguous": false, "suggestedCities": []}');
};

const analyze = async (city, sector, key) => {
  if (!ai) return fallbackAnalysis(city, sector);

  const prompt = `Perform a detailed real-estate Market Potential Factor (MPF) analysis for Locality: ${sector}, City: ${city}, Country: INDIA.
STRICT REQUIREMENT: only INDIA context.
Scoring: 0-100 for connectivity, healthcare, education, retail, employment.
Return JSON keys: city, sector, overallScore, label, breakdown, infrastructure, summary.`;

  const response = await generateContentWithModelFallback((model) => ({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
      topP: 0,
      topK: 1,
      candidateCount: 1,
      seed: stableSeed(`analysis::${key}`),
    },
  }));

  const parsed = JSON.parse(response.text || "{}");
  return normalizeAnalysis(parsed, city, sector);
};

const processRequest = async (item) => {
  const key = getInputKey(item.city, item.sector);

  const validation = await validateInput(item.city, item.sector, key);
  if (!validation.isValid) {
    return {
      status: "invalid_input",
      result: null,
      error: validation.reason || "Invalid input. Enter a valid city and locality.",
    };
  }

  const ambiguity = await detectAmbiguity(item.city, item.sector, key);
  if (ambiguity.isAmbiguous && Array.isArray(ambiguity.suggestedCities) && ambiguity.suggestedCities.length > 1) {
    return {
      status: "needs_clarification",
      result: null,
      error: "Input is ambiguous. Please choose a city.",
      suggestedCities: ambiguity.suggestedCities,
    };
  }

  const result = await analyze(item.city, item.sector, key);
  return { status: "done", result, error: null, suggestedCities: [] };
};

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.get("/", (req, res) => {
  res.json({
    message: "API server running",
    endpoints: ["POST /api/input", "GET /api/reply/:id"],
  });
});

// Endpoint 1: Accept city + locality and issue deterministic request id.
app.post("/api/input", (req, res) => {
  const city = normalize(req.body?.city);
  const sector = normalize(req.body?.sector);

  if (!city || !sector) {
    return res.status(400).json({ error: "Both city and sector are required." });
  }

  const key = getInputKey(city, sector);
  if (inputKeyMap.has(key)) {
    const existingId = inputKeyMap.get(key);
    const existing = store.get(existingId);
    return res.json({ id: existingId, status: existing?.status || "pending" });
  }

  const id = crypto.createHash("sha256").update(key).digest("hex");
  inputKeyMap.set(key, id);
  store.set(id, {
    id,
    city,
    sector,
    status: "pending",
    result: null,
    error: null,
    suggestedCities: [],
  });

  return res.json({ id, status: "pending" });
});

// Endpoint 2: Returns computed result for id (or computes once and caches it).
app.get("/api/reply/:id", async (req, res) => {
  const { id } = req.params;
  const item = store.get(id);

  if (!item) {
    return res.status(404).json({ error: "id not found" });
  }

  if (item.status !== "pending") {
    return res.json({
      id,
      status: item.status,
      result: item.result,
      error: item.error,
      suggestedCities: item.suggestedCities || [],
    });
  }

  try {
    const processed = await processRequest(item);
    const updated = { ...item, ...processed };
    store.set(id, updated);

    return res.json({
      id,
      status: updated.status,
      result: updated.result,
      error: updated.error,
      suggestedCities: updated.suggestedCities || [],
    });
  } catch (error) {
    console.error("Processing error:", error);
    const fallback = fallbackAnalysis(item.city, item.sector);
    const updated = {
      ...item,
      status: "done",
      result: fallback,
      error: "Model unavailable. Returned fallback response.",
      suggestedCities: [],
    };
    store.set(id, updated);

    return res.json({
      id,
      status: updated.status,
      result: updated.result,
      error: updated.error,
      suggestedCities: updated.suggestedCities,
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
