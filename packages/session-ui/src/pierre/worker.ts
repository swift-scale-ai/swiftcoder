import { WorkerPoolManager } from "@pierre/diffs/worker"
import ShikiWorkerUrl from "@pierre/diffs/worker/worker.js?worker&url"
import { registerSwiftCoderTheme } from "@swiftscale/ui/context/marked-theme-register"

registerSwiftCoderTheme()

export type WorkerPoolStyle = "unified" | "split"

export function workerFactory(): Worker {
  return new Worker(ShikiWorkerUrl, { type: "module" })
}

function createPool(lineDiffType: "none" | "word-alt") {
  const pool = new WorkerPoolManager(
    {
      workerFactory,
      // Diff work is bursty and each worker owns a Shiki WASM/highlighter
      // instance. One worker keeps idle memory bounded; queued work still
      // preserves correctness and large files are virtualized by the viewer.
      poolSize: 1,
    },
    {
      theme: "SwiftCoder",
      lineDiffType,
      preferredHighlighter: "shiki-wasm",
    },
  )

  void pool.initialize()
  return pool
}

let unified: WorkerPoolManager | undefined
let split: WorkerPoolManager | undefined

export function getWorkerPool(style: WorkerPoolStyle | undefined): WorkerPoolManager | undefined {
  if (typeof window === "undefined") return

  if (style === "split") {
    if (!split) split = createPool("word-alt")
    return split
  }

  if (!unified) unified = createPool("none")
  return unified
}

export function getWorkerPools() {
  return {
    unified: getWorkerPool("unified"),
    split: getWorkerPool("split"),
  }
}
