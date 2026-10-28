package expo.modules.compressoengine

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Android backend for the compresso adapter contract.
 *
 * `prepare` decodes once at the target size (ImageDecoder on API 28+, which
 * also applies EXIF orientation; a sampled BitmapFactory decode plus a manual
 * rotation below that), so a 50 MP photo never needs a full-size bitmap.
 */
class CompressoEngineModule : Module() {
  private val store = ConcurrentHashMap<String, PreparedImage>()

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CompressoEngine")

    // No platform HEIC encoder below the androidx HeifWriter, which needs a
    // hardware codec; WebP and JPEG cover every sharing target.
    Function("formats") { listOf("webp", "jpeg", "png") }

    AsyncFunction("prepare") Coroutine { uri: String, options: PrepareOptions ->
      withContext(Dispatchers.IO) { prepare(uri, options) }
    }

    AsyncFunction("encode") Coroutine { handle: String, options: EncodeOptions ->
      withContext(Dispatchers.Default) {
        get(handle).encode(context, options.format, options.quality, options.metadata).size
      }
    }

    AsyncFunction("write") Coroutine { handle: String, options: WriteOptions ->
      withContext(Dispatchers.IO) {
        val prepared = get(handle)
        val bytes = prepared.encode(context, options.format, options.quality, options.metadata)
        val file = outputFile(options.name, if (options.format == "jpeg") "jpg" else options.format)
        file.writeBytes(bytes)
        mapOf(
          "uri" to Uri.fromFile(file).toString(),
          "size" to bytes.size,
          "width" to prepared.bitmap.width,
          "height" to prepared.bitmap.height,
          "format" to options.format,
        )
      }
    }

    AsyncFunction("copyOriginal") Coroutine { handle: String, name: String ->
      withContext(Dispatchers.IO) {
        val prepared = get(handle)
        val file = outputFile(name, if (prepared.sourceFormat == "jpeg") "jpg" else prepared.sourceFormat)
        open(prepared.uri).use { input -> file.outputStream().use { input.copyTo(it) } }
        mapOf(
          "uri" to Uri.fromFile(file).toString(),
          "size" to file.length(),
          "width" to prepared.originalWidth,
          "height" to prepared.originalHeight,
          "format" to prepared.sourceFormat,
        )
      }
    }

    // MediaStore insert into Pictures/Compresso: no permission at all on
    // Android 10+, and it shows up as a "Compresso" album in the gallery.
    AsyncFunction("saveToLibrary") Coroutine { uri: String, takenAt: Double? ->
      withContext(Dispatchers.IO) { saveToLibrary(parseUri(uri), takenAt).toString() }
    }

    // Our own MediaStore item, so the gallery can read it without any permission.
    Function("openInGallery") { uri: String ->
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(Uri.parse(uri), "image/*")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        context.startActivity(intent)
        true
      } catch (e: ActivityNotFoundException) {
        false
      }
    }

    Function("release") { handle: String ->
      store.remove(handle)?.bitmap?.recycle()
    }
  }

  private fun get(handle: String): PreparedImage =
    store[handle] ?: throw UnknownHandleException()

  private fun open(uri: Uri): InputStream =
    context.contentResolver.openInputStream(uri) ?: throw DecodeException(uri.toString(), null)

  private fun prepare(uriString: String, options: PrepareOptions): Map<String, Any> {
    val uri = parseUri(uriString)
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    val rawWidth = bounds.outWidth
    val rawHeight = bounds.outHeight
    if (rawWidth <= 0 || rawHeight <= 0) throw DecodeException(uriString, null)
    if (rawWidth.toDouble() * rawHeight > options.maxInputPixels) throw TooLargeException()

    val exif = runCatching { open(uri).use { ExifInterface(it) } }.getOrNull()
    val rotation = exif?.rotationDegrees ?: 0
    val turned = rotation == 90 || rotation == 270
    val longEdge = max(rawWidth, rawHeight).toDouble()
    val scale = min(1.0, (options.maxLongEdge ?: longEdge) / longEdge)

    val bitmap = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        decodeModern(uri, scale)
      } else {
        decodeLegacy(uri, rawWidth, rawHeight, scale, rotation)
      }
    } catch (e: OutOfMemoryError) {
      throw TooLargeException()
    } catch (e: Exception) {
      throw DecodeException(uriString, e)
    }

    val size = runCatching {
      context.contentResolver.openFileDescriptor(uri, "r")?.use { it.statSize }
    }.getOrNull() ?: 0L
    val prepared = PreparedImage(
      uri = uri,
      bitmap = bitmap,
      exif = exif,
      originalSize = size,
      sourceFormat = formatName(bounds.outMimeType),
      originalWidth = if (turned) rawHeight else rawWidth,
      originalHeight = if (turned) rawWidth else rawHeight,
    )
    val handle = UUID.randomUUID().toString()
    store[handle] = prepared
    val takenAt = exif?.dateTimeOriginal
    return listOfNotNull(
      takenAt?.let { "takenAt" to it.toDouble() },
    ).toMap() + mapOf(
      "handle" to handle,
      "width" to bitmap.width,
      "height" to bitmap.height,
      "originalWidth" to prepared.originalWidth,
      "originalHeight" to prepared.originalHeight,
      "originalSize" to size,
      "sourceFormat" to prepared.sourceFormat,
    )
  }

  @androidx.annotation.RequiresApi(Build.VERSION_CODES.P)
  private fun decodeModern(uri: Uri, scale: Double): Bitmap {
    val source = ImageDecoder.createSource(context.contentResolver, uri)
    return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
      decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      if (scale < 1.0) {
        decoder.setTargetSize(
          max(1, (info.size.width * scale).roundToInt()),
          max(1, (info.size.height * scale).roundToInt()),
        )
      }
    }
  }

  private fun decodeLegacy(uri: Uri, width: Int, height: Int, scale: Double, rotation: Int): Bitmap {
    // Largest power-of-two sample that still leaves at least the target size.
    var sample = 1
    while (max(width, height) / (sample * 2) >= max(width, height) * scale) sample *= 2
    val decoded = open(uri).use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: throw DecodeException(uri.toString(), null)
    val targetW = max(1, (width * scale).roundToInt())
    val targetH = max(1, (height * scale).roundToInt())
    val sized = if (decoded.width != targetW || decoded.height != targetH) {
      Bitmap.createScaledBitmap(decoded, targetW, targetH, true).also { if (it !== decoded) decoded.recycle() }
    } else decoded
    if (rotation == 0) return sized
    val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
    return Bitmap.createBitmap(sized, 0, 0, sized.width, sized.height, matrix, true)
      .also { if (it !== sized) sized.recycle() }
  }

  private fun saveToLibrary(file: Uri, takenAt: Double?): Uri {
    val legacy = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
    if (legacy && context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
      throw PermissionException()
    }
    val name = file.lastPathSegment ?: "compresso-${System.currentTimeMillis()}.jpg"
    val mime = when (name.substringAfterLast('.', "").lowercase()) {
      "png" -> "image/png"
      "webp" -> "image/webp"
      "heic" -> "image/heic"
      else -> "image/jpeg"
    }
    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Images.Media.DISPLAY_NAME, name)
      put(MediaStore.Images.Media.MIME_TYPE, mime)
      takenAt?.let { put(MediaStore.Images.Media.DATE_TAKEN, it.toLong()) }
      if (!legacy) {
        put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Compresso")
        put(MediaStore.Images.Media.IS_PENDING, 1)
      }
    }
    val collection = if (legacy) {
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI
    } else {
      MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    }
    val item = resolver.insert(collection, values) ?: throw SaveException(null)
    try {
      resolver.openOutputStream(item)?.use { out -> open(file).use { it.copyTo(out) } } ?: throw SaveException(null)
      if (!legacy) {
        resolver.update(item, ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }, null, null)
      }
      return item
    } catch (e: Exception) {
      resolver.delete(item, null, null)
      throw if (e is SaveException) e else SaveException(e)
    }
  }

  private fun outputFile(name: String, ext: String): File {
    val dir = File(context.cacheDir, "compresso-out").apply { mkdirs() }
    return File(dir, "$name.$ext")
  }
}

class PrepareOptions : Record {
  @Field val maxLongEdge: Double? = null
  @Field val maxInputPixels: Double = 100_000_000.0
}

class EncodeOptions : Record {
  @Field val format: String = "jpeg"
  @Field val quality: Double = 0.8
  @Field val metadata: String = "strip-location"
}

class WriteOptions : Record {
  @Field val format: String = "jpeg"
  @Field val quality: Double = 0.8
  @Field val metadata: String = "strip-location"
  @Field val name: String = "image"
}

class DecodeException(uri: String, cause: Throwable?) :
  CodedException("ERR_DECODE", "Could not read $uri as an image", cause)

class TooLargeException :
  CodedException("ERR_TOO_LARGE", "Image exceeds the maximum decodable size", null)

class UnknownHandleException :
  CodedException("ERR_HANDLE", "This image was already released", null)

class PermissionException :
  CodedException("ERR_PERMISSION", "Permission to add photos was not granted", null)

class SaveException(cause: Throwable?) :
  CodedException("ERR_SAVE", "Could not save to the gallery", cause)

class EncodeException(format: String) :
  CodedException("ERR_FORMAT", "This device cannot write $format", null)

class PreparedImage(
  val uri: Uri,
  val bitmap: Bitmap,
  private val exif: ExifInterface?,
  val originalSize: Long,
  val sourceFormat: String,
  val originalWidth: Int,
  val originalHeight: Int,
) {
  // Only the most recent encode is kept: `write` almost always asks for the
  // last candidate the search measured.
  private var cachedKey: String? = null
  private var cachedBytes: ByteArray? = null

  @Synchronized
  fun encode(context: Context, format: String, quality: Double, metadata: String): ByteArray {
    val key = "$format|$quality|$metadata"
    cachedBytes?.let { if (cachedKey == key) return it }

    val compressFormat = when (format) {
      "jpeg" -> Bitmap.CompressFormat.JPEG
      "png" -> Bitmap.CompressFormat.PNG
      "webp" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Bitmap.CompressFormat.WEBP_LOSSY
      } else {
        @Suppress("DEPRECATION") Bitmap.CompressFormat.WEBP
      }
      else -> throw EncodeException(format)
    }
    // JPEG has no alpha: composite onto white, as compresso.js does, instead of
    // letting transparent pixels come out black.
    val pixels = if (format == "jpeg" && bitmap.hasAlpha()) flattened(bitmap) else bitmap
    val out = ByteArrayOutputStream()
    pixels.compress(compressFormat, (quality * 100).roundToInt().coerceIn(0, 100), out)
    if (pixels !== bitmap) pixels.recycle()

    val bytes = withMetadata(context, out.toByteArray(), format, metadata)
    cachedKey = key
    cachedBytes = bytes
    return bytes
  }

  /**
   * Bitmap.compress writes no EXIF at all, so `strip` is free. Otherwise the
   * chosen tags are copied from the source. Sizes are measured after this, so a
   * target size is honoured by the file that is actually saved.
   */
  private fun withMetadata(context: Context, bytes: ByteArray, format: String, policy: String): ByteArray {
    val source = exif ?: return bytes
    if (policy == "strip" || format == "png") return bytes
    val tmp = File.createTempFile("compresso", ".$format", context.cacheDir)
    return try {
      tmp.writeBytes(bytes)
      val target = ExifInterface(tmp.absolutePath)
      val tags = if (policy == "keep") CAPTURE_TAGS + LOCATION_TAGS else CAPTURE_TAGS
      for (tag in tags) source.getAttribute(tag)?.let { target.setAttribute(tag, it) }
      target.setAttribute(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL.toString())
      target.setAttribute(ExifInterface.TAG_PIXEL_X_DIMENSION, bitmap.width.toString())
      target.setAttribute(ExifInterface.TAG_PIXEL_Y_DIMENSION, bitmap.height.toString())
      target.saveAttributes()
      tmp.readBytes()
    } catch (e: Exception) {
      bytes
    } finally {
      tmp.delete()
    }
  }

  private fun flattened(src: Bitmap): Bitmap {
    val out = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
    Canvas(out).apply {
      drawColor(Color.WHITE)
      drawBitmap(src, 0f, 0f, null)
    }
    return out
  }

  companion object {
    val CAPTURE_TAGS = listOf(
      ExifInterface.TAG_DATETIME, ExifInterface.TAG_DATETIME_ORIGINAL, ExifInterface.TAG_DATETIME_DIGITIZED,
      ExifInterface.TAG_OFFSET_TIME, ExifInterface.TAG_OFFSET_TIME_ORIGINAL, ExifInterface.TAG_OFFSET_TIME_DIGITIZED,
      ExifInterface.TAG_SUBSEC_TIME, ExifInterface.TAG_SUBSEC_TIME_ORIGINAL, ExifInterface.TAG_SUBSEC_TIME_DIGITIZED,
      ExifInterface.TAG_MAKE, ExifInterface.TAG_MODEL, ExifInterface.TAG_LENS_MAKE, ExifInterface.TAG_LENS_MODEL,
      ExifInterface.TAG_ARTIST, ExifInterface.TAG_COPYRIGHT, ExifInterface.TAG_IMAGE_DESCRIPTION,
      ExifInterface.TAG_EXPOSURE_TIME, ExifInterface.TAG_F_NUMBER, ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY,
      ExifInterface.TAG_FOCAL_LENGTH, ExifInterface.TAG_FOCAL_LENGTH_IN_35MM_FILM, ExifInterface.TAG_FLASH,
      ExifInterface.TAG_WHITE_BALANCE, ExifInterface.TAG_EXPOSURE_BIAS_VALUE, ExifInterface.TAG_METERING_MODE,
      ExifInterface.TAG_COLOR_SPACE,
    )
    val LOCATION_TAGS = listOf(
      ExifInterface.TAG_GPS_LATITUDE, ExifInterface.TAG_GPS_LATITUDE_REF,
      ExifInterface.TAG_GPS_LONGITUDE, ExifInterface.TAG_GPS_LONGITUDE_REF,
      ExifInterface.TAG_GPS_ALTITUDE, ExifInterface.TAG_GPS_ALTITUDE_REF,
      ExifInterface.TAG_GPS_TIMESTAMP, ExifInterface.TAG_GPS_DATESTAMP,
      ExifInterface.TAG_GPS_IMG_DIRECTION, ExifInterface.TAG_GPS_IMG_DIRECTION_REF,
      ExifInterface.TAG_GPS_SPEED, ExifInterface.TAG_GPS_SPEED_REF,
    )
  }
}

private fun parseUri(value: String): Uri =
  if (value.contains("://")) Uri.parse(value) else Uri.fromFile(File(value))

private fun formatName(mime: String?): String = when (mime) {
  "image/jpeg" -> "jpeg"
  "image/png" -> "png"
  "image/webp" -> "webp"
  "image/heic", "image/heif" -> "heic"
  "image/gif" -> "gif"
  "image/avif" -> "avif"
  else -> "image"
}
