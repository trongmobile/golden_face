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
import { usePageMeta } from '@/utils/usePageMeta'

const STEPS = [
  {
    icon: Upload,
    title: 'Add a photo',
    text: 'Upload a front-facing portrait or take one with your camera. You can rotate and crop it before analysis.',
  },
  {
    icon: ScanFace,
    title: 'Landmarks are detected on your device',
    text: 'A face-landmark model runs inside your browser and locates 478 points on the face. Nothing is sent to a server.',
  },
  {
    icon: Ruler,
    title: 'Explore the geometry',
    text: 'See proportions, vertical thirds and left–right symmetry drawn on your photo, with the formula behind every number.',
  },
] as const

const LIMITS = [
  'It is one 2D photo. Camera distance, lens, angle, lighting and expression all change the numbers.',
  'Only a few ratios have a recognised golden-ratio claim. The rest are shown as plain proportions.',
  'Studies of perceived attractiveness do not show that closer-to-φ faces are judged more attractive.',
  'The hairline cannot be found reliably, so it is never guessed — you can mark it yourself.',
] as const

export function HomePage() {
  usePageMeta(
    'GoldenFace — Facial Proportion Analyzer',
    'Explore facial proportions through the mathematics of the golden ratio. Private, in-browser landmark analysis — a geometric curiosity, not a measure of beauty.',
  )

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full bg-champagne-100/70 blur-3xl"
        />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div className="animate-fade-up">
            <Badge>
              <Sparkles className="size-3.5" aria-hidden="true" />
              Facial proportion analyzer
            </Badge>
            <h1
              id="hero-title"
              className="mt-6 font-display text-5xl leading-[1.05] font-medium tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
            >
              Discover the Geometry of Your Face
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Explore facial proportions through the mathematics of the golden ratio.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/analysis?source=upload" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
                <Upload className="size-5" aria-hidden="true" />
                Upload Photo
              </Link>
              <Link to="/analysis?source=camera" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
                <Camera className="size-5" aria-hidden="true" />
                Take a Photo
              </Link>
            </div>

            <p className="mt-6 flex items-start gap-2 text-sm text-muted">
              <Lock className="mt-0.5 size-4 shrink-0 text-champagne-700" aria-hidden="true" />
              Your photo is analyzed in your browser and is never uploaded or stored.
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
          eyebrow="How it works"
          id="how-title"
          title="From photo to proportions in three steps"
          description="Every step happens on your device, and every number can be traced back to the landmarks that produced it."
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-champagne-100 text-champagne-700">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl text-champagne-300" aria-hidden="true">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
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
              eyebrow="The golden ratio"
              id="phi-title"
              title={
                <>
                  A number worth knowing: <span className="text-champagne-700">φ ≈ 1.618</span>
                </>
              }
            />
            <p className="mt-5 leading-relaxed text-muted">
              Two quantities are in the golden ratio when the larger divided by the smaller equals the sum of both
              divided by the larger. It appears in geometry, in the Fibonacci sequence and, in popular accounts, in
              art and design.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              GoldenFace measures a handful of facial ratios and shows how far each one lies from φ. The comparison
              is a geometric exercise — nothing more.
            </p>
            <Link
              to="/about"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-champagne-400 decoration-2 underline-offset-4 hover:decoration-champagne-700"
            >
              How the numbers are calculated
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-panel border border-champagne-200 bg-champagne-50 p-6 sm:p-8">
            <h3 className="flex items-center gap-2 font-display text-2xl font-medium text-ink">
              <ShieldCheck className="size-6 text-champagne-700" aria-hidden="true" />
              What this tool cannot tell you
            </h3>
            <ul className="mt-5 space-y-3.5">
              {LIMITS.map((limit) => (
                <li key={limit} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-champagne-600" />
                  {limit}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-champagne-200 pt-5 text-sm font-medium text-ink">
              The golden ratio is one geometric reference, not a standard of beauty. Results never rank or rate a face.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy band */}
      <section aria-labelledby="privacy-title" className="container-page py-16 sm:py-20">
        <div className="overflow-hidden rounded-panel bg-navy px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-champagne-300 uppercase">Privacy by design</p>
              <h2
                id="privacy-title"
                className="mt-3 font-display text-3xl leading-tight font-medium tracking-tight sm:text-4xl"
              >
                Your photo stays yours.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/75">
                GoldenFace has no server for photos: there is nowhere for your picture to be uploaded to.
              </p>
              <Link to="/privacy" className={buttonStyles({ variant: 'onDark', className: 'mt-7' })}>
                Read the privacy policy
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Lock, title: 'On-device analysis', text: 'The model and your photo meet inside your browser.' },
                { icon: EyeOff, title: 'Nothing is stored', text: 'No accounts, cookies, local storage or analytics.' },
                { icon: Camera, title: 'Camera on request', text: 'The camera only runs while you are taking the photo.' },
                { icon: ShieldCheck, title: 'No identification', text: 'No face recognition and no guesses about who you are.' },
              ].map((item) => (
                <li key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <item.icon className="size-5 text-champagne-300" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="container-page pb-4 text-center">
        <h2 id="cta-title" className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Ready to explore?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">
          Use a front-facing photo with even lighting and a relaxed expression for the steadiest measurements.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/analysis?source=upload" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            <Upload className="size-5" aria-hidden="true" />
            Upload Photo
          </Link>
          <Link to="/analysis?source=camera" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            <Camera className="size-5" aria-hidden="true" />
            Take a Photo
          </Link>
        </div>
      </section>
    </>
  )
}
