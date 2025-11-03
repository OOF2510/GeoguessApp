import axios from 'axios';
import { Platform } from 'react-native';
import appCheck from '@react-native-firebase/app-check';
import { decode } from 'base-64';
import { initializeFirebase } from './firebase';

const API_BASE_URL = 'https://geo.api.oof2510.space';

let appCheckToken = '';
let appCheckTokenExpiry = 0;
let firebaseInitialized = false;

// Helper function to parse JWT and get expiry time
const getTokenExpiry = (token: string): number => {
  try {
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(
      decode(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return decodedPayload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return Date.now() + 3600000; // Fallback to 1 hour from now
  }
};

// Initialize Firebase App Check
export const initAppCheck = async () => {
  if (!firebaseInitialized) {
    try {
      initializeFirebase();
      firebaseInitialized = true;
    } catch (error) {
      console.error('Error initializing Firebase App Check provider:', error);
    }
  }

  try {
    const appCheckTokenResult = await appCheck().getToken(true);
    if (appCheckTokenResult) {
      appCheckToken = appCheckTokenResult.token;
      // Parse expiry from JWT token
      appCheckTokenExpiry = getTokenExpiry(appCheckToken);
    }
  } catch (error) {
    console.error('Error initializing App Check:', error);
  }
};

// Get a valid App Check token
const getValidToken = async (): Promise<string> => {
  if (!appCheckToken || Date.now() >= appCheckTokenExpiry) {
    await initAppCheck();
  }
  return appCheckToken;
};

// Game session management
export const startGameSession = async (): Promise<{
  gameSessionId: string;
  seed: string;
  expiresAt: string;
}> => {
  const token = await getValidToken();
  const response = await axios.post(
    `${API_BASE_URL}/game/start`,
    {},
    {
      headers: {
        'X-Firebase-AppCheck': token,
      },
      timeout: 15000,
    },
  );
  return response.data;
};

export const submitScore = async (
  gameSessionId: string,
  score: number,
  metadata: Record<string, any> = {},
): Promise<void> => {
  const token = await getValidToken();
  await axios.post(
    `${API_BASE_URL}/game/submit`,
    { gameSessionId, score, metadata },
    {
      headers: {
        'X-Firebase-AppCheck': token,
      },
    },
  );
};

export const getLeaderboard = async (
  limit: number = 50,
): Promise<
  Array<{
    rank: number;
    score: number;
    createdAt: string;
  }>
> => {
  const response = await axios.get(`${API_BASE_URL}/leaderboard/top`, {
    params: { limit },
  });
  return response.data;
};

export const getAppCheckToken = getValidToken;
