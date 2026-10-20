import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MetricResult } from '@/types'
import { PHI } from '../golden-ratio'
import type { MetricId } from '../metric-catalog'

const SHORT_LABELS: Partial<Record<MetricId, string>> = {
  'face-length-width': 'Face length ÷ width',
  'mouth-nose': 'Mouth ÷ nose width',
  'lip-ratio': 'Lower ÷ upper lip',
}

// Neutral, non-evaluative colours: navy for the measurement, accent for the reference.
const MEASURED = '#12263a'
const REFERENCE = '#2b8f88'

export function RatioChart({ metrics }: { metrics: MetricResult[] }) {
  const data = metrics.flatMap((metric) =>
    metric.status === 'ok' && metric.golden
      ? [
          {
            name: SHORT_LABELS[metric.id] ?? metric.id,
            measured: Number(metric.golden.ratio.toFixed(3)),
            reference: Number(PHI.toFixed(3)),
          },
        ]
      : [],
  )

  if (data.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line-strong bg-mist p-5 text-sm text-muted">
        None of the ratios that have a golden-ratio comparison could be measured on this photo, so there is
        nothing to chart.
      </p>
    )
  }

  const summary = data.map((row) => `${row.name}: measured ${row.measured}, reference ${row.reference}`).join('; ')

  return (
    <div role="img" aria-label={`Bar chart comparing measured ratios with the golden ratio. ${summary}.`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: -12 }} barGap={6}>
          <CartesianGrid vertical={false} stroke="#dce5e9" />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#c8d5db' }} tick={{ fill: '#55626d', fontSize: 12 }} interval={0} />
          <YAxis
            domain={[0, 2.2]}
            ticks={[0, 0.5, 1, 1.5, 2]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#55626d', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(43,143,136,0.12)' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #dce5e9', fontSize: 13 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          <ReferenceLine y={PHI} stroke="#145a56" strokeDasharray="5 5" />
          <Bar dataKey="measured" name="Measured ratio (larger ÷ smaller)" fill={MEASURED} radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={44} />
          <Bar dataKey="reference" name="Reference φ ≈ 1.618" fill={REFERENCE} radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
