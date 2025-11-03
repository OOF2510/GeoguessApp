import appCheck from '@react-native-firebase/app-check';
import { Platform } from 'react-native';

let initialized = false;

// Initialize Firebase App Check
const initializeFirebase = () => {
  if (initialized) {
    return;
  }

  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();

  // On Android, use the Play Integrity provider.
  if (Platform.OS === 'android') {
    provider.configure({
      android: {
        provider: 'playIntegrity',
      },
    });
  }

  // Initialize App Check with the configured provider.
  appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  console.log('Firebase App Check with Play Integrity initialized.');
  initialized = true;
};

export { initializeFirebase };
