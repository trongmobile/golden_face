import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/Skeleton'
import { Footer } from './Footer'
import { Header } from './Header'

/** Scrolls to the top (or to a #hash target) and moves focus to <main> after navigation. */
function useRouteEffects(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname, hash } = useLocation()
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
  }, [pathname, hash, mainRef])
}

function PageFallback() {
  return (
    <div className="container-page py-16" role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  )
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null)
  useRouteEffects(mainRef)

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="no-print sr-only z-50 rounded-full bg-navy px-5 py-3 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
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
