import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CanvasPreview } from '@/components/ui/CanvasPreview'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBytes } from '@/utils/format'
import type { AnalysisStage } from '../analyze'
import type { ModelLoadProgress } from '../landmarker'

interface AnalyzingPanelProps {
  image: HTMLCanvasElement
  stage: AnalysisStage
  modelProgress: ModelLoadProgress | null
  onCancel: () => void
}

const STAGE_TEXT: Record<AnalysisStage, { title: string; detail: string }> = {
  'loading-model': {
    title: 'Preparing the face model',
    detail: 'The model is downloaded once (about 4 MB) and then runs entirely on your device.',
  },
  detecting: { title: 'Finding your face', detail: 'Locating the face and its 478 landmarks.' },
  'checking-faces': { title: 'Checking the photo', detail: 'Making sure exactly one face is clearly visible.' },
  measuring: { title: 'Measuring proportions', detail: 'Computing ratios, thirds and symmetry.' },
}

export function AnalyzingPanel({ image, stage, modelProgress, onCancel }: AnalyzingPanelProps) {
  const text = STAGE_TEXT[stage]
  let progress: number | null = null
  let progressNote = ''
  if (stage === 'loading-model' && modelProgress) {
    if (modelProgress.stage === 'downloading' && modelProgress.total) {
      progress = (modelProgress.loaded / modelProgress.total) * 100
      progressNote = `${formatBytes(modelProgress.loaded)} of ${formatBytes(modelProgress.total)}`
    } else if (modelProgress.stage === 'initializing') {
      progressNote = 'Starting the engine…'
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-card border border-line bg-ink/5">
          <CanvasPreview source={image} maxSide={600} label="The photo being analyzed" className="block h-auto w-full" />
          <div className="absolute inset-0 animate-pulse bg-champagne-100/20" aria-hidden="true" />
        </div>

        <Card>
          <div role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-champagne-700 uppercase">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Analyzing on your device
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium text-ink">{text.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text.detail}</p>
          </div>

          <div className="mt-6">
            <ProgressBar label="Analysis progress" value={progress} />
            {progressNote && <p className="mt-2 text-xs text-muted tabular-nums">{progressNote}</p>}
          </div>

          <div className="mt-8 space-y-3" aria-hidden="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <Button variant="ghost" className="mt-8" onClick={onCancel}>
            Cancel
          </Button>
        </Card>
      </div>
    </div>
  )
}
