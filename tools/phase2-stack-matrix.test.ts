import { afterAll, describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

type Stack = {
  name: string
  files: Record<string, { before: string; after: string }>
  verify: (repo: string, build: string) => string[]
}

const bun = path.resolve(import.meta.dir, "../.tools/bun")
const roots: string[] = []

async function run(args: string[], cwd: string, env?: Record<string, string>) {
  const proc = Bun.spawn(args, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exit, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (exit !== 0) throw new Error(`${args.join(" ")} failed (${exit})\n${stdout}\n${stderr}`)
  return stdout
}

async function write(repo: string, file: string, content: string) {
  const target = path.join(repo, file)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content)
}

const stacks: Stack[] = [
  {
    name: "TypeScript",
    files: {
      "src/math.ts": {
        before: "export const add = (a: number, b: number) => a + b\n",
        after:
          "export const add = (a: number, b: number) => a + b\nexport const multiply = (a: number, b: number) => a * b\n",
      },
      "src/math.test.ts": {
        before:
          'import { expect, test } from "bun:test"\nimport { add } from "./math"\ntest("add", () => expect(add(2, 3)).toBe(5))\n',
        after:
          'import { expect, test } from "bun:test"\nimport { add, multiply } from "./math"\ntest("add", () => expect(add(2, 3)).toBe(5))\ntest("multiply", () => expect(multiply(4, 3)).toBe(12))\n',
      },
    },
    verify: () => [bun, "test"],
  },
  {
    name: "Go",
    files: {
      "go.mod": { before: "module phase2/go\n\ngo 1.22\n", after: "module phase2/go\n\ngo 1.22\n" },
      "math.go": {
        before: "package calc\n\nfunc Add(a, b int) int { return a + b }\n",
        after:
          "package calc\n\nfunc Add(a, b int) int { return a + b }\nfunc Multiply(a, b int) int { return a * b }\n",
      },
      "math_test.go": {
        before:
          'package calc\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) { if Add(2, 3) != 5 { t.Fatal("add") } }\n',
        after:
          'package calc\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) { if Add(2, 3) != 5 { t.Fatal("add") } }\nfunc TestMultiply(t *testing.T) { if Multiply(4, 3) != 12 { t.Fatal("multiply") } }\n',
      },
    },
    verify: () => ["go", "test", "./..."],
  },
  {
    name: "Python",
    files: {
      "calculator.py": {
        before: "def add(a, b):\n    return a + b\n",
        after: "def add(a, b):\n    return a + b\n\ndef multiply(a, b):\n    return a * b\n",
      },
      "test_calculator.py": {
        before:
          "import unittest\nfrom calculator import add\n\nclass CalculatorTest(unittest.TestCase):\n    def test_add(self):\n        self.assertEqual(add(2, 3), 5)\n\nif __name__ == '__main__':\n    unittest.main()\n",
        after:
          "import unittest\nfrom calculator import add, multiply\n\nclass CalculatorTest(unittest.TestCase):\n    def test_add(self):\n        self.assertEqual(add(2, 3), 5)\n\n    def test_multiply(self):\n        self.assertEqual(multiply(4, 3), 12)\n\nif __name__ == '__main__':\n    unittest.main()\n",
      },
    },
    verify: () => ["python3", "-m", "unittest", "-v"],
  },
  {
    name: "Rust",
    files: {
      "Cargo.toml": {
        before: '[package]\nname = "phase2-rust"\nversion = "0.1.0"\nedition = "2021"\n',
        after: '[package]\nname = "phase2-rust"\nversion = "0.1.0"\nedition = "2021"\n',
      },
      "src/lib.rs": {
        before: "pub fn add(a: i32, b: i32) -> i32 { a + b }\n",
        after: "pub fn add(a: i32, b: i32) -> i32 { a + b }\npub fn multiply(a: i32, b: i32) -> i32 { a * b }\n",
      },
      "tests/calc.rs": {
        before: "use phase2_rust::add;\n\n#[test]\nfn adds() { assert_eq!(add(2, 3), 5); }\n",
        after:
          "use phase2_rust::{add, multiply};\n\n#[test]\nfn adds() { assert_eq!(add(2, 3), 5); }\n#[test]\nfn multiplies() { assert_eq!(multiply(4, 3), 12); }\n",
      },
    },
    verify: () => ["cargo", "test", "--quiet"],
  },
  {
    name: "Java",
    files: {
      "src/Calculator.java": {
        before: "public final class Calculator { public static int add(int a, int b) { return a + b; } }\n",
        after:
          "public final class Calculator { public static int add(int a, int b) { return a + b; } public static int multiply(int a, int b) { return a * b; } }\n",
      },
      "test/CalculatorTest.java": {
        before:
          "public final class CalculatorTest { public static void main(String[] args) { assert Calculator.add(2, 3) == 5; } }\n",
        after:
          "public final class CalculatorTest { public static void main(String[] args) { assert Calculator.add(2, 3) == 5; assert Calculator.multiply(4, 3) == 12; } }\n",
      },
    },
    verify: (_repo, build) => [
      "sh",
      "-c",
      `javac -d "$BUILD_DIR" src/Calculator.java test/CalculatorTest.java && java -ea -cp "$BUILD_DIR" CalculatorTest`,
    ],
  },
]

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
})

describe("Phase 2 five-stack workspace matrix", () => {
  for (const stack of stacks) {
    test(`${stack.name}: multi-file change, validation, and Git review`, async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), `swiftcoder-phase2-${stack.name.toLowerCase()}-`))
      roots.push(repo)
      const build = path.join(repo, ".phase2-build")

      await run(["git", "init", "-q"], repo)
      await run(["git", "config", "user.email", "phase2@swift-scale.com"], repo)
      await run(["git", "config", "user.name", "SwiftCoder Phase 2"], repo)
      for (const [file, content] of Object.entries(stack.files)) await write(repo, file, content.before)
      await run(["git", "add", "."], repo)
      await run(["git", "commit", "-q", "-m", "baseline"], repo)

      for (const [file, content] of Object.entries(stack.files)) await write(repo, file, content.after)
      await run(stack.verify(repo, build), repo, { BUILD_DIR: build })
      await run(["git", "diff", "--check"], repo)

      const changed = (await run(["git", "diff", "--name-only"], repo)).trim().split("\n").filter(Boolean)
      expect(changed.length).toBeGreaterThanOrEqual(2)
      expect(changed).toEqual(
        expect.arrayContaining(
          Object.entries(stack.files)
            .filter(([, value]) => value.before !== value.after)
            .map(([file]) => file),
        ),
      )
    }, 30_000)
  }
})
