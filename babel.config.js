module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "react-native-linear-gradient": "expo-linear-gradient",
          },
        },
      ],
      // REQUIRED for the Swipe-to-Trade gestures to work! MUST BE LAST!
      "react-native-reanimated/plugin",
    ],
  };
};