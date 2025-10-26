/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App.tsx';
import { name as appName } from './app.json';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, Button } from 'react-native';

AppRegistry.registerComponent(appName, () => App);
const ErrorFallback = ({error, resetErrorBoundary}) => (
  <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
    <Text>App Crashed</Text>
    <Text>{error.message}</Text>
    <Button title="Retry" onPress={resetErrorBoundary} />
  </View>
);

AppRegistry.registerComponent(appName, () => () => (
  <ErrorBoundary 
    FallbackComponent={ErrorFallback}
    onReset={() => {}}
  >
    <App />
  </ErrorBoundary>
));
