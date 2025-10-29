import axios from 'axios';

interface ImageResult {
  url: string;
  coord: {
    lat: number;
    lon: number;
  };
}

interface CountryInfo {
  country: string;
  countryCode: string;
  displayName: string;
}

interface ApiResponse {
  imageUrl: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  countryName: string;
}

async function getImageWithCountry(): Promise<{
  image: ImageResult;
  countryInfo: CountryInfo | null;
} | null> {
  try {
    const response = await axios.get<ApiResponse>(
      'https://geo.api.oof2510.space/getImage',
      {
        timeout: 15000,
        headers: { 'User-Agent': 'geoguessr-app/1.0' },
      },
    );

    const data = response.data;
    if (!data || !data.imageUrl || !data.coordinates) {
      throw new Error('Invalid API response');
    }

    const image: ImageResult = {
      url: data.imageUrl,
      coord: {
        lat: data.coordinates.lat,
        lon: data.coordinates.lon,
      },
    };

    // The new API already provides country info, so we don't need reverse geocoding
    const countryInfo: CountryInfo = {
      country: data.countryName ? data.countryName.toLowerCase() : '',
      countryCode: '', // API doesn't provide country code, but we can work without it
      displayName: data.countryName || 'Unknown',
    };

    return {
      image,
      countryInfo: data.countryName ? countryInfo : null,
    };
  } catch (error) {
    console.error('Error fetching image with country:', error);
    return null;
  }
}

function normalizeCountry(text: string): string {
  const normalized = (text || '').trim().toLowerCase();
  return normalized
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchGuess(
  guess: string,
  country: string | null,
  code: string | null,
): boolean {
  if (!guess) return false;
  if (code && (guess === code || guess === code.toLowerCase())) return true;
  if (!country) return false;
  const aliases = countryAliases(country, code);
  return aliases.some((alias: string) => guess === alias);
}

function countryAliases(country: string | null, code: string | null): string[] {
  const base = new Set<string>();
  const c = (country || '').toLowerCase();
  const cc = (code || '').toLowerCase();

  if (c) base.add(c);
  if (cc) base.add(cc);

  // Common country aliases
  if (c.includes('united states')) {
    base.add('usa');
    base.add('us');
    base.add('united states of america');
    base.add('america');
  }
  if (c.includes('united kingdom')) {
    base.add('uk');
    base.add('great britain');
    base.add('britain');
    base.add('england');
  }
  if (c.includes('russia')) {
    base.add('russian federation');
  }
  if (c.includes('south korea')) {
    base.add('korea');
    base.add('republic of korea');
  }
  if (c.includes('north korea')) {
    base.add('dprk');
    base.add('democratic peoples republic of korea');
  }
  if (c.includes('united arab emirates') || c === 'uae') {
    base.add('united arab emirates');
    base.add('uae');
  }
  if (c.includes('czechia')) {
    base.add('czech republic');
  }
  if (c.includes('eswatini')) {
    base.add('swaziland');
  }
  if (c.includes('east timor')) {
    base.add('timor leste');
  }
  if (
    c.includes('ivory coast') ||
    c.includes("côte d'ivoire") ||
    c.includes('cote divoire')
  ) {
    base.add('cote divoire');
    base.add("cote d'ivoire");
    base.add('ivory coast');
  }

  return Array.from(base);
}

export { getImageWithCountry, normalizeCountry, matchGuess, countryAliases };
