import { LocationAnalysis } from "../types";

const analysisCache = new Map<string, LocationAnalysis>();
const matchesCache = new Map<string, { isAmbiguous: boolean; suggestedCities: string[] }>();
const validationCache = new Map<string, { isValid: boolean; reason: string }>();

type PersistentEntry<T> = {
  value: T;
  savedAt: number;
};

const ANALYSIS_CACHE_KEY = "locate:analysis-cache:v1";
const MATCHES_CACHE_KEY = "locate:matches-cache:v1";
const VALIDATION_CACHE_KEY = "locate:validation-cache:v1";
const DEFAULT_CACHE_DAYS = 30;
const CACHE_TTL_DAYS = Math.max(
  1,
  Number((import.meta as any)?.env?.VITE_ANALYSIS_CACHE_TTL_DAYS || DEFAULT_CACHE_DAYS),
);
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

const API_BASE_URL =
  ((import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://localhost:4000";

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const getCacheKey = (city: string, locality: string) =>
  `${(city || "").trim().toLowerCase()}::${(locality || "").trim().toLowerCase()}`;

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

const isObviouslyGibberish = (value: string): boolean => {
  const text = (value || "").trim();
  if (!text || text.length < 2) return true;
  if (/[0-9]{5,}/.test(text)) return true;
  if (/[^a-zA-Z0-9\s,.'-]/.test(text)) return true;
  if (/([a-zA-Z])\1{3,}/.test(text)) return true;

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return true;
  if (!/[aeiouAEIOU]/.test(letters) && letters.length > 4) return true;

  return false;
};

const toErrorMessage = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message?: unknown }).message || "");
  }
  return "Unable to process input right now. Try again.";
};

const fetchJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    let detail = "";
    try {
      const parsed = (await response.json()) as { error?: string };
      detail = parsed?.error || "";
    } catch {
      detail = "";
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
};

const pollReply = async (id: string): Promise<{
  status: "pending" | "done" | "invalid_input" | "needs_clarification";
  result: LocationAnalysis | null;
  error: string | null;
  suggestedCities: string[];
}> => {
  const started = Date.now();
  const timeoutMs = 12000;

  while (Date.now() - started < timeoutMs) {
    const reply = await fetchJson<{
      id: string;
      status: "pending" | "done" | "invalid_input" | "needs_clarification";
      result: LocationAnalysis | null;
      error: string | null;
      suggestedCities: string[];
    }>(`/api/reply/${id}`);

    if (reply.status !== "pending") return reply;

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error("Analysis timed out. Please retry.");
};

export const validateLocationInput = async (
  city: string,
  locality: string,
): Promise<{ isValid: boolean; reason: string }> => {
  const cacheKey = getCacheKey(city, locality);
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }
  if (persistentValidationCache.has(cacheKey)) {
    const cached = persistentValidationCache.get(cacheKey)!.value;
    validationCache.set(cacheKey, cached);
    return cached;
  }

  const invalid = {
    isValid: !(isObviouslyGibberish(city) || isObviouslyGibberish(locality)),
    reason: "Invalid input. Enter a valid city and locality.",
  };

  const result = invalid.isValid ? { isValid: true, reason: "Valid input." } : invalid;
  validationCache.set(cacheKey, result);
  persistentValidationCache.set(cacheKey, { value: result, savedAt: Date.now() });
  savePersistentMap(VALIDATION_CACHE_KEY, persistentValidationCache);
  return result;
};

export const getCityMatches = async (
  city: string,
  locality: string,
): Promise<{ isAmbiguous: boolean; suggestedCities: string[] }> => {
  const cacheKey = getCacheKey(city, locality);
  if (matchesCache.has(cacheKey)) {
    return matchesCache.get(cacheKey)!;
  }
  if (persistentMatchesCache.has(cacheKey)) {
    const cached = persistentMatchesCache.get(cacheKey)!.value;
    matchesCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const input = await fetchJson<{ id: string; status: string }>("/api/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, locality }),
    });

    const reply = await pollReply(input.id);
    const result = {
      isAmbiguous: reply.status === "needs_clarification",
      suggestedCities: reply.suggestedCities || [],
    };

    matchesCache.set(cacheKey, result);
    persistentMatchesCache.set(cacheKey, { value: result, savedAt: Date.now() });
    savePersistentMap(MATCHES_CACHE_KEY, persistentMatchesCache);
    return result;
  } catch {
    const result = { isAmbiguous: false, suggestedCities: [] };
    matchesCache.set(cacheKey, result);
    persistentMatchesCache.set(cacheKey, { value: result, savedAt: Date.now() });
    savePersistentMap(MATCHES_CACHE_KEY, persistentMatchesCache);
    return result;
  }
};

export const analyzeLocation = async (city: string, locality: string): Promise<LocationAnalysis> => {
  const cacheKey = getCacheKey(city, locality);
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }
  if (persistentAnalysisCache.has(cacheKey)) {
    const cached = persistentAnalysisCache.get(cacheKey)!.value;
    analysisCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const input = await fetchJson<{ id: string; status: string }>("/api/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, locality }),
    });

    const reply = await pollReply(input.id);

    if (reply.status === "invalid_input") {
      throw new Error(reply.error || "Invalid input. Enter a valid city and locality.");
    }

    if (reply.status === "needs_clarification") {
      const joined = (reply.suggestedCities || []).join(", ");
      throw new Error(
        reply.error ||
          (joined ? `Input is ambiguous. Suggested cities: ${joined}` : "Input is ambiguous. Please refine city."),
      );
    }

    if (!reply.result) {
      throw new Error(reply.error || "No analysis returned from server.");
    }

    analysisCache.set(cacheKey, reply.result);
    persistentAnalysisCache.set(cacheKey, { value: reply.result, savedAt: Date.now() });
    savePersistentMap(ANALYSIS_CACHE_KEY, persistentAnalysisCache);
    return reply.result;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
};
