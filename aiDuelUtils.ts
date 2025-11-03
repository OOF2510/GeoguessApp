import axios, { AxiosError } from 'axios';
import { getAppCheckToken } from './leaderAuthUtils';

export const API_BASE_URL = 'https://geo.api.oof2510.space';

export interface AiDuelScores {
  player: number;
  ai: number;
}

export type AiDuelStatus = 'in-progress' | 'completed' | string;

export interface AiDuelRound {
  roundIndex: number;
  imageUrl: string;
}

export interface AiDuelMatchResponse {
  matchId: string;
  round: AiDuelRound;
  totalRounds?: number;
  scores?: AiDuelScores;
  status?: AiDuelStatus;
}

export interface AiDuelCountry {
  name?: string | null;
  code?: string | null;
}

export interface AiDuelCoordinates {
  lat?: number;
  lon?: number;
}

export interface AiDuelGuessParticipant {
  guess?: string | null;
  isCorrect?: boolean;
}

export interface AiDuelAiResult {
  countryName?: string | null;
  confidence?: number | null;
  explanation?: string | null;
  fallbackReason?: string | null;
  isCorrect?: boolean;
}

export interface AiDuelHistoryEntry {
  roundIndex: number;
  correctCountry?: AiDuelCountry | null;
  player?: AiDuelGuessParticipant | null;
  ai?: AiDuelAiResult | null;
}

export interface AiDuelGuessResult {
  correctCountry?: AiDuelCountry | null;
  coordinates?: AiDuelCoordinates | null;
  playerResult?: AiDuelGuessParticipant | null;
  aiResult?: AiDuelAiResult | null;
  scores?: AiDuelScores;
  status?: AiDuelStatus;
  history?: AiDuelHistoryEntry[];
  nextRound?: AiDuelRound | null;
}

export interface AiDuelGuessResponse extends AiDuelGuessResult {}

export interface AiDuelApiError extends Error {
  status?: number;
  code?: string;
  payload?: unknown;
}

const REQUEST_TIMEOUT_MS = 15000;

const withAppCheckHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAppCheckToken();
  return token
    ? {
        'X-Firebase-AppCheck': token,
      }
    : {};
};

const buildApiError = (
  error: unknown,
  fallbackMessage: string,
): AiDuelApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const payload = axiosError.response?.data ?? null;
    const messageFromPayload =
      (payload &&
        (payload.errorDescription ||
          payload.error ||
          payload.message)) as string | undefined;

    const apiError: AiDuelApiError = new Error(
      messageFromPayload || fallbackMessage,
    );
    apiError.status = axiosError.response?.status;
    if (payload && typeof payload === 'object') {
      const maybeCode = (payload as Record<string, unknown>).error;
      if (typeof maybeCode === 'string') {
        apiError.code = maybeCode;
      }
      const nestedPayload =
        (payload as Record<string, unknown>).payload ?? payload;
      apiError.payload = nestedPayload;
    }
    return apiError;
  }

  const apiError: AiDuelApiError = new Error(fallbackMessage);
  return apiError;
};

export const startAiMatch = async (): Promise<AiDuelMatchResponse> => {
  try {
    const headers = await withAppCheckHeaders();
    const response = await axios.post<AiDuelMatchResponse>(
      `${API_BASE_URL}/ai-duel/start`,
      {},
      {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'Failed to start AI duel');
  }
};

export const submitAiGuess = async (
  matchId: string,
  roundIndex: number,
  guess: string,
): Promise<AiDuelGuessResponse> => {
  try {
    const headers = await withAppCheckHeaders();
    const response = await axios.post<AiDuelGuessResponse>(
      `${API_BASE_URL}/ai-duel/guess`,
      { matchId, roundIndex, guess },
      {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'Failed to submit AI guess');
  }
};
