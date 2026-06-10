const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// prebuild が旧アーキテクチャ（ReactNativeHostWrapper）を生成した場合に
// 新アーキテクチャ（ExpoReactHostFactory）へ書き換える
const withMainApplication = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const packageName = config.android?.package ?? 'com.example.app';
      const packagePath = packageName.replace(/\./g, '/');
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath,
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainApplicationPath)) {
        return config;
      }

      const contents = fs.readFileSync(mainApplicationPath, 'utf-8');

      // 既に新アーキテクチャなら何もしない
      if (contents.includes('ExpoReactHostFactory')) {
        return config;
      }

      // 旧アーキテクチャが生成されていた場合のみ書き換える
      if (!contents.includes('ReactNativeHostWrapper')) {
        return config;
      }

      const newContents = `package ${packageName}

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost
    get() = ExpoReactHostFactory.getDefaultReactHost(applicationContext, PackageList(this).packages)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

      fs.writeFileSync(mainApplicationPath, newContents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withMainApplication;
