import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useI18n } from '@/i18n'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="no-print mt-24 border-t border-line bg-paper">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {t('layout.footer.tagline')}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink">
            <Lock className="size-4 text-accent-700" aria-hidden="true" />
            {t('layout.footer.privacyNote')}
          </p>
        </div>

        <nav aria-label={t('layout.footer.nav')}>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase">{t('layout.footer.explore')}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="text-muted hover:text-ink" to="/analysis">
                {t('layout.footer.analyze')}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/about">
                {t('layout.footer.about')}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/privacy">
                {t('layout.footer.privacyPolicy')}
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/privacy#terms">
                {t('layout.footer.terms')}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase">{t('layout.footer.goodToKnow')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {t('layout.footer.goodToKnowText')}
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-muted">
          {t('layout.footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
