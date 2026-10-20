import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

function normalizeBase(raw: string | undefined): string {
  let base = (raw ?? '/').trim() || '/'
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`
  return base
}

/**
 * Adds the share-card image (an absolute URL) to the page head when the public site URL is known.
 * Everything else a static host needs — a pre-rendered page per language and route, canonical and
 * hreflang links, sitemap.xml, robots.txt and 404.html — is written after the build by
 * scripts/prerender.mjs.
 */
function shareImage(siteUrl: string): Plugin {
  return {
    name: 'goldenface-share-image',
    apply: 'build',
    transformIndexHtml() {
      if (!siteUrl) return []
      const image = `${siteUrl}/og-image.png`
      return [
        { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: image }, injectTo: 'head' },
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')
  const base = normalizeBase(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH)
  const siteUrl = (process.env.VITE_SITE_URL ?? env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

  return {
    base,
    plugins: [react(), tailwindcss(), shareImage(siteUrl)],
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
