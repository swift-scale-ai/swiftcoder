import * as i18n from "@solid-primitives/i18n"
import {
  DESKTOP_NATIVE_LOCALES,
  detectDesktopNativeLocale,
  type DesktopNativeLocale,
} from "../../../../app/src/i18n/desktop-native"

import { dict as desktopEn } from "./en"
import { dict as desktopZh } from "./zh"
import { dict as desktopZht } from "./zht"
import { dict as desktopKo } from "./ko"
import { dict as desktopDe } from "./de"
import { dict as desktopEs } from "./es"
import { dict as desktopFr } from "./fr"
import { dict as desktopJa } from "./ja"
import { dict as desktopRu } from "./ru"
import { dict as desktopAr } from "./ar"
import { dict as desktopBr } from "./br"

export type Locale = DesktopNativeLocale

type RawDictionary = typeof desktopEn
type Dictionary = Record<keyof i18n.Flatten<RawDictionary>, string>

function detectLocale(): Locale {
  if (typeof navigator !== "object") return "en"
  return detectDesktopNativeLocale(navigator.languages?.length ? navigator.languages : [navigator.language])
}

function parseLocale(value: unknown): Locale | null {
  if (!value) return null
  if (typeof value !== "string") return null
  if ((DESKTOP_NATIVE_LOCALES as readonly string[]).includes(value)) return value as Locale
  return null
}

function parseRecord(value: unknown) {
  if (!value || typeof value !== "object") return null
  if (Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseStored(value: unknown) {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function pickLocale(value: unknown): Locale | null {
  const direct = parseLocale(value)
  if (direct) return direct

  const record = parseRecord(value)
  if (!record) return null

  return parseLocale(record.locale)
}

const base = i18n.flatten(desktopEn)

function build(locale: Locale): Dictionary {
  if (locale === "en") return base
  if (locale === "zh") return { ...base, ...i18n.flatten(desktopZh) }
  if (locale === "zht") return { ...base, ...i18n.flatten(desktopZht) }
  if (locale === "de") return { ...base, ...i18n.flatten(desktopDe) }
  if (locale === "es") return { ...base, ...i18n.flatten(desktopEs) }
  if (locale === "fr") return { ...base, ...i18n.flatten(desktopFr) }
  if (locale === "ja") return { ...base, ...i18n.flatten(desktopJa) }
  if (locale === "ru") return { ...base, ...i18n.flatten(desktopRu) }
  if (locale === "ar") return { ...base, ...i18n.flatten(desktopAr) }
  if (locale === "br") return { ...base, ...i18n.flatten(desktopBr) }
  return { ...base, ...i18n.flatten(desktopKo) }
}

const state = {
  locale: detectLocale(),
  dict: base as Dictionary,
  init: undefined as Promise<Locale> | undefined,
}

state.dict = build(state.locale)

const translate = i18n.translator(() => state.dict, i18n.resolveTemplate)

export function t(key: keyof Dictionary, params?: Record<string, string | number>) {
  return translate(key, params)
}

export function initI18n(): Promise<Locale> {
  const cached = state.init
  if (cached) return cached

  const promise = (async () => {
    const raw = await window.api.storeGet("swiftcoder.global.dat", "language").catch(() => null)
    const value = parseStored(raw)
    const next = pickLocale(value) ?? state.locale

    state.locale = next
    state.dict = build(next)
    return next
  })().catch(() => state.locale)

  state.init = promise
  return promise
}
