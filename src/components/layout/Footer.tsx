import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-line bg-paper">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            A curiosity about geometry, not a judgement of people. The golden ratio is a reference point for
            exploration — it is not a standard of beauty.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink">
            <Lock className="size-4 text-champagne-700" aria-hidden="true" />
            Photos are processed on your device and never uploaded.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-champagne-700 uppercase">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="text-muted hover:text-ink" to="/analysis">
                Analyze a photo
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/about">
                About the golden ratio
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/privacy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className="text-muted hover:text-ink" to="/privacy#terms">
                Terms of use
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-champagne-700 uppercase">Good to know</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Results come from a single 2D photo and are affected by angle, lens, lighting and expression. Only analyze
            photos of yourself or of people who have agreed to it.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-muted">
          © {new Date().getFullYear()} GoldenFace. Facial landmarks by Google MediaPipe. Provided “as is”, without
          warranty.
        </p>
      </div>
    </footer>
  )
}
