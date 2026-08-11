import { describe, expect, test } from "bun:test"
import { isSwiftScaleTextModelID } from "./provider"

describe("SwiftScale coding model catalog", () => {
  test("excludes audio and image models", () => {
    for (const id of ["swiftaudio.auto", "swiftimage.auto", "swift-audio.auto", "swift/image-v1"]) {
      expect(isSwiftScaleTextModelID(id)).toBe(false)
    }
  })

  test("keeps coding and commercial text models", () => {
    for (const id of ["swiftagent.auto", "swiftlite.auto", "gpt-5.6", "claude-sonnet-4.5"]) {
      expect(isSwiftScaleTextModelID(id)).toBe(true)
    }
  })
})
