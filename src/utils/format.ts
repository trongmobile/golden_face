/** Formats a ratio with a fixed number of decimals, e.g. 1.618. */
export function formatRatio(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

export function formatPercent(value: number, digits = 1): string {
  return Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—'
}

/** 0–1 fraction → "12.3%". */
export function formatShare(fraction: number, digits = 0): string {
  return formatPercent(fraction * 100, digits)
}

export function formatSignedPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(digits))
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}%`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
