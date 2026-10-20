import { Link } from 'react-router-dom'
import { buttonStyles } from '@/components/ui/button-styles'
import { usePageMeta } from '@/utils/usePageMeta'

export function NotFoundPage() {
  usePageMeta('Page not found — GoldenFace')
  return (
    <section className="container-page py-24 text-center" aria-labelledby="nf-title">
      <p className="font-display text-7xl text-accent-700" aria-hidden="true">
        404
      </p>
      <h1 id="nf-title" className="mt-4 font-display text-3xl font-medium text-ink">
        This page does not exist
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted">The link may be mistyped or the page may have moved.</p>
      <Link to="/" className={buttonStyles({ className: 'mt-8' })}>
        Back to home
      </Link>
    </section>
  )
}
