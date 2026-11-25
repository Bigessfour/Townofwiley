import AppKit
import Foundation
import PDFKit
import Vision

struct PageText: Codable {
    var page: Int
    var text: String
}

struct OcrPayload: Codable {
    var text: String
    var meanConfidence: Double
    var rotation: Int
    var observations: Int
    var lowQuality: Bool
}

let cues = ["shall", "town", "section", "ordinance", "code", "wiley", "board", "sec.", "resolution"]
let functionWords: Set<String> = [
    "the", "of", "and", "to", "a", "in", "for", "or", "by", "be", "is", "as", "on", "that", "this",
]

func fail(_ message: String) -> Never {
    fputs(message + "\n", stderr)
    exit(1)
}

func rank(_ text: String) -> (Int, Int, Int) {
    let lowered = text.lowercased()
    let words = lowered.split { !$0.isLetter }.map(String.init)
    let functions = words.filter { functionWords.contains($0) }.count
    let cueHits = cues.filter { lowered.contains($0) }.count
    let usable = words.count >= 40 && functions >= 8 && cueHits >= 2 ? 1 : 0
    return (usable, functions, cueHits)
}

func renderPdfPage(url: URL, pageIndex: Int, pixelWidth: Int, pixelHeight: Int) -> CGImage {
    guard let document = PDFDocument(url: url), let page = document.page(at: pageIndex) else {
        fail("Could not open PDF page \(pageIndex) in \(url.path)")
    }
    let box = page.bounds(for: .mediaBox)
    guard box.width > 0, box.height > 0 else {
        fail("Invalid page box for \(url.lastPathComponent) page \(pageIndex)")
    }
    var width = pixelWidth
    var height = pixelHeight
    if width <= 0 || height <= 0 {
        let scale = 3400.0 / max(box.width, box.height)
        width = max(Int((box.width * scale).rounded()), 1)
        height = max(Int((box.height * scale).rounded()), 1)
    }
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fail("Could not allocate a bitmap for \(url.lastPathComponent)")
    }
    context.setFillColor(CGColor(gray: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.saveGState()
    context.scaleBy(x: CGFloat(width) / box.width, y: CGFloat(height) / box.height)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    guard let image = context.makeImage() else {
        fail("PDF page draw produced no image")
    }
    return image
}

func loadImage(url: URL) -> CGImage {
    guard let image = NSImage(contentsOf: url),
          let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let cg = rep.cgImage
    else {
        fail("Could not read image \(url.path)")
    }
    return cg
}

func rotate180(_ image: CGImage) -> CGImage {
    let width = image.width
    let height = image.height
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fail("Could not allocate a rotated bitmap")
    }
    context.translateBy(x: CGFloat(width), y: CGFloat(height))
    context.rotate(by: .pi)
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let rotated = context.makeImage() else {
        fail("Rotation produced no image")
    }
    return rotated
}

func sectionOrder(_ text: String) -> Int {
    guard let expression = try? NSRegularExpression(pattern: #"\b(\d{1,2})-(\d{1,2})-(\d{1,3})\b"#) else {
        return 0
    }
    let range = NSRange(text.startIndex..., in: text)
    let numbers = expression.matches(in: text, range: range).compactMap { match -> (Int, Int, Int)? in
        func value(_ index: Int) -> Int? {
            guard let piece = Range(match.range(at: index), in: text) else { return nil }
            return Int(text[piece])
        }
        guard let chapter = value(1), let article = value(2), let section = value(3) else { return nil }
        return (chapter, article, section)
    }
    guard numbers.count >= 2 else { return 0 }
    return zip(numbers, numbers.dropFirst()).reduce(0) { score, pair in
        score + (pair.1 >= pair.0 ? 1 : -1)
    }
}

func columnText(_ observations: [VNRecognizedTextObservation]) -> String {
    let sorted = observations.sorted { left, right in
        let dy = left.boundingBox.midY - right.boundingBox.midY
        if abs(dy) > 0.012 {
            return left.boundingBox.midY > right.boundingBox.midY
        }
        return left.boundingBox.minX < right.boundingBox.minX
    }
    var lines: [String] = []
    var current: [VNRecognizedTextObservation] = []
    var currentY: CGFloat = -1
    for observation in sorted {
        if currentY < 0 || abs(observation.boundingBox.midY - currentY) <= 0.008 {
            current.append(observation)
            let total = current.reduce(CGFloat(0)) { $0 + $1.boundingBox.midY }
            currentY = total / CGFloat(current.count)
        } else {
            lines.append(lineText(current))
            current = [observation]
            currentY = observation.boundingBox.midY
        }
    }
    if !current.isEmpty {
        lines.append(lineText(current))
    }
    return lines.joined(separator: "\n")
}

func reading(_ observations: [VNRecognizedTextObservation]) -> String {
    let left = observations.filter { $0.boundingBox.midX < 0.42 }
    let right = observations.filter { $0.boundingBox.midX > 0.58 }
    let twoColumn = left.count > 8 && right.count > 8
    if !twoColumn {
        return columnText(observations)
    }
    let leftColumn = observations.filter { $0.boundingBox.midX < 0.5 }
    let rightColumn = observations.filter { $0.boundingBox.midX >= 0.5 }
    return [columnText(leftColumn), columnText(rightColumn)]
        .filter { !$0.isEmpty }
        .joined(separator: "\n\n")
}

func recognize(_ image: CGImage) -> (String, Double, Int) {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US"]
    request.automaticallyDetectsLanguage = false
    // Small fraction of page height so footnotes and section numbers are kept.
    request.minimumTextHeight = 0.006
    request.customWords = [
        "Wiley", "ordinance", "Ordinance", "municipal", "Trustees", "C.R.S.",
        "zoning", "annexation", "subdivision",
    ]
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        fail("Vision failed: \(error.localizedDescription)")
    }
    let observations = request.results ?? []
    let confidences = observations.map { Double($0.topCandidates(1).first?.confidence ?? 0) }
    let mean = confidences.isEmpty ? 0 : confidences.reduce(0, +) / Double(confidences.count)
    return (reading(observations), mean, observations.count)
}

func lineText(_ observations: [VNRecognizedTextObservation]) -> String {
    observations
        .sorted { $0.boundingBox.minX < $1.boundingBox.minX }
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: " ")
}

func readingScore(_ text: String, confidence: Double) -> (Int, Int, Int, Double) {
    let usable = rank(text)
    return (sectionOrder(text), usable.0, usable.1, confidence)
}

func bestReading(_ image: CGImage) -> OcrPayload {
    let upright = recognize(image)
    let uprightScore = readingScore(upright.0, confidence: upright.1)
    // Section numbers that already run down the page are the strongest sign
    // the scan is upright. Do not spend a second pass flipping those.
    if uprightScore.0 > 0 {
        return OcrPayload(
            text: upright.0,
            meanConfidence: upright.1,
            rotation: 0,
            observations: upright.2,
            lowQuality: upright.1 < 0.9
        )
    }
    let turned = recognize(rotate180(image))
    let turnedScore = readingScore(turned.0, confidence: turned.1)
    // Turn only when that makes section numbers run forward, or when the
    // upright pass is not readable English and the turned pass is.
    // A higher confidence on the turned pass is not enough: Vision can read
    // an upright page upside down and still score the words highly.
    let turnHelpsOrder = turnedScore.0 > uprightScore.0
    let turnRescuesText = uprightScore.1 == 0 && turnedScore.1 == 1
    let useTurned = turnHelpsOrder || turnRescuesText
    let chosen = useTurned ? turned : upright
    return OcrPayload(
        text: chosen.0,
        meanConfidence: chosen.1,
        rotation: useTurned ? 180 : 0,
        observations: chosen.2,
        lowQuality: chosen.1 < 0.9
    )
}

func emit(_ payload: OcrPayload) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    guard let data = try? encoder.encode(payload) else {
        fail("Could not encode OCR result")
    }
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard let command = arguments.first else {
    fail("Usage: OrdinanceVisionOcr ocr-pdf <pdf> <pageIndex> <pxW> <pxH> | ocr-image <image> | text-layer <pdf> <pageIndex>")
}

switch command {
case "survey":
    guard arguments.count == 3 else {
        fail("Usage: OrdinanceVisionOcr survey <pdf> <out.json>")
    }
    let url = URL(fileURLWithPath: arguments[1])
    guard let document = PDFDocument(url: url) else {
        fail("Could not open \(url.path)")
    }
    let pages = (0..<document.pageCount).map { index in
        PageText(page: index, text: document.page(at: index)?.string ?? "")
    }
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(pages) else {
        fail("Could not encode the text-layer survey")
    }
    do {
        try data.write(to: URL(fileURLWithPath: arguments[2]))
    } catch {
        fail("Could not write survey: \(error.localizedDescription)")
    }
case "text-layer":
    guard arguments.count == 3, let pageIndex = Int(arguments[2]) else {
        fail("Usage: OrdinanceVisionOcr text-layer <pdf> <pageIndex>")
    }
    let url = URL(fileURLWithPath: arguments[1])
    guard let document = PDFDocument(url: url), let page = document.page(at: pageIndex) else {
        fail("Could not read text layer for page \(pageIndex)")
    }
    print(page.string ?? "")
case "ocr-pdf":
    guard arguments.count == 5,
          let pageIndex = Int(arguments[2]),
          let pixelWidth = Int(arguments[3]),
          let pixelHeight = Int(arguments[4])
    else {
        fail("Usage: OrdinanceVisionOcr ocr-pdf <pdf> <pageIndex> <pxW> <pxH>")
    }
    let image = renderPdfPage(
        url: URL(fileURLWithPath: arguments[1]),
        pageIndex: pageIndex,
        pixelWidth: pixelWidth,
        pixelHeight: pixelHeight
    )
    emit(bestReading(image))
case "ocr-image":
    guard arguments.count == 2 else {
        fail("Usage: OrdinanceVisionOcr ocr-image <image>")
    }
    emit(bestReading(loadImage(url: URL(fileURLWithPath: arguments[1]))))
default:
    fail("Unknown command \(command)")
}
