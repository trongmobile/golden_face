import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCw, RotateCcw, SwitchCamera } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { CanvasPreview } from '@/components/ui/CanvasPreview'
import { Modal } from '@/components/ui/Modal'
import { releaseCanvas } from '@/features/image-upload/image-utils'
import { cn } from '@/utils/cn'
import { useCamera } from './useCamera'

interface CameraModalProps {
  open: boolean
  onClose: () => void
  /** Receives the captured frame. The receiver owns the canvas from then on. */
  onCapture: (canvas: HTMLCanvasElement) => void
  /** Ask for camera permission immediately (true when the user explicitly chose "Take a photo"). */
  autoStart?: boolean
}

/**
 * Camera capture dialog. The camera session lives inside the modal body, which is
 * unmounted when the dialog closes — that is what guarantees the camera is released.
 */
export function CameraModal({ open, onClose, onCapture, autoStart = true }: CameraModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Take a photo"
      description="Face the camera, keep a relaxed expression and use even lighting."
    >
      <CameraSession autoStart={autoStart} onCapture={onCapture} onClose={onClose} />
    </Modal>
  )
}

function CameraSession({
  autoStart,
  onCapture,
  onClose,
}: {
  autoStart: boolean
  onCapture: (canvas: HTMLCanvasElement) => void
  onClose: () => void
}) {
  const camera = useCamera()
  const { start, stop, capture, status, error, facingMode, canSwitch, videoRef, switchCamera } = camera
  const [captured, setCaptured] = useState<HTMLCanvasElement | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const handedOff = useRef(false)
  const capturedRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    capturedRef.current = captured
  }, [captured])

  useEffect(() => {
    if (autoStart) void start('user')
  }, [autoStart, start])

  // Free the still image if the dialog closes without using it.
  useEffect(
    () => () => {
      if (!handedOff.current) releaseCanvas(capturedRef.current)
    },
    [],
  )

  const takePhoto = () => {
    const frame = capture()
    if (!frame) {
      setCaptureError('The camera is not ready yet. Wait for the preview to appear, then try again.')
      return
    }
    setCaptureError(null)
    // The camera is switched off as soon as the picture is taken.
    stop()
    setCaptured(frame)
  }

  const retake = () => {
    releaseCanvas(captured)
    setCaptured(null)
    void start(facingMode)
  }

  const usePhoto = () => {
    if (!captured) return
    handedOff.current = true
    onCapture(captured)
  }

  const showIntro = !autoStart && status === 'idle' && !captured && !error
  const mirrored = facingMode === 'user'

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      {showIntro && (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-100 text-accent-700">
            <Camera className="size-6" aria-hidden="true" />
          </span>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            GoldenFace needs permission to use your camera. The picture stays on this device and the camera switches
            off as soon as you take it.
          </p>
          <Button className="mt-5" onClick={() => void start('user')} icon={<Camera className="size-4" aria-hidden="true" />}>
            Start camera
          </Button>
        </div>
      )}

      {status === 'starting' && (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-accent-50 p-4 text-sm text-ink">
          <Loader2 className="size-5 shrink-0 animate-spin text-accent-700" aria-hidden="true" />
          Waiting for camera access — choose “Allow” when your browser asks.
        </div>
      )}

      {status === 'error' && error && (
        <Alert
          tone="error"
          title={error.title}
          actions={
            <>
              {error.kind !== 'unsupported' && error.kind !== 'insecure' && (
                <Button size="sm" variant="secondary" onClick={() => void start(facingMode)} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
                  Try again
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={onClose} icon={<ImagePlus className="size-4" aria-hidden="true" />}>
                Upload a photo instead
              </Button>
            </>
          }
        >
          {error.message}
        </Alert>
      )}

      {/* The video element stays mounted so the stream can attach to it. */}
      <div className={cn('relative overflow-hidden rounded-card bg-ink', (captured || status === 'idle' || status === 'error') && 'hidden')}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
          className={cn('mx-auto block max-h-[62dvh] w-full object-contain', mirrored && '-scale-x-100')}
        />
        {status === 'active' && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
          >
            <ellipse cx="50" cy="48" rx="21" ry="29" fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="0.5" strokeDasharray="2 1.6" />
          </svg>
        )}
      </div>

      {captured && (
        <div className="overflow-hidden rounded-card bg-ink">
          <CanvasPreview source={captured} label="The photo you just took" maxSide={1000} className="mx-auto block max-h-[62dvh] w-auto max-w-full" />
        </div>
      )}

      {captureError && <Alert tone="warning">{captureError}</Alert>}

      {status === 'active' && !captured && (
        <>
          <p className="text-center text-sm text-muted">Center your face in the oval and look straight at the lens.</p>
          <div className="flex items-center justify-between gap-3">
            <div className="w-28">
              {canSwitch && (
                <Button size="sm" variant="secondary" onClick={() => void switchCamera()} icon={<SwitchCamera className="size-4" aria-hidden="true" />}>
                  Switch camera
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={takePhoto}
              aria-label="Take photo"
              className="grid size-[4.5rem] place-items-center rounded-full border-4 border-accent-500 bg-paper shadow-soft transition-transform active:scale-95"
            >
              <span className="size-12 rounded-full bg-navy" />
            </button>
            <div className="flex w-28 justify-end">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}

      {captured && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={retake} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
            Retake
          </Button>
          <Button variant="primary" onClick={usePhoto} icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
            Use this photo
          </Button>
        </div>
      )}
    </div>
  )
}
