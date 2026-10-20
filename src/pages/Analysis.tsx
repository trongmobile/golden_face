import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle2, Lock, ScanFace, Sun, UserRound } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CameraModal } from '@/features/camera/CameraModal'
import { checkCameraSupport } from '@/features/camera/camera-errors'
import { AnalysisError, analyzeFace, type AnalysisStage } from '@/features/face-analysis/analyze'
import { AnalysisErrorPanel } from '@/features/face-analysis/components/AnalysisErrorPanel'
import { AnalyzingPanel } from '@/features/face-analysis/components/AnalyzingPanel'
import { releaseFaceLandmarker, type ModelLoadProgress } from '@/features/face-analysis/landmarker'
import { ImageFileError, validateImageFile } from '@/features/image-upload/file-validation'
import { applyEdits, decodeImageFile, releaseCanvas, type Photo } from '@/features/image-upload/image-utils'
import { NO_EDITS, type PhotoEdits } from '@/features/image-upload/crop-utils'
import { PhotoEditor } from '@/features/image-upload/PhotoEditor'
import { UploadDropzone } from '@/features/image-upload/UploadDropzone'
import type { AnalysisResult } from '@/types'
import { usePageMeta } from '@/utils/usePageMeta'

// The results screen (with the chart library) is only needed once there is something to show.
const ResultsView = lazy(() =>
  import('@/features/face-analysis/components/ResultsView').then((m) => ({ default: m.ResultsView })),
)

type Phase = 'select' | 'edit' | 'analyzing' | 'results' | 'error'

interface State {
  phase: Phase
  photo: Photo | null
  edits: PhotoEdits
  /** The edited photo that was actually analysed. */
  analysisImage: HTMLCanvasElement | null
  result: AnalysisResult | null
  error: AnalysisError | null
  stage: AnalysisStage
  modelProgress: ModelLoadProgress | null
  fileError: string | null
  decoding: boolean
  notice: string | null
}

type Action =
  | { type: 'decode-start' }
  | { type: 'decode-fail'; message: string }
  | { type: 'photo-loaded'; photo: Photo }
  | { type: 'set-edits'; edits: PhotoEdits }
  | { type: 'analyze-start'; image: HTMLCanvasElement }
  | { type: 'stage'; stage: AnalysisStage }
  | { type: 'model-progress'; progress: ModelLoadProgress }
  | { type: 'success'; result: AnalysisResult }
  | { type: 'failure'; error: AnalysisError }
  | { type: 'back-to-edit' }
  | { type: 'reset'; notice?: string }

const initialState: State = {
  phase: 'select',
  photo: null,
  edits: NO_EDITS,
  analysisImage: null,
  result: null,
  error: null,
  stage: 'loading-model',
  modelProgress: null,
  fileError: null,
  decoding: false,
  notice: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'decode-start':
      return { ...state, decoding: true, fileError: null, notice: null }
    case 'decode-fail':
      return { ...state, decoding: false, fileError: action.message }
    case 'photo-loaded':
      return { ...initialState, phase: 'edit', photo: action.photo }
    case 'set-edits':
      return { ...state, edits: action.edits }
    case 'analyze-start':
      return {
        ...state,
        phase: 'analyzing',
        analysisImage: action.image,
        result: null,
        error: null,
        stage: 'loading-model',
        modelProgress: null,
      }
    case 'stage':
      return { ...state, stage: action.stage }
    case 'model-progress':
      return { ...state, modelProgress: action.progress }
    case 'success':
      return { ...state, phase: 'results', result: action.result }
    case 'failure':
      return { ...state, phase: 'error', error: action.error }
    case 'back-to-edit':
      return { ...state, phase: 'edit', analysisImage: null, result: null, error: null }
    case 'reset':
      return { ...initialState, notice: action.notice ?? null }
  }
}

const TIPS = [
  { icon: UserRound, text: 'Face the camera straight on, chin level, with your whole face in view.' },
  { icon: Sun, text: 'Use soft, even light — a window works well. Avoid strong shadows, flash and backlight.' },
  { icon: ScanFace, text: 'Keep a relaxed, neutral expression with your mouth closed.' },
  { icon: CheckCircle2, text: 'Move hair off the forehead and face, and remove glasses, masks and hats if you can.' },
] as const

export function AnalysisPage() {
  usePageMeta(
    'Analyze a Photo — GoldenFace',
    'Upload or capture a front-facing photo and measure facial proportions entirely on your device. Nothing is uploaded.',
  )

  const [state, dispatch] = useReducer(reducer, initialState)
  const [searchParams] = useSearchParams()
  // "Take a Photo" from the home page opens the camera dialog right away, but waits for an
  // explicit click on "Start camera" before asking the browser for permission.
  const [cameraOpen, setCameraOpen] = useState(() => searchParams.get('source') === 'camera')
  const [cameraAutoStart, setCameraAutoStart] = useState(() => searchParams.get('source') !== 'camera')
  const uploadButtonRef = useRef<HTMLButtonElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ?source=upload (from the home page) puts focus on the photo chooser.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('source') === 'upload') {
      uploadButtonRef.current?.focus({ preventScroll: true })
    }
  }, [])

  // Release every canvas, abort work in flight and free the model when leaving the page.
  useEffect(
    () => () => {
      controllerRef.current?.abort()
      const current = stateRef.current
      releaseCanvas(current.photo?.canvas)
      releaseCanvas(current.analysisImage)
      void releaseFaceLandmarker()
    },
    [],
  )

  // Move focus to the new heading when the step changes, so screen-reader users notice it.
  useEffect(() => {
    if (state.phase === 'select') return
    const heading = document.querySelector<HTMLElement>('main h1, main h2')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0 })
  }, [state.phase])

  const discardAll = useCallback((notice?: string) => {
    controllerRef.current?.abort()
    const current = stateRef.current
    releaseCanvas(current.photo?.canvas)
    releaseCanvas(current.analysisImage)
    dispatch({ type: 'reset', notice })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    dispatch({ type: 'decode-start' })
    try {
      await validateImageFile(file)
      const canvas = await decodeImageFile(file)
      releaseCanvas(stateRef.current.photo?.canvas)
      dispatch({ type: 'photo-loaded', photo: { canvas, origin: 'upload', name: file.name } })
    } catch (error) {
      dispatch({
        type: 'decode-fail',
        message: error instanceof ImageFileError ? error.message : 'This photo could not be opened. Please try another one.',
      })
    }
  }, [])

  const handleCameraCapture = useCallback((canvas: HTMLCanvasElement) => {
    releaseCanvas(stateRef.current.photo?.canvas)
    dispatch({ type: 'photo-loaded', photo: { canvas, origin: 'camera' } })
    setCameraOpen(false)
  }, [])

  const openCamera = useCallback(() => {
    setCameraAutoStart(true)
    setCameraOpen(true)
  }, [])

  const analyze = useCallback(async () => {
    const { photo, edits, analysisImage: previous } = stateRef.current
    if (!photo) return
    releaseCanvas(previous)
    let image: HTMLCanvasElement
    try {
      image = applyEdits(photo.canvas, edits.turns, edits.crop)
    } catch {
      dispatch({
        type: 'failure',
        error: new AnalysisError('resource-error', 'The photo could not be prepared on this device.'),
      })
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    dispatch({ type: 'analyze-start', image })

    try {
      const result = await analyzeFace(image, {
        signal: controller.signal,
        onStage: (stage) => dispatch({ type: 'stage', stage }),
        onModelProgress: (progress) => dispatch({ type: 'model-progress', progress }),
      })
      if (controller.signal.aborted) return
      dispatch({ type: 'success', result })
    } catch (error) {
      if (controller.signal.aborted) return
      const failure =
        error instanceof AnalysisError
          ? error
          : new AnalysisError('detection-failed', 'The photo could not be analyzed. Please try again.', { cause: error })
      if (failure.code === 'aborted') return
      dispatch({ type: 'failure', error: failure })
    }
  }, [])

  const cancelAnalysis = useCallback(() => {
    controllerRef.current?.abort()
    releaseCanvas(stateRef.current.analysisImage)
    dispatch({ type: 'back-to-edit' })
  }, [])

  const backToEdit = useCallback(() => {
    releaseCanvas(stateRef.current.analysisImage)
    dispatch({ type: 'back-to-edit' })
  }, [])

  const cameraModal = (
    <CameraModal
      open={cameraOpen}
      autoStart={cameraAutoStart}
      onClose={() => setCameraOpen(false)}
      onCapture={handleCameraCapture}
    />
  )

  const liveMessage =
    state.phase === 'analyzing'
      ? 'Analyzing your photo on this device.'
      : state.phase === 'results'
        ? 'Analysis complete. Your results are ready.'
        : state.phase === 'error'
          ? (state.error?.message ?? 'The analysis could not be completed.')
          : state.phase === 'edit'
            ? 'Photo loaded. Check it, then choose Analyze this photo.'
            : (state.notice ?? '')

  let content: React.ReactNode

  if (state.phase === 'analyzing' && state.analysisImage) {
    content = (
      <AnalyzingPanel
        image={state.analysisImage}
        stage={state.stage}
        modelProgress={state.modelProgress}
        onCancel={cancelAnalysis}
      />
    )
  } else if (state.phase === 'results' && state.result && state.analysisImage) {
    content = (
      <Suspense
        fallback={
          <div className="container-page py-12" role="status" aria-label="Preparing your results">
            <Skeleton className="h-12 w-2/3 max-w-lg" />
            <Skeleton className="mt-8 h-96 w-full" />
          </div>
        }
      >
        <ResultsView
          image={state.analysisImage}
          result={state.result}
          onAnalyzeAnother={() => discardAll()}
          onClear={() => discardAll('Your photo and analysis were removed from this page.')}
        />
      </Suspense>
    )
  } else if (state.phase === 'error' && state.error) {
    content = (
      <AnalysisErrorPanel
        error={state.error}
        onEdit={backToEdit}
        onRetry={() => void analyze()}
        onChoosePhoto={() => discardAll()}
      />
    )
  } else if (state.phase === 'edit' && state.photo) {
    const { photo } = state
    content = (
      <div className="container-page py-10 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.18em] text-champagne-700 uppercase">Step 2 of 3</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink outline-none sm:text-5xl">
          Check your photo
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Rotate or crop so one face fills a good part of the picture. Nothing leaves your device.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <Card>
            <PhotoEditor photo={photo} edits={state.edits} onChange={(edits) => dispatch({ type: 'set-edits', edits })} />
          </Card>
          <div className="space-y-4">
            <Card>
              <h2 className="font-display text-xl font-medium text-ink">
                {photo.origin === 'camera' ? 'Camera photo' : (photo.name ?? 'Your photo')}
              </h2>
              <p className="mt-1 text-sm text-muted tabular-nums">
                {photo.canvas.width} × {photo.canvas.height} px
              </p>
              <Button size="lg" className="mt-5 w-full" onClick={() => void analyze()} icon={<ScanFace className="size-5" aria-hidden="true" />}>
                Analyze this photo
              </Button>
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => discardAll()}
              >
                Choose a different photo
              </Button>
              <Button variant="ghost" className="mt-1 w-full" onClick={openCamera} icon={<Camera className="size-4" aria-hidden="true" />}>
                Take a new photo
              </Button>
            </Card>
            <Card className="bg-champagne-50">
              <h2 className="text-sm font-semibold text-ink">Quick check</h2>
              <ul className="mt-3 space-y-2.5">
                {TIPS.map((tip) => (
                  <li key={tip.text} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <tip.icon className="mt-0.5 size-4 shrink-0 text-champagne-700" aria-hidden="true" />
                    {tip.text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    )
  } else {
    const cameraProblem = checkCameraSupport()
    content = (
      <div className="container-page py-10 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.18em] text-champagne-700 uppercase">Analysis</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          Analyze a photo
        </h1>
        <p className="mt-3 flex max-w-2xl items-start gap-2 text-muted">
          <Lock className="mt-1 size-4 shrink-0 text-champagne-700" aria-hidden="true" />
          Choose a front-facing portrait. It is analyzed in your browser and never uploaded.
        </p>

        {state.notice && (
          <Alert tone="success" className="mt-6" title="Done">
            {state.notice}
          </Alert>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <UploadDropzone
            onFile={(file) => void handleFile(file)}
            busy={state.decoding}
            error={state.fileError}
            buttonRef={uploadButtonRef}
          />
          <div className="space-y-6">
            <Card>
              <span className="grid size-11 place-items-center rounded-full bg-champagne-100 text-champagne-700">
                <Camera className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-medium text-ink">Take a photo</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Use your front or rear camera. The camera only runs while the dialog is open.
              </p>
              {cameraProblem ? (
                <Alert tone="warning" className="mt-4" title={cameraProblem.title}>
                  {cameraProblem.message}
                </Alert>
              ) : (
                <Button className="mt-5" variant="secondary" onClick={openCamera} icon={<Camera className="size-4" aria-hidden="true" />}>
                  Open camera
                </Button>
              )}
            </Card>

            <Card className="bg-champagne-50">
              <h2 className="text-sm font-semibold text-ink">For the steadiest measurements</h2>
              <ul className="mt-3 space-y-2.5">
                {TIPS.map((tip) => (
                  <li key={tip.text} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <tip.icon className="mt-0.5 size-4 shrink-0 text-champagne-700" aria-hidden="true" />
                    {tip.text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div aria-live="polite" className="sr-only" role="status">
        {liveMessage}
      </div>
      {content}
      {cameraModal}
    </>
  )
}
