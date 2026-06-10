const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// apply plugin を ext {} の後に移動し、CMake パス長制限の回避コメントを追加する
const withRootBuildGradle = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let contents = fs.readFileSync(buildGradlePath, 'utf-8');

      const pluginLines =
        'apply plugin: "expo-root-project"\n' +
        'apply plugin: "com.facebook.react.rootproject"';

      const cmakeComment =
        '\n// CMake オブジェクトファイルのパス長制限（250文字）を回避するため、\n' +
        '// ビルド出力先を短いパスに変更する\n';

      // 既に適用済みの場合はスキップ
      if (contents.includes(cmakeComment.trim())) {
        return config;
      }

      // ext {} より前の apply plugin 行を削除
      contents = contents.replace(
        /apply plugin: "expo-root-project"\napply plugin: "com\.facebook\.react\.rootproject"\n\n/,
        ''
      );

      // ext {} ブロックの末尾の後に apply plugin とコメントを追加
      contents = contents.replace(
        /(ext \{[^}]*\})/,
        `$1\n\n${pluginLines}${cmakeComment}`
      );

      fs.writeFileSync(buildGradlePath, contents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withRootBuildGradle;
