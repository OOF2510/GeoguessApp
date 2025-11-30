import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  // Animated,
  ImageSourcePropType,
  Modal,
  ScrollView,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../navigation/navigationTypes';
import RNFS from 'react-native-fs';
import { getLeaderboard } from '../services/leaderAuthUtils';
import { getImageWithCountry } from '../services/geoApiUtils';
import type { PrefetchedRound } from '../services/geoApiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const { width: screenWidth } = Dimensions.get('window');
const backgroundImages: ImageSourcePropType[] = [
  require('../../assets/bg1.jpg'),
  require('../../assets/bg2.jpg'),
  require('../../assets/bg3.jpg'),
  require('../../assets/bg4.jpg'),
  require('../../assets/bg5.jpg'),
  require('../../assets/bg6.jpg'),
  require('../../assets/bg7.jpg'),
  require('../../assets/bg8.jpg'),
  require('../../assets/bg9.jpg'),
  require('../../assets/bg10.jpg'),
  require('../../assets/bg11.jpg'),
];

const MAIN_MENU_STATE_KEY = 'geofinder.mainMenuState.v1';
const MAIN_MENU_STATE_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

type PersistedMainMenuState = {
  prefetchedRound: PrefetchedRound | null;
  currentIndex: number;
  cachedImages: number[];
  savedAt?: number;
};

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
      gameSessionId: string | null;
    }>
  >([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [showCredits, setShowCredits] = useState<boolean>(false);
  const [prefetchedRound, setPrefetchedRound] =
    useState<PrefetchedRound | null>(null);
  const isPrefetchingRef = useRef(false);
  const prefetchedRoundRef = useRef<PrefetchedRound | null>(null);
  const [userGameSessionIds, setUserGameSessionIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const lastStateRef = useRef<PersistedMainMenuState | null>(null);
  const skipPersistRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const persistMainMenuState = useCallback(async (): Promise<void> => {
    const snapshot = lastStateRef.current;

    if (!snapshot) {
      try {
        await AsyncStorage.removeItem(MAIN_MENU_STATE_KEY);
      } catch (error) {
        console.error('Failed to clear main menu state:', error);
      }
      return;
    }

    try {
      await AsyncStorage.setItem(
        MAIN_MENU_STATE_KEY,
        JSON.stringify({ ...snapshot, savedAt: Date.now() }),
      );
    } catch (error) {
      console.error('Failed to persist main menu state:', error);
    }
  }, []);

  const clearPersistedMainMenuState = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(MAIN_MENU_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear main menu state:', error);
    }
  }, []);

  const restorePersistedMainMenuState = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(MAIN_MENU_STATE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw) as PersistedMainMenuState;
      if (!parsed || typeof parsed.savedAt !== 'number') {
        await clearPersistedMainMenuState();
        return false;
      }

      const isExpired = Date.now() - parsed.savedAt > MAIN_MENU_STATE_MAX_AGE_MS;
      if (isExpired) {
        await clearPersistedMainMenuState();
        return false;
      }

      setPrefetchedRound(parsed.prefetchedRound ?? null);
      prefetchedRoundRef.current = parsed.prefetchedRound ?? null;
      setCachedImages(
        Array.isArray(parsed.cachedImages) ? parsed.cachedImages : [],
      );
      setCurrentIndex(
        Number.isFinite(parsed.currentIndex) ? parsed.currentIndex : 0,
      );
      return true;
    } catch (error) {
      console.error('Failed to restore main menu state:', error);
      return false;
    }
  }, [clearPersistedMainMenuState]);

  const getRandomBackgroundImage = useCallback((cache: number[] = []) => {
    const recentCache = Array.isArray(cache) ? cache : [];

    const availableIndices = backgroundImages
      .map((_, i) => i)
      .filter(i => !recentCache.includes(i));

    if (availableIndices.length === 0) {
      const idx = Math.floor(Math.random() * backgroundImages.length);
      const newCache = [idx].slice(-4);
      setCachedImages(newCache);
      saveCachedImages(newCache);
      return idx;
    }

    const selectedIndex =
      availableIndices[Math.floor(Math.random() * availableIndices.length)];

    const newCache = [...recentCache, selectedIndex].slice(-4);
    setCachedImages(newCache);
    saveCachedImages(newCache);

    return selectedIndex;
  }, []);

  const saveCachedImages = async (newCache: number[]) => {
    try {
      const filePath = `${RNFS.CachesDirectoryPath}/lastUsedImages.json`;
      await RNFS.writeFile(filePath, JSON.stringify(newCache), 'utf8');
    } catch (error) {
      console.error('Error saving cached images:', error);
    }
  };

  const loadCachedImages = useCallback(async () => {
    const filePath = `${RNFS.CachesDirectoryPath}/lastUsedImages.json`;

    try {
      const exists = await RNFS.exists(filePath);

      let cached: number[] = [];
      if (exists) {
        const content = await RNFS.readFile(filePath, 'utf8');
        cached = JSON.parse(content);
        if (isMountedRef.current) {
          setCachedImages(cached);
        }
      } else {
        if (isMountedRef.current) {
          setCachedImages([]);
        }
      }

      const initialIndex = getRandomBackgroundImage(cached);
      if (isMountedRef.current) {
        setCurrentIndex(initialIndex);
      }
    } catch (error) {
      console.error('Error loading cached images:', error);
      const initialIndex = getRandomBackgroundImage([]);
      if (isMountedRef.current) {
        setCurrentIndex(initialIndex);
      }
    }
  }, [getRandomBackgroundImage]);

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
  }, []);

  const prefetchInitialRound = useCallback(async () => {
    if (isPrefetchingRef.current || prefetchedRoundRef.current) {
      return;
    }

    isPrefetchingRef.current = true;
    try {
      const result = await getImageWithCountry();
      if (result) {
        if (!isMountedRef.current) {
          return;
        }
        setPrefetchedRound({
          image: result.image,
          countryInfo: result.countryInfo,
        });
      } else {
        if (!isMountedRef.current) {
          return;
        }
        setPrefetchedRound(null);
      }
    } catch (error) {
      console.error('Error prefetching initial round:', error);
      if (isMountedRef.current) {
        setPrefetchedRound(null);
      }
    }
    isPrefetchingRef.current = false;
  }, []);
  useEffect(() => {
    prefetchedRoundRef.current = prefetchedRound;
  }, [prefetchedRound]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (!skipPersistRef.current) {
          const snapshot = lastStateRef.current;

          if (!snapshot) {
            try {
              AsyncStorage.removeItem(MAIN_MENU_STATE_KEY).catch(error =>
                console.error('Failed to clear main menu state:', error),
              );
            } catch (error) {
              console.error('Failed to clear main menu state:', error);
            }
            return;
          }

          try {
            AsyncStorage.setItem(
              MAIN_MENU_STATE_KEY,
              JSON.stringify({ ...snapshot, savedAt: Date.now() }),
            ).catch(error =>
              console.error('Failed to persist main menu state:', error),
            );
          } catch (error) {
            console.error('Failed to persist main menu state:', error);
          }
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    lastStateRef.current = {
      prefetchedRound,
      currentIndex,
      cachedImages,
    };
  }, [prefetchedRound, currentIndex, cachedImages]);

  useEffect(() => {
    let isMounted = true;
    let prefetchAborted = false;

    const bootstrap = async () => {
      try {
        const restored = await restorePersistedMainMenuState();
        if (!isMounted || prefetchAborted) return;

        await loadCachedImages();
        if (!isMounted || prefetchAborted) return;

        if (!restored) {
          await clearPersistedMainMenuState();
          if (!isMounted || prefetchAborted) return;
          prefetchInitialRound();
        }
      } catch (error) {
        console.error('Error during MainMenu bootstrap:', error);
      }
    };

    bootstrap();

    return () => {
      isMountedRef.current = false;
      isMounted = false;
      prefetchAborted = true;
      if (!skipPersistRef.current) {
        const snapshot = lastStateRef.current;
        if (snapshot) {
          try {
            AsyncStorage.setItem(
              MAIN_MENU_STATE_KEY,
              JSON.stringify({ ...snapshot, savedAt: Date.now() }),
            ).catch(error =>
              console.error('Failed to persist main menu state on unmount:', error),
            );
          } catch (error) {
            console.error('Failed to persist main menu state on unmount:', error);
          }
        }
      } else {
        skipPersistRef.current = false;
      }
    };
  }, [clearPersistedMainMenuState, loadCachedImages, prefetchInitialRound, restorePersistedMainMenuState]);

  const loadUserGameSessionIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const stored = await AsyncStorage.getItem('gameSessionIds');
      if (!stored) {
        return new Set<string>();
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }

      const normalized = parsed.filter(
        (value: unknown): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );
      return new Set<string>(normalized);
    } catch (error) {
      console.error('Failed to load cached game session IDs:', error);
      return new Set<string>();
    }
  }, []);

  const handleStartGame = () => {
    const hasRoundReady = prefetchedRound !== null;
    const prefetchWasInFlight = isPrefetchingRef.current;

    navigation.navigate('Game', { prefetchedRound });
    setPrefetchedRound(null);
    prefetchedRoundRef.current = null;

    if (!hasRoundReady) {
      if (!prefetchWasInFlight) {
        prefetchInitialRound();
      }
      return;
    }

    prefetchInitialRound();
  };

  const handleStartAiGame = () => {
    const hasRoundReady = prefetchedRound !== null;
    const prefetchWasInFlight = isPrefetchingRef.current;

    navigation.navigate('AiDuel', { prefetchedRound });
    setPrefetchedRound(null);
    prefetchedRoundRef.current = null;

    if (!hasRoundReady) {
      if (!prefetchWasInFlight) {
        prefetchInitialRound();
      }
      return;
    }

    prefetchInitialRound();
  };

  const handleStartPanoGame = () => {
    navigation.navigate('PanoGame');
  };

  const handleLeaderboard = async () => {
    setShowLeaderboard(true);
    setLoadingLeaderboard(true);
    try {
      const [data, sessionIds] = await Promise.all([
        getLeaderboard(50),
        loadUserGameSessionIds(),
      ]);
      setUserGameSessionIds(new Set<string>(sessionIds));
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Still show the modal but with empty data
      setLeaderboardData([]);
      setUserGameSessionIds(new Set<string>());
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const closeLeaderboard = () => {
    setShowLeaderboard(false);
    setLeaderboardData([]);
    setUserGameSessionIds(new Set<string>());
  };

  const handleCredits = () => {
    setShowCredits(true);
  };

  const closeCredits = () => {
    setShowCredits(false);
  };

  const handleLicences = () => {
    setShowCredits(false);
    navigation.navigate('Licences');
  };
  
  const handleOpenGithub = async () => {
  const url = 'https://github.com/oof2510/geofinder';
  try {
    await Linking.openURL(url);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Alert.alert('Error', `Couldn't open GitHub → ${errorMessage}`);
  }
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
          {/*<Text style={styles.title}>GeoFinder</Text>*/}
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleStartGame}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aiButton} onPress={handleStartAiGame}>
          <Text style={styles.buttonText}>Play vs AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.panoButton}
          onPress={handleStartPanoGame}
        >
          <Text style={styles.buttonText}>360° Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={handleLeaderboard}
        >
          <Text style={styles.buttonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.creditsButton} onPress={handleCredits}>
        <Text style={styles.creditsButtonText}>Credits</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.githubButton} onPress={handleOpenGithub}>
        <Text style={styles.githubButtonText}>GitHub</Text>
      </TouchableOpacity>

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
                {leaderboardData.map((entry, index) => {
                  const isUserScore = Boolean(
                    entry.gameSessionId &&
                      userGameSessionIds.has(entry.gameSessionId),
                  );

                  return (
                    <View
                      key={index}
                      style={[
                        leaderboardStyles.leaderboardEntry,
                        isUserScore &&
                          leaderboardStyles.leaderboardEntryHighlight,
                      ]}
                    >
                      <Text style={leaderboardStyles.rankText}>
                        #{entry.rank}
                      </Text>
                      <Text style={leaderboardStyles.scoreText}>
                        {entry.score} pts
                      </Text>
                      <View style={leaderboardStyles.entryMeta}>
                        <Text style={leaderboardStyles.dateText}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </Text>
                        {isUserScore ? (
                          <View style={leaderboardStyles.userBadge}>
                            <Text style={leaderboardStyles.userBadgeText}>
                              You
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
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

      {/* Credits Modal */}
      <Modal
        visible={showCredits}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCredits}
      >
        <View style={creditsStyles.modalContainer}>
          <View style={creditsStyles.creditsBox}>
            <Text style={creditsStyles.creditsTitle}>Credits</Text>

            <ScrollView style={creditsStyles.scrollContainer}>
              <View style={creditsStyles.contentContainer}>
                <Text style={creditsStyles.creditsText}>
                  Images provided via Mapillary, licensed under CC-BY-SA.
                  {'\n'}
                  Map data provided by OpenStreetMap, licensed under ODbL.
                  {'\n'}
                  Fallback map data provided by BigDataCloud, Open-Metro
                  (CC-BY-4.0), and Geonames (CC-BY-SA)
                  {'\n'}
                  {'\n'}
                  AI models used for AI 1v1 provided by OpenRouter:
                  {'\n'}- Mistral Small 3.2 24B Instruct: licensed under
                  Apache-2.0 (see licenses)
                  {'\n'}- Google Gemma 3 27B: licenced under the Gemma licence
                  (see licences)
                  {'\n'}- Qwen 2.5 VL 32B Instruct: licensed under Apache-2.0
                  (see licenses)
                </Text>
              </View>
            </ScrollView>

            <View style={creditsStyles.buttonContainer}>
              <TouchableOpacity
                style={creditsStyles.closeButton}
                onPress={closeCredits}
              >
                <Text style={creditsStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={creditsStyles.closeButton}
                onPress={handleLicences}
              >
                <Text style={creditsStyles.closeButtonText}>Licences</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logo: {
    width: 256,
    height: 256,
    resizeMode: 'contain',
    opacity: 0.95,
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
  aiButton: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(160, 9, 247, 0.56)',
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
  panoButton: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(9, 211, 247, 0.56)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  creditsButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  githubButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  githubButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600',
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
  leaderboardEntryHighlight: {
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.6)',
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
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
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(136,136,136,1)',
    minWidth: 80,
    textAlign: 'right',
  },
  userBadge: {
    backgroundColor: 'rgba(76,175,80,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.6)',
    marginLeft: 8,
  },
  userBadgeText: {
    color: 'rgba(199, 234, 211, 1)',
    fontSize: 12,
    fontWeight: '700',
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

const creditsStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  creditsBox: {
    backgroundColor: 'rgba(30,30,30,1)',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  creditsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 215, 0, 1)',
    marginBottom: 20,
  },
  scrollContainer: {
    width: '100%',
    maxHeight: 400,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  creditsText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  closeButton: {
    width: '48%',
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