import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
let ai = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
  console.log('GoogleGenAI initialized');
} else {
  console.log('No API key provided; running with fallback responses');
}

const store = new Map();
const inputKeyMap = new Map(); // maps deterministic input key -> id
const resultCache = new Map(); // maps id -> fully computed result (prevents re-computation)

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'pong' });
});

app.post('/api/analyze', (req, res) => {
  const { city, sector } = req.body || {};

  const result = {
    city: city || 'Unknown Indian City',
    sector: sector || 'General District',
    overallScore: 88.5,
    label: 'High Growth',
    breakdown: {
      connectivity: 92,
      healthcare: 85,
      education: 88,
      retail: 82,
      employment: 90,
    },
    infrastructure: [
      { name: 'Express Link Metro', category: 'Metro', distance: 0.8 },
      { name: 'City Wellness Center', category: 'Hospital', distance: 2.1 },
      { name: 'Global International School', category: 'School', distance: 1.5 },
    ],
    summary:
      'This Indian location demonstrates exceptional appreciation velocity driven by robust infrastructure pipeline and strategic proximity to major hubs.',
  };

  res.json(result);
});

app.get('/', (req, res) => res.json({ message: 'API server running' }));

// Endpoint 1: receive input and return an id
app.post('/input', (req, res) => {
  const { city, sector } = req.body || {};
  if (!city && !sector) return res.status(400).json({ error: 'Provide city or sector' });
  const key = `${(city||'').trim().toLowerCase()}::${(sector||'').trim().toLowerCase()}`;
  if (inputKeyMap.has(key)) {
    const existingId = inputKeyMap.get(key);
    return res.json({ id: existingId });
  }

  const id = crypto.createHash('sha256').update(key).digest('hex');
  inputKeyMap.set(key, id);
  store.set(id, { city: city || null, sector: sector || null, status: 'pending', result: null });
  res.json({ id });
});

// Endpoint 2: produce (or return cached) reply for given id
app.get('/reply/:id', async (req, res) => {
  const id = req.params.id;
  
  // Check if result is already fully cached
  if (resultCache.has(id)) {
    return res.json({ id, result: resultCache.get(id) });
  }
  
  const item = store.get(id);
  if (!item) return res.status(404).json({ error: 'id not found' });
  if (item.result) {
    // Cache it before returning
    resultCache.set(id, item.result);
    return res.json({ id, result: item.result });
  }

  try {
    const { city, sector } = item;
    let queryContext = '';
    if (city && sector) queryContext = `Locality: ${sector}, City: ${city}, Country: INDIA`;
    else if (city) queryContext = `City: ${city}, Country: INDIA`;
    else queryContext = `Locality: ${sector}, Country: INDIA`;

    const prompt = `Perform a detailed real-estate Market Potential Factor (MPF) analysis for ${queryContext}.\n\nSTRICT REQUIREMENT: This platform is exclusively for the INDIAN real estate market. All data, landmarks, and infrastructure must be relevant to the location in INDIA.\n\nReturn a JSON object with keys: city, sector, overallScore, label, breakdown, infrastructure, summary.`;

    if (!ai) {
      const fallback = {
        city: city || 'Unknown Indian City',
        sector: sector || 'General District',
        overallScore: 88.5,
        label: 'High Growth',
        breakdown: {
          connectivity: 92,
          healthcare: 85,
          education: 88,
          retail: 82,
          employment: 90,
        },
        infrastructure: [
          { name: 'Express Link Metro', category: 'Metro', distance: 0.8 },
          { name: 'City Wellness Center', category: 'Hospital', distance: 2.1 },
          { name: 'Global International School', category: 'School', distance: 1.5 },
        ],
        summary: 'Fallback stub result for local testing.'
      };

      item.result = fallback;
      item.status = 'done';
      store.set(id, item);
      resultCache.set(id, fallback);
      return res.json({ id, result: fallback });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0 }
    });

    const result = response?.text ? JSON.parse(response.text) : { raw: response };
    item.result = result;
    item.status = 'done';
    store.set(id, item);
    resultCache.set(id, result);
    res.json({ id, result });
  } catch (err) {
    console.error('AI error', err);
    // Fallback: return a stubbed result so local testing still works
    const fallback = {
      city: item.city || 'Unknown Indian City',
      sector: item.sector || 'General District',
      overallScore: 88.5,
      label: 'High Growth',
      breakdown: {
        connectivity: 92,
        healthcare: 85,
        education: 88,
        retail: 82,
        employment: 90,
      },
      infrastructure: [
        { name: 'Express Link Metro', category: 'Metro', distance: 0.8 },
        { name: 'City Wellness Center', category: 'Hospital', distance: 2.1 },
        { name: 'Global International School', category: 'School', distance: 1.5 },
      ],
      summary: 'Fallback stub result for local testing.'
    };
    item.result = fallback;
    item.status = 'done';
    store.set(id, item);
    resultCache.set(id, fallback);
    res.json({ id, result: fallback });
  }
});

app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
