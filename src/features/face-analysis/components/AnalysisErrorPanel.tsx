import { Crop, ImagePlus, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useI18n } from '@/i18n'
import { AnalysisError, type AnalysisErrorCode } from '../analyze'
import { QualityPanel } from './QualityPanel'

/** Which actions to offer for each failure; the wording is in `analysisErrors.copy.<code>`. */
const ACTIONS: Record<AnalysisErrorCode, { canEdit?: boolean; canRetry?: boolean }> = {
  'no-face': { canEdit: true },
  'multiple-faces': { canEdit: true },
  'pose-too-large': {},
  'face-too-small': { canEdit: true },
  'face-cut-off': {},
  'poor-lighting': {},
  'invalid-landmarks': { canRetry: true },
  'model-load-failed': { canRetry: true },
  'resource-error': { canRetry: true },
  'detection-failed': { canRetry: true },
  aborted: {},
}

interface AnalysisErrorPanelProps {
  error: AnalysisError
  onEdit: () => void
  onRetry: () => void
  onChoosePhoto: () => void
}

export function AnalysisErrorPanel({ error, onEdit, onRetry, onChoosePhoto }: AnalysisErrorPanelProps) {
  const { t, list } = useI18n()
  const copy = ACTIONS[error.code]
  const advice = list(`analysisErrors.copy.${error.code}.advice`)
  const failedChecks = error.quality?.checks.filter((check) => check.status === 'fail') ?? []

  return (
    <div className="container-page py-10 sm:py-14">
      <Card className="mx-auto max-w-2xl" role="alert">
        <span className="grid size-12 place-items-center rounded-full bg-[#fbf1ee] text-[#9a3f2b]">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-display text-3xl font-medium text-ink">{t(`analysisErrors.copy.${error.code}.title`)}</h2>
        <p className="mt-2 leading-relaxed text-muted">
          {t(error.msg)}
        </p>
        <p className="mt-2 text-sm font-medium text-ink">{t('analysisErrors.panel.noMeasurements')}</p>

        {advice.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {advice.map((tip) => (
              <li key={tip} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-600" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        {error.quality && failedChecks.length > 0 && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-medium text-ink underline decoration-accent-400 decoration-2 underline-offset-4">
              {t('analysisErrors.panel.seeChecks')}
            </summary>
            <div className="mt-3">
              <QualityPanel quality={error.quality} model={{ name: 'MediaPipe Face Landmarker', delegate: t('analysisErrors.panel.onDevice') }} />
            </div>
          </details>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {copy.canRetry && (
            <Button variant="primary" onClick={onRetry} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
              {t('analysisErrors.panel.tryAgain')}
            </Button>
          )}
          {copy.canEdit && (
            <Button variant={copy.canRetry ? 'secondary' : 'primary'} onClick={onEdit} icon={<Crop className="size-4" aria-hidden="true" />}>
              {t('analysisErrors.panel.editCrop')}
            </Button>
          )}
          <Button
            variant={copy.canRetry || copy.canEdit ? 'secondary' : 'primary'}
            onClick={onChoosePhoto}
            icon={<ImagePlus className="size-4" aria-hidden="true" />}
          >
            {t('analysisErrors.panel.chooseAnother')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
