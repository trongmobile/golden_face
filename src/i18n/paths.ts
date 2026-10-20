import { DEFAULT_LANG, isLang } from './translate'
import type { Lang } from './types'

/**
 * Every language except the default has its own URL prefix: `/about` is English and `/vi/about`
 * is Vietnamese. The prefix is what lets search engines index each language separately.
 */

/** The language a URL path (without the site's base path) is in. */
export function langFromPath(pathname: string): Lang {
  const first = pathname.split('/')[1]
  return first && first !== DEFAULT_LANG && isLang(first) ? first : DEFAULT_LANG
}

/** The same page without any language prefix: `/vi/about` → `/about`, `/vi` → `/`. */
export function stripLang(pathname: string): string {
  const lang = langFromPath(pathname)
  if (lang === DEFAULT_LANG) return pathname === '' ? '/' : pathname
  const rest = pathname.slice(lang.length + 1)
  return rest === '' ? '/' : rest
}

/** The same page in `lang`: `/about` → `/vi/about`, `/` → `/vi`, and back again. */
export function withLang(pathname: string, lang: Lang): string {
  const bare = stripLang(pathname)
  if (lang === DEFAULT_LANG) return bare
  return bare === '/' ? `/${lang}` : `/${lang}${bare}`
}

/** Prefixes a link target such as `/analysis?source=upload` or `/privacy#terms` for `lang`. Other targets are left alone. */
export function localizeTo(to: string, lang: Lang): string {
  if (!to.startsWith('/') || to.startsWith('//')) return to
  const split = to.search(/[?#]/)
  const path = split === -1 ? to : to.slice(0, split)
  const tail = split === -1 ? '' : to.slice(split)
  return withLang(path, lang) + tail
}
