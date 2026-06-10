const { withGradleProperties } = require('@expo/config-plugins');

// Windows で gradle-fileevents.dll がクラッシュするためファイルウォッチャーを無効化する
const withDisableVfsWatch = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const alreadySet = props.some(
      (item) => item.type === 'property' && item.key === 'org.gradle.vfs.watch'
    );

    if (!alreadySet) {
      props.push({ type: 'property', key: 'org.gradle.vfs.watch', value: 'false' });
    }

    return config;
  });
};

module.exports = withDisableVfsWatch;
