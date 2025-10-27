import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: undefined;
  // Add other screens here as you create them
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
