const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  transformer: {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
}); 