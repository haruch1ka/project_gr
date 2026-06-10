const withRootBuildGradle = require('./plugins/withRootBuildGradle');
const withMainApplication = require('./plugins/withMainApplication');

/** @type {import('@expo/config').ExpoConfig} */
const config = {
  name: "project_gr",
  slug: "project-gr",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.taiho.projectgr",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-secure-store",
    "./plugins/withRootBuildGradle",
    "./plugins/withMainApplication",
  ],
};

module.exports = config;
