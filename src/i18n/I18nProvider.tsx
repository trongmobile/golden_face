import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, createI18n, htmlLang } from './context'
import { DEFAULT_LANG } from './translate'
import type { Lang } from './types'

interface I18nProviderProps {
  children: ReactNode
  /** Starting language when the provider keeps the language itself (tests, standalone use). */
  initialLang?: Lang
  /** When set, the language is controlled from outside (the URL) and `onLangChange` is asked to change it. */
  lang?: Lang
  onLangChange?: (lang: Lang) => void
}

/**
 * Provides the current language. In the app the language comes from the URL (see
 * `RoutedI18nProvider`), so a language is a page address, not a saved preference: nothing is
 * stored in the browser.
 */
export function I18nProvider({ children, initialLang, lang: controlledLang, onLangChange }: I18nProviderProps) {
  const [ownLang, setOwnLang] = useState<Lang>(initialLang ?? DEFAULT_LANG)
  const lang = controlledLang ?? ownLang

  const setLang = useCallback(
    (next: Lang) => {
      if (controlledLang === undefined) setOwnLang(next)
      else onLangChange?.(next)
    },
    [controlledLang, onLangChange],
  )

  useEffect(() => {
    document.documentElement.lang = htmlLang(lang)
  }, [lang])

  const value = useMemo(() => createI18n(lang, setLang), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
