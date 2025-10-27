import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from './navigationTypes';

const { width: screenWidth } = Dimensions.get('window');
const backgroundImages = Array.from(
  { length: 11 }, (_, i) => require(`./assets/bg${i + 1}.jpg`)
);

const MainMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [index, setIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const handleStartGame = () => {
    navigation.navigate('Game');
  };

  const handleLeaderboard = () => {
    // Implement leaderboard navigation later
    console.log('Leaderboard button pressed');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -screenWidth,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
      setIndex(prev => (prev + 1) % backgroundImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slideshowContainer}>
        <Animated.Image
          source={backgroundImages[index]}
          style={[styles.slideshowImage, { transform: [{ translateX: slideAnim }] }]}
          resizeMode="cover"
        />
        <Animated.Image
          source={backgroundImages[(index + 1) % backgroundImages.length]}
          style={[
            styles.slideshowImage,
            {
              position: 'absolute',
              transform: [{ translateX: slideAnim.interpolate({
                inputRange: [-screenWidth, 0],
                outputRange: [0, screenWidth],
              }) }],
            },
          ]}
          resizeMode="cover"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>GeoGuess</Text>
        <TouchableOpacity style={styles.button} onPress={handleStartGame}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaderboardButton} onPress={handleLeaderboard}>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#FFFFFF',
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
