import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NavigationProp, RootStackParamList } from './navigationTypes';
import { getImageWithCountry, normalizeCountry, matchGuess } from './geoApiUtils';
import type { PrefetchedRound } from './geoApiUtils';
import { startGameSession, submitScore } from './leaderAuthUtils';
import ImageViewer from 'react-native-image-zoom-viewer';
import { scheduleSummaryModal, cancelSummaryModal } from './summaryTimer';

const TOTAL_ROUNDS = 10;

const GameScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Game'>>();
  const initialPrefetchedRound: PrefetchedRound | null =
    route.params?.prefetchedRound ?? null;
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [guess, setGuess] = useState<string>('');
  const [guessCount, setGuessCount] = useState<number>(0);
  const [incorrectGuesses, setIncorrectGuesses] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [zoomImage, setZoomImage] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [nextRound, setNextRound] = useState<PrefetchedRound | null>(
    initialPrefetchedRound,
  );
  const prefetchIdRef = useRef<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [showGameSummary, setShowGameSummary] = useState<boolean>(false);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSummaryTimeout = (): void => {
    cancelSummaryModal(summaryTimeoutRef);
  };

  const prefetchNextRound = async (): Promise<void> => {
    const requestId: number = ++prefetchIdRef.current;
    try {
      const result = await getImageWithCountry();
      if (!result) return;

      if (prefetchIdRef.current === requestId) {
        setNextRound(result);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = async (): Promise<void> => {
    clearSummaryTimeout();
    setShowGameSummary(false);
    if (completedRounds >= TOTAL_ROUNDS) {
      setCompletedRounds(0);
      setRoundNumber(1);
    }

    const hasPrefetched: boolean = nextRound !== null;
    if (!hasPrefetched) {
      setLoading(true);
    }
    setImageUrl(null);
    setCountry(null);
    setCountryCode(null);
    setDisplayName(null);
    setCoord(null);
    setGuess('');
    setGuessCount(0);
    setIncorrectGuesses([]);
    setFeedback('');
    setGameOver(false);

    try {
      let roundData: PrefetchedRound | null = nextRound;
      if (roundData) {
        setNextRound(null);
      } else {
        const result = await getImageWithCountry();
        if (!result) {
          Alert.alert('Error', 'Could not fetch an image. Try again.');
          return;
        }
        roundData = result;
      }

      if (!roundData) {
        Alert.alert('Error', 'Could not fetch an image. Try again.');
        return;
      }

      setImageUrl(roundData.image.url);
      setCoord(roundData.image.coord);

      if (roundData.countryInfo) {
        setCountry(roundData.countryInfo.country);
        setCountryCode(roundData.countryInfo.countryCode);
        setDisplayName(roundData.countryInfo.displayName);
      } else {
        setDisplayName('Unknown');
      }

      prefetchNextRound();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start game.');
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = (): void => {
    if (!guess.trim()) return;

    const normalizedGuess: string = normalizeCountry(guess);
    const isCorrect: boolean = matchGuess(
      normalizedGuess,
      country,
      countryCode,
    );
    const newGuessCount: number = guessCount + 1;
    setGuessCount(newGuessCount);

    if (isCorrect) {
      setFeedback(`✅ Correct! It was ${displayName}`);
      setGameOver(true);
      setCorrectAnswers(prev => prev + 1);

      let pointsEarned: number;
      if (newGuessCount === 1) {
        pointsEarned = 3;
      } else if (newGuessCount === 2) {
        pointsEarned = 2;
      } else if (newGuessCount === 3) {
        pointsEarned = 1;
      } else {
        pointsEarned = 0;
      }

      const newScore = currentScore + pointsEarned;
      setCurrentScore(newScore);

      if (newScore > highScore) {
        setHighScore(newScore);
        AsyncStorage.setItem('highScore', newScore.toString());
      }
    } else {
      const newIncorrect: string[] = [...incorrectGuesses, guess];
      setIncorrectGuesses(newIncorrect);
      if (newGuessCount >= 3) {
        const coordStr: string = coord
          ? `(${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)})`
          : '';
        setFeedback(
          `❌ Game over! It was ${displayName}${
            coordStr ? ' ' + coordStr : ''
          }`,
        );
        setGameOver(true);
      } else {
        setFeedback(`❌ Not quite. Try again! (Guess ${newGuessCount}/3)`);
      }
    }
    setGuess('');

    // Check if round is complete
    if (isCorrect || newGuessCount >= 3) {
      setCompletedRounds(prevCompleted => {
        const updatedCompleted = prevCompleted + 1;

        if (updatedCompleted >= TOTAL_ROUNDS) {
          scheduleSummaryModal(summaryTimeoutRef, setShowGameSummary);
        } else {
          setRoundNumber(prev => prev + 1);
        }

        return updatedCompleted;
      });
    }
  };

  const continueGame = (): void => {
    clearSummaryTimeout();
    setRoundNumber(1);
    setCorrectAnswers(0);
    setCurrentScore(0);
    setCompletedRounds(0);
    setShowGameSummary(false);
    initializeGameSession();
  };

  const initializeGameSession = async (): Promise<void> => {
    setLoading(true);
    try {
      const session = await startGameSession();
      setGameSessionId(session.gameSessionId);
      console.log('Game session started:', session.gameSessionId);
      await startGame();
    } catch (error) {
      console.error('Error starting game session:', error);
      Alert.alert(
        'Warning',
        'Could not start game session. Playing in offline mode.',
      );
      await startGame();
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToMainMenu = async (): Promise<void> => {
    if (gameSessionId && currentScore > 0) {
      try {
        await submitScore(gameSessionId, currentScore, {
          correctAnswers,
          totalRounds: TOTAL_ROUNDS,
          roundsPlayed: completedRounds,
        });
        console.log('Score submitted successfully');
      } catch (error) {
        console.error('Error submitting score:', error);
        Alert.alert('Warning', 'Could not submit score to leaderboard.');
      }
    }
    clearSummaryTimeout();
    setShowGameSummary(false);
    navigation.navigate('MainMenu');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#121212',
    },
    scrollContainer: {
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 20,
      color: '#FFFFFF',
    },
    imageContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    prompt: {
      fontSize: 18,
      marginBottom: 10,
      color: '#FFFFFF',
    },
    input: {
      width: '80%',
      height: 50,
      backgroundColor: '#1E1E1E',
      borderColor: '#444',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 15,
      paddingHorizontal: 15,
      color: '#FFFFFF',
      fontSize: 16,
    },
    button: {
      width: '80%',
      marginBottom: 15,
      borderRadius: 25,
      backgroundColor: '#4CAF50',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonNext: {
      width: '80%',
      marginBottom: 15,
      borderRadius: 25,
      backgroundColor: '#2196F3',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    feedback: {
      fontSize: 16,
      marginVertical: 15,
      textAlign: 'center',
      color: '#FFFFFF',
    },
    incorrectTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 10,
      color: '#FFFFFF',
    },
    incorrect: {
      fontSize: 14,
      color: '#FF6B6B',
    },
    scoreContainer: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    scoreText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    attribution: {
      position: 'absolute',
      bottom: 70,
      left: 20,
      right: 20,
      color: '#888888',
      fontSize: 12,
      textAlign: 'center',
    },
  });

  const gameSummaryStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    summaryBox: {
      backgroundColor: '#1E1E1E',
      padding: 20,
      borderRadius: 10,
      width: '80%',
      alignItems: 'center',
    },
    summaryTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 20,
    },
    summaryText: {
      fontSize: 18,
      color: '#FFFFFF',
      marginBottom: 10,
      textAlign: 'center',
    },
    highScoreText: {
      fontSize: 18,
      color: '#66ff00af',
      fontWeight: 'bold',
      marginBottom: 20,
    },
    buttonContainer: {
      width: '100%',
      marginTop: 10,
      alignItems: 'center',
    },
  });

  useEffect(() => {
    const backAction = () => {
      if (zoomImage) {
        setZoomImage(false);
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [zoomImage]);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const stored = await AsyncStorage.getItem('highScore');
        if (stored) {
          setHighScore(parseInt(stored, 10)); // force base 10
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadHighScore();
  }, []);

  useEffect(() => {
    initializeGameSession();
    return () => {
      clearSummaryTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>GeoFinder</Text>
          <Text style={{ color: '#FFF', marginBottom: 10 }}>
            Round {roundNumber}/{TOTAL_ROUNDS}
          </Text>
          {loading && <Text style={{ color: '#FFF' }}>Loading...</Text>}
          {imageUrl && (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => setZoomImage(true)}
            >
              <Image
                source={{ uri: imageUrl ?? undefined }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          {!gameOver && imageUrl && (
            <>
              <Text style={styles.prompt}>
                Guess the country! (Guess {guessCount + 1}/3)
              </Text>
              <TextInput
                style={styles.input}
                value={guess}
                onChangeText={setGuess}
                onSubmitEditing={submitGuess}
                placeholder="Enter country name"
                placeholderTextColor="#888"
              />
              <TouchableOpacity style={styles.button} onPress={submitGuess}>
                <Text style={styles.buttonText}>Submit Guess</Text>
              </TouchableOpacity>
            </>
          )}
          {feedback && (
            <Text
              style={[
                styles.feedback,
                feedback.includes('✅')
                  ? { color: '#4CAF50' }
                  : { color: '#FF6B6B' },
              ]}
            >
              {feedback}
            </Text>
          )}
          {incorrectGuesses.length > 0 && (
            <View style={{ width: '80%' }}>
              <Text style={styles.incorrectTitle}>Previous Guesses:</Text>
              {incorrectGuesses.map((g: string, i: number) => (
                <Text key={i} style={styles.incorrect}>
                  • {g}
                </Text>
              ))}
            </View>
          )}
          {gameOver && completedRounds < TOTAL_ROUNDS && !showGameSummary && (
            <TouchableOpacity style={styles.buttonNext} onPress={startGame}>
              <Text style={styles.buttonText}>Next Game</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Text style={styles.attribution}>Images provided via Mapillary</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>High Score: {highScore}</Text>
          <Text style={styles.scoreText}>Score: {currentScore}</Text>
        </View>

        <Modal
          visible={zoomImage}
          transparent={true}
          onRequestClose={() => setZoomImage(false)}
        >
          <ImageViewer
            imageUrls={[{ url: imageUrl ?? '' }]}
            onCancel={() => setZoomImage(false)}
            enableSwipeDown={true}
            onSwipeDown={() => setZoomImage(false)}
            saveToLocalByLongPress={false}
          />
        </Modal>

        {/* Game Summary Modal */}
        <Modal
          visible={showGameSummary}
          transparent={true}
          animationType="slide"
        >
          <View style={gameSummaryStyles.modalContainer}>
            <View style={gameSummaryStyles.summaryBox}>
              <Text style={gameSummaryStyles.summaryTitle}>Game Complete!</Text>
              <Text style={gameSummaryStyles.summaryText}>
                You got {correctAnswers} out of {TOTAL_ROUNDS} correct!
              </Text>
              <Text style={gameSummaryStyles.summaryText}>
                Final Score: {currentScore}
              </Text>
              {currentScore > highScore && (
                <Text style={gameSummaryStyles.highScoreText}>
                  New High Score! 🎉
                </Text>
              )}
              <View style={gameSummaryStyles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4CAF50' }]}
                  onPress={continueGame}
                >
                  <Text style={styles.buttonText}>
                    Continue Game (10 more rounds)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#2196F3' }]}
                  onPress={async () => {
                    if (gameSessionId && currentScore > 0) {
                      try {
                        await submitScore(gameSessionId, currentScore, {
                          correctAnswers,
                          totalRounds: TOTAL_ROUNDS,
                          roundsPlayed: completedRounds,
                        });
                        // Reset score and start fresh
                        setCurrentScore(0);
                        setCorrectAnswers(0);
                        setCompletedRounds(0);
                        setRoundNumber(1);
                        Alert.alert(
                          'Success',
                          'Score submitted to leaderboard! Starting fresh game...',
                        );
                        startGame();
                      } catch (error) {
                        console.error('Error submitting score:', error);
                        Alert.alert(
                          'Error',
                          'Could not submit score to leaderboard.',
                        );
                      }
                    } else {
                      // If no score to submit, just start fresh
                      setCurrentScore(0);
                      setCorrectAnswers(0);
                      setCompletedRounds(0);
                      setRoundNumber(1);
                      startGame();
                    }
                  }}
                >
                  <Text style={styles.buttonText}>New Game</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#F44336' }]}
                  onPress={handleReturnToMainMenu}
                >
                  <Text style={styles.buttonText}>
                    Return to Main Menu (Submit to Leaderboard)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default GameScreen;
