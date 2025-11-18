import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PrefetchedRound } from '../services/geoApiUtils';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: { prefetchedRound?: PrefetchedRound | null } | undefined;
  PanoGame: undefined;
  AiDuel: { prefetchedRound?: PrefetchedRound | null } | undefined;
  Licences: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
