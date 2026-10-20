import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { RoutedI18nProvider } from './i18n'

/**
 * Build-time entry (see scripts/prerender.mjs): renders the app for one URL to an HTML string, so
 * every page ships with its content already in place. The browser then hydrates it (src/main.tsx).
 * `url` includes the site's base path, exactly as in the address bar.
 */
export async function render(url: string): Promise<string> {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  const { prelude } = await prerender(
    <StaticRouter location={url} basename={basename}>
      <RoutedI18nProvider>
        <AppRoutes />
      </RoutedI18nProvider>
    </StaticRouter>,
    // Without this React leaves any boundary over ~12 KB as a loading placeholder plus a hidden copy
    // swapped in by script — which a crawler without JavaScript would never see. Inline everything.
    { progressiveChunkSize: Infinity },
  )
  return new Response(prelude).text()
}

export { PAGE_LANGS, ROUTES, applyPage, buildRobots, buildSitemap, routePath } from './seo/seo'
