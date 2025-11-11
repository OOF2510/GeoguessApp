import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  BackHandler,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import type { PrefetchedRound } from '../services/geoApiUtils';
import { normalizeCountry } from '../services/geoApiUtils';
import {
  AiDuelApiError,
  AiDuelGuessResponse,
  AiDuelHistoryEntry,
  AiDuelRound,
  AiDuelScores,
  AiDuelStatus,
  startAiMatch,
  submitAiGuess,
} from '../services/aiDuelUtils';
import { NavigationProp, RootStackParamList } from '../navigation/navigationTypes';

const formatCountry = (value?: string | null): string => {
  if (!value) return 'Unknown';
  const normalized = normalizeCountry(value);
  if (!normalized) return value;
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatConfidence = (confidence?: number | null): string => {
  if (typeof confidence !== 'number') return '--';
  return `${Math.round(confidence * 100)}%`;
};

const formatCoordinates = (
  coords?: { lat?: number; lon?: number } | null,
): string | null => {
  if (
    !coords ||
    typeof coords.lat !== 'number' ||
    typeof coords.lon !== 'number'
  ) {
    return null;
  }
  return `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
};

const DEFAULT_SCORES: AiDuelScores = { player: 0, ai: 0 };

const AiDuel: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AiDuel'>>();
  const initialPrefetchedRound: PrefetchedRound | null =
    route.params?.prefetchedRound ?? null;
  const prefetchedRoundUrl: string | null =
    initialPrefetchedRound?.image.url ?? null;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<AiDuelRound | null>(null);
  const [queuedRound, setQueuedRound] = useState<AiDuelRound | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [scores, setScores] = useState<AiDuelScores>({ ...DEFAULT_SCORES });
  const [status, setStatus] = useState<AiDuelStatus>('in-progress');
  const [guess, setGuess] = useState<string>('');
  const [latestResult, setLatestResult] = useState<AiDuelGuessResponse | null>(
    null,
  );
  const [history, setHistory] = useState<AiDuelHistoryEntry[]>([]);
  const [zoomImage, setZoomImage] = useState<boolean>(false);
  const [prefetchedImageUrl, setPrefetchedImageUrl] = useState<string | null>(
    prefetchedRoundUrl,
  );

  useEffect(() => {
    setPrefetchedImageUrl(prefetchedRoundUrl);
  }, [prefetchedRoundUrl]);

  const resetState = useCallback((): void => {
    setGuess('');
    setScores({ ...DEFAULT_SCORES });
    setQueuedRound(null);
    setLatestResult(null);
    setHistory([]);
    setStatus('in-progress');
    setErrorMessage('');
    setCurrentRound(null);
    setMatchId(null);
  }, []);

  const bootstrap = useCallback(async (): Promise<void> => {
    setLoading(true);
    resetState();
    try {
      const response = await startAiMatch();
      if (!response?.matchId || !response.round) {
        throw new Error('Match could not be created');
      }

      setMatchId(response.matchId);
      setCurrentRound(response.round);
      setTotalRounds(response.totalRounds ?? 0);
      setScores(
        response.scores ? { ...response.scores } : { ...DEFAULT_SCORES },
      );
      setStatus(response.status ?? 'in-progress');
      setPrefetchedImageUrl(null);
    } catch (error) {
      console.error('Failed to start AI duel', error);
      setErrorMessage(
        "Couldn't start a match right now. Double-check your network connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [resetState]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const backAction = (): boolean => {
      if (zoomImage) {
        setZoomImage(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [zoomImage]);

  const roundLabel = useMemo(() => {
    if (!currentRound) return '';
    const roundNumber = currentRound.roundIndex + 1;
    return totalRounds
      ? `Round ${roundNumber} / ${totalRounds}`
      : `Round ${roundNumber}`;
  }, [currentRound, totalRounds]);

  const displayedImageUrl = currentRound?.imageUrl ?? prefetchedImageUrl;
  const displayedContributor =
    currentRound?.contributor ??
    latestResult?.contributor ??
    initialPrefetchedRound?.image.contributor ??
    null;
  const canSubmitGuess =
    !loading && !submitting && status === 'in-progress' && currentRound;
  const guessReady = guess.trim().length > 0;
  const completed = status === 'completed';
  const awaitingNextRound =
    status === 'in-progress' && Boolean(latestResult && queuedRound);

  const coordinateText = formatCoordinates(latestResult?.coordinates);

  const handleSubmitGuess = useCallback(async (): Promise<void> => {
    if (!canSubmitGuess) return;
    if (!matchId || !currentRound) {
      setErrorMessage('Match not ready yet. Please wait a moment.');
      return;
    }

    const cleanedGuess = guess.trim();
    if (!cleanedGuess) {
      setErrorMessage('Enter a country before submitting your guess.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const response = await submitAiGuess(
        matchId,
        currentRound.roundIndex,
        cleanedGuess,
      );
      setLatestResult(response);
      if (response.scores) {
        setScores({ ...response.scores });
      }
      if (response.status) {
        setStatus(response.status);
      }
      if (response.history) {
        setHistory(response.history);
      }
      setQueuedRound(response.nextRound ?? null);
      setGuess('');
    } catch (error) {
      console.error('Failed to submit AI guess', error);
      const duelError = error as AiDuelApiError;
      const payload =
        (duelError && typeof duelError === 'object'
          ? (duelError.payload as Record<string, unknown> | undefined)
          : undefined) ?? undefined;

      if (duelError.code === 'round_out_of_sync') {
        const expectedRound = payload?.expectedRound as AiDuelRound | undefined;
        const nextHistory = payload?.history as
          | AiDuelHistoryEntry[]
          | undefined;
        const nextScores = payload?.scores as AiDuelScores | undefined;
        const nextStatus = payload?.status as AiDuelStatus | undefined;

        if (expectedRound) {
          setCurrentRound(expectedRound);
        }
        if (Array.isArray(nextHistory)) {
          setHistory(nextHistory);
        }
        if (nextScores) {
          setScores({ ...nextScores });
        }
        if (nextStatus) {
          setStatus(nextStatus);
        }

        setQueuedRound(null);
        setLatestResult(null);
        setGuess('');
        setErrorMessage(
          'The match messed up and got behind. Try guessing again!',
        );
      } else if (duelError.code === 'match_completed') {
        const nextScores = payload?.scores as AiDuelScores | undefined;
        const nextHistory = payload?.history as
          | AiDuelHistoryEntry[]
          | undefined;
        if (nextScores) {
          setScores({ ...nextScores });
        }
        if (Array.isArray(nextHistory)) {
          setHistory(nextHistory);
        }
        setStatus('completed');
        setLatestResult(null);
        setQueuedRound(null);
        setErrorMessage('This match already wrapped up. Start a new duel!');
      } else if (duelError.code === 'missing_app_check_token') {
        setErrorMessage(
          'App Check verification failed. Please try again or restart the app.',
        );
      } else {
        setErrorMessage(
          duelError.message ||
            'Something went wrong submitting your guess. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmitGuess, currentRound, guess, matchId]);

  const handleNextRound = useCallback((): void => {
    if (!queuedRound) return;
    setCurrentRound(queuedRound);
    setQueuedRound(null);
    setLatestResult(null);
    setGuess('');
    setErrorMessage('');
  }, [queuedRound]);

  const handleRematch = useCallback((): void => {
    bootstrap();
  }, [bootstrap]);

  const handleReturnToMenu = useCallback((): void => {
    navigation.navigate('MainMenu');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>GeoFinder AI Duel</Text>
          <Text style={styles.subtitle}>
            Challenge GeoFinder&apos;s AI opponent across a multi-round match.
            Guess the country, compare results, and see how the AI reasoned
            about the image.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleReturnToMenu}
            >
              <Text style={styles.buttonText}>Back to Main Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading ? styles.disabledButton : null,
              ]}
              onPress={handleRematch}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? 'Starting match...'
                  : completed
                  ? 'Start new match'
                  : 'Restart'}
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.mainCard}>
            <View style={styles.roundHeader}>
              <Text style={styles.roundLabel}>
                {roundLabel || 'Awaiting round'}
              </Text>
              <View style={styles.scorePill}>
                <Text style={styles.scoreValue}>You {scores.player ?? 0}</Text>
                <Text style={styles.scoreDivider}>vs</Text>
                <Text style={styles.scoreValue}>AI {scores.ai ?? 0}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.imageWrapper}
              onPress={() => displayedImageUrl && setZoomImage(true)}
              activeOpacity={displayedImageUrl ? 0.85 : 1}
            >
              {displayedImageUrl ? (
                <Image
                  source={{ uri: displayedImageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  {loading ? (
                    <>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.imagePlaceholderText}>
                        Loading round...
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.imagePlaceholderText}>
                      Ready when you are
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.attribution}>
              {displayedContributor
                ? `Image by ${displayedContributor} at Mapillary, CC-BY-SA`
                : 'Images provided via Mapillary'}
            </Text>

            {status === 'in-progress' && currentRound && !latestResult && (
              <>
                <Text style={styles.prompt}>Guess the country</Text>
                <TextInput
                  style={styles.input}
                  value={guess}
                  onChangeText={setGuess}
                  onSubmitEditing={() => handleSubmitGuess()}
                  placeholder="e.g. Japan"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !guessReady || !canSubmitGuess
                      ? styles.disabledButton
                      : null,
                  ]}
                  onPress={handleSubmitGuess}
                  disabled={!guessReady || !canSubmitGuess}
                >
                  <Text style={styles.buttonText}>
                    {submitting ? 'Submitting...' : 'Lock in guess'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {awaitingNextRound && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNextRound}
              >
                <Text style={styles.buttonText}>Next round</Text>
              </TouchableOpacity>
            )}

            {completed && (
              <View style={styles.completeBanner}>
                <Text style={styles.completeText}>
                  Match complete! Want a rematch?
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Round insights</Text>
            {latestResult ? (
              <View style={styles.insightsBody}>
                <Text style={styles.insightLine}>
                  <Text style={styles.insightLabel}>Correct country: </Text>
                  {formatCountry(latestResult.correctCountry?.name)}
                  {latestResult.correctCountry?.code
                    ? ` (${latestResult.correctCountry.code})`
                    : ''}
                </Text>
                {coordinateText && (
                  <Text style={styles.insightLine}>
                    <Text style={styles.insightLabel}>Coordinates: </Text>
                    {coordinateText}
                  </Text>
                )}
                <View
                  style={[
                    styles.resultBox,
                    latestResult.playerResult?.isCorrect
                      ? styles.resultBoxCorrect
                      : styles.resultBoxIncorrect,
                  ]}
                >
                  <Text style={styles.resultTitle}>Your guess</Text>
                  <Text style={styles.resultValue}>
                    {latestResult.playerResult?.guess || 'No guess'}
                  </Text>
                  <Text style={styles.resultStatus}>
                    {latestResult.playerResult?.isCorrect
                      ? 'Correct'
                      : 'Incorrect'}
                  </Text>
                </View>

                {latestResult.aiResult && (
                  <View style={styles.aiResultBox}>
                    <Text style={styles.aiResultTitle}>AI guess</Text>
                    <Text style={styles.aiResultValue}>
                      {formatCountry(latestResult.aiResult.countryName)}
                    </Text>
                    <Text style={styles.aiResultMeta}>
                      Confidence{' '}
                      {formatConfidence(latestResult.aiResult.confidence)}
                    </Text>
                    {latestResult.aiResult.explanation ? (
                      <Text style={styles.aiResultExplanation}>
                        {latestResult.aiResult.explanation}
                      </Text>
                    ) : (
                      <Text style={styles.aiResultExplanation}>
                        No explanation provided.
                      </Text>
                    )}
                    {latestResult.aiResult.fallbackReason ? (
                      <Text style={styles.aiResultFallback}>
                        Fallback reason: {latestResult.aiResult.fallbackReason}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.sectionHint}>
                Submit a guess to see if you can beat the AI!
              </Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Match history</Text>
            {history.length === 0 ? (
              <Text style={styles.sectionHint}>
                Results will appear here after you complete your first round.
              </Text>
            ) : (
              history.map(round => {
                const playerCorrect = round.player?.isCorrect;
                const aiCorrect = round.ai?.isCorrect;
                return (
                  <View key={round.roundIndex} style={styles.historyEntry}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyRoundLabel}>
                        Round {round.roundIndex + 1}
                      </Text>
                      <Text style={styles.historyCountry}>
                        {formatCountry(round.correctCountry?.name)}
                        {round.correctCountry?.code
                          ? ` (${round.correctCountry.code})`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.historyGuessRow}>
                      <View
                        style={[
                          styles.historyGuessBox,
                          styles.historyGuessBoxLeft,
                          playerCorrect
                            ? styles.historyGuessPlayerCorrect
                            : styles.historyGuessPlayerIncorrect,
                        ]}
                      >
                        <Text style={styles.historyGuessTitle}>You</Text>
                        <Text style={styles.historyGuessValue}>
                          {round.player?.guess || 'No guess'}
                        </Text>
                        <Text style={styles.historyGuessNote}>
                          {playerCorrect ? 'Correct' : 'Incorrect'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.historyGuessBox,
                          styles.historyGuessBoxRight,
                          aiCorrect
                            ? styles.historyGuessAiCorrect
                            : styles.historyGuessAiIncorrect,
                        ]}
                      >
                        <Text style={styles.historyGuessTitle}>AI</Text>
                        <Text style={styles.historyGuessValue}>
                          {round.ai
                            ? formatCountry(round.ai.countryName)
                            : 'No guess'}
                        </Text>
                        {round.ai ? (
                          <Text style={styles.historyGuessMeta}>
                            Confidence {formatConfidence(round.ai.confidence)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <Modal
          visible={zoomImage}
          transparent={true}
          onRequestClose={() => setZoomImage(false)}
        >
          <ImageViewer
            imageUrls={[{ url: displayedImageUrl ?? '' }]}
            onCancel={() => setZoomImage(false)}
            enableSwipeDown={true}
            onSwipeDown={() => setZoomImage(false)}
            saveToLocalByLongPress={false}
          />
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 12,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#3D1F1F',
    borderColor: '#D32F2F',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FFB4A4',
    fontSize: 14,
  },
  mainCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderColor: '#2A2A2A',
    borderWidth: 1,
    marginBottom: 20,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreDivider: {
    color: '#888888',
    fontSize: 12,
    marginHorizontal: 8,
  },
  imageWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  imagePlaceholderText: {
    color: '#CCCCCC',
    marginTop: 10,
    fontSize: 14,
  },
  attribution: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  prompt: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E1E1E',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#046C4E',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    backgroundColor: '#2196F3',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBanner: {
    backgroundColor: '#1B422E',
    borderColor: '#2E7D32',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  completeText: {
    color: '#A5D6A7',
    textAlign: 'center',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderColor: '#2A2A2A',
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHint: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
  },
  insightsBody: {
    marginTop: 4,
  },
  insightLine: {
    color: '#DDDDDD',
    fontSize: 14,
    marginBottom: 4,
  },
  insightLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  resultBoxCorrect: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  resultBoxIncorrect: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.4)',
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
  },
  resultStatus: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  aiResultBox: {
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.4)',
  },
  aiResultTitle: {
    color: '#90CAF9',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  aiResultValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
  },
  aiResultMeta: {
    color: '#90CAF9',
    fontSize: 12,
    marginTop: 4,
  },
  aiResultExplanation: {
    color: '#E3F2FD',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  aiResultFallback: {
    color: '#90CAF9',
    fontSize: 12,
    marginTop: 8,
  },
  historyEntry: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyRoundLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyCountry: {
    color: '#BBBBBB',
    fontSize: 13,
  },
  historyGuessRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  historyGuessBoxLeft: {
    marginRight: 6,
  },
  historyGuessBoxRight: {
    marginLeft: 6,
  },
  historyGuessBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  historyGuessPlayerCorrect: {
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  historyGuessPlayerIncorrect: {
    borderColor: 'rgba(244, 67, 54, 0.4)',
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  historyGuessAiCorrect: {
    borderColor: 'rgba(33, 150, 243, 0.4)',
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  historyGuessAiIncorrect: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyGuessTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  historyGuessValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  historyGuessNote: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  historyGuessMeta: {
    color: '#90CAF9',
    fontSize: 12,
    marginTop: 4,
  },
});

export default AiDuel;
