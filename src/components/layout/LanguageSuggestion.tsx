import { useState, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { detectLang, translate, useI18n, withLang } from '@/i18n'

const subscribe = () => () => {}
const browserPrefersVietnamese = () => detectLang('', navigator.languages ?? [navigator.language]) === 'vi'
const neverOnTheServer = () => false

/**
 * A quiet offer, shown on English pages to visitors whose browser prefers Vietnamese. It does not
 * redirect: search engines should see every language at its own address, and a forced redirect
 * would trap anyone who wants the English page. It is drawn only in the browser, after hydration.
 */
export function LanguageSuggestion() {
  const { lang } = useI18n()
  const { pathname, search, hash } = useLocation()
  const [dismissed, setDismissed] = useState(false)
  const prefersVietnamese = useSyncExternalStore(subscribe, browserPrefersVietnamese, neverOnTheServer)

  if (lang !== 'en' || !prefersVietnamese || dismissed) return null

  return (
    <div className="no-print bg-navy text-white" lang="vi">
      <div className="container-page flex items-center justify-between gap-3 py-2 text-sm">
        <p>
          {translate('vi', 'layout.suggestVi.text')}{' '}
          <Link
            to={{ pathname: withLang(pathname, 'vi'), search, hash }}
            hrefLang="vi"
            className="font-semibold underline underline-offset-4"
          >
            {translate('vi', 'layout.suggestVi.cta')}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={translate('vi', 'layout.suggestVi.dismiss')}
          className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
