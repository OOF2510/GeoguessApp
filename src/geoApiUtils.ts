import axios from 'axios';

interface ImageResult {
  url: string;
  coord: {
    lat: number;
    lon: number;
  };
  countryName?: string;
}

async function getRandomImage(): Promise<ImageResult | null> {
  try {
    const response = await axios.get('https://geo.api.oof2510.space/getImage', {
      timeout: 15000
    });

    if (!response?.data?.imageUrl || typeof response.data.imageUrl !== 'string') {
      console.error('Invalid image URL');
      return null;
    }

    if (!response.data.coordinates || 
        typeof response.data.coordinates.lat !== 'number' || 
        typeof response.data.coordinates.lon !== 'number') {
      console.error('Invalid coordinates');
      return null;
    }

    return {
      url: response.data.imageUrl,
      coord: {
        lat: response.data.coordinates.lat,
        lon: response.data.coordinates.lon
      },
      countryName: response.data.countryName || 'Unknown'
    };
  } catch (error) {
    console.error('API request failed:', error);
    return null;
  }
}

function normalizeCountry(t: string): string {
  const s = (t || "").trim().toLowerCase();
  return s
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchGuess(guess: string, country: string | null, code: string | null): boolean {
  if (!guess) return false;
  if (code && (guess === code || guess === code.toLowerCase())) return true;
  if (!country) return false;
  const aliases = countryAliases(country, code);
  return aliases.some((a: string) => guess === a || guess.includes(a));
}

function countryAliases(country: string | null, code: string | null): string[] {
  const base: Set<string> = new Set();
  const c = (country || "").toLowerCase();
  const cc = (code || "").toLowerCase();
  if (c) base.add(c);
  if (cc) base.add(cc);
  if (c.includes("united states")) {
    base.add("usa");
    base.add("us");
    base.add("united states of america");
    base.add("america");
  }
  if (
    c.includes("ivory coast") ||
    c.includes("côte d'ivoire") ||
    c.includes("cote divoire")
  ) {
    base.add("cote divoire");
    base.add("cote d'ivoire");
    base.add("ivory coast");
  }
  return Array.from(base);
}

export {
  getRandomImage,
  normalizeCountry,
  matchGuess,
};

export type {
  ImageResult,
};
