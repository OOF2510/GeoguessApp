import appCheck from '@react-native-firebase/app-check';
import { Platform } from 'react-native';

// Initialize Firebase App Check
const initializeFirebase = () => {
  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();

  // On Android, use the Play Integrity provider.
  if (Platform.OS === 'android') {
    provider.configure({
      android: {
        provider: 'playIntegrity',
      },
    });


  // Initialize App Check with the configured provider.
  appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  console.log('Firebase App Check with Play Integrity initialized.');
};
}

export { initializeFirebase };

