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
  Dimensions,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImageWithCountry, normalizeCountry, matchGuess } from './geoApiUtils';
import ImageViewer from 'react-native-image-zoom-viewer';
const { width: screenWidth } = Dimensions.get('window');

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

interface PrefetchedRound {
  image: ImageResult;
  countryInfo: CountryInfo | null;
}

const App: React.FC = () => {
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
  const [nextRound, setNextRound] = useState<PrefetchedRound | null>(null);
  const prefetchIdRef = useRef<number>(0);

  const prefetchNextRound = async (): Promise<void> => {
    const requestId: number = ++prefetchIdRef.current;
    try {
      const result = await getImageWithCountry();
      if (!result) return;

      if (prefetchIdRef.current === requestId) {
        setNextRound({ image: result.image, countryInfo: result.countryInfo });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = async (): Promise<void> => {
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
          if (!hasPrefetched) {
            setLoading(false);
          }
          return;
        }
        roundData = { image: result.image, countryInfo: result.countryInfo };
      }

      if (!roundData) {
        Alert.alert('Error', 'Could not fetch an image. Try again.');
        if (!hasPrefetched) {
          setLoading(false);
        }
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
    }
    setLoading(false);
  };

  const submitGuess = (): void => {
    if (!guess.trim()) return;

    const normalizedGuess: string = normalizeCountry(guess);
    const isCorrect: boolean = matchGuess(normalizedGuess, country, countryCode);
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
        if (stored) {
          setHighScore(parseInt(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadHighScore();
  }, []);

  useEffect(() => {
    startGame();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>GeoGuess</Text>
          {loading && <Text style={{color: '#FFF'}}>Loading...</Text>}
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
      </SafeAreaView>
      
      <Text style={styles.attribution}>Images provided via Mapillary</Text>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>High Score: {highScore}</Text>
        <Text style={styles.scoreText}>Score: {currentScore}</Text>
      </View>
    </View>
  );
};

export default App;
