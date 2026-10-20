import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { buttonStyles } from '@/components/ui/button-styles'
import { DEFAULT_SIMILARITY_K, PHI, compareToGolden } from '@/features/face-analysis/golden-ratio'
import { METRIC_CATALOG } from '@/features/face-analysis/metric-catalog'
import { Link, useI18n } from '@/i18n'
import { formatRatio } from '@/utils/format'
import { usePageMeta } from '@/utils/usePageMeta'

const LIMIT_KEYS = ['flatPhoto', 'estimates', 'hairline', 'notARule', 'noRanking'] as const

export function AboutPage() {
  const { t, rich } = useI18n()
  usePageMeta(t('about.metaTitle'), t('about.metaDescription'))

  // Worked example shown on the page, computed with the same module the app uses.
  const example = compareToGolden(1.45, 1)

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t('about.heading.eyebrow')}
        title={t('about.heading.title')}
        description={t('about.heading.description')}
      />

      <section aria-labelledby="what-title" className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 id="what-title" className="font-display text-3xl font-medium text-ink">
            {t('about.what.title')}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            {rich(
              'about.what.paragraph1',
              {
                formula: (children) => <span className="font-medium whitespace-nowrap text-ink">{children}</span>,
                value: (children) => <span className="font-medium text-ink">{children}</span>,
              },
              { phi: PHI },
            )}
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            {rich('about.what.paragraph2', { i: (children) => <em>{children}</em> })}
          </p>
        </div>
        <Card className="self-start bg-accent-50">
          <h3 className="font-display text-xl font-medium text-ink">{t('about.compare.title')}</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            {(['step1', 'step2', 'step3'] as const).map((step) => (
              <li key={step}>
                {rich(
                  `about.compare.${step}`,
                  {
                    b: (children) => <span className="font-semibold text-ink">{children}</span>,
                    sup: (children) => <sup>{children}</sup>,
                  },
                  { k: DEFAULT_SIMILARITY_K },
                )}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {t('about.compare.note', { k: DEFAULT_SIMILARITY_K })}
          </p>
          {example.valid && (
            <p className="mt-4 rounded-xl border border-accent-200 bg-paper p-3.5 text-sm text-muted">
              {rich(
                'about.compare.example',
                { b: (children) => <span className="font-semibold text-ink">{children}</span> },
                {
                  ratio: formatRatio(example.ratio, 2),
                  error: (example.error * 100).toFixed(1),
                  similarity: example.similarity.toFixed(0),
                },
              )}
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="measures-title" className="mt-16">
        <h2 id="measures-title" className="font-display text-3xl font-medium text-ink">
          {t('about.measures.title')}
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t('about.measures.intro')}</p>
        <div
          className="mt-8 overflow-x-auto rounded-card border border-line bg-paper"
          role="region"
          aria-label={t('about.measures.tableLabel')}
          tabIndex={0}
        >
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">{t('about.measures.tableCaption')}</caption>
            <thead className="border-b border-line bg-mist text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t('about.measures.columnMeasurement')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('about.measures.columnFormula')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('about.measures.columnGolden')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {METRIC_CATALOG.map((metric) => (
                <tr key={metric.id}>
                  <th scope="row" className="px-4 py-3.5 font-semibold text-ink">
                    {t(`metrics.items.${metric.id}.label`)}
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {t(`metrics.items.${metric.id}.meaning`)}
                    </span>
                  </th>
                  <td className="px-4 py-3.5 text-muted">{t(`metrics.items.${metric.id}.formula`)}</td>
                  <td className="px-4 py-3.5 text-muted">
                    <span className={metric.goldenEligible ? 'font-semibold text-accent-700' : 'font-semibold text-ink'}>
                      {metric.goldenEligible ? t('about.measures.yes') : t('about.measures.no')}
                    </span>
                    <span className="mt-0.5 block text-xs">{t(`metrics.items.${metric.id}.goldenNote`)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{t('about.measures.note')}</p>
      </section>

      <section aria-labelledby="limits-title" className="mt-16">
        <h2 id="limits-title" className="font-display text-3xl font-medium text-ink">
          {t('about.limits.title')}
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {LIMIT_KEYS.map((key) => (
            <li key={key}>
              <Card className="h-full">
                <h3 className="font-semibold text-ink">{t(`about.limits.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`about.limits.${key}.text`)}</p>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-panel border border-accent-200 bg-accent-50 p-6 sm:p-8">
          <p className="font-display text-2xl font-medium text-ink">{t('about.limits.closing')}</p>
          <Link to="/analysis" className={buttonStyles({ className: 'mt-6' })}>
            {t('about.limits.cta')}
          </Link>
        </div>
      </section>
    </div>
  )
}
