import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  // Animated,
  ImageSourcePropType,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from './navigationTypes';
import RNFS from 'react-native-fs';
import { getLeaderboard } from './leaderAuthUtils';

// const { width: screenWidth } = Dimensions.get('window');
const backgroundImages: ImageSourcePropType[] = [
  require('./assets/bg1.jpg'),
  require('./assets/bg2.jpg'),
  require('./assets/bg3.jpg'),
  require('./assets/bg4.jpg'),
  require('./assets/bg5.jpg'),
  require('./assets/bg6.jpg'),
  require('./assets/bg7.jpg'),
  require('./assets/bg8.jpg'),
  require('./assets/bg9.jpg'),
  require('./assets/bg10.jpg'),
  require('./assets/bg11.jpg'),
];

const MainMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [currentIndex, setCurrentIndex] = useState(0);
  // const slideAnim = useRef(new Animated.Value(0)).current;
  // const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cachedImages, setCachedImages] = useState<number[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboardData, setLeaderboardData] = useState<
    Array<{
      rank: number;
      score: number;
      createdAt: string;
    }>
  >([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  // Preload images on component mount
  useEffect(() => {
    const preloadImages = async () => {
      const preloadPromises = backgroundImages.map(imageSource => {
        return Image.prefetch(Image.resolveAssetSource(imageSource).uri);
      });
      await Promise.all(preloadPromises);
      console.log('All background images preloaded');
    };

    preloadImages();

    // Load cached images from storage
    loadCachedImages();
  }, []);

  const loadCachedImages = async () => {
    try {
      const filePath = `${RNFS.CachesDirectoryPath}/lastUsedImages.json`;
      const exists = await RNFS.exists(filePath);

      let cached: number[] = [];
      if (exists) {
        const content = await RNFS.readFile(filePath, 'utf8');
        cached = JSON.parse(content);
        setCachedImages(cached);
      } else {
        // ensure state is initialized
        setCachedImages([]);
      }

      // After loading the cache (or defaulting), pick a single random background once
      const initialIndex = getRandomBackgroundImage(cached);
      setCurrentIndex(initialIndex);
    } catch (error) {
      console.error('Error loading cached images:', error);
      // Fallback: pick a random image based on current (possibly empty) cache state
      const initialIndex = getRandomBackgroundImage();
      setCurrentIndex(initialIndex);
    }
  };

  const saveCachedImages = async (newCache: number[]) => {
    try {
      const filePath = `${RNFS.CachesDirectoryPath}/lastUsedImages.json`;
      await RNFS.writeFile(filePath, JSON.stringify(newCache), 'utf8');
    } catch (error) {
      console.error('Error saving cached images:', error);
    }
  };

  const getRandomBackgroundImage = (cachedArray?: number[]) => {
    // Use the passed cache if provided (so we can pick immediately after reading file),
    // otherwise fall back to the cachedImages state.
    const cache = Array.isArray(cachedArray) ? cachedArray : cachedImages;

    // Build list of available indices excluding the recent cache
    const availableIndices = backgroundImages
      .map((_, i) => i)
      .filter(i => !cache.includes(i));

    // If all images were recently used, reset and pick any random one
    if (availableIndices.length === 0) {
      const idx = Math.floor(Math.random() * backgroundImages.length);
      const newCache = [idx].slice(-4);
      setCachedImages(newCache);
      saveCachedImages(newCache);
      return idx;
    }

    // Choose a random index from the available ones
    const selectedIndex =
      availableIndices[Math.floor(Math.random() * availableIndices.length)];

    // Update cache with the selected image (keep last 4)
    const newCache = [...cache, selectedIndex].slice(-4);
    setCachedImages(newCache);
    saveCachedImages(newCache);

    return selectedIndex;
  };

  const handleStartGame = () => {
    navigation.navigate('Game');
  };

  const handleLeaderboard = async () => {
    setShowLeaderboard(true);
    setLoadingLeaderboard(true);
    try {
      const data = await getLeaderboard(50);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Still show the modal but with empty data
      setLeaderboardData([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const closeLeaderboard = () => {
    setShowLeaderboard(false);
    setLeaderboardData([]);
  };

  // const startTransition = () => {
  //   const nextIndex = (currentIndex + 1) % backgroundImages.length;
  //
  //   // Reset animation value and start transition
  //   slideAnim.setValue(0);
  //
  //   Animated.timing(slideAnim, {
  //     toValue: -screenWidth,
  //     duration: 1000, // 1 second transition
  //     useNativeDriver: true,
  //   }).start(({ finished }) => {
  //     if (finished) {
  //       // Update current index after animation completes
  //       setCurrentIndex(nextIndex);
  //       slideAnim.setValue(0);
  //     }
  //   });
  // };

  // useEffect(() => {
  //   // Clear any existing interval
  //   if (intervalRef.current) {
  //     clearInterval(intervalRef.current);
  //   }
  //
  //   // Set up new interval
  //   intervalRef.current = setInterval(() => {
  //     startTransition();
  //   }, 7000); // 7 seconds per image

  //   return () => {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //     }
  //   };
  // }, [currentIndex]); // Only depend on currentIndex

  {
    /* Initialization is now handled after cache load inside loadCachedImages */
  }

  // const nextIndex = (currentIndex + 1) % backgroundImages.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slideshowContainer}>
        {/* Current image */}
        {/* <Animated.Image
          key={currentIndex}
          source={backgroundImages[currentIndex]}
          style={[
            styles.slideshowImage,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
          resizeMode="cover"
        /> */}

        {/* Next image */}
        {/* <Animated.Image
          key={nextIndex}
          source={backgroundImages[nextIndex]}
          style={[
            styles.slideshowImage,
            {
              position: 'absolute',
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [-screenWidth, 0],
                    outputRange: [0, screenWidth],
                  }),
                },
              ],
            },
          ]}
          resizeMode="cover"
        /> */}

        <Image
          source={backgroundImages[currentIndex]}
          style={styles.slideshowImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>GeoGuess</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleStartGame}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={handleLeaderboard}
        >
          <Text style={styles.buttonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard Modal */}
      <Modal
        visible={showLeaderboard}
        transparent={true}
        animationType="slide"
        onRequestClose={closeLeaderboard}
      >
        <View style={leaderboardStyles.modalContainer}>
          <View style={leaderboardStyles.leaderboardBox}>
            <Text style={leaderboardStyles.leaderboardTitle}>Leaderboard</Text>

            {loadingLeaderboard ? (
              <View style={leaderboardStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={leaderboardStyles.loadingText}>
                  Loading scores...
                </Text>
              </View>
            ) : leaderboardData.length > 0 ? (
              <ScrollView style={leaderboardStyles.scrollContainer}>
                {leaderboardData.map((entry, index) => (
                  <View key={index} style={leaderboardStyles.leaderboardEntry}>
                    <Text style={leaderboardStyles.rankText}>
                      #{entry.rank}
                    </Text>
                    <Text style={leaderboardStyles.scoreText}>
                      {entry.score} pts
                    </Text>
                    <Text style={leaderboardStyles.dateText}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={leaderboardStyles.emptyContainer}>
                <Text style={leaderboardStyles.emptyText}>
                  No scores available yet.
                </Text>
                <Text style={leaderboardStyles.emptySubText}>
                  Be the first to play and set a high score!
                </Text>
              </View>
            )}

            <View style={leaderboardStyles.buttonContainer}>
              <TouchableOpacity
                style={leaderboardStyles.closeButton}
                onPress={closeLeaderboard}
              >
                <Text style={leaderboardStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slideshowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  slideshowImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,1)',
  },
  button: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(76,175,80,0.56)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaderboardButton: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(33,37,243,0.56)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const leaderboardStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  leaderboardBox: {
    backgroundColor: 'rgba(30,30,30,1)',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  leaderboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 215, 0, 1)',
    marginBottom: 20,
  },
  scrollContainer: {
    width: '100%',
    maxHeight: 400,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    backgroundColor: 'rgba(42,42,42,1)',
    borderRadius: 8,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(76,175,80,1)',
    minWidth: 40,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,1)',
    flex: 1,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(136,136,136,1)',
    minWidth: 80,
    textAlign: 'right',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 18,
    marginBottom: 10,
  },
  emptySubText: {
    color: 'rgba(136,136,136,1)',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  closeButton: {
    width: '60%',
    borderRadius: 25,
    backgroundColor: 'rgba(231, 46, 46, 1)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainMenu;
