const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NDK_VERSION = '30.0.14904198';

// ndkVersion を apply plugin より前に定義し、CMake コメントを末尾に追加する
const withRootBuildGradle = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let contents = fs.readFileSync(buildGradlePath, 'utf-8');

      // 既に適用済みの場合はスキップ
      if (contents.includes('ndkVersion')) {
        return config;
      }

      const extBlock = `\next {\n    ndkVersion = "${NDK_VERSION}"\n}\n\n`;
      const cmakeComment =
        `\n// CMake オブジェクトファイルのパス長制限（250文字）を回避するため、\n` +
        `// ビルド出力先を短いパスに変更する\n`;

      // apply plugin の直前に ext {} を挿入
      contents = contents.replace(
        /(\napply plugin: "expo-root-project")/,
        `${extBlock}$1`
      );

      contents += cmakeComment;

      fs.writeFileSync(buildGradlePath, contents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withRootBuildGradle;
