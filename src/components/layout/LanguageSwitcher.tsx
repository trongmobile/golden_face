import { LANGUAGES, useI18n } from '@/i18n'
import { cn } from '@/utils/cn'

/**
 * Switches the interface language with one tap. Short codes keep it narrow enough for a 320 px
 * header; the full language name follows the visible code for screen readers (so the visible
 * label is part of the accessible name). The choice is kept in memory only
 * (nothing is stored).
 */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('layout.language')}
      className="flex shrink-0 rounded-full border border-line-strong bg-paper p-0.5"
    >
      {LANGUAGES.map((language) => {
        const active = language.code === lang
        return (
          <button
            key={language.code}
            type="button"
            lang={language.htmlLang}
            aria-pressed={active}
            title={language.name}
            onClick={() => setLang(language.code)}
            className={cn(
              'h-8 min-w-8 rounded-full px-2 text-xs font-semibold tracking-wide transition-colors',
              active ? 'bg-navy text-white' : 'text-muted hover:text-ink',
            )}
          >
            {language.code.toUpperCase()}
            <span className="sr-only"> {language.name}</span>
          </button>
        )
      })}
    </div>
  )
}
