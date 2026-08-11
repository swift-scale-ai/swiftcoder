import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

const execFile = promisify(execFileCallback)
const service = "com.swiftscale.swiftcoder.api-key"
const account = "swiftcoder"
const common = ["-a", account, "-s", service]

export const reference = "keychain://com.swiftscale.swiftcoder.api-key/swiftcoder"
export const enabled = () => process.platform === "darwin" && process.env.SWIFTCODER_CLIENT === "desktop"

export async function read() {
  if (!enabled()) return undefined
  try {
    const { stdout } = await execFile("/usr/bin/security", ["find-generic-password", ...common, "-w"])
    const value = stdout.trim()
    return value || undefined
  } catch (error) {
    if ((error as { code?: number }).code === 44) return undefined
    throw error
  }
}

export async function write(value: string) {
  if (!enabled()) return
  await execFile("/usr/bin/security", ["add-generic-password", ...common, "-w", value, "-U"])
}

export async function remove() {
  if (!enabled()) return
  try {
    await execFile("/usr/bin/security", ["delete-generic-password", ...common])
  } catch (error) {
    if ((error as { code?: number }).code !== 44) throw error
  }
}
