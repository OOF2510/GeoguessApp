import { geoApiClient, getAppCheckToken } from './leaderAuthUtils';

export interface AiDuelScores {
  player: number;
  ai: number;
}

export type AiDuelStatus = 'in-progress' | 'completed' | string;

export interface AiDuelRound {
  roundIndex: number;
  imageUrl: string;
  contributor?: string | null;
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
  contributor?: string | null;
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

const buildApiError = (
  error: unknown,
  fallbackMessage: string,
): AiDuelApiError => {
  if (error && typeof error === 'object') {
    const baseMessage = (error as Error).message || fallbackMessage;
    const apiError: AiDuelApiError = new Error(baseMessage);

    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      apiError.status = status;
    }

    const original = (error as { original?: unknown }).original;
    const payload =
      (original &&
        typeof original === 'object' &&
        'response' in original &&
        (original as any).response?.data) ??
      (error as { payload?: unknown }).payload ??
      null;

    if (payload && typeof payload === 'object') {
      const maybeCode = (payload as Record<string, unknown>).error;
      if (typeof maybeCode === 'string') {
        apiError.code = maybeCode;
      }
      apiError.payload =
        (payload as Record<string, unknown>).payload ?? payload;
    }

    if (!apiError.message) {
      apiError.message = fallbackMessage;
    }

    return apiError;
  }

  return new Error(fallbackMessage) as AiDuelApiError;
};

export const startAiMatch = async (): Promise<AiDuelMatchResponse> => {
  try {
    const token = await getAppCheckToken();
    geoApiClient.setAppCheckToken(token || null);
    return await geoApiClient.startAiDuel();
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
    const token = await getAppCheckToken();
    geoApiClient.setAppCheckToken(token || null);
    return await geoApiClient.submitAiGuess(matchId, roundIndex, guess);
  } catch (error) {
    throw buildApiError(error, 'Failed to submit AI guess');
  }
};
