const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.watchFolders = [path.resolve(__dirname, 'android/app/src/main/assets')];
defaultConfig.resolver.cacheEnabled = true;
defaultConfig.resolver.cacheDirectory = path.resolve(process.env.HOME, '.metro-cache');

module.exports = defaultConfig;
