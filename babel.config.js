module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // Reanimated 4.x ships its Babel plugin under react-native-worklets.
      'react-native-worklets/plugin',
    ],
  };
};
