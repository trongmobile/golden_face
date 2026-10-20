import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, createI18n, htmlLang } from './context'
import { detectLang } from './translate'
import type { Lang } from './types'

/**
 * Holds the current language in memory. The language is not saved to localStorage, cookies or
 * anywhere else (GoldenFace promises to store nothing); it is detected again on every visit.
 */
export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(() => initialLang ?? detectLang())

  useEffect(() => {
    document.documentElement.lang = htmlLang(lang)
  }, [lang])

  const value = useMemo(() => createI18n(lang, setLang), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
