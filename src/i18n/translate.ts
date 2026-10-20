import { en } from './locales/en'
import { vi } from './locales/vi'
import type { Dict, Lang, ListKey, Msg, MsgKey, Params, Translate } from './types'

export const DEFAULT_LANG: Lang = 'en'

/** `name` is shown in the language switcher in the language's own words. */
export const LANGUAGES: readonly { code: Lang; name: string; htmlLang: string; ogLocale: string }[] = [
  { code: 'en', name: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  { code: 'vi', name: 'Tiếng Việt', htmlLang: 'vi', ogLocale: 'vi_VN' },
]

export const DICTIONARIES: Record<Lang, Dict> = { en, vi }

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((language) => language.code === value)
}

/** Builds a message descriptor. Use it wherever code (not a component) needs to produce text. */
export function msg(key: MsgKey, params?: Params): Msg {
  return params ? { key, params } : { key }
}

function lookup(dict: unknown, key: string): unknown {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

/** Replaces `{name}` placeholders. Unknown placeholders are left as they are. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Turns nested messages inside `params` into text in `lang`. */
function flattenParams(lang: Lang, params?: Params): Record<string, string | number> | undefined {
  if (!params) return undefined
  const out: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(params)) {
    out[name] =
      typeof value === 'string' || typeof value === 'number'
        ? value
        : Array.isArray(value)
          ? (value as readonly Msg[]).map((item) => translate(lang, item)).join(', ')
          : translate(lang, value as Msg)
  }
  return out
}

/** Looks a message up in `lang`, falling back to English and finally to the key itself. */
export function translate(lang: Lang, input: MsgKey | Msg, params?: Params): string {
  const key = typeof input === 'string' ? input : input.key
  const values = typeof input === 'string' ? params : { ...input.params, ...params }
  const found = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key)
  return typeof found === 'string' ? interpolate(found, flattenParams(lang, values)) : key
}

/** A translator fixed to English, for non-React code and tests that are not given one. */
export const englishT: Translate = (input, params) => translate('en', input, params)

export function translateList(lang: Lang, key: ListKey): string[] {
  const found = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key)
  return Array.isArray(found) ? found.filter((item): item is string => typeof item === 'string') : []
}

/**
 * Picks the language to start in: an explicit `?lang=` link wins, then the browser's
 * language preferences, then English. Nothing is stored — the choice lives in memory only.
 */
export function detectLang(
  search: string = typeof window === 'undefined' ? '' : window.location.search,
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]),
): Lang {
  const requested = new URLSearchParams(search).get('lang')?.toLowerCase().split('-')[0]
  if (isLang(requested)) return requested
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return DEFAULT_LANG
}
