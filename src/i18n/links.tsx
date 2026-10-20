import { Link as RouterLink, NavLink as RouterNavLink, type LinkProps, type NavLinkProps } from 'react-router-dom'
import { useI18n } from './context'
import { localizeTo } from './paths'

/** A router `Link` that keeps the visitor in their language: `/about` becomes `/vi/about` on Vietnamese pages. */
export function Link({ to, ...props }: LinkProps) {
  const { lang } = useI18n()
  return <RouterLink to={typeof to === 'string' ? localizeTo(to, lang) : to} {...props} />
}

/** `NavLink` with the same language-aware targets as `Link`. */
export function NavLink({ to, ...props }: NavLinkProps) {
  const { lang } = useI18n()
  return <RouterNavLink to={typeof to === 'string' ? localizeTo(to, lang) : to} {...props} />
}
