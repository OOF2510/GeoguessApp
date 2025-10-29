import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PrefetchedRound } from './geoApiUtils';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: { prefetchedRound?: PrefetchedRound | null } | undefined;
  // Add other screens here as you create them
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
