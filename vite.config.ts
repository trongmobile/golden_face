import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

/** Routes that get their own pre-rendered shell (title + description) for hosting on static servers. */
const ROUTES = [
  {
    path: '',
    title: 'GoldenFace — Facial Proportion Analyzer',
    description:
      'Explore facial proportions through the mathematics of the golden ratio. Private, in-browser landmark analysis — a geometric curiosity, not a measure of beauty.',
  },
  {
    path: 'analysis',
    title: 'Analyze a Photo — GoldenFace',
    description:
      'Upload or capture a front-facing photo and measure facial proportions entirely on your device. Nothing is uploaded.',
  },
  {
    path: 'about',
    title: 'About the Golden Ratio — GoldenFace',
    description:
      'What the golden ratio (φ ≈ 1.618) is, how GoldenFace compares facial measurements with it, and why it is not a standard of beauty.',
  },
  {
    path: 'privacy',
    title: 'Privacy Policy — GoldenFace',
    description:
      'GoldenFace processes photos on your device. Images and facial landmarks are never uploaded, stored or used for training.',
  },
] as const

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function normalizeBase(raw: string | undefined): string {
  let base = (raw ?? '/').trim() || '/'
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`
  return base
}

/**
 * Static-hosting helpers (GitHub Pages friendly):
 *  - injects canonical / Open Graph URLs when VITE_SITE_URL is set,
 *  - emits a route-specific copy of index.html for every route (real 200 responses),
 *  - emits 404.html as the SPA fallback for unknown paths,
 *  - emits sitemap.xml and robots.txt.
 */
function staticSite(siteUrl: string): Plugin {
  let outDir = 'dist'
  return {
    name: 'goldenface-static-site',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml() {
      if (!siteUrl) return []
      const image = `${siteUrl}/og-image.png`
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: image }, injectTo: 'head' },
      ]
    },
    async closeBundle() {
      const indexHtml = await readFile(join(outDir, 'index.html'), 'utf8')

      for (const route of ROUTES) {
        if (route.path === '') continue
        let html = indexHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(route.title)}</title>`)
          .replace(
            /(<meta name="description" content=")[^"]*(")/,
            `$1${escapeAttr(route.description)}$2`,
          )
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(route.title)}$2`)
          .replace(
            /(<meta property="og:description" content=")[^"]*(")/,
            `$1${escapeAttr(route.description)}$2`,
          )
        if (siteUrl) {
          html = html
            .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${siteUrl}/${route.path}$2`)
            .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${siteUrl}/${route.path}$2`)
        }
        await mkdir(join(outDir, route.path), { recursive: true })
        await writeFile(join(outDir, route.path, 'index.html'), html)
      }

      await writeFile(join(outDir, '404.html'), indexHtml)

      if (siteUrl) {
        const urls = ROUTES.map(
          (route) => `  <url><loc>${siteUrl}/${route.path}</loc><changefreq>monthly</changefreq></url>`,
        ).join('\n')
        await writeFile(
          join(outDir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        )
        await writeFile(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)
      } else {
        await writeFile(join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\n')
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')
  const base = normalizeBase(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH)
  const siteUrl = (process.env.VITE_SITE_URL ?? env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

  return {
    base,
    plugins: [react(), tailwindcss(), staticSite(siteUrl)],
    resolve: {
      alias: { '@': resolve(rootDir, 'src') },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 700,
    },
    server: { host: true },
  }
})
