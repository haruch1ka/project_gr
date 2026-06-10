const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_VERSION = '8.14.3';

// @react-native/gradle-plugin が Gradle 9.x 非対応のため 8.x に固定する
const withGradleWrapper = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle/wrapper/gradle-wrapper.properties'
      );

      let contents = fs.readFileSync(wrapperPath, 'utf-8');
      contents = contents.replace(
        /distributionUrl=.*gradle-[\d.]+-bin\.zip/,
        `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
      );
      fs.writeFileSync(wrapperPath, contents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withGradleWrapper;
