import { useId, type ReactNode } from 'react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useI18n } from '@/i18n'
import { usePageMeta } from '@/utils/usePageMeta'

function Block({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className="mt-12 scroll-mt-24">
      <h2 id={headingId} className="font-display text-2xl font-medium text-ink sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PrivacyPage() {
  const { t, list, rich } = useI18n()
  usePageMeta(t('privacy.metaTitle'), t('privacy.metaDescription'))

  const tags = { b: (children: ReactNode) => <strong className="text-ink">{children}</strong> }

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t('privacy.heading.eyebrow')}
        title={t('privacy.heading.title')}
        description={t('privacy.heading.description')}
      />

      <Block title={t('privacy.short.title')}>
        <List items={list('privacy.short.items')} />
      </Block>

      <Block title={t('privacy.photo.title')}>
        <List
          items={[
            rich('privacy.photo.processing', tags),
            rich('privacy.photo.storage', tags),
            rich('privacy.photo.temporaryFiles', tags),
            rich('privacy.photo.reports', tags),
          ]}
        />
      </Block>

      <Block title={t('privacy.camera.title')}>
        <p>{t('privacy.camera.text')}</p>
      </Block>

      <Block title={t('privacy.network.title')}>
        <List items={list('privacy.network.items')} />
      </Block>

      <Block title={t('privacy.notDo.title')}>
        <List items={list('privacy.notDo.items')} />
      </Block>

      <Block id="terms" title={t('privacy.terms.title')}>
        <List
          items={[
            rich('privacy.terms.purpose', tags),
            rich('privacy.terms.consent', tags),
            rich('privacy.terms.accuracy', tags),
            rich('privacy.terms.responsibility', tags),
          ]}
        />
      </Block>

      <Block title={t('privacy.questions.title')}>
        <p>{t('privacy.questions.text')}</p>
      </Block>
    </div>
  )
}
