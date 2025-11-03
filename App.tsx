import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainMenu from './MainMenu';
import GameScreen from './GameScreen';
import AiDuel from './AiDuel';
import Licences from './Licences';
import { RootStackParamList } from './navigationTypes';
import { initializeFirebase } from './firebase';
import { initAppCheck } from './leaderAuthUtils';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  useEffect(() => {
    initializeFirebase();
    initAppCheck();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainMenu"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen name="MainMenu" component={MainMenu} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="AiDuel" component={AiDuel} />
        <Stack.Screen name="Licences" component={Licences} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
