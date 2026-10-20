import { useEffect, useId, useState } from 'react'
import { Menu, ScanFace, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { buttonStyles } from '@/components/ui/button-styles'
import { Link, NavLink, useI18n, type MsgKey } from '@/i18n'
import { cn } from '@/utils/cn'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV_ITEMS: readonly { to: string; label: MsgKey; end: boolean }[] = [
  { to: '/', label: 'layout.nav.home', end: true },
  { to: '/analysis', label: 'layout.nav.analysis', end: false },
  { to: '/about', label: 'layout.nav.about', end: false },
  { to: '/privacy', label: 'layout.nav.privacy', end: false },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent-100 text-ink' : 'text-muted hover:text-ink',
  )

export function Header() {
  const { t } = useI18n()
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
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-mist/90 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link to="/" aria-label={t('layout.homeLabel')} className="rounded-lg" onClick={() => setMenuOpen(false)}>
          <Logo />
        </Link>

        <nav aria-label={t('layout.navPrimary')} className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden lg:block">
            <Link to="/analysis" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              <ScanFace className="size-4" aria-hidden="true" />
              {t('layout.analyzeCta')}
            </Link>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-accent-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label={t('layout.navMobile')}
        hidden={!menuOpen}
        className="border-t border-line bg-mist md:hidden"
      >
        <ul className="container-page flex flex-col gap-1 py-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn('block rounded-xl px-4 py-3 text-base font-medium', isActive ? 'bg-accent-100 text-ink' : 'text-muted')
                }
              >
                {t(item.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
