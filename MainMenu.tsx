import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from './navigationTypes';

const { width: screenWidth } = Dimensions.get('window');
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
  const [nextIndex, setNextIndex] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Preload images on component mount
  useEffect(() => {
    const preloadImages = async () => {
      const preloadPromises = backgroundImages.map((imageSource) => {
        return Image.prefetch(Image.resolveAssetSource(imageSource).uri);
      });
      await Promise.all(preloadPromises);
      console.log('All background images preloaded');
    };
    
    preloadImages();
  }, []);

  const handleStartGame = () => {
    navigation.navigate('Game');
  };

  const handleLeaderboard = () => {
    console.log('Leaderboard button pressed');
  };

  const startTransition = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setNextIndex((currentIndex + 1) % backgroundImages.length);
    
    // Reset animation value and start transition
    slideAnim.setValue(0);
    
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 1000, // 1 second transition
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        // Update current index and reset for next transition
        setCurrentIndex(nextIndex);
        setIsTransitioning(false);
        slideAnim.setValue(0);
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition();
    }, 7000); // 7 seconds per image

    return () => clearInterval(interval);
  }, [currentIndex, nextIndex, isTransitioning]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slideshowContainer}>
        {/* Current image */}
        <Animated.Image
          source={backgroundImages[currentIndex]}
          style={[
            styles.slideshowImage,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
          resizeMode="cover"
        />
        
        {/* Next image */}
        <Animated.Image
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
    color: '#FFFFFF',
  },
  button: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#4CAF508e',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaderboardButton: {
    width: '80%',
    marginBottom: 15,
    borderRadius: 25,
    backgroundColor: '#2125f38e',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainMenu;
