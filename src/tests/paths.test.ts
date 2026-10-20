import { describe, expect, it } from 'vitest'
import { langFromPath, localizeTo, stripLang, withLang } from '@/i18n'

describe('language in the URL', () => {
  it('tells the language from the first path segment', () => {
    expect(langFromPath('/')).toBe('en')
    expect(langFromPath('/about')).toBe('en')
    expect(langFromPath('/vi')).toBe('vi')
    expect(langFromPath('/vi/')).toBe('vi')
    expect(langFromPath('/vi/about')).toBe('vi')
  })

  it('does not mistake other paths for a language', () => {
    expect(langFromPath('/vietnam')).toBe('en')
    expect(langFromPath('/en/about')).toBe('en')
    expect(langFromPath('/privacy/vi')).toBe('en')
    expect(langFromPath('')).toBe('en')
  })

  it('strips the prefix', () => {
    expect(stripLang('/vi')).toBe('/')
    expect(stripLang('/vi/')).toBe('/')
    expect(stripLang('/vi/about')).toBe('/about')
    expect(stripLang('/about')).toBe('/about')
    expect(stripLang('/')).toBe('/')
    expect(stripLang('')).toBe('/')
  })

  it('moves a page to another language and back', () => {
    expect(withLang('/about', 'vi')).toBe('/vi/about')
    expect(withLang('/', 'vi')).toBe('/vi')
    expect(withLang('/vi/about', 'vi')).toBe('/vi/about')
    expect(withLang('/vi/about', 'en')).toBe('/about')
    expect(withLang('/vi', 'en')).toBe('/')
    expect(withLang('/about', 'en')).toBe('/about')
  })

  it('prefixes link targets and keeps their query string and hash', () => {
    expect(localizeTo('/analysis?source=upload', 'vi')).toBe('/vi/analysis?source=upload')
    expect(localizeTo('/privacy#terms', 'vi')).toBe('/vi/privacy#terms')
    expect(localizeTo('/', 'vi')).toBe('/vi')
    expect(localizeTo('/analysis?source=upload', 'en')).toBe('/analysis?source=upload')
    expect(localizeTo('/vi/about', 'en')).toBe('/about')
  })

  it('leaves relative, hash-only and external targets alone', () => {
    for (const target of ['about', '#main', 'https://example.com/a', '//cdn.example.com/x', 'mailto:a@b.c']) {
      expect(localizeTo(target, 'vi')).toBe(target)
    }
  })
})
