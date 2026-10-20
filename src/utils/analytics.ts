/**
 * Visit counting with GoatCounter (https://www.goatcounter.com).
 *
 * GoatCounter sets no cookies and uses no local storage. GoldenFace only tells it which page was
 * opened — never a photo, landmarks or results. The script is not loaded on localhost or private
 * network addresses, so development, previews and the end-to-end tests make no external requests.
 *
 * Equivalent to:
 *   <script data-goatcounter="https://goldenface.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
 * except that the automatic "count on load" is turned off (`no_onload`) and every route is counted
 * explicitly with `trackPageview`: this is a single-page app, so the script alone would only see
 * the first page a visitor lands on.
 */
const ENDPOINT = 'https://goldenface.goatcounter.com/count'
const SCRIPT_SRC = '//gc.zgo.at/count.js'

interface GoatCounter {
  count?: (vars: { path?: string; title?: string }) => void
  no_onload?: boolean
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

const NON_PUBLIC_HOST =
  /^(localhost|0\.0\.0\.0|127\.[\d.]+|10\.[\d.]+|192\.168\.[\d.]+|172\.(1[6-9]|2\d|3[01])\.[\d.]+|\[?::1\]?)$|\.local$/i

/** True for real domains; false for localhost, loopback, private-network addresses and `.local` names. */
export function isPublicHost(hostname: string): boolean {
  return hostname !== '' && !NON_PUBLIC_HOST.test(hostname)
}

let started = false
let ready = false
let failed = false
const pending: string[] = []

function count(path: string): void {
  window.goatcounter?.count?.({ path })
}

/** Loads the GoatCounter script once. Returns false (and does nothing) when not on a public host. */
export function startAnalytics(hostname: string = window.location.hostname): boolean {
  if (started) return true
  if (!isPublicHost(hostname)) return false
  started = true

  window.goatcounter = { ...window.goatcounter, no_onload: true }
  const script = document.createElement('script')
  script.async = true
  script.dataset.goatcounter = ENDPOINT
  script.src = SCRIPT_SRC
  script.addEventListener('load', () => {
    ready = true
    pending.splice(0).forEach(count)
  })
  // Blocked by an ad blocker or offline: carry on silently and stop queueing.
  script.addEventListener('error', () => {
    failed = true
    pending.length = 0
  })
  document.head.append(script)
  return true
}

/** Counts one page view. Queued until the script has loaded; a no-op when analytics is not running. */
export function trackPageview(path: string): void {
  if (!started || failed) return
  if (ready) count(path)
  else pending.push(path)
}

/** Forgets all state. For tests only. */
export function resetAnalyticsForTests(): void {
  started = false
  ready = false
  failed = false
  pending.length = 0
}
