import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { msg, type Msg } from '@/i18n'
import type { FaceConnections } from '@/types'

/**
 * Lazy loader for the MediaPipe Face Landmarker.
 *
 * Nothing here runs until the user starts an analysis: the MediaPipe library
 * itself is pulled in with a dynamic `import()`, so the home page never pays
 * for it. The WASM runtime and the model are self-hosted (copied into /public
 * by `npm run prepare:assets`); the public Google/jsDelivr copies are only a
 * fallback if the self-hosted files cannot be fetched.
 */

const BASE = import.meta.env.BASE_URL

export const MODEL_SOURCES = [
  `${BASE}models/face_landmarker.task`,
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
] as const

export const WASM_SOURCES = [
  `${BASE}mediapipe/wasm`,
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm',
] as const

export type ModelLoadProgress =
  | { stage: 'downloading'; loaded: number; total: number | null }
  | { stage: 'initializing' }

export interface LandmarkerHandle {
  landmarker: FaceLandmarker
  delegate: 'GPU' | 'CPU'
  connections: FaceConnections
}

export class ModelLoadError extends Error {
  /** What to show the visitor, in their language (`t(error.msg)`). `message` is for developers. */
  readonly msg: Msg

  constructor(message: string, options?: { cause?: unknown; msg?: Msg }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'ModelLoadError'
    this.msg = options?.msg ?? msg('analysisErrors.detail.model-load-failed')
  }
}

let handlePromise: Promise<LandmarkerHandle> | null = null
let progressListeners = new Set<(progress: ModelLoadProgress) => void>()
let lastProgress: ModelLoadProgress | null = null

function emit(progress: ModelLoadProgress) {
  lastProgress = progress
  progressListeners.forEach((listener) => listener(progress))
}

/**
 * A `.task` file is a zip archive that may start with a few padding bytes before the
 * `PK\x03\x04` signature. Anything else (e.g. an HTML 404 page) is not a model.
 */
export function looksLikeModelBundle(bytes: Uint8Array): boolean {
  if (bytes.length < 1024) return false
  const head = bytes.subarray(0, 64)
  for (let i = 0; i + 3 < head.length; i++) {
    if (head[i] === 0x50 && head[i + 1] === 0x4b && head[i + 2] === 0x03 && head[i + 3] === 0x04) return true
  }
  return false
}

async function downloadModel(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const totalHeader = Number(response.headers.get('content-length'))
  const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : null

  let bytes: Uint8Array
  if (response.body) {
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      emit({ stage: 'downloading', loaded, total })
    }
    bytes = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer())
  }
  if (!looksLikeModelBundle(bytes)) throw new Error(`${url} is not a MediaPipe model bundle`)
  return bytes
}

async function downloadModelWithFallback(): Promise<Uint8Array> {
  let lastError: unknown
  for (const url of MODEL_SOURCES) {
    try {
      return await downloadModel(url)
    } catch (error) {
      lastError = error
    }
  }
  throw new ModelLoadError(
    'The face-analysis model could not be downloaded. Check your internet connection and try again.',
    { cause: lastError, msg: msg('analysisErrors.model.download') },
  )
}

async function createHandle(): Promise<LandmarkerHandle> {
  const modelBuffer = await downloadModelWithFallback()
  emit({ stage: 'initializing' })

  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

  let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null
  let visionError: unknown
  for (const wasmUrl of WASM_SOURCES) {
    try {
      vision = await FilesetResolver.forVisionTasks(wasmUrl)
      // Verify the loader file is reachable before committing to this location.
      const probe = await fetch(vision.wasmLoaderPath, { method: 'HEAD' })
      if (!probe.ok) throw new Error(`HTTP ${probe.status} for ${vision.wasmLoaderPath}`)
      // Some static hosts answer missing files with the SPA's HTML page and a 200 status.
      if (probe.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`${vision.wasmLoaderPath} is not a script`)
      }
      break
    } catch (error) {
      visionError = error
      vision = null
    }
  }
  if (!vision) {
    throw new ModelLoadError('The face-analysis engine could not be loaded.', {
      cause: visionError,
      msg: msg('analysisErrors.model.engineLoad'),
    })
  }

  const baseOptions = { modelAssetBuffer: modelBuffer }
  const common = {
    runningMode: 'IMAGE' as const,
    numFaces: 4,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  }

  let landmarker: FaceLandmarker
  let delegate: 'GPU' | 'CPU' = 'GPU'
  try {
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { ...baseOptions, delegate: 'GPU' },
      ...common,
    })
  } catch {
    delegate = 'CPU'
    try {
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: 'CPU' },
        ...common,
      })
    } catch (error) {
      throw new ModelLoadError('The face-analysis engine could not start on this device.', {
        cause: error,
        msg: msg('analysisErrors.model.engineStart'),
      })
    }
  }

  const pairs = (list: { start: number; end: number }[]): [number, number][] =>
    list.map((connection) => [connection.start, connection.end])
  return {
    landmarker,
    delegate,
    connections: {
      tesselation: pairs(FaceLandmarker.FACE_LANDMARKS_TESSELATION),
      contours: pairs(FaceLandmarker.FACE_LANDMARKS_CONTOURS),
      faceOval: pairs(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL),
    },
  }
}

/**
 * Loads the model once and shares it. Pass `onProgress` to follow the download.
 * If `signal` aborts, this call rejects but the shared load keeps going so the
 * next attempt benefits from it.
 */
export function loadFaceLandmarker(
  onProgress?: (progress: ModelLoadProgress) => void,
  signal?: AbortSignal,
): Promise<LandmarkerHandle> {
  if (onProgress) {
    progressListeners.add(onProgress)
    if (lastProgress && !handlePromise) onProgress(lastProgress)
  }
  if (!handlePromise) {
    lastProgress = null
    handlePromise = createHandle().catch((error: unknown) => {
      handlePromise = null
      throw error
    })
  }
  const shared = handlePromise
  const cleanup = () => {
    if (onProgress) progressListeners.delete(onProgress)
  }

  return new Promise<LandmarkerHandle>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Model loading was cancelled.', 'AbortError'))
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort, { once: true })
    shared.then(
      (handle) => {
        signal?.removeEventListener('abort', onAbort)
        cleanup()
        resolve(handle)
      },
      (error: unknown) => {
        signal?.removeEventListener('abort', onAbort)
        cleanup()
        reject(error)
      },
    )
  })
}

/** Frees the model's WebAssembly memory. Safe to call at any time. */
export async function releaseFaceLandmarker(): Promise<void> {
  const pending = handlePromise
  handlePromise = null
  progressListeners = new Set()
  lastProgress = null
  if (!pending) return
  try {
    const handle = await pending
    handle.landmarker.close()
  } catch {
    // Nothing was loaded, so there is nothing to release.
  }
}
