import { describe, expect, it } from 'vitest'
import TEMPLATE from '../../index.html?raw'
import { PAGE_LANGS, ROUTES, applyPage, buildRobots, buildSitemap, pageUrl, routeMeta, routePath, setMeta } from '@/seo/seo'

// TEMPLATE is the real index.html, so a change to how it is written cannot silently break the build.
const SITE = 'https://owner.example/golden_face'

const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1]

describe('page addresses', () => {
  it('puts every language and route at its own directory URL', () => {
    expect(routePath('en', '')).toBe('')
    expect(routePath('en', 'about')).toBe('about/')
    expect(routePath('vi', '')).toBe('vi/')
    expect(routePath('vi', 'privacy')).toBe('vi/privacy/')
    expect(pageUrl(SITE, 'en', '')).toBe(`${SITE}/`)
    expect(pageUrl(SITE, 'vi', 'analysis')).toBe(`${SITE}/vi/analysis/`)
  })
})

describe('titles and descriptions', () => {
  it.each(PAGE_LANGS.flatMap((lang) => ROUTES.map((route) => [lang, route] as const)))(
    'are specific, distinct and a sensible length for %s "%s"',
    (lang, route) => {
      const { title, description } = routeMeta(lang, route)
      expect(title).toContain('GoldenFace')
      expect(title.length).toBeLessThanOrEqual(70)
      expect(description.length).toBeGreaterThanOrEqual(50)
      expect(description.length).toBeLessThanOrEqual(200)
    },
  )

  it('are different on every page and in every language', () => {
    const all = PAGE_LANGS.flatMap((lang) => ROUTES.map((route) => routeMeta(lang, route)))
    expect(new Set(all.map((meta) => meta.title)).size).toBe(all.length)
    expect(new Set(all.map((meta) => meta.description)).size).toBe(all.length)
  })
})

describe('Google Search Console ownership tag', () => {
  it('is on every page in every language, because removing it un-verifies the site', () => {
    for (const lang of PAGE_LANGS) {
      for (const route of ROUTES) {
        const html = applyPage(TEMPLATE, { lang, route, body: '', siteUrl: SITE })
        expect(html.match(/name="google-site-verification"\s+content="[^"]+"/g)).toHaveLength(1)
      }
    }
  })
})

describe('applyPage', () => {
  it('writes the language, title, descriptions and share-card text of each page', () => {
    for (const lang of PAGE_LANGS) {
      for (const route of ROUTES) {
        const { title, description } = routeMeta(lang, route)
        const html = applyPage(TEMPLATE, { lang, route, body: '<h1>x</h1>' })
        expect(html, `${lang} ${route}`).toContain(`<html lang="${lang}"`)
        expect(html).toContain(`<title>${title}</title>`)
        expect(attr(html, /name="description"\s+content="([^"]*)"/)).toBe(description)
        expect(attr(html, /property="og:title"\s+content="([^"]*)"/)).toBe(title)
        expect(attr(html, /property="og:description"\s+content="([^"]*)"/)).toBe(description)
        expect(attr(html, /name="twitter:title"\s+content="([^"]*)"/)).toBe(title)
        expect(attr(html, /name="twitter:description"\s+content="([^"]*)"/)).toBe(description)
      }
    }
  })

  it('puts the rendered app inside the root, untouched by replacement patterns', () => {
    const body = '<h1>Costs $& and $1 and $$</h1>'
    const html = applyPage(TEMPLATE, { lang: 'en', route: '', body })
    expect(html).toContain(`<div id="root">${body}</div>`)
  })

  it('replaces the no-JavaScript message in the page language', () => {
    const vi = applyPage(TEMPLATE, { lang: 'vi', route: '', body: '' })
    const en = applyPage(TEMPLATE, { lang: 'en', route: '', body: '' })
    expect(vi).toContain('Bạn vẫn đọc được trang này khi không có JavaScript')
    expect(en).toContain('Reading this page works without JavaScript')
    expect(vi.match(/<noscript>/g)).toHaveLength(1)
    // The note is not a second page: no heading of its own next to the real <h1>.
    expect(vi.match(/<noscript>[\s\S]*<\/noscript>/)![0]).not.toContain('<h1')
  })

  it('adds no absolute-URL tags when the site URL is unknown', () => {
    const html = applyPage(TEMPLATE, { lang: 'en', route: '', body: '' })
    expect(html).not.toMatch(/rel="canonical"|hreflang|og:url|ld\+json/)
  })

  it('adds canonical, hreflang alternates for every language and an x-default when the site URL is known', () => {
    const html = applyPage(TEMPLATE, { lang: 'vi', route: 'about', body: '', siteUrl: SITE })
    expect(html).toContain(`<link rel="canonical" href="${SITE}/vi/about/" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="en" href="${SITE}/about/" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="vi" href="${SITE}/vi/about/" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}/about/" />`)
    expect(html).toContain(`<meta property="og:url" content="${SITE}/vi/about/" />`)
    expect(html).toContain('<meta property="og:locale" content="vi_VN" />')
    expect(html).toContain('<meta property="og:locale:alternate" content="en_US" />')
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
  })

  it('gives each language page a canonical that points at itself', () => {
    for (const lang of PAGE_LANGS) {
      const html = applyPage(TEMPLATE, { lang, route: 'privacy', body: '', siteUrl: SITE })
      expect(attr(html, /rel="canonical" href="([^"]*)"/)).toBe(pageUrl(SITE, lang, 'privacy'))
    }
  })

  it('describes the home page as a free web application in structured data, and only the home page', () => {
    for (const lang of PAGE_LANGS) {
      const home = applyPage(TEMPLATE, { lang, route: '', body: '', siteUrl: SITE })
      const json = attr(home, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/)!
      const data = JSON.parse(json)
      expect(data['@type']).toBe('WebApplication')
      expect(data.url).toBe(pageUrl(SITE, lang, ''))
      expect(data.inLanguage).toBe(lang)
      expect(data.isAccessibleForFree).toBe(true)
      expect(data.description).toBe(routeMeta(lang, '').description)
      expect(applyPage(TEMPLATE, { lang, route: 'about', body: '', siteUrl: SITE })).not.toContain('ld+json')
    }
  })

  it('cannot be broken out of by text in the structured data', () => {
    const html = applyPage(TEMPLATE, { lang: 'en', route: '', body: '', siteUrl: 'https://x.example/</script><b>' })
    expect(html.match(/<\/script>/g)?.length).toBe(
      (TEMPLATE.match(/<\/script>/g)?.length ?? 0) + 1,
    )
  })
})

describe('setMeta', () => {
  it('matches a tag however it is wrapped and escapes the value', () => {
    const wrapped = '<meta\n  name="description"\n  content="old"\n/>'
    expect(setMeta(wrapped, 'name', 'description', 'a "quoted" <b> & more')).toBe(
      '<meta\n  name="description"\n  content="a &quot;quoted&quot; &lt;b&gt; &amp; more"\n/>',
    )
    expect(setMeta('<meta name="description" content="old" />', 'name', 'description', 'new')).toContain('content="new"')
  })

  it('leaves the page alone when the tag is missing', () => {
    expect(setMeta('<p>no meta</p>', 'name', 'description', 'x')).toBe('<p>no meta</p>')
  })
})

describe('sitemap and robots', () => {
  const sitemap = buildSitemap(SITE)

  it('lists every page in every language', () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(locs).toHaveLength(ROUTES.length * PAGE_LANGS.length)
    for (const lang of PAGE_LANGS) {
      for (const route of ROUTES) expect(locs).toContain(pageUrl(SITE, lang, route))
    }
  })

  it('gives each page its alternates, including x-default', () => {
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    const block = sitemap.split('<url>').find((entry) => entry.includes(`<loc>${SITE}/vi/about/</loc>`))!
    expect(block).toContain(`hreflang="en" href="${SITE}/about/"`)
    expect(block).toContain(`hreflang="vi" href="${SITE}/vi/about/"`)
    expect(block).toContain(`hreflang="x-default" href="${SITE}/about/"`)
  })

  it('points robots.txt at the sitemap only when there is one', () => {
    expect(buildRobots(SITE)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
    expect(buildRobots()).toBe('User-agent: *\nAllow: /\n')
  })
})
