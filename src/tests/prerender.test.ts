// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { PAGE_LANGS, ROUTES, routePath } from '@/seo/seo'
import { render } from '@/entry-server'

// Renders the real app to HTML the way the build does, in Node, without a browser.
describe('pre-rendering the app', () => {
  it('writes real content for every page in every language, with no loading placeholder', async () => {
    for (const lang of PAGE_LANGS) {
      for (const route of ROUTES) {
        const html = await render(`/${routePath(lang, route)}`)
        expect(html, `${lang} /${route}`).toMatch(/<h1[ >]/)
        expect(html).toContain('<main')
        expect(html).toContain('<footer')
        expect(html).not.toContain('Loading page')
        expect(html).not.toContain('Đang tải trang')
      }
    }
  })

  it('renders each language in its own words', async () => {
    expect(await render('/')).toContain('Discover the Geometry of Your Face')
    expect(await render('/vi/')).toContain('Khám phá hình học trên khuôn mặt bạn')
    expect(await render('/about/')).toContain('A famous number')
    expect(await render('/vi/about/')).toContain('Một con số nổi tiếng')
  })

  it('keeps visitors in their language through every internal link', async () => {
    const vi = await render('/vi/privacy/')
    const hrefs = [...vi.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]!)
    expect(hrefs.length).toBeGreaterThan(4)
    for (const href of hrefs) expect(href, href).toMatch(/^\/vi(\/|$|\?|#)|^\/assets\//)
    const en = await render('/privacy/')
    for (const match of en.matchAll(/href="(\/[^"]*)"/g)) expect(match[1]).not.toMatch(/^\/vi(\/|$)/)
  })

  it('does not show the Vietnamese suggestion in the pre-rendered English pages', async () => {
    expect(await render('/')).not.toContain('Xem bằng tiếng Việt')
  })

  it('renders an unknown address as the 404 page', async () => {
    expect(await render('/vi/nothing-here/')).toContain('Trang này không tồn tại')
    expect(await render('/nothing-here/')).toContain('This page does not exist')
  })
})
