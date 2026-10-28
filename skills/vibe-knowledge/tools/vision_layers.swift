// Vision 前景实例分割：导出与原图等大的灰度蒙版（_all = 全部实例，_N = 单个实例），再用 PIL 合成主体层、补洞做底层。
// 编译：swiftc -O vision_layers.swift -o ~/.cache/vibe-knowledge/vision_layers   用法：vision_layers in.jpg out/prefix
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: layers in.jpg outPrefix"); exit(1) }
let ci = CIImage(contentsOf: URL(fileURLWithPath: a[1]))!
let ctx = CIContext(); let cg = ctx.createCGImage(ci, from: ci.extent)!
let req = VNGenerateForegroundInstanceMaskRequest(); let h = VNImageRequestHandler(cgImage: cg)
try h.perform([req])
guard let r = req.results?.first else { print("no subject"); exit(2) }
func save(_ set: IndexSet, _ path: String) throws {
  let buf = try r.generateScaledMaskForImage(forInstances: set, from: h)
  let im = CIImage(cvPixelBuffer: buf); let o = ctx.createCGImage(im, from: im.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())!
  let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(d, o, nil); CGImageDestinationFinalize(d)
}
try save(r.allInstances, a[2] + "_all.png")
for i in r.allInstances { try save(IndexSet(integer: i), a[2] + "_\(i).png") }
print("instances", Array(r.allInstances))
