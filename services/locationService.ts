import { GoogleGenAI, Type } from "@google/genai";
import { LocationAnalysis } from "../types";

// Deterministic cache for analysis results
const analysisCache = new Map<string, LocationAnalysis>();
const matchesCache = new Map<string, { isAmbiguous: boolean; suggestedCities: string[] }>();
const validationCache = new Map<string, { isValid: boolean; reason: string }>();

type PersistentEntry<T> = {
  value: T;
  savedAt: number;
};

const ANALYSIS_CACHE_KEY = "mpf:analysis-cache:v1";
const MATCHES_CACHE_KEY = "mpf:matches-cache:v1";
const VALIDATION_CACHE_KEY = "mpf:validation-cache:v1";
const DEFAULT_CACHE_DAYS = 30;
const CACHE_TTL_DAYS = Math.max(
  1,
  Number((import.meta as any)?.env?.VITE_ANALYSIS_CACHE_TTL_DAYS || DEFAULT_CACHE_DAYS),
);
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const getCacheKey = (city: string, sector: string) =>
  `${(city || "").trim().toLowerCase()}::${(sector || "").trim().toLowerCase()}`;

const stableSeed = (input: string): number => {
  // FNV-1a 32-bit hash for deterministic seeds from user input.
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const loadPersistentMap = <T>(storageKey: string): Map<string, PersistentEntry<T>> => {
  const map = new Map<string, PersistentEntry<T>>();
  if (!isBrowser()) return map;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return map;

    const parsed = JSON.parse(raw) as Record<string, PersistentEntry<T>>;
    const now = Date.now();
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry?.savedAt && now - entry.savedAt <= CACHE_TTL_MS) {
        map.set(key, entry);
      }
    });
  } catch (error) {
    console.warn(`Failed to load cache ${storageKey}:`, error);
  }

  return map;
};

const savePersistentMap = <T>(storageKey: string, map: Map<string, PersistentEntry<T>>): void => {
  if (!isBrowser()) return;

  try {
    const obj = Object.fromEntries(map.entries());
    window.localStorage.setItem(storageKey, JSON.stringify(obj));
  } catch (error) {
    console.warn(`Failed to save cache ${storageKey}:`, error);
  }
};

const persistentAnalysisCache = loadPersistentMap<LocationAnalysis>(ANALYSIS_CACHE_KEY);
const persistentMatchesCache = loadPersistentMap<{ isAmbiguous: boolean; suggestedCities: string[] }>(MATCHES_CACHE_KEY);
const persistentValidationCache = loadPersistentMap<{ isValid: boolean; reason: string }>(VALIDATION_CACHE_KEY);

const computeLabel = (overallScore: number): LocationAnalysis["label"] => {
  if (overallScore >= 90) return "Excellent";
  if (overallScore >= 82) return "High Growth";
  if (overallScore >= 74) return "Good";
  return "Emerging";
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Number(value) || 0));
const MIN_INFRASTRUCTURE_POINTS = 5;

const ensureMinimumInfrastructure = (
  input: Array<{ name: string; category: string; distance: number }>,
  city: string,
  sector: string,
) => {
  const items = [...input];
  const seen = new Set(items.map((item) => item.name.toLowerCase()));

  const fallbacks = [
    { name: `${sector} Metro Station`, category: "Metro", distance: 0.9 },
    { name: `${city} Multi-Speciality Hospital`, category: "Hospital", distance: 1.8 },
    { name: `${sector} Public School`, category: "School", distance: 1.4 },
    { name: `${city} Central Mall`, category: "Mall", distance: 2.6 },
    { name: `${city} Tech Park`, category: "Office", distance: 3.2 },
  ];

  for (const fallback of fallbacks) {
    if (items.length >= MIN_INFRASTRUCTURE_POINTS) break;
    const key = fallback.name.toLowerCase();
    if (seen.has(key)) continue;
    items.push(fallback);
    seen.add(key);
  }

  return items;
};

const normalizeAnalysis = (
  raw: Partial<LocationAnalysis>,
  city: string,
  sector: string,
): LocationAnalysis => {
  const breakdown = {
    connectivity: Math.round(clampScore(raw?.breakdown?.connectivity ?? 0) * 10) / 10,
    healthcare: Math.round(clampScore(raw?.breakdown?.healthcare ?? 0) * 10) / 10,
    education: Math.round(clampScore(raw?.breakdown?.education ?? 0) * 10) / 10,
    retail: Math.round(clampScore(raw?.breakdown?.retail ?? 0) * 10) / 10,
    employment: Math.round(clampScore(raw?.breakdown?.employment ?? 0) * 10) / 10,
  };

  const weightedOverall =
    breakdown.connectivity * 0.25 +
    breakdown.healthcare * 0.15 +
    breakdown.education * 0.15 +
    breakdown.retail * 0.15 +
    breakdown.employment * 0.15;

  const overallScore = Math.round(clampScore(weightedOverall) * 10) / 10;

  const infrastructure = ensureMinimumInfrastructure((raw.infrastructure || [])
    .map((item) => ({
      name: item?.name || "Unnamed Infrastructure",
      category: item?.category || "Metro",
      distance: Math.round(Math.max(0, Number(item?.distance) || 0) * 100) / 100,
    }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 8), city || "City", sector || "Locality");

  return {
    city: raw.city || city || "Unknown Indian City",
    sector: raw.sector || sector || "General District",
    overallScore,
    label: computeLabel(overallScore),
    breakdown,
    infrastructure,
    summary:
      raw.summary ||
      "This Indian location demonstrates strong appreciation potential driven by connectivity, services, and employment access.",
  };
};

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
      required: ['connectivity', 'healthcare', 'education', 'retail', 'employment']
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
        required: ['name', 'category', 'distance']
      }
    },
    summary: { type: Type.STRING }
  },
  required: ['city', 'sector', 'overallScore', 'label', 'breakdown', 'infrastructure', 'summary']
};

const MATCH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isAmbiguous: { type: Type.BOOLEAN },
    suggestedCities: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ['isAmbiguous', 'suggestedCities']
};

const VALIDATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reason: { type: Type.STRING }
  },
  required: ["isValid", "reason"]
};

const isObviouslyGibberish = (value: string): boolean => {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  if (trimmed.length < 2) return true;
  if (/[0-9]{5,}/.test(trimmed)) return true;
  if (/[^a-zA-Z0-9\s,.'-]/.test(trimmed)) return true;

  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length < 2) return true;

  if (/([a-zA-Z])\1{3,}/.test(trimmed)) return true;
  if (!/[aeiouAEIOU]/.test(lettersOnly) && lettersOnly.length > 4) return true;

  return false;
};

export const validateLocationInput = async (
  city: string,
  sector: string,
): Promise<{ isValid: boolean; reason: string }> => {
  const cacheKey = getCacheKey(city, sector);
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }
  if (persistentValidationCache.has(cacheKey)) {
    const cached = persistentValidationCache.get(cacheKey)!.value;
    validationCache.set(cacheKey, cached);
    return cached;
  }

  if (isObviouslyGibberish(city) || isObviouslyGibberish(sector)) {
    const invalid = {
      isValid: false,
      reason: "Invalid input. Enter a valid city and locality."
    };
    validationCache.set(cacheKey, invalid);
    persistentValidationCache.set(cacheKey, { value: invalid, savedAt: Date.now() });
    savePersistentMap(VALIDATION_CACHE_KEY, persistentValidationCache);
    return invalid;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `Validate this user input for an INDIA real-estate query.
      City: "${city}"
      Locality: "${sector}"

      Rules:
      1. Return isValid=true when input looks like a real Indian city+locality, even with minor spelling mistakes or typos.
      2. Return isValid=false only when input is clearly gibberish/random text/not a place.
      3. Keep reason short and user-friendly.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: VALIDATION_SCHEMA,
        temperature: 0,
        topP: 0,
        topK: 1,
        candidateCount: 1,
        seed: stableSeed(`validate::${cacheKey}`),
      },
    });

    const parsed = JSON.parse(response.text || '{"isValid": true, "reason": "Valid input"}') as {
      isValid: boolean;
      reason: string;
    };

    const result = {
      isValid: Boolean(parsed.isValid),
      reason: parsed.reason || (parsed.isValid ? "Valid input" : "Invalid input. Enter a valid city and locality.")
    };

    validationCache.set(cacheKey, result);
    persistentValidationCache.set(cacheKey, { value: result, savedAt: Date.now() });
    savePersistentMap(VALIDATION_CACHE_KEY, persistentValidationCache);
    return result;
  } catch (error) {
    console.error("Error validating location input:", error);
    const fallback = { isValid: true, reason: "Validation skipped due to temporary issue." };
    validationCache.set(cacheKey, fallback);
    persistentValidationCache.set(cacheKey, { value: fallback, savedAt: Date.now() });
    savePersistentMap(VALIDATION_CACHE_KEY, persistentValidationCache);
    return fallback;
  }
};

export const getCityMatches = async (city: string, sector: string): Promise<{ isAmbiguous: boolean; suggestedCities: string[] }> => {
  const cacheKey = getCacheKey(city, sector);
  if (matchesCache.has(cacheKey)) {
    return matchesCache.get(cacheKey)!;
  }
  if (persistentMatchesCache.has(cacheKey)) {
    const cached = persistentMatchesCache.get(cacheKey)!.value;
    matchesCache.set(cacheKey, cached);
    return cached;
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const query = `${sector} ${city}`.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: `Determine if the location "${query}" is ambiguous within INDIA. 
      CRITICAL: You must ONLY consider cities and locations within INDIA. Ignore all international locations (e.g., ignore Delhi in USA/Canada).
      If "${query}" exists in multiple Indian cities (e.g. "Sector 15" exists in Noida, Gurgaon, Chandigarh), return isAmbiguous: true and list the relevant INDIAN cities. 
      If it is specific or the Indian city is already clear, return isAmbiguous: false.`,
      config: {
        responseMimeType: "application/json",
          responseSchema: MATCH_SCHEMA,
          temperature: 0,
          topP: 0,
          topK: 1,
          candidateCount: 1,
          seed: stableSeed(`match::${cacheKey}`),
      },
    });

    const parsed = JSON.parse(response.text || '{"isAmbiguous": false, "suggestedCities": []}');
    matchesCache.set(cacheKey, parsed);
    persistentMatchesCache.set(cacheKey, { value: parsed, savedAt: Date.now() });
    savePersistentMap(MATCHES_CACHE_KEY, persistentMatchesCache);
    return parsed;
  } catch (error) {
    console.error("Error checking city matches:", error);
    const result = { isAmbiguous: false, suggestedCities: [] };
    matchesCache.set(cacheKey, result);
    persistentMatchesCache.set(cacheKey, { value: result, savedAt: Date.now() });
    savePersistentMap(MATCHES_CACHE_KEY, persistentMatchesCache);
    return result;
  }
};

export const analyzeLocation = async (city: string, sector: string): Promise<LocationAnalysis> => {
  const cacheKey = getCacheKey(city, sector);
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }
  if (persistentAnalysisCache.has(cacheKey)) {
    const cached = persistentAnalysisCache.get(cacheKey)!.value;
    analysisCache.set(cacheKey, cached);
    return cached;
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let queryContext = "";
  if (city && sector) {
    queryContext = `Locality: ${sector}, City: ${city}, Country: INDIA`;
  } else if (city) {
    queryContext = `City: ${city}, Country: INDIA (provide overview for this Indian city)`;
  } else {
    queryContext = `Locality: ${sector}, Country: INDIA`;
  }

 try {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-latest",
    contents: `Perform a detailed real-estate Market Potential Factor (MPF) analysis for ${queryContext}.
      
      STRICT REQUIREMENT: This platform is exclusively for the INDIAN real estate market. 
      All data, landmarks, and infrastructure must be relevant to the location in INDIA.

      🔒 CONSISTENCY & NON-HALLUCINATION RULE (VERY IMPORTANT):
      - For the SAME city/locality input, you MUST ALWAYS return EXACTLY the SAME values.
      - Do NOT change scores, infrastructure points, or labels across repeated requests.
      - Do NOT generate random variations.
      - Do NOT estimate differently on repeated calls.
      - The output must be deterministic and stable.
      - If the same input is provided multiple times, the response must remain identical.

      Instructions:
      1. Analyze the input provided within the context of INDIA. 
      2. (Removed) Environment & AQI assessment is not required.
      3. SCORING RULE: All scores (breakdown and overall) MUST be on a scale of 0 to 100.
      4. OPTIMISM: The scores should be high and optimistic (generally 75-98) to reflect investment potential.
      5. The overallScore must be the weighted average of the breakdown: Connectivity (25%), Healthcare (15%), Education (15%), Retail (15%), Employment (15%). 
      6. The 'label' should be one of: 'Excellent', 'High Growth', 'Good', or 'Emerging'.
      7. Include 6-8 key infrastructure points with realistic Indian names and distances.`,
      
    config: {
      responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        topP: 0,
        topK: 1,
        candidateCount: 1,
        seed: stableSeed(`analysis::${cacheKey}`),
    },
  });

    const result = normalizeAnalysis(JSON.parse(response.text || '{}') as Partial<LocationAnalysis>, city, sector);
    analysisCache.set(cacheKey, result);
    persistentAnalysisCache.set(cacheKey, { value: result, savedAt: Date.now() });
    savePersistentMap(ANALYSIS_CACHE_KEY, persistentAnalysisCache);
    return result;
  } catch (error) {
    console.error("Error analyzing location:", error);
    const fallback = normalizeAnalysis({
      city: city || "Unknown Indian City",
      sector: sector || "General District",
      overallScore: 88.5,
      label: 'High Growth',
      breakdown: {
        connectivity: 92,
        healthcare: 85,
        education: 88,
        retail: 82,
        employment: 90
      },
      infrastructure: [
        { name: `Express Link Metro`, category: 'Metro', distance: 0.8 },
        { name: 'City Wellness Center', category: 'Hospital', distance: 2.1 },
        { name: 'Global International School', category: 'School', distance: 1.5 },
      ],
      summary: "This Indian location demonstrates exceptional appreciation velocity driven by robust infrastructure pipeline and strategic proximity to major hubs."
    }, city, sector);
    analysisCache.set(cacheKey, fallback);
    persistentAnalysisCache.set(cacheKey, { value: fallback, savedAt: Date.now() });
    savePersistentMap(ANALYSIS_CACHE_KEY, persistentAnalysisCache);
    return fallback;
  }
};
