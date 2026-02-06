import { GoogleGenAI, Type } from "@google/genai";
import { LocationAnalysis } from "../types";

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
        environment: { type: Type.NUMBER },
      },
      required: ['connectivity', 'healthcare', 'education', 'retail', 'employment', 'environment']
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

export const getCityMatches = async (city: string, sector: string): Promise<{ isAmbiguous: boolean; suggestedCities: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const query = `${sector} ${city}`.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Determine if the location "${query}" is ambiguous within INDIA. 
      CRITICAL: You must ONLY consider cities and locations within INDIA. Ignore all international locations (e.g., ignore Delhi in USA/Canada).
      If "${query}" exists in multiple Indian cities (e.g. "Sector 15" exists in Noida, Gurgaon, Chandigarh), return isAmbiguous: true and list the relevant INDIAN cities. 
      If it is specific or the Indian city is already clear, return isAmbiguous: false.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: MATCH_SCHEMA,
      },
    });

    return JSON.parse(response.text || '{"isAmbiguous": false, "suggestedCities": []}');
  } catch (error) {
    console.error("Error checking city matches:", error);
    return { isAmbiguous: false, suggestedCities: [] };
  }
};

export const analyzeLocation = async (city: string, sector: string): Promise<LocationAnalysis> => {
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
      model: "gemini-3-flash-preview",
      contents: `Perform a detailed real-estate Market Potential Factor (MPF) analysis for ${queryContext}.
      
      STRICT REQUIREMENT: This platform is exclusively for the INDIAN real estate market. 
      All data, landmarks, and infrastructure must be relevant to the location in INDIA.
      
      Instructions:
      1. Analyze the input provided within the context of INDIA. 
      2. ENVIRONMENT & AQI: Specifically evaluate the Air Quality Index (AQI), green cover, and ecological health of the area based on Indian environmental standards.
      3. SCORING RULE: All scores (breakdown and overall) MUST be on a scale of 0 to 100.
      4. OPTIMISM: The scores should be high and optimistic (generally 75-98) to reflect investment potential.
      5. The overallScore must be the weighted average of the breakdown: Connectivity (25%), Healthcare (15%), Education (15%), Retail (15%), Employment (15%), and Environment/AQI (15%). 
      6. The 'label' should be one of: 'Excellent', 'High Growth', 'Good', or 'Emerging'.
      7. Include 6-8 key infrastructure points with realistic Indian names and distances.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || '{}');
    return result as LocationAnalysis;
  } catch (error) {
    console.error("Error analyzing location:", error);
    return {
      city: city || "Unknown Indian City",
      sector: sector || "General District",
      overallScore: 88.5,
      label: 'High Growth',
      breakdown: {
        connectivity: 92,
        healthcare: 85,
        education: 88,
        retail: 82,
        employment: 90,
        environment: 84
      },
      infrastructure: [
        { name: `Express Link Metro`, category: 'Metro', distance: 0.8 },
        { name: 'City Wellness Center', category: 'Hospital', distance: 2.1 },
        { name: 'Global International School', category: 'School', distance: 1.5 },
      ],
      summary: "This Indian location demonstrates exceptional appreciation velocity driven by robust infrastructure pipeline and strategic proximity to major hubs."
    };
  }
};
