import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import TEMPLATE from '../../index.html?raw'
import { BLOG_SLUGS, getPost, listPosts, parseFrontMatter } from '@/blog/posts'
import { RoutedI18nProvider } from '@/i18n'
import { PAGE_LANGS, ROUTES, applyPage, articleStructuredData, buildSitemap } from '@/seo/seo'
import { BlogPage } from '@/pages/Blog'
import { BlogPostPage } from '@/pages/BlogPost'

const SITE = 'https://owner.example/golden_face'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RoutedI18nProvider>
        <Routes>
          <Route path="blog" element={<BlogPage />} />
          <Route path="vi/blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="vi/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<p>not found</p>} />
        </Routes>
      </RoutedI18nProvider>
    </MemoryRouter>,
  )
}

describe('blog content', () => {
  it('has at least one post, and each one in every language under the same slug', () => {
    expect(BLOG_SLUGS.length).toBeGreaterThan(0)
    for (const slug of BLOG_SLUGS) {
      for (const lang of PAGE_LANGS) {
        const post = getPost(lang, slug)
        expect(post, `${lang} ${slug}`).toBeDefined()
        expect(post!.body.trimStart()).toMatch(/^# \S/)
        expect(post!.body.match(/^# /gm)).toHaveLength(1)
      }
    }
  })

  it('lists posts newest first', () => {
    for (const lang of PAGE_LANGS) {
      const dates = listPosts(lang).map((post) => post.published)
      expect(dates).toEqual([...dates].sort().reverse())
    }
  })

  it('never links to a page that does not exist', () => {
    const known = new Set(['', ...ROUTES.map((route) => `/${route}`.replace(/\/$/, ''))])
    for (const lang of PAGE_LANGS) {
      for (const post of listPosts(lang)) {
        for (const match of post.body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
          const path = match[1]!.replace(/^\/vi(?=\/|$)/, '').replace(/[?#].*$/, '') || '/'
          expect(known.has(path === '/' ? '' : path), `${lang} ${post.slug}: ${match[1]}`).toBe(true)
        }
      }
    }
  })

  it('reads flat front matter and ignores the authoring lists', () => {
    const { data, body } = parseFrontMatter('---\nslug: a\ntitle: "T: x"\nlist:\n  - { a: b }\n---\n# H\n')
    expect(data).toEqual({ slug: 'a', title: 'T: x' })
    expect(body).toBe('# H\n')
  })
})

describe('blog pages', () => {
  it('lists the articles in the visitor’s language and links to them', () => {
    renderAt('/vi/blog')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ghi chép về tỷ lệ vàng')
    const post = getPost('vi', BLOG_SLUGS[0]!)!
    const link = screen.getAllByRole('link', { name: new RegExp(post.title.slice(0, 20)) })[0]!
    expect(link).toHaveAttribute('href', `/vi/blog/${post.slug}`)
  })

  it('shows one article with a single h1, its table and language-aware links', () => {
    const slug = BLOG_SLUGS[0]!
    renderAt(`/vi/blog/${slug}`)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('table')).toBeInTheDocument()
    const cta = screen.getAllByRole('link').find((a) => a.getAttribute('href') === '/vi/analysis')
    expect(cta).toBeDefined()
  })

  it('does not interpret raw HTML in a post', () => {
    renderAt(`/blog/${BLOG_SLUGS[0]!}`)
    expect(document.querySelector('script')).toBeNull()
  })
})

describe('blog SEO', () => {
  const route = `blog/${BLOG_SLUGS[0]!}`

  it('marks posts as articles with structured data, and other pages as websites', () => {
    const post = applyPage(TEMPLATE, { lang: 'en', route, body: '<h1>x</h1>', siteUrl: SITE })
    expect(post).toMatch(/property="og:type"\s+content="article"/)
    expect(post).toContain(`"@type":"Article"`)
    expect(post).toContain(`<link rel="canonical" href="${SITE}/${route}/" />`)
    expect(post).toContain(`hreflang="vi" href="${SITE}/vi/${route}/"`)
    const about = applyPage(TEMPLATE, { lang: 'en', route: 'about', body: '<h1>x</h1>', siteUrl: SITE })
    expect(about).not.toContain('"@type":"Article"')
    expect(about).not.toMatch(/content="article"/)
  })

  it('has no article data for a route that is not a post', () => {
    expect(articleStructuredData('en', SITE, 'about')).toBeUndefined()
    expect(articleStructuredData('en', SITE, 'blog')).toBeUndefined()
  })

  it('puts every post in every language in the sitemap with its alternates', () => {
    const xml = buildSitemap(SITE)
    for (const lang of PAGE_LANGS) {
      const path = lang === 'en' ? '' : `${lang}/`
      expect(xml).toContain(`<loc>${SITE}/${path}${route}/</loc>`)
    }
  })
})
