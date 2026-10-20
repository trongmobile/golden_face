import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { I18nProvider, detectLang, msg, translate, useI18n } from '@/i18n'
import { DICTIONARIES } from '@/i18n/translate'
import { renderRich } from '@/i18n/rich'

type Tree = { [key: string]: string | readonly string[] | Tree }

function flatten(node: Tree, prefix = ''): Map<string, string | readonly string[]> {
  const out = new Map<string, string | readonly string[]>()
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string' || Array.isArray(value)) out.set(path, value as string | readonly string[])
    else for (const [innerPath, inner] of flatten(value as Tree, path)) out.set(innerPath, inner)
  }
  return out
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort()
const tags = (text: string) => [...text.matchAll(/<(\/?\w+)>/g)].map((match) => match[1]!).sort()

describe('translation dictionaries', () => {
  const en = flatten(DICTIONARIES.en as unknown as Tree)
  const vi = flatten(DICTIONARIES.vi as unknown as Tree)

  it('have exactly the same keys in every language', () => {
    expect([...vi.keys()].sort()).toEqual([...en.keys()].sort())
  })

  it('never leave a translation empty', () => {
    for (const [key, value] of vi) {
      const parts = typeof value === 'string' ? [value] : value
      for (const part of parts) expect(part.trim(), key).not.toBe('')
    }
  })

  it('keep the same {placeholders} and <tags> in every language', () => {
    for (const [key, source] of en) {
      const target = vi.get(key)!
      const sourceParts = typeof source === 'string' ? [source] : source
      const targetParts = typeof target === 'string' ? [target] : target
      expect(targetParts.length, `${key} list length`).toBe(sourceParts.length)
      sourceParts.forEach((text, index) => {
        expect(placeholders(targetParts[index]!), `${key} placeholders`).toEqual(placeholders(text))
        expect(tags(targetParts[index]!), `${key} tags`).toEqual(tags(text))
      })
    }
  })
})

describe('translate', () => {
  it('substitutes placeholders and leaves unknown ones alone', () => {
    expect(translate('en', 'layout.footer.copyright', { year: 2030 })).toContain('2030')
    expect(translate('en', 'layout.footer.copyright')).toContain('{year}')
  })

  it('accepts a Msg descriptor, with extra params merged in', () => {
    expect(translate('vi', msg('layout.footer.copyright', { year: 2031 }))).toContain('2031')
  })

  it('translates messages nested inside params, including lists', () => {
    const inner = [msg('layout.nav.home'), msg('layout.nav.privacy')]
    expect(translate('vi', msg('layout.footer.copyright', { year: msg('layout.nav.home') }))).toContain('Trang chủ')
    expect(translate('en', msg('layout.footer.copyright', { year: inner }))).toContain('Home, Privacy')
    expect(translate('vi', msg('layout.footer.copyright', { year: inner }))).toContain('Trang chủ, Quyền riêng tư')
  })

  it('falls back to the key for an unknown message', () => {
    expect(translate('vi', 'nope.nothing' as never)).toBe('nope.nothing')
  })
})

describe('detectLang', () => {
  it('prefers an explicit ?lang= link over the browser language', () => {
    expect(detectLang('?lang=vi', ['en-US'])).toBe('vi')
    expect(detectLang('?lang=VI-vn', ['en-US'])).toBe('vi')
  })

  it('uses the first supported browser language, ignoring region', () => {
    expect(detectLang('', ['fr-FR', 'vi-VN', 'en'])).toBe('vi')
    expect(detectLang('', ['en-GB'])).toBe('en')
  })

  it('falls back to English for unsupported languages and bad values', () => {
    expect(detectLang('?lang=xx', ['fr', 'de'])).toBe('en')
    expect(detectLang('', [])).toBe('en')
  })
})

describe('renderRich', () => {
  it('renders tagged parts through the given tags, including nested ones', () => {
    const { container } = render(
      <p>
        {renderRich('a <b>bold <i>and italic</i></b> c <u>plain</u>', {
          b: (children) => <strong>{children}</strong>,
          i: (children) => <em>{children}</em>,
        })}
      </p>,
    )
    expect(screen.getByText('bold', { exact: false }).tagName).toBe('STRONG')
    expect(screen.getByText('and italic').tagName).toBe('EM')
    expect(container.textContent).toBe('a bold and italic c plain')
  })
})

describe('language switching', () => {
  function Probe() {
    const { t, lang } = useI18n()
    return (
      <p data-testid="probe">
        {lang}: {t('layout.nav.home')}
      </p>
    )
  }

  it('renders English without a provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('en: Home')
  })

  it('switches the whole tree and the <html lang> attribute without storing anything', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider initialLang="en">
        <LanguageSwitcher />
        <Probe />
      </I18nProvider>,
    )
    const english = screen.getByRole('button', { name: /English/ })
    expect(english).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('vi: Trang chủ')
    expect(screen.getByRole('group', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'true')
    expect(english).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.lang).toBe('vi')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})
