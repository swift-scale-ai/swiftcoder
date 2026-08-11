export const destroyedWindowURL = "<destroyed>"

export type WindowBounds = { x: number; y: number; width: number; height: number }

const minimumWindowHeight = 600

export function initialWindowHeight(availableHeight: number) {
  return availableHeight
}

const intersects = (a: WindowBounds, b: WindowBounds) => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width >= 80 && height >= 80
}

const intersectionArea = (a: WindowBounds, b: WindowBounds) => {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return width * height
}

export function visibleWindowBounds(saved: Partial<WindowBounds>, primary: WindowBounds, displays: WindowBounds[]) {
  const candidate = {
    x: saved.x ?? primary.x,
    y: saved.y ?? primary.y,
    width: Math.max(saved.width ?? 1280, 900),
    height: Math.max(saved.height ?? initialWindowHeight(primary.height), minimumWindowHeight),
  }
  const target = displays
    .filter((display) => intersects(candidate, display))
    .sort((a, b) => intersectionArea(candidate, b) - intersectionArea(candidate, a))[0]

  if (target) {
    const width = Math.min(candidate.width, target.width)
    const height = Math.min(candidate.height, target.height)
    return {
      x: Math.min(Math.max(candidate.x, target.x), target.x + target.width - width),
      y: Math.min(Math.max(candidate.y, target.y), target.y + target.height - height),
      width,
      height,
    }
  }

  const width = Math.min(candidate.width, primary.width)
  const height = Math.min(candidate.height, primary.height)
  return {
    x: primary.x + Math.round((primary.width - width) / 2),
    y: primary.y + Math.round((primary.height - height) / 2),
    width,
    height,
  }
}

type WebContentsURLState = {
  isDestroyed(): boolean
  getURL(): string
}

type WindowURLState = {
  isDestroyed(): boolean
  readonly webContents: WebContentsURLState
}

export function safeWebContentsURL(webContents: WebContentsURLState) {
  try {
    if (webContents.isDestroyed()) return destroyedWindowURL
    return webContents.getURL()
  } catch {
    return destroyedWindowURL
  }
}

export function safeWindowURL(win: WindowURLState) {
  try {
    if (win.isDestroyed()) return destroyedWindowURL
    return safeWebContentsURL(win.webContents)
  } catch {
    return destroyedWindowURL
  }
}
