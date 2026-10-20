import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { buttonStyles } from '@/components/ui/button-styles'
import { DEFAULT_SIMILARITY_K, PHI, compareToGolden } from '@/features/face-analysis/golden-ratio'
import { METRIC_CATALOG } from '@/features/face-analysis/metric-catalog'
import { formatRatio } from '@/utils/format'
import { usePageMeta } from '@/utils/usePageMeta'

const LIMITS = [
  {
    title: 'It is one 2D photo',
    text: 'A flat picture cannot capture depth. Camera distance, lens distortion, head angle, expression, lighting and image resolution all change measured widths and heights — a close-up selfie enlarges the nose relative to the ears, for example.',
  },
  {
    title: 'Landmarks are estimates',
    text: 'The model predicts where features are. Hair, glasses, beards, makeup and shadows can shift points by a few pixels, and covered areas are guessed by the model.',
  },
  {
    title: 'The hairline is not detected',
    text: 'Facial-landmark models do not place a reliable hairline. GoldenFace never estimates it: the upper third is skipped unless you mark the hairline yourself.',
  },
  {
    title: 'φ is not a rule for faces',
    text: 'Perception studies (for example Pallett, Link & Lee, 2010) found that preferred facial proportions sit close to population averages rather than at φ. Beauty and attraction depend on far more than geometry.',
  },
  {
    title: 'No ranking, no judgement',
    text: 'GoldenFace never produces a “beauty score”. The only percentage shown is the geometric similarity of one ratio to φ, and it is shown for a few ratios only.',
  },
] as const

export function AboutPage() {
  usePageMeta(
    'About the Golden Ratio — GoldenFace',
    'What the golden ratio (φ ≈ 1.618) is, how GoldenFace compares facial measurements with it, and why it is not a standard of beauty.',
  )

  // Worked example shown on the page, computed with the same module the app uses.
  const example = compareToGolden(1.45, 1)

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow="About the golden ratio"
        title="A famous number, and an honest look at its limits"
        description="What φ is, how GoldenFace uses it, and why a face does not need to match it."
      />

      <section aria-labelledby="what-title" className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 id="what-title" className="font-display text-3xl font-medium text-ink">
            What is the golden ratio?
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Two quantities a and b (a &gt; b) are in the golden ratio when{' '}
            <span className="font-medium whitespace-nowrap text-ink">(a + b) ÷ a = a ÷ b</span>. That ratio is
            φ = (1 + √5) ÷ 2 ≈ <span className="font-medium text-ink">{PHI}</span>.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            It was studied by Euclid as the “extreme and mean ratio”, popularised in the Renaissance by Luca Pacioli’s{' '}
            <em>De Divina Proportione</em>, and is linked to the Fibonacci sequence — the ratio of neighbouring
            Fibonacci numbers approaches φ. In the twentieth century some dentists, surgeons and designers proposed
            φ-based “ideal” face templates. These ideas are popular, but the evidence that φ describes attractive
            faces is weak.
          </p>
        </div>
        <Card className="self-start bg-champagne-50">
          <h3 className="font-display text-xl font-medium text-ink">How GoldenFace compares a ratio with φ</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            <li>
              <span className="font-semibold text-ink">1. Ratio. </span>r = max(A, B) ÷ min(A, B), so r is never below 1.
            </li>
            <li>
              <span className="font-semibold text-ink">2. Deviation. </span>error = |r − φ| ÷ φ.
            </li>
            <li>
              <span className="font-semibold text-ink">3. Similarity. </span>similarity = 100 × e<sup>−k × error</sup>,
              with k = {DEFAULT_SIMILARITY_K}.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            k only controls how fast the percentage falls off: with k = {DEFAULT_SIMILARITY_K}, a 10 % deviation scores
            about 74 and a 23 % deviation about 50. It is a presentation setting — not a medical threshold or a standard
            of beauty.
          </p>
          {example.valid && (
            <p className="mt-4 rounded-xl border border-champagne-200 bg-paper p-3.5 text-sm text-muted">
              <span className="font-semibold text-ink">Example. </span>A = 1.45, B = 1 gives r = {formatRatio(example.ratio, 2)},
              error = {(example.error * 100).toFixed(1)} %, similarity ={' '}
              {example.similarity.toFixed(0)} %. The percentage is called the “geometric similarity to the reference
              golden ratio” — never a beauty score.
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="measures-title" className="mt-16">
        <h2 id="measures-title" className="font-display text-3xl font-medium text-ink">
          What GoldenFace measures
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Distances are computed from the model’s landmarks in a face-aligned coordinate system, so head tilt, image size
          and position do not change them. Only ratios that have a recognised golden-ratio claim are compared with φ —
          the others are shown as plain proportions, because faces are not expected to equal 1.618 everywhere.
        </p>
        <div
          className="mt-8 overflow-x-auto rounded-card border border-line bg-paper"
          role="region"
          aria-label="Measurements table (scrolls sideways on small screens)"
          tabIndex={0}
        >
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Measurements, formulas and whether each is compared with the golden ratio</caption>
            <thead className="border-b border-line bg-ivory text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Measurement</th>
                <th scope="col" className="px-4 py-3 font-medium">Formula and landmarks</th>
                <th scope="col" className="px-4 py-3 font-medium">Compared with φ?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {METRIC_CATALOG.map((metric) => (
                <tr key={metric.id}>
                  <th scope="row" className="px-4 py-3.5 font-semibold text-ink">
                    {metric.label}
                    <span className="mt-0.5 block text-xs font-normal text-muted">{metric.meaning}</span>
                  </th>
                  <td className="px-4 py-3.5 text-muted">{metric.formula}</td>
                  <td className="px-4 py-3.5 text-muted">
                    <span className={metric.goldenEligible ? 'font-semibold text-champagne-700' : 'font-semibold text-ink'}>
                      {metric.goldenEligible ? 'Yes' : 'No'}
                    </span>
                    <span className="mt-0.5 block text-xs">{metric.goldenNote}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          “Cheekbone width ÷ jaw width” and “jaw width ÷ cheekbone width” are reciprocals and carry identical
          information, so only one is shown. Landmark numbers refer to the 478-point MediaPipe face mesh.
          Geometric symmetry compares each left/right landmark pair with the facial midline and never treats perfect
          symmetry as better.
        </p>
      </section>

      <section aria-labelledby="limits-title" className="mt-16">
        <h2 id="limits-title" className="font-display text-3xl font-medium text-ink">
          Limits of the method
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {LIMITS.map((limit) => (
            <li key={limit.title}>
              <Card className="h-full">
                <h3 className="font-semibold text-ink">{limit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{limit.text}</p>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-panel border border-champagne-200 bg-champagne-50 p-6 sm:p-8">
          <p className="font-display text-2xl font-medium text-ink">
            The golden ratio is a way to look at geometry — not a way to measure a person.
          </p>
          <Link to="/analysis" className={buttonStyles({ className: 'mt-6' })}>
            Try an analysis
          </Link>
        </div>
      </section>
    </div>
  )
}
