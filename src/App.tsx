import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/Home'

// Heavy routes are split out so the home page stays light. The face-analysis model is
// loaded even later, only when the user starts an analysis.
const AnalysisPage = lazy(() => import('@/pages/Analysis').then((m) => ({ default: m.AnalysisPage })))
const AboutPage = lazy(() => import('@/pages/About').then((m) => ({ default: m.AboutPage })))
const PrivacyPage = lazy(() => import('@/pages/Privacy').then((m) => ({ default: m.PrivacyPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFoundPage })))

export function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
