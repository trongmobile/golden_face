import { act, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Layout } from '@/components/layout/Layout'
import { isPublicHost, resetAnalyticsForTests, startAnalytics, trackPageview } from '@/utils/analytics'

const scripts = () => [...document.head.querySelectorAll<HTMLScriptElement>('script[data-goatcounter]')]

beforeEach(() => {
  resetAnalyticsForTests()
})

afterEach(() => {
  scripts().forEach((script) => script.remove())
  delete window.goatcounter
})

describe('which hosts are counted', () => {
  it.each(['goldenface.example', 'someone.github.io', 'www.golden-ratio.app', '8.8.8.8'])('counts %s', (host) => {
    expect(isPublicHost(host)).toBe(true)
  })

  it.each([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.0.0.5',
    '192.168.1.20',
    '172.16.4.2',
    '172.31.255.1',
    '[::1]',
    '::1',
    'laptop.local',
    '',
  ])('never counts %s', (host) => {
    expect(isPublicHost(host)).toBe(false)
  })

  it('does not count 172.32.x.x, which is not a private range', () => {
    expect(isPublicHost('172.32.0.1')).toBe(true)
  })
})

describe('startAnalytics', () => {
  it('loads nothing on localhost, which is where development and the end-to-end tests run', () => {
    expect(startAnalytics('localhost')).toBe(false)
    expect(scripts()).toHaveLength(0)
    expect(window.goatcounter).toBeUndefined()
  })

  it('adds the GoatCounter script once on a public host, with the count switched to manual', () => {
    expect(startAnalytics('goldenface.example')).toBe(true)
    expect(startAnalytics('goldenface.example')).toBe(true)
    const [script, ...rest] = scripts()
    expect(rest).toHaveLength(0)
    expect(script!.dataset.goatcounter).toBe('https://goldenface.goatcounter.com/count')
    expect(script!.getAttribute('src')).toBe('//gc.zgo.at/count.js')
    expect(script!.async).toBe(true)
    expect(window.goatcounter?.no_onload).toBe(true)
  })
})

describe('trackPageview', () => {
  it('does nothing when analytics was never started', () => {
    const count = vi.fn()
    window.goatcounter = { count }
    trackPageview('/about')
    expect(count).not.toHaveBeenCalled()
  })

  it('holds page views until the script has loaded, then sends them in order', () => {
    startAnalytics('goldenface.example')
    const count = vi.fn()
    trackPageview('/')
    trackPageview('/analysis')
    window.goatcounter!.count = count
    expect(count).not.toHaveBeenCalled()

    scripts()[0]!.dispatchEvent(new Event('load'))
    expect(count.mock.calls.map(([vars]) => vars.path)).toEqual(['/', '/analysis'])

    trackPageview('/privacy')
    expect(count).toHaveBeenLastCalledWith({ path: '/privacy' })
    expect(count).toHaveBeenCalledTimes(3)
  })

  it('drops its queue and stays quiet when the script is blocked', () => {
    startAnalytics('goldenface.example')
    const count = vi.fn()
    trackPageview('/')
    scripts()[0]!.dispatchEvent(new Event('error'))
    window.goatcounter!.count = count
    trackPageview('/about')
    scripts()[0]!.dispatchEvent(new Event('load'))
    expect(count).not.toHaveBeenCalled()
  })
})

vi.mock('@/utils/analytics', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/analytics')>()
  return { ...original, trackPageview: vi.fn(original.trackPageview) }
})

describe('page views in the app', () => {
  it('counts the first page and every route change, by path only', async () => {
    const tracked = vi.mocked(trackPageview)
    tracked.mockClear()

    let go: (to: string) => void = () => {}
    function Navigator() {
      const navigate = useNavigate()
      go = (to) => navigate(to)
      return null
    }

    render(
      <MemoryRouter initialEntries={['/?lang=vi']}>
        <Navigator />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>home</p>} />
            <Route path="privacy" element={<p>privacy</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(tracked).toHaveBeenLastCalledWith('/')

    await act(async () => go('/privacy?x=1#terms'))
    expect(tracked).toHaveBeenLastCalledWith('/privacy')
    expect(tracked.mock.calls.map(([path]) => path)).toEqual(['/', '/privacy'])
  })
})
