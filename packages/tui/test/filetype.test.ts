import { expect, test } from "bun:test"
import { filetype } from "../src/util/filetype"

for (const extension of [".cppm", ".ccm", ".cxxm", ".c++m", ".ixx"]) {
  test(`recognizes C++ module interface ${extension}`, () => {
    expect(filetype(`/project/module${extension}`)).toBe("cpp")
  })
}

test("preserves existing filetype mappings", () => {
  expect(filetype("main.cpp")).toBe("cpp")
  expect(filetype("main.ts")).toBe("typescript")
  expect(filetype()).toBe("none")
})
