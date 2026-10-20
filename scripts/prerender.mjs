// Runs after `vite build` and `vite build --ssr`: writes one finished HTML page per language and
// route (the app rendered to HTML, plus titles, hreflang/canonical links and structured data),
// the single-page-app fallback 404.html, sitemap.xml and robots.txt.
//
//   VITE_BASE_PATH  where the site is served from ("/" for a domain, "/repo/" for a project page)
//   VITE_SITE_URL   public URL without trailing slash; enables canonical/hreflang/JSON-LD and the sitemap
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const env = loadEnv('production', root, 'VITE_')
function normalizeBase(raw) {
  let base = (raw ?? '/').trim() || '/'
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`
  return base
}
const base = normalizeBase(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH)
const siteUrl = (process.env.VITE_SITE_URL ?? env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

const server = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
const template = await readFile(join(dist, 'index.html'), 'utf8')

// Unknown addresses get the app shell with an empty root: the browser renders the right page itself.
await writeFile(join(dist, '404.html'), template)

let pages = 0
for (const lang of server.PAGE_LANGS) {
  for (const route of server.ROUTES) {
    const path = server.routePath(lang, route)
    const body = await server.render(base + path)
    if (!body.includes('<h1')) throw new Error(`Rendering ${base}${path} produced no content`)
    const html = server.applyPage(template, { lang, route, body, siteUrl: siteUrl || undefined })
    const file = join(dist, path, 'index.html')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, html)
    pages++
  }
}

await writeFile(join(dist, 'robots.txt'), server.buildRobots(siteUrl || undefined))
// The date of the last commit, so a redeploy of unchanged content does not look like an update.
// Without git (a source archive) the sitemap simply has no <lastmod>.
function lastCommitDate() {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  } catch {
    return undefined
  }
}
if (siteUrl) await writeFile(join(dist, 'sitemap.xml'), server.buildSitemap(siteUrl, lastCommitDate()))

await rm(ssrDir, { recursive: true, force: true })
console.log(`prerendered ${pages} pages${siteUrl ? `, sitemap.xml for ${siteUrl}` : ' (no VITE_SITE_URL: canonical links and sitemap skipped)'}`)
