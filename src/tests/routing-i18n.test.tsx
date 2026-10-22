import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/layout/Header'
import { Layout } from '@/components/layout/Layout'
import { LanguageSuggestion } from '@/components/layout/LanguageSuggestion'
import { RoutedI18nProvider, stripLang } from '@/i18n'

function Where() {
  const { pathname, search, hash } = useLocation()
  return (
    <>
      <p data-testid="where">{`${pathname}${search}${hash}`}</p>
      <p data-testid="how">{useNavigationType()}</p>
    </>
  )
}

/** Routes matched on the path without its language prefix, as AppRoutes does in the real app. */
function BareRoutes({ children }: { children: React.ReactNode }) {
  const { pathname, search, hash } = useLocation()
  return <Routes location={{ pathname: stripLang(pathname), search, hash }}>{children}</Routes>
}

function renderAt(path: string, children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RoutedI18nProvider>
        <Where />
        {children}
      </RoutedI18nProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('language comes from the URL', () => {
  it('renders Vietnamese under /vi and English elsewhere', () => {
    renderAt('/vi/about', <Header />)
    expect(screen.getByRole('link', { name: 'Về tỷ lệ vàng' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('vi')
    document.documentElement.lang = ''
    renderAt('/about', <Header />)
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps visitors in their language: every header link is prefixed on Vietnamese pages', () => {
    renderAt('/vi/privacy', <Header />)
    const nav = screen.getAllByRole('navigation', { name: 'Điều hướng chính' })[0]!
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/vi')
    expect(within(nav).getByRole('link', { name: 'Phân tích' })).toHaveAttribute('href', '/vi/analysis')
    expect(within(nav).getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/vi/blog')
    expect(screen.getByRole('link', { name: 'Trang chủ GoldenFace' })).toHaveAttribute('href', '/vi')
  })

  it('leaves English links unprefixed', () => {
    renderAt('/privacy', <Header />)
    const nav = screen.getAllByRole('navigation', { name: 'Primary' })[0]!
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Analysis' })).toHaveAttribute('href', '/analysis')
  })

  it('marks the current page in the navigation in both languages', () => {
    renderAt('/vi/analysis', <Header />)
    const nav = screen.getAllByRole('navigation', { name: 'Điều hướng chính' })[0]!
    expect(within(nav).getByRole('link', { name: 'Phân tích' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current')
  })
})

describe('switching language', () => {
  it('moves to the same page in the other language, keeping the query and hash, and replaces the history entry', async () => {
    const user = userEvent.setup()
    renderAt('/about?x=1#terms', <Header />)

    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/vi/about?x=1#terms')
    expect(screen.getByTestId('how')).toHaveTextContent('REPLACE')
    expect(screen.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /English/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/about?x=1#terms')
  })

  it('goes home in the other language from the home page', async () => {
    const user = userEvent.setup()
    renderAt('/', <Header />)
    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/vi$/)
    await user.click(screen.getByRole('button', { name: /English/ }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/)
  })

  it('does not scroll to the top or move focus, because the visitor is still on the same page', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo')
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <RoutedI18nProvider>
          <BareRoutes>
            <Route element={<Layout />}>
              <Route path="privacy" element={<p>page</p>} />
            </Route>
          </BareRoutes>
        </RoutedI18nProvider>
      </MemoryRouter>,
    )
    const callsAfterLoad = scrollTo.mock.calls.length
    const button = screen.getByRole('button', { name: /Tiếng Việt/ })
    button.focus()
    await user.click(button)
    expect(scrollTo.mock.calls.length).toBe(callsAfterLoad)
    expect(screen.getByRole('button', { name: /Tiếng Việt/ })).toHaveFocus()
  })
})

describe('Vietnamese suggestion on English pages', () => {
  const prefer = (...languages: string[]) => vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages)

  it('is offered to a browser that prefers Vietnamese, pointing at the same page', () => {
    prefer('vi-VN', 'en')
    renderAt('/about?x=1', <LanguageSuggestion />)
    const link = screen.getByRole('link', { name: 'Xem bằng tiếng Việt' })
    expect(link).toHaveAttribute('href', '/vi/about?x=1')
    expect(link).toHaveAttribute('hreflang', 'vi')
    expect(screen.getByText(/Trang này có bản tiếng Việt/)).toBeInTheDocument()
  })

  it('can be dismissed', async () => {
    prefer('vi')
    const user = userEvent.setup()
    renderAt('/', <LanguageSuggestion />)
    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('link', { name: 'Xem bằng tiếng Việt' })).not.toBeInTheDocument()
  })

  it('is not shown on Vietnamese pages', () => {
    prefer('vi')
    renderAt('/vi/about', <LanguageSuggestion />)
    expect(screen.queryByRole('link', { name: 'Xem bằng tiếng Việt' })).not.toBeInTheDocument()
  })

  it('is not shown to browsers that prefer English or something else', () => {
    prefer('en-US')
    const first = renderAt('/', <LanguageSuggestion />)
    expect(screen.queryByRole('link', { name: 'Xem bằng tiếng Việt' })).not.toBeInTheDocument()
    first.unmount()
    prefer('fr-FR')
    renderAt('/', <LanguageSuggestion />)
    expect(screen.queryByRole('link', { name: 'Xem bằng tiếng Việt' })).not.toBeInTheDocument()
  })

  it('does not redirect: following it is the visitor’s choice', async () => {
    prefer('vi')
    renderAt('/privacy', <LanguageSuggestion />)
    expect(screen.getByTestId('where')).toHaveTextContent('/privacy')
    await act(async () => {})
    expect(screen.getByTestId('where')).toHaveTextContent('/privacy')
  })
})
