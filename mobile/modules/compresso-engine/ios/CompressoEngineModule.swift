import CoreGraphics
import ExpoModulesCore
import ImageIO
import Photos
import UniformTypeIdentifiers

/**
 * ImageIO backend for the compresso adapter contract.
 *
 * `prepare` decodes once, straight to the target size, with
 * `CGImageSourceCreateThumbnailAtIndex` — the full-resolution bitmap of a 48 MP
 * photo is never allocated, which is what keeps big batches alive on older
 * iPhones. Orientation is applied during that decode, so every encode starts
 * from upright pixels and writes orientation 1.
 */
public class CompressoEngineModule: Module {
  private let store = PreparedStore()

  public func definition() -> ModuleDefinition {
    Name("CompressoEngine")

    Function("formats") { () -> [String] in
      let writable = CGImageDestinationCopyTypeIdentifiers() as? [String] ?? []
      return writable.contains(UTType.heic.identifier) ? ["heic", "jpeg", "png"] : ["jpeg", "png"]
    }

    AsyncFunction("prepare") { (uri: String, options: PrepareOptions) -> [String: Any] in
      let url = fileURL(uri)
      guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
            CGImageSourceGetCount(source) > 0 else {
        throw DecodeException(uri)
      }
      let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
      let rawWidth = props[kCGImagePropertyPixelWidth] as? Int ?? 0
      let rawHeight = props[kCGImagePropertyPixelHeight] as? Int ?? 0
      guard rawWidth > 0, rawHeight > 0 else { throw DecodeException(uri) }
      if Double(rawWidth) * Double(rawHeight) > options.maxInputPixels { throw TooLargeException() }

      let longEdge = Double(max(rawWidth, rawHeight))
      let target = min(longEdge, options.maxLongEdge ?? longEdge)
      let thumbOptions: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceThumbnailMaxPixelSize: max(1, Int(target.rounded())),
      ]
      guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions as CFDictionary) else {
        throw DecodeException(uri)
      }

      // EXIF orientations 5–8 are quarter turns: the upright original is rotated.
      let orientation = props[kCGImagePropertyOrientation] as? UInt32 ?? 1
      let turned = orientation >= 5 && orientation <= 8
      let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
      let prepared = PreparedImage(
        url: url, image: image, properties: props, originalSize: size,
        sourceFormat: formatName(CGImageSourceGetType(source) as String?)
      )
      let handle = self.store.put(prepared)
      var result: [String: Any] = [
        "handle": handle,
        "width": image.width,
        "height": image.height,
        "originalWidth": turned ? rawHeight : rawWidth,
        "originalHeight": turned ? rawWidth : rawHeight,
        "originalSize": size,
        "sourceFormat": prepared.sourceFormat,
      ]
      if let date = captureDate(props) { result["takenAt"] = date.timeIntervalSince1970 * 1000 }
      return result
    }

    // Add-only access ("Add Photos Only"): Compresso can save, never browse.
    // The capture date is set explicitly so a stripped file still sorts where
    // the original did in the library.
    AsyncFunction("saveToLibrary") { (uri: String, takenAt: Double?, promise: Promise) in
      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else {
          promise.reject(PermissionException())
          return
        }
        PHPhotoLibrary.shared().performChanges({
          let request = PHAssetCreationRequest.forAsset()
          request.addResource(with: .photo, fileURL: fileURL(uri), options: nil)
          if let takenAt { request.creationDate = Date(timeIntervalSince1970: takenAt / 1000) }
        }) { ok, error in
          if ok { promise.resolve(nil) } else { promise.reject(SaveException(error?.localizedDescription ?? "")) }
        }
      }
    }

    AsyncFunction("encode") { (handle: String, options: EncodeOptions) -> Int in
      let prepared = try self.store.get(handle)
      return try prepared.encode(options.format, options.quality, options.metadata).count
    }

    AsyncFunction("write") { (handle: String, options: WriteOptions) -> [String: Any] in
      let prepared = try self.store.get(handle)
      let data = try prepared.encode(options.format, options.quality, options.metadata)
      let url = try outputURL(options.name, ext: fileExtension(options.format))
      try data.write(to: url, options: .atomic)
      return [
        "uri": url.absoluteString,
        "size": data.count,
        "width": prepared.image.width,
        "height": prepared.image.height,
        "format": options.format,
      ]
    }

    AsyncFunction("copyOriginal") { (handle: String, name: String) -> [String: Any] in
      let prepared = try self.store.get(handle)
      let ext = prepared.url.pathExtension.isEmpty ? prepared.sourceFormat : prepared.url.pathExtension
      let url = try outputURL(name, ext: ext)
      try? FileManager.default.removeItem(at: url)
      try FileManager.default.copyItem(at: prepared.url, to: url)
      return [
        "uri": url.absoluteString,
        "size": prepared.originalSize,
        "width": prepared.properties[kCGImagePropertyPixelWidth] as? Int ?? prepared.image.width,
        "height": prepared.properties[kCGImagePropertyPixelHeight] as? Int ?? prepared.image.height,
        "format": prepared.sourceFormat,
      ]
    }

    Function("release") { (handle: String) in
      self.store.remove(handle)
    }
  }
}

// MARK: - Records

struct PrepareOptions: Record {
  @Field var maxLongEdge: Double?
  @Field var maxInputPixels: Double = 100_000_000
}

struct EncodeOptions: Record {
  @Field var format: String = "jpeg"
  @Field var quality: Double = 0.8
  @Field var metadata: String = "strip-location"
}

struct WriteOptions: Record {
  @Field var format: String = "jpeg"
  @Field var quality: Double = 0.8
  @Field var metadata: String = "strip-location"
  @Field var name: String = "image"
}

// MARK: - Errors

final class DecodeException: GenericException<String> {
  override var reason: String { "Could not read \(param) as an image" }
}

final class TooLargeException: Exception {
  override var reason: String { "Image exceeds the maximum decodable size" }
}

final class UnknownHandleException: Exception {
  override var reason: String { "This image was already released" }
}

final class PermissionException: Exception {
  override var reason: String { "Permission to add photos was not granted" }
}

final class SaveException: GenericException<String> {
  override var reason: String { "Could not save to Photos: \(param)" }
}

final class EncodeException: GenericException<String> {
  override var reason: String { "This device cannot write \(param)" }
}

// MARK: - Prepared images

final class PreparedImage {
  let url: URL
  let image: CGImage
  let properties: [CFString: Any]
  let originalSize: Int
  let sourceFormat: String

  private let lock = NSLock()
  // Only the most recent encode is kept: the search measures many candidates,
  // and `write` almost always asks for the last one that fit.
  private var cachedKey: String?
  private var cachedData: Data?

  init(url: URL, image: CGImage, properties: [CFString: Any], originalSize: Int, sourceFormat: String) {
    self.url = url
    self.image = image
    self.properties = properties
    self.originalSize = originalSize
    self.sourceFormat = sourceFormat
  }

  func encode(_ format: String, _ quality: Double, _ metadata: String) throws -> Data {
    let key = "\(format)|\(quality)|\(metadata)"
    lock.lock()
    if cachedKey == key, let data = cachedData { lock.unlock(); return data }
    lock.unlock()

    let type: UTType
    switch format {
    case "heic": type = .heic
    case "png": type = .png
    case "jpeg": type = .jpeg
    default: throw EncodeException(format)
    }
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(data, type.identifier as CFString, 1, nil) else {
      throw EncodeException(format)
    }
    var props = metadataProperties(properties, policy: metadata)
    if format != "png" { props[kCGImageDestinationLossyCompressionQuality] = quality }
    // JPEG has no alpha: composite onto white, as compresso.js does, instead of
    // letting transparent pixels come out black.
    let pixels = format == "jpeg" ? flattened(image) : image
    CGImageDestinationAddImage(destination, pixels, props as CFDictionary)
    guard CGImageDestinationFinalize(destination) else { throw EncodeException(format) }

    let result = data as Data
    lock.lock()
    cachedKey = key
    cachedData = result
    lock.unlock()
    return result
  }
}

final class PreparedStore {
  private var items: [String: PreparedImage] = [:]
  private let lock = NSLock()

  func put(_ item: PreparedImage) -> String {
    let handle = UUID().uuidString
    lock.lock(); items[handle] = item; lock.unlock()
    return handle
  }

  func get(_ handle: String) throws -> PreparedImage {
    lock.lock(); defer { lock.unlock() }
    guard let item = items[handle] else { throw UnknownHandleException() }
    return item
  }

  func remove(_ handle: String) {
    lock.lock(); items[handle] = nil; lock.unlock()
  }
}

// MARK: - Helpers

/**
 * The metadata written with each encode. Sizes are measured with metadata
 * included, so a target size is honoured by the file that is actually saved.
 */
func metadataProperties(_ source: [CFString: Any], policy: String) -> [CFString: Any] {
  var out: [CFString: Any] = [:]
  if policy != "strip" {
    for key in [kCGImagePropertyExifDictionary, kCGImagePropertyTIFFDictionary] {
      if let value = source[key] { out[key] = value }
    }
    if policy == "keep" {
      for key in [kCGImagePropertyGPSDictionary, kCGImagePropertyIPTCDictionary] {
        if let value = source[key] { out[key] = value }
      }
    }
  }
  // Pixels were made upright during decode, and the EXIF pixel size is stale.
  out[kCGImagePropertyOrientation] = 1
  if var tiff = out[kCGImagePropertyTIFFDictionary] as? [CFString: Any] {
    tiff[kCGImagePropertyTIFFOrientation] = 1
    out[kCGImagePropertyTIFFDictionary] = tiff
  }
  if var exif = out[kCGImagePropertyExifDictionary] as? [CFString: Any] {
    exif.removeValue(forKey: kCGImagePropertyExifPixelXDimension)
    exif.removeValue(forKey: kCGImagePropertyExifPixelYDimension)
    out[kCGImagePropertyExifDictionary] = exif
  }
  return out
}

func flattened(_ image: CGImage) -> CGImage {
  switch image.alphaInfo {
  case .none, .noneSkipFirst, .noneSkipLast: return image
  default: break
  }
  let space = image.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)!
  guard let context = CGContext(
    data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
    space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
  ) else { return image }
  let rect = CGRect(x: 0, y: 0, width: image.width, height: image.height)
  context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  context.fill(rect)
  context.draw(image, in: rect)
  return context.makeImage() ?? image
}

/** EXIF DateTimeOriginal (+ its offset when present), or nil. */
func captureDate(_ props: [CFString: Any]) -> Date? {
  guard let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any],
        let stamp = exif[kCGImagePropertyExifDateTimeOriginal] as? String else { return nil }
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  if let offset = exif[kCGImagePropertyExifOffsetTimeOriginal] as? String {
    formatter.dateFormat = "yyyy:MM:dd HH:mm:ssxxx"
    if let date = formatter.date(from: stamp + offset) { return date }
  }
  formatter.dateFormat = "yyyy:MM:dd HH:mm:ss"
  return formatter.date(from: stamp)
}

func fileURL(_ uri: String) -> URL {
  if let url = URL(string: uri), url.scheme != nil { return url }
  return URL(fileURLWithPath: uri)
}

func outputURL(_ name: String, ext: String) throws -> URL {
  let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("compresso-out", isDirectory: true)
  try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  return dir.appendingPathComponent(name).appendingPathExtension(ext)
}

func fileExtension(_ format: String) -> String {
  format == "jpeg" ? "jpg" : format
}

func formatName(_ typeIdentifier: String?) -> String {
  switch typeIdentifier {
  case UTType.jpeg.identifier: return "jpeg"
  case UTType.heic.identifier, UTType.heif.identifier: return "heic"
  case UTType.png.identifier: return "png"
  case UTType.webP.identifier: return "webp"
  case UTType.gif.identifier: return "gif"
  case UTType.tiff.identifier: return "tiff"
  default: return typeIdentifier.flatMap { UTType($0)?.preferredFilenameExtension } ?? "image"
  }
}
