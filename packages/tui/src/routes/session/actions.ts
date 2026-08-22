export async function requestSessionCompaction(input: { summarize: () => Promise<{ error?: unknown }> }) {
  const result = await input.summarize()
  if (result.error) throw result.error
}

export async function copySessionTranscript(input: { transcript: string; write?: (text: string) => Promise<void> }) {
  if (!input.write) throw new Error("Clipboard is not available in this terminal.")
  await input.write(input.transcript)
}

export async function exportSessionTranscript(input: {
  transcript: string
  openWithoutSaving: boolean
  filepath?: string
  write: (file: string, content: string) => Promise<void>
  openEditor?: (content: string) => Promise<string | undefined>
}) {
  if (input.openWithoutSaving) {
    if (!input.openEditor) {
      throw new Error("No external editor configured. Set $VISUAL or $EDITOR and try again.")
    }
    await input.openEditor(input.transcript)
    return { kind: "opened" as const }
  }

  if (!input.filepath) throw new Error("Export path is required.")
  await input.write(input.filepath, input.transcript)
  if (input.openEditor) {
    const edited = await input.openEditor(input.transcript)
    if (edited !== undefined) await input.write(input.filepath, edited)
  }
  return { kind: "saved" as const, filepath: input.filepath }
}
