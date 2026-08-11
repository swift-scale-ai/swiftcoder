import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const [iconset, output] = process.argv.slice(2)
if (!iconset || !output) {
  console.error("Usage: node tools/build-icns.mjs <iconset> <output.icns>")
  process.exit(1)
}

const entries = [
  ["icp4", "icon_16x16.png"],
  ["icp5", "icon_32x32.png"],
  ["icp6", "icon_32x32@2x.png"],
  ["ic07", "icon_128x128.png"],
  ["ic08", "icon_128x128@2x.png"],
  ["ic09", "icon_256x256@2x.png"],
  ["ic10", "icon_512x512@2x.png"],
]

const chunks = await Promise.all(
  entries.map(async ([type, filename]) => {
    const image = await readFile(join(iconset, filename))
    const chunk = Buffer.allocUnsafe(8 + image.length)
    chunk.write(type, 0, 4, "ascii")
    chunk.writeUInt32BE(chunk.length, 4)
    image.copy(chunk, 8)
    return chunk
  }),
)

const size = 8 + chunks.reduce((total, chunk) => total + chunk.length, 0)
const header = Buffer.allocUnsafe(8)
header.write("icns", 0, 4, "ascii")
header.writeUInt32BE(size, 4)
await writeFile(output, Buffer.concat([header, ...chunks], size))
