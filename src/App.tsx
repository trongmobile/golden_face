import { lazy, useMemo } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { RoutedI18nProvider, stripLang } from '@/i18n'
import { HomePage } from '@/pages/Home'

// Heavy routes are split out so the home page stays light. The face-analysis model is
// loaded even later, only when the user starts an analysis.
const AnalysisPage = lazy(() => import('@/pages/Analysis').then((m) => ({ default: m.AnalysisPage })))
const AboutPage = lazy(() => import('@/pages/About').then((m) => ({ default: m.AboutPage })))
const PrivacyPage = lazy(() => import('@/pages/Privacy').then((m) => ({ default: m.PrivacyPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFoundPage })))

/**
 * The pages, defined once for every language: `/vi/about` is matched as `/about`, and the language
 * comes from the URL (see `RoutedI18nProvider`). Because the route tree is the same for all
 * languages, switching language keeps the page — and a photo being analysed — exactly as it was.
 */
export function AppRoutes() {
  const { pathname, search, hash, state, key } = useLocation()
  const location = useMemo(
    () => ({ pathname: stripLang(pathname), search, hash, state, key }),
    [pathname, search, hash, state, key],
  )
  return (
    <Routes location={location}>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <BrowserRouter basename={basename}>
      <RoutedI18nProvider>
        <AppRoutes />
      </RoutedI18nProvider>
    </BrowserRouter>
  )
}
