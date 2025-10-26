/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { View, Text, Button } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import App from './src/App.tsx';
import { name as appName } from './app.json';

const ErrorFallback = ({error, resetErrorBoundary}) => (
  <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
    <Text>App Crashed</Text>
    <Text>{error.message}</Text>
    <Button title="Retry" onPress={resetErrorBoundary} />
  </View>
);

const Root = () => (
  <ErrorBoundary 
    FallbackComponent={ErrorFallback}
    onReset={() => {}}
  >
    <App />
  </ErrorBoundary>
);

AppRegistry.registerComponent(appName, () => Root);
