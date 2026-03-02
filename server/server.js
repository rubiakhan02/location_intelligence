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
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash-latest",
  "gemini-2.5-flash",
].filter(Boolean);
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (ai) {
  console.log("GoogleGenAI initialized");
} else {
  console.log("No API key provided; running with fallback responses");
}

const store = new Map();
const inputKeyMap = new Map();

const CATEGORY_CONFIG = {
  L: {
    name: "Local Economy & Indicators",
    maxScore: 200,
    sections: ["Overview", "Jobs & Diversification", "Population & Urbanisation"],
  },
  O: {
    name: "Ongoing / Future Projects",
    maxScore: 150,
    sections: ["Catalysts"],
  },
  C: {
    name: "Connectivity & Commute",
    maxScore: 150,
    sections: ["Intra-City Connectivity", "Regional Connectivity"],
  },
  A: {
    name: "Amenities & Gentrification",
    maxScore: 150,
    sections: ["Lifestyle", "Social Infra", "Gentrification"],
  },
  T: {
    name: "Trends & Historical Data",
    maxScore: 150,
    sections: ["Prices & Yields", "Market Behaviour"],
  },
  E: {
    name: "Existing Supply vs Demand",
    maxScore: 200,
    sections: ["Supply", "Demand", "Absorption"],
  },
};

const CATEGORY_ORDER = ["L", "O", "C", "A", "T", "E"];

const MODEL_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    cityName: { type: Type.STRING },
    altName: { type: Type.STRING },
    state: { type: Type.STRING },
    focus: { type: Type.STRING },
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          name: { type: Type.STRING },
          score: { type: Type.NUMBER },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING },
              },
              required: ["title", "body"],
            },
          },
        },
        required: ["code", "score", "sections"],
      },
    },
    headlineVerdict: { type: Type.STRING },
    nearbyLandmarks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          distanceKm: { type: Type.NUMBER },
        },
        required: ["name", "category", "distanceKm"],
      },
    },
    interpretation: {
      type: Type.OBJECT,
      properties: {
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        watchOuts: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["strengths", "watchOuts"],
    },
    recommendations: {
      type: Type.OBJECT,
      properties: {
        microMarketStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
        developerAndInfra: { type: Type.ARRAY, items: { type: Type.STRING } },
        assetType: { type: Type.ARRAY, items: { type: Type.STRING } },
        holdingHorizon: { type: Type.STRING },
      },
      required: ["microMarketStrategy", "developerAndInfra", "assetType", "holdingHorizon"],
    },
    verdictText: { type: Type.STRING },
  },
  required: [
    "cityName",
    "altName",
    "state",
    "focus",
    "categories",
    "headlineVerdict",
    "nearbyLandmarks",
    "interpretation",
    "recommendations",
    "verdictText",
  ],
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

const LANDMARK_VERIFICATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nearbyLandmarks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          distanceKm: { type: Type.NUMBER },
        },
        required: ["name", "category", "distanceKm"],
      },
    },
  },
  required: ["nearbyLandmarks"],
};

const normalize = (value) => (value || "").trim();
const getInputKey = (city, locality) =>
  `${normalize(city).toLowerCase()}::${normalize(locality).toLowerCase()}`;

const slugifyCity = (value) =>
  normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown-city";

const stableSeed = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647;
};

const seededInt = (seedObj, min, max) => {
  seedObj.value = (seedObj.value * 48271) % 2147483647;
  return min + (seedObj.value % (max - min + 1));
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

const clampByMax = (value, max) => Math.max(0, Math.min(max, Number(value) || 0));

const buildGrade = (totalScore) => {
  if (totalScore >= 900) return { grade: "A+", gradeLabel: "Excellent" };
  if (totalScore >= 850) return { grade: "A", gradeLabel: "Excellent" };
  if (totalScore >= 800) return { grade: "B+", gradeLabel: "Very Strong" };
  if (totalScore >= 750) return { grade: "B", gradeLabel: "Strong" };
  if (totalScore >= 700) return { grade: "C+", gradeLabel: "Stable" };
  if (totalScore >= 650) return { grade: "C", gradeLabel: "Moderate" };
  return { grade: "D", gradeLabel: "Weak" };
};

const getDefaultBody = (title, city, locality) => {
  if (title === "Overview") return `${locality} in ${city} has locality-level demand linked to city economic fundamentals.`;
  if (title === "Jobs & Diversification") return `Employment catchments near ${locality} support residential and rental demand with sector diversification.`;
  if (title === "Population & Urbanisation") return `Household formation and migration into ${locality} remain key to sustained absorption.`;
  if (title === "Catalysts") return `Mobility, civic, and commercial projects around ${locality} can improve long-run value if delivered on time.`;
  if (title === "Intra-City Connectivity") return `${locality} has functional city access, though peak-hour congestion can affect commute reliability.`;
  if (title === "Regional Connectivity") return `Regional links through highways, rail, and airport access shape the locality's market depth.`;
  if (title === "Lifestyle") return `Retail, food, and daily-needs ecosystems around ${locality} support end-user livability.`;
  if (title === "Social Infra") return `Schools and hospitals in and around ${locality} influence family-led housing preference.`;
  if (title === "Gentrification") return `${locality} is in an evolving urbanization cycle with selective premiumization.`;
  if (title === "Prices & Yields") return `Price growth and rental yields in ${locality} indicate a balance between capital upside and income performance.`;
  if (title === "Market Behaviour") return `Demand resilience in ${locality} is strongest in well-connected and correctly priced sub-markets.`;
  if (title === "Supply") return `Pipeline supply in ${locality} should be monitored for timing and segment concentration.`;
  if (title === "Demand") return `End-user and tenant interest in ${locality} depends on jobs access, livability, and affordability.`;
  if (title === "Absorption") return `Absorption in ${locality} is strongest where pricing, location, and delivery quality align.`;
  return `${locality} in ${city} shows relevant locality-level dynamics.`;
};

const normalizeSections = (rawSections, sectionTitles, city, locality) => {
  const safeSections = Array.isArray(rawSections) ? rawSections : [];

  return sectionTitles.map((title, index) => {
    const byTitle = safeSections.find(
      (s) => normalize(s?.title).toLowerCase() === title.toLowerCase(),
    );
    const byIndex = safeSections[index];
    const source = byTitle || byIndex || {};
    const body = normalize(source.body) || getDefaultBody(title, city, locality);

    return { title, body };
  });
};

const normalizeStringArray = (input, fallbackItem) => {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = arr.map((x) => normalize(String(x || ""))).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [fallbackItem];
};

const normalizeLandmarkCategory = (value) => {
  const v = normalize(value).toLowerCase();
  if (v.includes("mall")) return "Mall";
  if (v.includes("university") || v.includes("college")) return "University";
  if (v.includes("metro")) return "Metro Station";
  if (v.includes("hospital")) return "Hospital";
  if (v.includes("airport")) return "Airport";
  if (v.includes("school")) return "School";
  if (v.includes("park")) return "Park";
  if (v.includes("rail")) return "Railway Station";
  if (v.includes("it") || v.includes("tech")) return "IT Park";
  return "";
};

const isLowConfidenceLandmark = (name) => {
  const n = normalize(name).toLowerCase();
  if (!n) return true;
  return [
    "famous mall",
    "local university",
    "nearest metro station",
    "city hospital",
    "major airport",
    "public school",
    "central park",
    "unknown landmark",
    "unnamed landmark",
  ].includes(n);
};

const normalizeNearbyLandmarks = (input) => {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((item) => {
      const name = normalize(item?.name);
      const category = normalizeLandmarkCategory(item?.category);
      const distanceKm = Math.round(Math.max(0, Number(item?.distanceKm) || 0) * 100) / 100;
      return { name, category, distanceKm };
    })
    .filter((item) => item.name && item.category && !isLowConfidenceLandmark(item.name))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
    .slice(0, 10);
};

const verifyNearbyLandmarks = async (city, locality, landmarks, key) => {
  const cleaned = normalizeNearbyLandmarks(landmarks);
  if (!ai || cleaned.length === 0) return cleaned;

  try {
    const response = await generateContentWithModelFallback((model) => ({
      model,
      contents: `Validate this landmark list for locality accuracy.\nCity: "${city}"\nLocality: "${locality}"\nCandidate landmarks JSON: ${JSON.stringify(cleaned)}\nRules:\n1. Keep only landmarks that are genuinely associated with this locality/city context.\n2. Remove doubtful, generic, wrongly located, or unverifiable landmarks.\n3. Keep the same schema with keys: name, category, distanceKm.\n4. If uncertain about all landmarks, return an empty nearbyLandmarks array.\n5. Do not invent new landmarks.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: LANDMARK_VERIFICATION_SCHEMA,
        temperature: 0,
        topP: 0,
        topK: 1,
        candidateCount: 1,
        seed: stableSeed(`landmark-verify::${key}`),
      },
    }));

    const parsed = JSON.parse(response.text || '{"nearbyLandmarks": []}');
    return normalizeNearbyLandmarks(parsed?.nearbyLandmarks);
  } catch (error) {
    console.error("Landmark verification error:", error);
    return cleaned;
  }
};

const getCategoryRanges = () => ({
  L: [115, 180],
  O: [75, 135],
  C: [80, 135],
  A: [85, 140],
  T: [80, 135],
  E: [100, 175],
});

const fallbackLocateReport = (city, locality, key) => {
  const seed = { value: stableSeed(`fallback::${key}`) || 137 };
  const ranges = getCategoryRanges();

  const categories = CATEGORY_ORDER.map((code) => {
    const conf = CATEGORY_CONFIG[code];
    const [min, max] = ranges[code];
    const score = seededInt(seed, min, max);

    return {
      code,
      name: conf.name,
      maxScore: conf.maxScore,
      score,
      sections: conf.sections.map((title) => ({ title, body: getDefaultBody(title, city, locality) })),
    };
  });

  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);
  const { grade, gradeLabel } = buildGrade(totalScore);

  return {
    id: 1,
    cityId: slugifyCity(city),
    cityName: city,
    altName: "",
    localityName: locality,
    state: "Unknown",
    focus: "Residential + rental demand driven by local jobs access and infrastructure trajectory",
    evaluationDate: new Date().toISOString().slice(0, 10),
    categories,
    summary: {
      totalScore,
      maxTotalScore: 1000,
      grade,
      gradeLabel,
      headlineVerdict: `${locality}, ${city} is a ${gradeLabel.toLowerCase()} micro-market with selective long-term potential.`,
    },
    nearbyLandmarks: [],
    interpretation: {
      strengths: [
        `Demand in ${locality} benefits from proximity to employment catchments.`,
        `Urban services and social infrastructure support end-user occupancy depth.`,
        `Multiple price points allow strategy choice between yield and appreciation.`,
      ],
      watchOuts: [
        "Infrastructure execution timing can delay expected value unlock.",
        "Congestion and civic-service load can compress livability in peak periods.",
        "Sub-market dispersion can create uneven performance across nearby pockets.",
      ],
    },
    recommendations: {
      microMarketStrategy: [
        `Prioritize projects in ${locality} with proven delivery history and transport-linked positioning.`,
      ],
      developerAndInfra: [
        "Prefer compliant developers and phase entry around on-ground infra completion, not announcements.",
      ],
      assetType: ["Mid-segment residential apartments with recurring rental demand."],
      holdingHorizon: "5-7 years",
    },
    verdictText: `${locality} in ${city} offers viable long-horizon potential when entry pricing and micro-location are disciplined. The market is suitable for investors prioritizing steady compounding over speculative short-cycle flips.`,
  };
};

const normalizeLocateReport = (raw, city, locality) => {
  const categoriesByCode = new Map(
    (Array.isArray(raw?.categories) ? raw.categories : []).map((cat) => [normalize(cat?.code).toUpperCase(), cat]),
  );

  const categories = CATEGORY_ORDER.map((code) => {
    const conf = CATEGORY_CONFIG[code];
    const rawCat = categoriesByCode.get(code) || {};
    const score = Math.round(clampByMax(rawCat?.score, conf.maxScore));

    return {
      code,
      name: conf.name,
      maxScore: conf.maxScore,
      score,
      sections: normalizeSections(rawCat?.sections, conf.sections, city, locality),
    };
  });

  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);
  const { grade, gradeLabel } = buildGrade(totalScore);

  return {
    id: 1,
    cityId: slugifyCity(raw?.cityName || city),
    cityName: normalize(raw?.cityName) || city,
    altName: normalize(raw?.altName),
    localityName: locality,
    state: normalize(raw?.state) || "Unknown",
    focus:
      normalize(raw?.focus) ||
      "Residential + commercial demand shaped by connectivity, jobs access, and social infrastructure",
    evaluationDate: new Date().toISOString().slice(0, 10),
    categories,
    summary: {
      totalScore,
      maxTotalScore: 1000,
      grade,
      gradeLabel,
      headlineVerdict:
        normalize(raw?.headlineVerdict) ||
        `${locality}, ${city} is a ${gradeLabel.toLowerCase()} micro-market with infrastructure-linked upside.`,
    },
    nearbyLandmarks: normalizeNearbyLandmarks(raw?.nearbyLandmarks),
    interpretation: {
      strengths: normalizeStringArray(raw?.interpretation?.strengths, "Structural demand from jobs and livability anchors supports this micro-market."),
      watchOuts: normalizeStringArray(raw?.interpretation?.watchOuts, "Execution delays and localized oversupply remain key watchpoints."),
    },
    recommendations: {
      microMarketStrategy: normalizeStringArray(
        raw?.recommendations?.microMarketStrategy,
        "Focus on transit-proximate, end-user driven pockets with demonstrated rental depth.",
      ),
      developerAndInfra: normalizeStringArray(
        raw?.recommendations?.developerAndInfra,
        "Select credible developers and align entry with tangible infra progress.",
      ),
      assetType: normalizeStringArray(
        raw?.recommendations?.assetType,
        "Mid-segment residential assets with stable tenant demand.",
      ),
      holdingHorizon: normalize(raw?.recommendations?.holdingHorizon) || "5-7 years",
    },
    verdictText:
      normalize(raw?.verdictText) ||
      `${locality} in ${city} has investable fundamentals, but returns will depend on asset quality, entry price, and infra execution.`,
  };
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

const validateInput = async (city, locality, key) => {
  if (isObviouslyGibberish(city) || isObviouslyGibberish(locality)) {
    return { isValid: false, reason: "Invalid input. Enter a valid city and locality." };
  }

  if (!ai) return { isValid: true, reason: "Validation skipped (no API key)." };

  try {
    const response = await generateContentWithModelFallback((model) => ({
      model,
      contents: `Validate this real-estate input.\nCity: "${city}"\nLocality: "${locality}"\nRules:\n1. Accept minor spelling mistakes and typos.\n2. Reject only clear gibberish/random/non-place input.\n3. Return JSON only.`,
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

const detectAmbiguity = async (city, locality, key) => {
  if (!ai) return { isAmbiguous: false, suggestedCities: [] };

  const query = `${locality} ${city}`.trim();
  const response = await generateContentWithModelFallback((model) => ({
    model,
    contents: `Determine if "${query}" is ambiguous geographically. If this locality can refer to multiple cities, return isAmbiguous true with suggestedCities. If specific enough, return isAmbiguous false.`,
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

const analyze = async (city, locality, key) => {
  if (!ai) return fallbackLocateReport(city, locality, key);

  const prompt = `You are an urban economics and real-estate intelligence engine.
Generate a LOCATE Score Report (out of 1000) for Locality: ${locality}, City: ${city}.
Use realistic locality-level signals only; avoid fabricated mega projects.
Category score limits:
L max 200, O max 150, C max 150, A max 150, T max 150, E max 200.
Return strictly valid JSON with keys:
cityName, altName, state, focus, categories, headlineVerdict, nearbyLandmarks, interpretation, recommendations, verdictText.
For categories include codes L,O,C,A,T,E with score and sections.
Section titles must be:
L: Overview, Jobs & Diversification, Population & Urbanisation
O: Catalysts
C: Intra-City Connectivity, Regional Connectivity
A: Lifestyle, Social Infra, Gentrification
T: Prices & Yields, Market Behaviour
E: Supply, Demand, Absorption
For nearbyLandmarks:
- Return 6-10 real nearby landmarks for this exact locality only.
- Prefer categories: Mall, University, Metro Station, Hospital, Airport, School, Park, Railway Station, IT Park.
- Include distanceKm as realistic approximate road distance.
- If uncertain about accuracy, return an empty array.
Keep tone professional and investment-grade.`;

  const response = await generateContentWithModelFallback((model) => ({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: MODEL_REPORT_SCHEMA,
      temperature: 0,
      topP: 0,
      topK: 1,
      candidateCount: 1,
      seed: stableSeed(`analysis::${key}`),
    },
  }));

  const parsed = JSON.parse(response.text || "{}");
  parsed.nearbyLandmarks = await verifyNearbyLandmarks(
    city,
    locality,
    parsed?.nearbyLandmarks,
    key,
  );
  return normalizeLocateReport(parsed, city, locality);
};

const processRequest = async (item) => {
  const key = getInputKey(item.city, item.locality);

  const [validation, ambiguity] = await Promise.all([
    validateInput(item.city, item.locality, key),
    detectAmbiguity(item.city, item.locality, key),
  ]);

  if (!validation.isValid) {
    return {
      status: "invalid_input",
      result: null,
      error: validation.reason || "Invalid input. Enter a valid city and locality.",
    };
  }

  if (ambiguity.isAmbiguous && Array.isArray(ambiguity.suggestedCities) && ambiguity.suggestedCities.length > 1) {
    return {
      status: "needs_clarification",
      result: null,
      error: "Input is ambiguous. Please choose a city.",
      suggestedCities: ambiguity.suggestedCities,
    };
  }

  const result = await analyze(item.city, item.locality, key);
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

app.post("/api/input", (req, res) => {
  const city = normalize(req.body?.city);
  const locality = normalize(req.body?.locality ?? req.body?.sector);

  if (!city || !locality) {
    return res.status(400).json({ error: "Both city and locality are required." });
  }

  const key = getInputKey(city, locality);
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
    locality,
    status: "pending",
    result: null,
    error: null,
    suggestedCities: [],
  });

  return res.json({ id, status: "pending" });
});

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
    const fallback = fallbackLocateReport(item.city, item.locality, getInputKey(item.city, item.locality));
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
