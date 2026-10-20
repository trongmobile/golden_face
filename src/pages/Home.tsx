import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  EyeOff,
  Lock,
  Ruler,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { FaceGeometry } from '@/components/illustrations/FaceGeometry'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { buttonStyles } from '@/components/ui/button-styles'
import { useI18n } from '@/i18n'
import { usePageMeta } from '@/utils/usePageMeta'

const STEPS = [
  { icon: Upload, key: 'add' },
  { icon: ScanFace, key: 'detect' },
  { icon: Ruler, key: 'explore' },
] as const

const PRIVACY_ITEMS = [
  { icon: Lock, key: 'onDevice' },
  { icon: EyeOff, key: 'nothingStored' },
  { icon: Camera, key: 'cameraOnRequest' },
  { icon: ShieldCheck, key: 'noIdentification' },
] as const

export function HomePage() {
  const { t, list, rich } = useI18n()
  usePageMeta(t('home.metaTitle'), t('home.metaDescription'))

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full bg-accent-100/70 blur-3xl"
        />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div className="animate-fade-up">
            <Badge>
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t('home.hero.badge')}
            </Badge>
            <h1
              id="hero-title"
              className="mt-6 font-display text-5xl leading-[1.05] font-medium tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
            >
              {t('home.hero.title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/analysis?source=upload" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
                <Upload className="size-5" aria-hidden="true" />
                {t('home.hero.upload')}
              </Link>
              <Link to="/analysis?source=camera" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
                <Camera className="size-5" aria-hidden="true" />
                {t('home.hero.camera')}
              </Link>
            </div>

            <p className="mt-6 flex items-start gap-2 text-sm text-muted">
              <Lock className="mt-0.5 size-4 shrink-0 text-accent-700" aria-hidden="true" />
              {t('home.hero.privacyNote')}
            </p>
          </div>

          <div className="animate-fade-in mx-auto w-full max-w-md [animation-delay:150ms] lg:max-w-none">
            <FaceGeometry />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow={t('home.how.eyebrow')}
          id="how-title"
          title={t('home.how.title')}
          description={t('home.how.description')}
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.key}>
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-accent-100 text-accent-700">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl text-accent-300" aria-hidden="true">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-ink">{t(`home.steps.${step.key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`home.steps.${step.key}.text`)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* The golden ratio and its limits */}
      <section aria-labelledby="phi-title" className="border-y border-line bg-paper">
        <div className="container-page grid gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={t('home.phi.eyebrow')}
              id="phi-title"
              title={rich('home.phi.title', { accent: (children) => <span className="text-accent-700">{children}</span> })}
            />
            <p className="mt-5 leading-relaxed text-muted">{t('home.phi.paragraph1')}</p>
            <p className="mt-4 leading-relaxed text-muted">{t('home.phi.paragraph2')}</p>
            <Link
              to="/about"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-accent-400 decoration-2 underline-offset-4 hover:decoration-accent-700"
            >
              {t('home.phi.link')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-panel border border-accent-200 bg-accent-50 p-6 sm:p-8">
            <h3 className="flex items-center gap-2 font-display text-2xl font-medium text-ink">
              <ShieldCheck className="size-6 text-accent-700" aria-hidden="true" />
              {t('home.limits.title')}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {list('home.limits.items').map((limit) => (
                <li key={limit} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-600" />
                  {limit}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-accent-200 pt-5 text-sm font-medium text-ink">
              {t('home.limits.note')}
            </p>
          </div>
        </div>
      </section>

      {/* Privacy band */}
      <section aria-labelledby="privacy-title" className="container-page py-16 sm:py-20">
        <div className="overflow-hidden rounded-panel bg-navy px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-accent-300 uppercase">
                {t('home.privacy.eyebrow')}
              </p>
              <h2
                id="privacy-title"
                className="mt-3 font-display text-3xl leading-tight font-medium tracking-tight sm:text-4xl"
              >
                {t('home.privacy.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/75">{t('home.privacy.text')}</p>
              <Link to="/privacy" className={buttonStyles({ variant: 'onDark', className: 'mt-7' })}>
                {t('home.privacy.cta')}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PRIVACY_ITEMS.map((item) => (
                <li key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <item.icon className="size-5 text-accent-300" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{t(`home.privacy.${item.key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{t(`home.privacy.${item.key}.text`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="container-page pb-4 text-center">
        <h2 id="cta-title" className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {t('home.cta.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">{t('home.cta.text')}</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/analysis?source=upload" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            <Upload className="size-5" aria-hidden="true" />
            {t('home.hero.upload')}
          </Link>
          <Link to="/analysis?source=camera" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            <Camera className="size-5" aria-hidden="true" />
            {t('home.hero.camera')}
          </Link>
        </div>
      </section>
    </>
  )
}
