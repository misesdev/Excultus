package com.excultus.downloads

import android.os.SystemClock
import com.excultus.specs.NativeExcultusDownloaderSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request

/**
 * Streams HTTPS downloads to disk on background threads.
 *
 * - Resumes partial files with `Range: bytes=<size>-`; if the server ignores
 *   the range (HTTP 200) the file is rewritten from the start.
 * - Emits throttled progress events and exactly one terminal event
 *   (completed or failed) per started task.
 * - `stop` cancels the HTTP call and keeps the partial file for resuming.
 *
 * Queue policy, validation and persistence live in the JS DownloadManager.
 */
class ExcultusDownloaderModule(reactContext: ReactApplicationContext) :
  NativeExcultusDownloaderSpec(reactContext) {

  private class Task {
    @Volatile var call: Call? = null
    @Volatile var cancelled = false
  }

  private val client: OkHttpClient =
    OkHttpClient.Builder()
      .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .followRedirects(true)
      .followSslRedirects(false)
      .retryOnConnectionFailure(true)
      .build()

  private val executor: ExecutorService = Executors.newCachedThreadPool()
  private val tasks = ConcurrentHashMap<String, Task>()

  override fun getName(): String = NAME

  override fun start(taskId: String, url: String, destinationPath: String, promise: Promise) {
    if (!url.startsWith("https://")) {
      promise.reject("E_INSECURE_URL", "Only HTTPS downloads are allowed")
      return
    }
    val task = Task()
    if (tasks.putIfAbsent(taskId, task) != null) {
      promise.resolve(null) // Already running: starting twice is a no-op.
      return
    }
    executor.execute { run(taskId, url, File(destinationPath), task) }
    promise.resolve(null)
  }

  override fun stop(taskId: String, promise: Promise) {
    tasks[taskId]?.let {
      it.cancelled = true
      it.call?.cancel()
    }
    promise.resolve(null)
  }

  override fun invalidate() {
    tasks.values.forEach {
      it.cancelled = true
      it.call?.cancel()
    }
    executor.shutdownNow()
    super.invalidate()
  }

  private fun run(taskId: String, url: String, file: File, task: Task) {
    try {
      file.parentFile?.mkdirs()
      val existing = if (file.exists()) file.length() else 0L
      val builder = Request.Builder().url(url).header("User-Agent", USER_AGENT)
      if (existing > 0) {
        builder.header("Range", "bytes=$existing-")
      }
      val call = client.newCall(builder.build())
      task.call = call
      if (task.cancelled) {
        emitFailed(taskId, "cancelled", 0, "Cancelled")
        return
      }
      call.execute().use { response ->
        if (response.code == HTTP_RANGE_NOT_SATISFIABLE && existing > 0) {
          // The partial file already holds every byte; JS validates its size.
          emitCompleted(taskId, existing, existing, "")
          return
        }
        if (!response.isSuccessful) {
          emitFailed(taskId, "http", response.code, "HTTP ${response.code}")
          return
        }
        val body = response.body
        if (body == null) {
          emitFailed(taskId, "io", response.code, "Empty response body")
          return
        }
        val append = response.code == HTTP_PARTIAL_CONTENT && existing > 0
        val contentLength = body.contentLength()
        val total = when {
          contentLength < 0 -> -1L
          append -> existing + contentLength
          else -> contentLength
        }
        var written = if (append) existing else 0L
        var lastEmit = 0L
        FileOutputStream(file, append).use { output ->
          body.byteStream().use { input ->
            val buffer = ByteArray(BUFFER_SIZE)
            while (true) {
              if (task.cancelled) {
                emitFailed(taskId, "cancelled", 0, "Cancelled")
                return
              }
              val read = input.read(buffer)
              if (read == -1) break
              output.write(buffer, 0, read)
              written += read
              val now = SystemClock.elapsedRealtime()
              if (now - lastEmit >= PROGRESS_INTERVAL_MS) {
                lastEmit = now
                emitProgress(taskId, written, total)
              }
            }
            output.flush()
            output.fd.sync()
          }
        }
        emitCompleted(taskId, written, total, body.contentType()?.toString() ?: "")
      }
    } catch (error: IOException) {
      val reason = when {
        task.cancelled -> "cancelled"
        isOutOfSpace(error) -> "storage"
        else -> "network"
      }
      emitFailed(taskId, reason, 0, error.message ?: error.javaClass.simpleName)
    } catch (error: Exception) {
      emitFailed(taskId, "io", 0, error.message ?: error.javaClass.simpleName)
    } finally {
      tasks.remove(taskId)
    }
  }

  private fun isOutOfSpace(error: IOException): Boolean {
    val message = error.message ?: return false
    return message.contains("ENOSPC") || message.contains("No space left", ignoreCase = true)
  }

  private fun emitProgress(taskId: String, written: Long, total: Long) {
    emitOnProgress(
      Arguments.createMap().apply {
        putString("taskId", taskId)
        putDouble("bytesWritten", written.toDouble())
        putDouble("totalBytes", total.toDouble())
      })
  }

  private fun emitCompleted(taskId: String, written: Long, total: Long, contentType: String) {
    emitOnCompleted(
      Arguments.createMap().apply {
        putString("taskId", taskId)
        putDouble("bytesWritten", written.toDouble())
        putDouble("totalBytes", total.toDouble())
        putString("contentType", contentType)
      })
  }

  private fun emitFailed(taskId: String, reason: String, httpStatus: Int, message: String) {
    emitOnFailed(
      Arguments.createMap().apply {
        putString("taskId", taskId)
        putString("reason", reason)
        putDouble("httpStatus", httpStatus.toDouble())
        putString("message", message.take(MAX_MESSAGE_LENGTH))
      })
  }

  companion object {
    const val NAME = "ExcultusDownloader"
    private const val USER_AGENT = "Excultus/1.0 (Android; personal audio library)"
    private const val CONNECT_TIMEOUT_SECONDS = 20L
    private const val READ_TIMEOUT_SECONDS = 60L
    private const val BUFFER_SIZE = 64 * 1024
    private const val PROGRESS_INTERVAL_MS = 500L
    private const val HTTP_PARTIAL_CONTENT = 206
    private const val HTTP_RANGE_NOT_SATISFIABLE = 416
    private const val MAX_MESSAGE_LENGTH = 300
  }
}
