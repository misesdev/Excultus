package com.excultus.youtube

import com.excultus.specs.NativeExcultusYouTubeSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import org.schabi.newpipe.extractor.Image
import org.schabi.newpipe.extractor.MediaFormat
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.Page
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.exceptions.ContentNotAvailableException
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import org.schabi.newpipe.extractor.playlist.PlaylistInfo
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.AudioTrackType
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem

/**
 * Resolves YouTube videos and playlists with NewPipeExtractor.
 *
 * Only progressive M4A (AAC) audio is offered: it is a single file the
 * downloader can fetch with Range requests and every Android player decodes.
 * Stream URLs expire after a few hours, so callers resolve right before
 * each transfer instead of storing them.
 */
class ExcultusYouTubeModule(reactContext: ReactApplicationContext) :
  NativeExcultusYouTubeSpec(reactContext) {

  private val executor: ExecutorService = Executors.newFixedThreadPool(MAX_PARALLEL_REQUESTS)

  init {
    ensureInitialized()
  }

  override fun getName(): String = NAME

  override fun resolveVideo(videoId: String, promise: Promise) {
    if (!VIDEO_ID.matches(videoId)) {
      promise.reject(E_EXTRACTION, "Invalid video id")
      return
    }
    executor.execute {
      settle(promise) {
        val info = StreamInfo.getInfo(ServiceList.YouTube, "$WATCH_URL$videoId")
        val stream =
          pickAudioStream(info.audioStreams)
            ?: throw NoAudioException("No progressive M4A audio stream")
        Arguments.createMap().apply {
          putString("id", videoId)
          putString("title", info.name)
          putString("uploader", info.uploaderName ?: "")
          putDouble("durationSeconds", info.duration.toDouble())
          putString("thumbnailUrl", bestImage(info.thumbnails))
          putString("streamUrl", stream.content)
          putString("mimeType", MediaFormat.M4A.mimeType)
          putDouble("contentLength", (stream.itagItem?.contentLength ?: -1L).toDouble())
        }
      }
    }
  }

  override fun getPlaylist(playlistId: String, maxEntries: Double, promise: Promise) {
    if (!LIST_ID.matches(playlistId)) {
      promise.reject(E_EXTRACTION, "Invalid playlist id")
      return
    }
    val limit = maxEntries.toInt().coerceAtLeast(1)
    executor.execute {
      settle(promise) {
        val url = "$PLAYLIST_URL$playlistId"
        val info = PlaylistInfo.getInfo(ServiceList.YouTube, url)
        val items = info.relatedItems.toMutableList()
        var next: Page? = info.nextPage
        while (items.size < limit && Page.isValid(next)) {
          val page = PlaylistInfo.getMoreItems(ServiceList.YouTube, url, next)
          items.addAll(page.items)
          next = page.nextPage
        }
        val entries = Arguments.createArray()
        items.take(limit).forEach { entries.pushMap(toEntry(it)) }
        Arguments.createMap().apply {
          putString("id", playlistId)
          putString("title", info.name)
          putString("uploader", info.uploaderName ?: "")
          putString("thumbnailUrl", bestImage(info.thumbnails))
          putArray("entries", entries)
          putBoolean("truncated", items.size > limit || Page.isValid(next))
        }
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private fun toEntry(item: StreamInfoItem): WritableMap =
    Arguments.createMap().apply {
      putString("id", videoIdFromUrl(item.url) ?: "")
      putString("title", item.name)
      putString("uploader", item.uploaderName ?: "")
      putDouble("durationSeconds", item.duration.toDouble())
    }

  /** Runs `block` and maps extractor failures to the documented rejection codes. */
  private fun settle(promise: Promise, block: () -> WritableMap) {
    try {
      promise.resolve(block())
    } catch (error: NoAudioException) {
      promise.reject(E_NO_AUDIO, error.message, error)
    } catch (error: ContentNotAvailableException) {
      promise.reject(E_UNAVAILABLE, error.message ?: "Content not available", error)
    } catch (error: ReCaptchaException) {
      promise.reject(E_NETWORK, error.message ?: "Rate limited", error)
    } catch (error: IOException) {
      promise.reject(E_NETWORK, error.message ?: error.javaClass.simpleName, error)
    } catch (error: Exception) {
      promise.reject(E_EXTRACTION, error.message ?: error.javaClass.simpleName, error)
    }
  }

  private class NoAudioException(message: String) : Exception(message)

  companion object {
    const val NAME = "ExcultusYouTube"
    private const val E_UNAVAILABLE = "E_UNAVAILABLE"
    private const val E_NO_AUDIO = "E_NO_AUDIO"
    private const val E_NETWORK = "E_NETWORK"
    private const val E_EXTRACTION = "E_EXTRACTION"
    private const val WATCH_URL = "https://www.youtube.com/watch?v="
    private const val PLAYLIST_URL = "https://www.youtube.com/playlist?list="
    private const val MAX_PARALLEL_REQUESTS = 4
    private const val TIMEOUT_SECONDS = 30L
    private val VIDEO_ID = Regex("^[A-Za-z0-9_-]{11}$")
    private val LIST_ID = Regex("^[A-Za-z0-9_-]{10,64}$")
    private val VIDEO_ID_PARAM = Regex("[?&]v=([A-Za-z0-9_-]{11})")

    @Volatile private var initialized = false

    @Synchronized
    private fun ensureInitialized() {
      if (initialized) return
      val client =
        OkHttpClient.Builder()
          .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
          .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
          .build()
      NewPipe.init(OkHttpExtractorDownloader(client))
      initialized = true
    }

    private fun videoIdFromUrl(url: String): String? = VIDEO_ID_PARAM.find(url)?.groupValues?.get(1)

    private fun bestImage(images: List<Image>): String =
      images.maxByOrNull { it.height }?.url ?: ""

    /** Highest-bitrate progressive M4A, preferring the original (non-dubbed) track. */
    private fun pickAudioStream(streams: List<AudioStream>): AudioStream? =
      streams
        .filter {
          it.format == MediaFormat.M4A &&
            it.isUrl &&
            it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP
        }
        .sortedWith(
          compareBy<AudioStream> {
              it.audioTrackType != null && it.audioTrackType != AudioTrackType.ORIGINAL
            }
            .thenByDescending { maxOf(it.averageBitrate, it.bitrate) })
        .firstOrNull()
  }
}
