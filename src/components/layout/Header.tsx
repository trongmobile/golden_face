import { useEffect, useId, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ScanFace, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { buttonStyles } from '@/components/ui/button-styles'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/analysis', label: 'Analysis', end: false },
  { to: '/about', label: 'About Golden Ratio', end: false },
  { to: '/privacy', label: 'Privacy', end: false },
] as const

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-champagne-100 text-ink' : 'text-muted hover:text-ink',
  )

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="GoldenFace home" className="rounded-lg" onClick={() => setMenuOpen(false)}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Link to="/analysis" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              <ScanFace className="size-4" aria-hidden="true" />
              Analyze a photo
            </Link>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-champagne-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Mobile"
        hidden={!menuOpen}
        className="border-t border-line bg-ivory md:hidden"
      >
        <ul className="container-page flex flex-col gap-1 py-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn('block rounded-xl px-4 py-3 text-base font-medium', isActive ? 'bg-champagne-100 text-ink' : 'text-muted')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
