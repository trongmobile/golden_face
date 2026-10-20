import { Crop, ImagePlus, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AnalysisError, type AnalysisErrorCode } from '../analyze'
import { QualityPanel } from './QualityPanel'

interface ErrorCopy {
  title: string
  advice: string[]
  /** Offer going back to crop/rotate the same photo. */
  canEdit?: boolean
  /** Offer re-running the analysis unchanged (transient failures). */
  canRetry?: boolean
}

const COPY: Record<AnalysisErrorCode, ErrorCopy> = {
  'no-face': {
    title: 'No face found',
    advice: [
      'Use a front-facing photo where your whole face is visible.',
      'Take off sunglasses, masks and anything covering the eyes, nose or mouth, and move hair away from the face.',
      'Make sure the face is lit — not in shadow or silhouette — and not too small in the picture.',
      'If the face is small, use Edit & crop to zoom in on it.',
    ],
    canEdit: true,
  },
  'multiple-faces': {
    title: 'More than one face found',
    advice: [
      'GoldenFace measures one face at a time so it never mixes people up.',
      'Use a photo with a single person, or crop the photo tightly around one face.',
    ],
    canEdit: true,
  },
  'pose-too-large': {
    title: 'The face is turned too far',
    advice: [
      'Look straight into the camera with your chin level.',
      'Turned or tilted heads change widths and make the face look asymmetric, so no numbers are shown.',
    ],
  },
  'face-too-small': {
    title: 'The face is too small',
    advice: [
      'Move closer, or crop the photo around the face (Edit & crop).',
      'Aim for a face at least about 200 px wide.',
    ],
    canEdit: true,
  },
  'face-cut-off': {
    title: 'The face is cut off',
    advice: ['Leave some space around the head so forehead, ears and chin are inside the picture.'],
  },
  'poor-lighting': {
    title: 'The lighting is too poor',
    advice: ['Face a window or lamp so your face is evenly lit, and avoid strong backlight or flash glare.'],
  },
  'invalid-landmarks': {
    title: 'The face could not be measured',
    advice: ['The detected landmarks were incomplete. Try a clearer, front-facing photo.'],
    canRetry: true,
  },
  'model-load-failed': {
    title: 'The face model could not be loaded',
    advice: [
      'The model (about 4 MB) is downloaded the first time you analyze a photo. Check your internet connection and try again.',
    ],
    canRetry: true,
  },
  'resource-error': {
    title: 'This device ran out of resources',
    advice: [
      'Close other tabs or apps and try again.',
      'A smaller photo uses less memory — crop it or choose a lower-resolution copy.',
    ],
    canRetry: true,
  },
  'detection-failed': {
    title: 'Something went wrong while reading the photo',
    advice: ['Please try again, or choose a different photo.'],
    canRetry: true,
  },
  aborted: { title: 'Analysis cancelled', advice: [] },
}

interface AnalysisErrorPanelProps {
  error: AnalysisError
  onEdit: () => void
  onRetry: () => void
  onChoosePhoto: () => void
}

export function AnalysisErrorPanel({ error, onEdit, onRetry, onChoosePhoto }: AnalysisErrorPanelProps) {
  const copy = COPY[error.code]
  const failedChecks = error.quality?.checks.filter((check) => check.status === 'fail') ?? []

  return (
    <div className="container-page py-10 sm:py-14">
      <Card className="mx-auto max-w-2xl" role="alert">
        <span className="grid size-12 place-items-center rounded-full bg-[#fbf1ee] text-[#9a3f2b]">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-display text-3xl font-medium text-ink">{copy.title}</h2>
        <p className="mt-2 leading-relaxed text-muted">
          {error.code === 'multiple-faces' && error.faceCount
            ? `${error.faceCount} faces were found in this photo.`
            : error.message}
        </p>
        <p className="mt-2 text-sm font-medium text-ink">No measurements were made, so there is nothing to score.</p>

        {copy.advice.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {copy.advice.map((tip) => (
              <li key={tip} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-champagne-600" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        {error.quality && failedChecks.length > 0 && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-medium text-ink underline decoration-champagne-400 decoration-2 underline-offset-4">
              See the quality checks
            </summary>
            <div className="mt-3">
              <QualityPanel quality={error.quality} model={{ name: 'MediaPipe Face Landmarker', delegate: 'on-device' }} />
            </div>
          </details>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {copy.canRetry && (
            <Button variant="primary" onClick={onRetry} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
              Try again
            </Button>
          )}
          {copy.canEdit && (
            <Button variant={copy.canRetry ? 'secondary' : 'primary'} onClick={onEdit} icon={<Crop className="size-4" aria-hidden="true" />}>
              Edit &amp; crop this photo
            </Button>
          )}
          <Button
            variant={copy.canRetry || copy.canEdit ? 'secondary' : 'primary'}
            onClick={onChoosePhoto}
            icon={<ImagePlus className="size-4" aria-hidden="true" />}
          >
            Choose another photo
          </Button>
        </div>
      </Card>
    </div>
  )
}
