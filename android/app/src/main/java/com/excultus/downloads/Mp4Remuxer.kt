package com.excultus.downloads

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.nio.ByteBuffer

/**
 * Rewrites fragmented MP4 (DASH: `moof`/`mdat` pairs, as served by YouTube)
 * into a regular MP4 with a single sample table. Samples are copied as is,
 * without re-encoding. Local players handle fragmented files poorly: seeking
 * and resuming snap to fragment boundaries and every jump re-buffers.
 */
object Mp4Remuxer {
  private const val SAMPLE_BUFFER_SIZE = 1 shl 20
  private const val BOX_HEADER_SIZE = 8
  private const val LARGE_BOX_HEADER_SIZE = 16

  /** Returns true when the file was fragmented and has been replaced in place. */
  @Throws(IOException::class)
  fun remuxIfFragmented(file: File): Boolean {
    if (!isFragmented(file)) return false
    val output = File(file.path + ".remux")
    try {
      remux(file, output)
      if (!output.renameTo(file)) {
        throw IOException("Could not replace ${file.name}")
      }
    } finally {
      output.delete()
    }
    return true
  }

  /** Scans top-level box headers only; never reads sample data. */
  private fun isFragmented(file: File): Boolean {
    RandomAccessFile(file, "r").use { input ->
      var offset = 0L
      val length = input.length()
      while (offset + BOX_HEADER_SIZE <= length) {
        input.seek(offset)
        var size = input.readInt().toLong() and 0xFFFFFFFFL
        val type = ByteArray(4).also { input.readFully(it) }.toString(Charsets.US_ASCII)
        if (type == "moof") return true
        size = when (size) {
          0L -> return false // Box extends to the end of the file.
          1L -> if (offset + LARGE_BOX_HEADER_SIZE <= length) input.readLong() else return false
          else -> size
        }
        if (size < BOX_HEADER_SIZE) return false
        offset += size
      }
    }
    return false
  }

  private fun remux(input: File, output: File) {
    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null
    try {
      extractor.setDataSource(input.path)
      val tracks = mutableMapOf<Int, Int>()
      val newMuxer = MediaMuxer(output.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = newMuxer
      for (index in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(index)
        if (format.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
          extractor.selectTrack(index)
          tracks[index] = newMuxer.addTrack(format)
        }
      }
      if (tracks.isEmpty()) throw IOException("No audio track to remux")
      newMuxer.start()
      val buffer = ByteBuffer.allocate(SAMPLE_BUFFER_SIZE)
      val info = MediaCodec.BufferInfo()
      while (true) {
        val size = extractor.readSampleData(buffer, 0)
        if (size < 0) break
        val flags =
          if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
            MediaCodec.BUFFER_FLAG_KEY_FRAME
          } else {
            0
          }
        info.set(0, size, extractor.sampleTime, flags)
        newMuxer.writeSampleData(tracks.getValue(extractor.sampleTrackIndex), buffer, info)
        extractor.advance()
      }
      newMuxer.stop()
    } finally {
      muxer?.release()
      extractor.release()
    }
  }
}
