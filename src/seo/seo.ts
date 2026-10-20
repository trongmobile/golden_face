import { DEFAULT_LANG, LANGUAGES, translate } from '@/i18n/translate'
import type { Lang, MsgKey } from '@/i18n/types'

/**
 * Everything a search engine needs that is not the page itself: per-language titles and
 * descriptions, canonical and `hreflang` links, structured data, the sitemap and robots.txt.
 * Pure string functions, used by the build (scripts/prerender.mjs) and covered by unit tests.
 */

/** The pages that are written to disk, one HTML file per language. `''` is the home page. */
export const ROUTES = ['', 'analysis', 'about', 'privacy'] as const
export type SeoRoute = (typeof ROUTES)[number]

export const PAGE_LANGS: readonly Lang[] = LANGUAGES.map((language) => language.code)

const META_KEYS: Record<SeoRoute, { title: MsgKey; description: MsgKey }> = {
  '': { title: 'home.metaTitle', description: 'home.metaDescription' },
  analysis: { title: 'analysisPage.meta.title', description: 'analysisPage.meta.description' },
  about: { title: 'about.metaTitle', description: 'about.metaDescription' },
  privacy: { title: 'privacy.metaTitle', description: 'privacy.metaDescription' },
}

export function routeMeta(lang: Lang, route: SeoRoute): { title: string; description: string } {
  const keys = META_KEYS[route]
  return { title: translate(lang, keys.title), description: translate(lang, keys.description) }
}

/** Where a page lives below the site root: `''`, `about/`, `vi/`, `vi/about/`. */
export function routePath(lang: Lang, route: SeoRoute): string {
  return `${lang === DEFAULT_LANG ? '' : `${lang}/`}${route ? `${route}/` : ''}`
}

/** Absolute URL of a page. `siteUrl` has no trailing slash and includes any base path. */
export function pageUrl(siteUrl: string, lang: Lang, route: SeoRoute): string {
  return `${siteUrl}/${routePath(lang, route)}`
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Replaces the `content` of `<meta name|property="…">`, however the tag is wrapped over lines. */
export function setMeta(html: string, attribute: 'name' | 'property', key: string, content: string): string {
  const pattern = new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`)
  return html.replace(pattern, (_match, open: string, close: string) => `${open}${escapeHtml(content)}${close}`)
}

/**
 * The pages already contain their content, so without JavaScript they stay readable; this note only
 * explains why the photo tools do not work. (404.html keeps index.html's fuller message, because
 * it has no content of its own.)
 */
function noscript(lang: Lang): string {
  return `<noscript>
      <p style="max-width: 40rem; margin: 1.5rem auto; padding: 0 1rem; font-family: system-ui, sans-serif">${escapeHtml(translate(lang, 'common.noscript.text'))}</p>
    </noscript>`
}

/** JSON-LD for the home page. `<` is escaped so the text can never close the script tag. */
export function homeStructuredData(lang: Lang, siteUrl: string, description: string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GoldenFace',
    url: pageUrl(siteUrl, lang, ''),
    description,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    inLanguage: lang,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** `<link>` / `<meta>` tags that need absolute URLs, so they are only written when the site URL is known. */
export function headLinks(siteUrl: string, lang: Lang, route: SeoRoute, description: string): string {
  const url = escapeHtml(pageUrl(siteUrl, lang, route))
  const alternate = (code: Lang) => escapeHtml(pageUrl(siteUrl, code, route))
  const lines = [
    `<link rel="canonical" href="${url}" />`,
    ...PAGE_LANGS.map((code) => `<link rel="alternate" hreflang="${code}" href="${alternate(code)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${alternate(DEFAULT_LANG)}" />`,
    `<meta property="og:url" content="${url}" />`,
  ]
  const locale = LANGUAGES.find((language) => language.code === lang)!.ogLocale
  lines.push(`<meta property="og:locale" content="${locale}" />`)
  for (const other of LANGUAGES) {
    if (other.code !== lang) lines.push(`<meta property="og:locale:alternate" content="${other.ogLocale}" />`)
  }
  if (route === '') {
    lines.push(`<script type="application/ld+json">${homeStructuredData(lang, siteUrl, description)}</script>`)
  }
  return lines.map((line) => `    ${line}`).join('\n')
}

export interface PageInput {
  lang: Lang
  route: SeoRoute
  /** The rendered app, written inside `<div id="root">`. */
  body: string
  /** Public URL of the site without a trailing slash; enables canonical, hreflang, Open Graph URL and JSON-LD. */
  siteUrl?: string
}

/** Turns the built `index.html` into the finished page for one language and route. */
export function applyPage(template: string, { lang, route, body, siteUrl }: PageInput): string {
  const { title, description } = routeMeta(lang, route)
  const htmlLang = LANGUAGES.find((language) => language.code === lang)!.htmlLang

  let html = template
    .replace(/<html lang="[^"]*"/, () => `<html lang="${htmlLang}"`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, () => noscript(lang))
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', description)
  if (siteUrl) {
    html = html.replace('</head>', () => `${headLinks(siteUrl, lang, route, description)}\n  </head>`)
  }
  return html
}

/** sitemap.xml listing every page in every language, each with its alternates. `lastmod` is a `YYYY-MM-DD` date. */
export function buildSitemap(siteUrl: string, lastmod?: string): string {
  const modified = lastmod ? `\n    <lastmod>${escapeHtml(lastmod)}</lastmod>` : ''
  const entries = ROUTES.flatMap((route) =>
    PAGE_LANGS.map((lang) => {
      const url = (code: Lang) => escapeHtml(pageUrl(siteUrl, code, route))
      const alternates = [
        ...PAGE_LANGS.map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${url(code)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(DEFAULT_LANG)}"/>`,
      ].join('\n')
      return `  <url>\n    <loc>${url(lang)}</loc>\n${alternates}${modified}\n    <changefreq>monthly</changefreq>\n  </url>`
    }),
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
}

export function buildRobots(siteUrl?: string): string {
  return siteUrl
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n'
}
