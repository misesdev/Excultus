package com.excultus.youtube

import java.io.IOException
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException

/** HTTP transport NewPipeExtractor uses for its API and page requests. */
class OkHttpExtractorDownloader(private val client: OkHttpClient) : Downloader() {

  @Throws(IOException::class, ReCaptchaException::class)
  override fun execute(request: Request): Response {
    val body = request.dataToSend()?.toRequestBody()
    val builder =
      okhttp3.Request.Builder()
        .method(request.httpMethod(), body)
        .url(request.url())
        .header("User-Agent", USER_AGENT)
    request.headers().forEach { (name, values) ->
      builder.removeHeader(name)
      values.forEach { builder.addHeader(name, it) }
    }
    client.newCall(builder.build()).execute().use { response ->
      if (response.code == HTTP_TOO_MANY_REQUESTS) {
        throw ReCaptchaException("Rate limited by YouTube", request.url())
      }
      return Response(
        response.code,
        response.message,
        response.headers.toMultimap(),
        response.body?.string(),
        response.request.url.toString())
    }
  }

  companion object {
    private const val USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
    private const val HTTP_TOO_MANY_REQUESTS = 429
  }
}
