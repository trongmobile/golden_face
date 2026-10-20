import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import { describe, expect, it } from 'vitest'
import { Layout } from '@/components/layout/Layout'
import { Route, Routes } from 'react-router-dom'
import { AboutPage } from '@/pages/About'
import { HomePage } from '@/pages/Home'
import { NotFoundPage } from '@/pages/NotFound'
import { PrivacyPage } from '@/pages/Privacy'
import { METRIC_CATALOG } from '@/features/face-analysis/metric-catalog'
import { RoutedI18nProvider, stripLang, translate } from '@/i18n'

/** Mirrors AppRoutes (src/App.tsx) with the pages imported directly, so the tests can stay synchronous. */
function Pages() {
  const { pathname, search, hash } = useLocation()
  return (
    <Routes location={{ pathname: stripLang(pathname), search, hash }}>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

/** Renders the app at `path`; a `/vi` prefix means Vietnamese, as in the real site. */
function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RoutedI18nProvider>
        <Suspense fallback={null}>
          <Pages />
        </Suspense>
      </RoutedI18nProvider>
    </MemoryRouter>,
  )
}

describe('home page', () => {
  it('has the required headline, description and two calls to action', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Discover the Geometry of Your Face' })).toBeInTheDocument()
    expect(screen.getByText('Explore facial proportions through the mathematics of the golden ratio.')).toBeInTheDocument()
    const upload = screen.getAllByRole('link', { name: 'Upload Photo' })[0]!
    const camera = screen.getAllByRole('link', { name: 'Take a Photo' })[0]!
    expect(upload).toHaveAttribute('href', '/analysis?source=upload')
    expect(camera).toHaveAttribute('href', '/analysis?source=camera')
  })

  it('explains how it works, the golden ratio and its limits', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /three steps/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What this tool cannot tell you/ })).toBeInTheDocument()
    expect(screen.getAllByText(/not a standard of beauty/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/never rank or rate a face/i)).toBeInTheDocument()
  })

  it('has one h1, labelled landmark regions and an illustration with a text alternative', () => {
    renderApp('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Illustration of a face outline/ })).toBeInTheDocument()
  })

  it('does not make claims that beauty can be measured', () => {
    const { container } = renderApp('/')
    const text = (container.textContent ?? '').toLowerCase()
    expect(text).not.toMatch(/beauty score|rate your|how beautiful|attractiveness score|perfect face/)
  })
})

describe('layout and navigation', () => {
  it('offers the four required navigation links', () => {
    renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    for (const [name, href] of [
      ['Home', '/'],
      ['Analysis', '/analysis'],
      ['About Golden Ratio', '/about'],
      ['Privacy', '/privacy'],
    ] as const) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href)
    }
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('provides a skip link to the main content', () => {
    renderApp('/')
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('has an accessible mobile menu that opens, closes with Escape and after navigating', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Hidden elements have no accessible name, so look the menu up by its label attribute.
    const mobile = document.querySelector<HTMLElement>('nav[aria-label="Mobile"]')!
    expect(mobile).not.toBeVisible()
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(mobile).toBeVisible()
    await user.keyboard('{Escape}')
    expect(mobile).not.toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(mobile).getByRole('link', { name: 'Privacy' }))
    expect(await screen.findByRole('heading', { level: 1, name: /stays on your device/ })).toBeInTheDocument()
    expect(mobile).not.toBeVisible()
  })

  it('footer carries the privacy statement and links to the privacy policy and terms', () => {
    renderApp('/')
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText(/never stored/i)).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy')
    expect(within(footer).getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/privacy#terms')
  })

  it('updates the document title for each page', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(document.title).toBe('GoldenFace — Facial Proportion Analyzer')
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'About Golden Ratio' }))
    expect(document.title).toBe('About the Golden Ratio — GoldenFace')
  })

  it('shows a helpful 404 page for unknown routes', () => {
    renderApp('/nope/not-here')
    expect(screen.getByRole('heading', { level: 1, name: 'This page does not exist' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})

describe('about page', () => {
  it('documents the formula, k and every measurement from the catalog', () => {
    renderApp('/about')
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/r = max\(A, B\) ÷ min\(A, B\)/)).toBeInTheDocument()
    expect(screen.getByText(/error = \|r − φ\| ÷ φ/)).toBeInTheDocument()
    expect(screen.getByText(/not a medical threshold or a standard\s+of beauty/i)).toBeInTheDocument()
    const table = screen.getByRole('table')
    for (const metric of METRIC_CATALOG) {
      const label = translate('en', `metrics.items.${metric.id}.label`)
      expect(within(table).getByRole('rowheader', { name: new RegExp(label.replace(/[÷.]/g, '.')) })).toBeInTheDocument()
    }
    // Exactly the eligible ones are marked "Yes".
    const yes = within(table).getAllByText('Yes')
    expect(yes).toHaveLength(METRIC_CATALOG.filter((m) => m.goldenEligible).length)
  })

  it('states the limitations and that the hairline is never guessed', () => {
    renderApp('/about')
    expect(screen.getByRole('heading', { name: 'Limits of the method' })).toBeInTheDocument()
    expect(screen.getByText('The hairline is not detected')).toBeInTheDocument()
    expect(screen.getByText('φ is not a rule for faces')).toBeInTheDocument()
    expect(screen.getByText(/never produces a “beauty score”/)).toBeInTheDocument()
  })

  it('shows a worked example computed by the same formulas', () => {
    renderApp('/about')
    expect(screen.getByText(/A = 1.45, B = 1 gives r = 1.45/)).toBeInTheDocument()
  })
})

describe('privacy page', () => {
  it('describes the real behaviour of the app', () => {
    renderApp('/privacy')
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/analyzed inside your browser/i)
    expect(text).toMatch(/no localStorage|not written to localStorage/i)
    expect(text).toMatch(/never used to train/i)
    expect(text).toMatch(/does not recognise or identify people/i)
    expect(text).toMatch(/camera is switched off/i)
    expect(text).toMatch(/Google Cloud Storage/)
    expect(text).toMatch(/internet connection/i)
    expect(text).toMatch(/Last updated/)
  })

  it('includes terms of use with the consent requirement', () => {
    renderApp('/privacy')
    const terms = document.getElementById('terms')!
    expect(terms).toBeInTheDocument()
    expect(within(terms).getByRole('heading', { name: 'Terms of use' })).toBeInTheDocument()
    expect(terms.textContent).toMatch(/agreed/)
    expect(terms.textContent).toMatch(/not medical/i)
  })
})

describe('Vietnamese pages', () => {
  it('translates the home page, its call-to-action links and the illustration text', () => {
    renderApp('/vi')
    expect(screen.getByRole('heading', { level: 1, name: 'Khám phá hình học trên khuôn mặt bạn' })).toBeInTheDocument()
    const upload = screen.getAllByRole('link', { name: 'Tải ảnh lên' })[0]!
    const camera = screen.getAllByRole('link', { name: 'Chụp ảnh' })[0]!
    expect(upload).toHaveAttribute('href', '/vi/analysis?source=upload')
    expect(camera).toHaveAttribute('href', '/vi/analysis?source=camera')
    expect(screen.getByRole('heading', { name: /ba bước/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Công cụ này không thể cho bạn biết điều gì' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Hình minh họa đường viền khuôn mặt/ })).toBeInTheDocument()
    expect(document.title).toBe('GoldenFace — Phân tích tỷ lệ khuôn mặt')
    expect(document.documentElement.lang).toBe('vi')
    // The headline claim must survive translation: no beauty score.
    expect(screen.queryByText(/Discover the Geometry/)).not.toBeInTheDocument()
  })

  it('translates the about page, including the formulas and the measurements table', () => {
    renderApp('/vi/about')
    expect(screen.getByRole('heading', { level: 1, name: /Một con số nổi tiếng/ })).toBeInTheDocument()
    expect(screen.getByText(/r = max\(A, B\) ÷ min\(A, B\), nên r không bao giờ nhỏ hơn 1/)).toBeInTheDocument()
    expect(screen.getByText(/A = 1.45, B = 1 cho r = 1.45/)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Có')).toHaveLength(METRIC_CATALOG.filter((m) => m.goldenEligible).length)
    expect(screen.getByRole('heading', { name: 'Giới hạn của phương pháp' })).toBeInTheDocument()
    expect(screen.getByText('Đường chân tóc không được phát hiện')).toBeInTheDocument()
    expect(document.title).toBe('Về tỷ lệ vàng — GoldenFace')
  })

  it('translates the privacy policy and terms while keeping the section anchor', () => {
    renderApp('/vi/privacy')
    expect(screen.getByRole('heading', { level: 1, name: /ở lại trên thiết bị/ })).toBeInTheDocument()
    expect(screen.getByText(/Cập nhật lần cuối ngày 20 tháng 10 năm 2026/)).toBeInTheDocument()
    const terms = document.getElementById('terms')!
    expect(within(terms).getByRole('heading', { name: 'Điều khoản sử dụng' })).toBeInTheDocument()
    expect(terms.textContent).toMatch(/đã đồng ý/)
    expect(document.body.textContent).toMatch(/không localStorage/)
    // Every section is labelled by its own heading, whatever the language.
    for (const region of screen.getAllByRole('region')) {
      expect(region).toHaveAccessibleName()
    }
  })

  it('translates the 404 page', () => {
    renderApp('/vi/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Trang này không tồn tại' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/vi')
    expect(document.title).toBe('Không tìm thấy trang — GoldenFace')
  })
})
