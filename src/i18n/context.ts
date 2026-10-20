import { createContext, useContext, type ReactNode } from 'react'
import { renderRich, type RichTags } from './rich'
import { LANGUAGES, translate, translateList } from './translate'
import type { Lang, ListKey, Msg, MsgKey, Params } from './types'

export interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translates a key (with optional `{placeholders}`) or a `Msg` returned by analysis code. */
  t: (input: MsgKey | Msg, params?: Params) => string
  /** A list of strings, such as bullet points. */
  list: (key: ListKey) => string[]
  /** A message with `<tag>…</tag>` markup rendered through `tags`. */
  rich: (key: MsgKey, tags: RichTags, params?: Params) => ReactNode
}

export function createI18n(lang: Lang, setLang: (lang: Lang) => void): I18n {
  return {
    lang,
    setLang,
    t: (input, params) => translate(lang, input, params),
    list: (key) => translateList(lang, key),
    rich: (key, tags, params) => renderRich(translate(lang, key, params), tags),
  }
}

export function htmlLang(lang: Lang): string {
  return LANGUAGES.find((language) => language.code === lang)?.htmlLang ?? lang
}

/** Without a provider (for example in a unit test) components render in English. */
export const I18nContext = createContext<I18n>(createI18n('en', () => {}))

export function useI18n(): I18n {
  return useContext(I18nContext)
}
