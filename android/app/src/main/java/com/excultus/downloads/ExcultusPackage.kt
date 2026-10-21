package com.excultus.downloads

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Registers the app's own TurboModules. */
class ExcultusPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == ExcultusDownloaderModule.NAME) ExcultusDownloaderModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
      ExcultusDownloaderModule.NAME to
        ReactModuleInfo(
          name = ExcultusDownloaderModule.NAME,
          className = ExcultusDownloaderModule.NAME,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = true,
        ))
  }
}
