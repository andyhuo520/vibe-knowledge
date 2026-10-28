import Vision
import AppKit
let args = CommandLine.arguments.dropFirst()
for path in args {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.recognitionLanguages = ["zh-Hans","en-US"]
  req.usesLanguageCorrection = true
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  let obs = (req.results ?? []).sorted { $0.boundingBox.minY > $1.boundingBox.minY }
  let lines = obs.compactMap { o -> String? in
    guard let t = o.topCandidates(1).first, t.confidence > 0.4 else { return nil }
    let b = o.boundingBox
    return String(format: "[y%.2f h%.3f] ", b.minY, b.height) + t.string }
  print("@@" + (path as NSString).lastPathComponent)
  lines.forEach { print($0) }
}
