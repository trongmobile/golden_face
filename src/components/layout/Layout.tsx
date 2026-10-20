import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/Skeleton'
import { stripLang, useI18n } from '@/i18n'
import { trackPageview } from '@/utils/analytics'
import { Footer } from './Footer'
import { Header } from './Header'
import { LanguageSuggestion } from './LanguageSuggestion'

/** Scrolls to the top (or to a #hash target) and moves focus to <main> after navigation. */
function useRouteEffects(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname, hash } = useLocation()
  // Switching language keeps the same page, so it must not scroll to the top or move focus.
  const route = stripLang(pathname)
  const first = useRef(true)

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
    // Skip the initial load so the page does not steal focus from the browser's own behaviour.
    if (first.current) {
      first.current = false
      return
    }
    // A page that already placed focus inside <main> (e.g. "Upload Photo" focusing the file chooser)
    // keeps it. Parent effects run after child effects, so without this check we would steal it.
    const main = mainRef.current
    if (main && document.activeElement !== main && main.contains(document.activeElement)) return
    main?.focus({ preventScroll: true })
  }, [route, hash, mainRef])
}

/** Counts every page the visitor opens (the app never reloads, so the script cannot see them itself). */
function usePageviews() {
  const { pathname } = useLocation()
  useEffect(() => trackPageview(pathname), [pathname])
}

function PageFallback() {
  const { t } = useI18n()
  return (
    <div className="container-page py-16" role="status" aria-label={t('layout.loadingPage')}>
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  )
}

export function Layout() {
  const { t } = useI18n()
  const mainRef = useRef<HTMLElement>(null)
  useRouteEffects(mainRef)
  usePageviews()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="no-print sr-only z-50 rounded-full bg-navy px-5 py-3 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('layout.skipToMain')}
      </a>
      <LanguageSuggestion />
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
