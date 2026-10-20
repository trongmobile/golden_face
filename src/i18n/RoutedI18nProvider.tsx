import { useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { I18nProvider } from './I18nProvider'
import { langFromPath, withLang } from './paths'
import type { Lang } from './types'

/**
 * Takes the language from the URL (`/vi/…` is Vietnamese) and, when the visitor switches language,
 * moves to the same page in the other language. It replaces the history entry, so Back still
 * leaves the page instead of flipping the language.
 */
export function RoutedI18nProvider({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const lang = langFromPath(pathname)

  const onLangChange = useCallback(
    (next: Lang) => navigate({ pathname: withLang(pathname, next), search, hash }, { replace: true }),
    [navigate, pathname, search, hash],
  )

  return (
    <I18nProvider lang={lang} onLangChange={onLangChange}>
      {children}
    </I18nProvider>
  )
}
