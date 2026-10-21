package com.excultus.downloads

import com.excultus.youtube.ExcultusYouTubeModule
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Registers the app's own TurboModules. */
class ExcultusPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      ExcultusDownloaderModule.NAME -> ExcultusDownloaderModule(reactContext)
      ExcultusYouTubeModule.NAME -> ExcultusYouTubeModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    listOf(ExcultusDownloaderModule.NAME, ExcultusYouTubeModule.NAME).associateWith { name ->
      ReactModuleInfo(
        name = name,
        className = name,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = true,
      )
    }
  }
}
