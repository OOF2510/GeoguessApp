import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  BackHandler,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomImage, normalizeCountry, matchGuess, ImageResult } from './geoApiUtils';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width: screenWidth } = Dimensions.get('window');

interface PrefetchedRound {
  image: ImageResult;
}

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
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
  const [nextRound, setNextRound] = useState<PrefetchedRound | null>(null);
  const prefetchIdRef = useRef<number>(0);

  const prefetchNextRound = async (): Promise<void> => {
    const requestId: number = ++prefetchIdRef.current;
    try {
      const img: ImageResult | null = await getRandomImage();
      if (!img) return;
      if (prefetchIdRef.current === requestId) {
        setNextRound({ image: img });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = async (): Promise<void> => {
    const hasPrefetched: boolean = nextRound !== null;
    if (!hasPrefetched) {
      setLoading(true);
      setApiError(null);
    }
    setImageUrl(null);
    setCountry(null);
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
        const img: ImageResult | null = await getRandomImage();
        if (!img) {
          setApiError('Failed to load game data. Check connection.');
          return;
        }
        roundData = { image: img };
      }

      if (!roundData) {
        setApiError('Failed to load game data. Check connection.');
        return;
      }

      setImageUrl(roundData.image.url);
      setCoord(roundData.image.coord);

      setCountry(roundData.image.countryName || null);
      setDisplayName(roundData.image.countryName || 'Unknown');

      prefetchNextRound();
    } catch (e) {
      setApiError('Network error. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = (): void => {
    if (!guess.trim()) return;

    const normalizedGuess: string = normalizeCountry(guess);
    const isCorrect: boolean = matchGuess(normalizedGuess, country, null);
    const newGuessCount: number = guessCount + 1;
    setGuessCount(newGuessCount);

    if (isCorrect) {
      setFeedback(`✅ Correct! It was ${displayName}`);
      setGameOver(true);
      const newScore = currentScore + 1;
      setCurrentScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        AsyncStorage.setItem('highScore', newScore.toString());
      }
    } else {
      const newIncorrect: string[] = [...incorrectGuesses, guess];
      setIncorrectGuesses(newIncorrect);
      if (newGuessCount >= 3) {
        const coordStr: string = coord ? `(${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)})` : '';
        setFeedback(`❌ Game over! It was ${displayName}${coordStr ? ' ' + coordStr : ''}`);
        setGameOver(true);
      } else {
        setFeedback(`❌ Not quite. Try again! (Guess ${newGuessCount}/3)`);
      }
    }
    setGuess('');
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      submitGuess();
    }
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
    zoomedImage: {
      width: screenWidth - 40,
      height: screenWidth - 40,
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
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.9)',
    },
    closeButton: {
      position: 'absolute',
      top: 40,
      right: 20,
      backgroundColor: '#333',
      borderRadius: 20,
      padding: 10,
    },
    closeButtonText: {
      color: '#FFF',
      fontSize: 16,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    attributionText: {
      color: '#BBBBBB',
      fontSize: 12,
      marginBottom: 8,
    },
    scoreContainer: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    scoreText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    errorText: {
      fontSize: 16,
      marginVertical: 15,
      textAlign: 'center',
      color: '#FF6B6B',
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

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [zoomImage]);

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const stored = await AsyncStorage.getItem('highScore');
        const score = parseInt(stored || '0');
        if (!isNaN(score)) {
          setHighScore(score);
        }
      } catch (e) {
        console.error('Storage read error:', e);
      }
    };
    loadHighScore();
  }, []);

  useEffect(() => {
    startGame();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>GeoGuess</Text>
        {loading && <Text style={{color: '#FFF'}}>Loading...</Text>}
        {apiError && <Text style={styles.errorText}>{apiError}</Text>}
        {imageUrl && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setZoomImage(true)}
          >
            <Image 
              source={{ uri: imageUrl || 'placeholder_uri' }} 
              style={styles.image}
              defaultSource={require('../assets/icon.png')}
              onError={() => setImageUrl(null)}
            />
          </TouchableOpacity>
        )}
        {!gameOver && imageUrl && (
          <>
            <Text style={styles.prompt}>Guess the country! (Guess {guessCount + 1}/3)</Text>
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
          <Text style={[
            styles.feedback, 
            feedback.includes('✅') ? {color: '#4CAF50'} : {color: '#FF6B6B'}
          ]}>
            {feedback}
          </Text>
        )}
        {incorrectGuesses.length > 0 && (
          <View style={{width: '80%'}}>
            <Text style={styles.incorrectTitle}>Previous Guesses:</Text>
            {incorrectGuesses.map((g: string, i: number) => (
              <Text key={i} style={styles.incorrect}>• {g}</Text>
            ))}
          </View>
        )}
        {gameOver && (
          <TouchableOpacity style={styles.buttonNext} onPress={startGame}>
            <Text style={styles.buttonText}>Next Game</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
      <View style={styles.bottomContainer}>
        <Text style={styles.attributionText}>Images provided via Mapilliary</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>High Score: {highScore}</Text>
          <Text style={styles.scoreText}>Score: {currentScore}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default App;
