import { cn } from '@/utils/cn'

/**
 * Decorative illustration for the hero: a stylised face inside a golden rectangle
 * (height : width = φ), with the golden spiral and landmark guide lines.
 * Purely illustrative — it is not generated from any photo.
 */
export function FaceGeometry({ className }: { className?: string }) {
  const gold = 'var(--color-champagne-500)'
  const goldDeep = 'var(--color-champagne-700)'
  const ink = 'var(--color-navy)'

  return (
    <svg
      viewBox="0 0 420 520"
      role="img"
      aria-label="Illustration of a face outline inside a golden rectangle, with the golden spiral and measurement lines"
      className={cn('h-auto w-full', className)}
    >
      {/* soft backdrop */}
      <ellipse cx="210" cy="262" rx="196" ry="244" fill="var(--color-champagne-50)" />

      {/* golden rectangle and its square subdivisions */}
      <g fill="none" stroke={gold} strokeWidth="1" opacity="0.7">
        <rect x="110" y="100" width="200" height="324" />
        <path d="M110 224 H310 M234 100 V224 M234 176 H310 M262 176 V224 M234 196 H262 M234 176 V196" opacity="0.65" />
      </g>

      {/* golden spiral */}
      <path
        d="M310 424 A200 200 0 0 1 110 224 A124 124 0 0 1 234 100 A76 76 0 0 1 310 176 A48 48 0 0 1 262 224 A28 28 0 0 1 234 196 A20 20 0 0 1 254 176"
        fill="none"
        stroke={goldDeep}
        strokeWidth="1.6"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
        className="animate-draw"
      />

      {/* face oval: width 200, height 324 → 1 : 1.618 */}
      <ellipse cx="210" cy="262" rx="100" ry="162" fill="none" stroke={ink} strokeWidth="1.6" />

      {/* features */}
      <g fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M148 206 q22 -14 44 -2 M228 204 q22 -12 44 2" />
        <ellipse cx="170" cy="232" rx="19" ry="7.5" />
        <ellipse cx="250" cy="232" rx="19" ry="7.5" />
        <path d="M210 236 v54 M194 300 q16 12 32 0" />
        <path d="M180 346 q30 16 60 0 M184 346 q26 -9 52 0" />
      </g>
      <circle cx="170" cy="232" r="2.6" fill={ink} />
      <circle cx="250" cy="232" r="2.6" fill={ink} />

      {/* measurement guides */}
      <g stroke={goldDeep} strokeWidth="1" strokeDasharray="3 4" opacity="0.85">
        <path d="M210 88 V436" />
        <path d="M28 232 H336" />
        <path d="M28 300 H336" />
        <path d="M28 346 H336" />
      </g>

      {/* landmark dots */}
      <g fill={goldDeep}>
        {[
          [210, 100],
          [210, 424],
          [110, 262],
          [310, 262],
          [190, 300],
          [230, 300],
          [180, 346],
          [240, 346],
          [150, 232],
          [190, 232],
          [230, 232],
          [270, 232],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
        ))}
      </g>

      {/* labels */}
      <g fontFamily="var(--font-sans)" fontSize="11" fontWeight="600" letterSpacing="0.08em" fill={goldDeep}>
        <text x="318" y="106">φ 1.618</text>
        <text x="318" y="428">L : W</text>
        <text x="30" y="226">eyes</text>
        <text x="30" y="294">nose</text>
        <text x="30" y="340">mouth</text>
      </g>
      <g stroke={goldDeep} strokeWidth="1" opacity="0.8">
        <path d="M330 120 V412" />
        <path d="M325 120 H335 M325 412 H335" />
        <path d="M110 446 H310" />
        <path d="M110 441 V451 M310 441 V451" />
      </g>
      <text x="210" y="466" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11" fontWeight="600" letterSpacing="0.08em" fill={goldDeep}>
        1
      </text>
    </svg>
  )
}
