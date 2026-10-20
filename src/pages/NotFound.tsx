import { Link } from 'react-router-dom'
import { buttonStyles } from '@/components/ui/button-styles'
import { useI18n } from '@/i18n'
import { usePageMeta } from '@/utils/usePageMeta'

export function NotFoundPage() {
  const { t } = useI18n()
  usePageMeta(t('notFound.metaTitle'))
  return (
    <section className="container-page py-24 text-center" aria-labelledby="nf-title">
      <p className="font-display text-7xl text-accent-700" aria-hidden="true">
        404
      </p>
      <h1 id="nf-title" className="mt-4 font-display text-3xl font-medium text-ink">
        {t('notFound.title')}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t('notFound.text')}</p>
      <Link to="/" className={buttonStyles({ className: 'mt-8' })}>
        {t('notFound.home')}
      </Link>
    </section>
  )
}
