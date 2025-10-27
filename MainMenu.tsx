import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from './navigationTypes';

const { width: screenWidth } = Dimensions.get('window');

const MainMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleStartGame = () => {
    navigation.navigate('Game');
  };

  const handleLeaderboard = () => {
    // Implement leaderboard navigation later
    console.log('Leaderboard button pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>GeoGuess</Text>
        <Image
          source={require('./assets/earth.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.button} onPress={handleStartGame}>
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLeaderboard}>
          <Text style={styles.buttonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  logo: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.4,
    marginBottom: 40,
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
});

export default MainMenu;
