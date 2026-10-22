import { Lock } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Link, useI18n } from '@/i18n'

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
              <Link className="text-muted hover:text-ink" to="/blog">
                {t('layout.footer.blog')}
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
        <div className="container-page flex flex-col gap-1 py-5 text-center text-xs text-muted">
          <p suppressHydrationWarning>{t('layout.footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('layout.footer.aiNote')}</p>
        </div>
      </div>
    </footer>
  )
}
