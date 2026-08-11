# SwiftCoder Icons

The canonical artwork is `source/logo.png`. Generate all desktop raster sizes and the complete macOS iconset directly from that master:

```bash
./tools/generate-desktop-icons.sh
```

The generator never resizes an already resized output. It renders every dev, beta, and production PNG directly from the master, then builds `icon.icns` from dedicated 16px through 1024px inputs. `dock.png` remains a native 256px render matching the packaged icon.
