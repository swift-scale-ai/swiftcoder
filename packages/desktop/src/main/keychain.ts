import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

const execFile = promisify(execFileCallback)

type ExecFile = (file: string, args: string[]) => Promise<{ stdout: string }>

export type SecureCredentialStore = {
  get: () => Promise<string | undefined>
  set: (value: string) => Promise<void>
  remove: () => Promise<void>
}

export const createMacOSKeychainStore = (input: {
  service: string
  account: string
  run?: ExecFile
}): SecureCredentialStore => {
  const run: ExecFile = input.run ?? ((file, args) => execFile(file, args))
  const common = ["-a", input.account, "-s", input.service]
  return {
    async get() {
      try {
        const result = await run("/usr/bin/security", ["find-generic-password", ...common, "-w"])
        return result.stdout.trim() || undefined
      } catch (error) {
        const code = (error as { code?: number }).code
        if (code === 44) return undefined
        throw new Error("Unable to read SwiftCoder credentials from macOS Keychain", { cause: error })
      }
    },
    async set(value) {
      await run("/usr/bin/security", ["add-generic-password", ...common, "-w", value, "-U"])
    },
    async remove() {
      try {
        await run("/usr/bin/security", ["delete-generic-password", ...common])
      } catch (error) {
        const code = (error as { code?: number }).code
        if (code !== 44) throw new Error("Unable to remove SwiftCoder credentials from macOS Keychain", { cause: error })
      }
    },
  }
}

