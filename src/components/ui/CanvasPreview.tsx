import { useEffect, useRef } from 'react'
import { fitWithin, type QuarterTurns } from '@/features/image-upload/image-utils'

interface CanvasPreviewProps {
  source: HTMLCanvasElement
  /** Longest side of the drawn preview in pixels (the display size is controlled by CSS). */
  maxSide?: number
  /** Clockwise quarter turns applied while drawing. */
  turns?: QuarterTurns
  className?: string
  label: string
}

/** Draws a (possibly huge) canvas, optionally rotated, into a smaller one so it can be shown cheaply. */
export function CanvasPreview({ source, maxSide = 1000, turns = 0, className, label }: CanvasPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || source.width === 0 || source.height === 0) return
    const swapped = turns % 2 === 1
    const rotatedWidth = swapped ? source.height : source.width
    const rotatedHeight = swapped ? source.width : source.height
    const size = fitWithin(rotatedWidth, rotatedHeight, maxSide)
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return
    const scale = size.width / rotatedWidth
    context.imageSmoothingQuality = 'high'
    context.translate(size.width / 2, size.height / 2)
    context.rotate((turns * Math.PI) / 2)
    context.drawImage(source, (-source.width * scale) / 2, (-source.height * scale) / 2, source.width * scale, source.height * scale)
  }, [source, maxSide, turns])

  return <canvas ref={ref} role="img" aria-label={label} className={className} />
}
