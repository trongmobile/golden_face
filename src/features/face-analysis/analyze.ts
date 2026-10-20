import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { msg, translate, type Msg } from '@/i18n'
import type { AnalysisResult, ImageSize, Landmark, QualityCheck, QualityReport } from '@/types'
import { computeMeasurements, InvalidLandmarksError } from './measurements'
import { poseFromLandmarks, poseFromTransformMatrix, type TransformMatrix } from './pose'
import {
  computeFaceBox,
  evaluateQuality,
  failedChecks,
  samplePixelStats,
  type ExpressionScores,
  type FaceBox,
} from './quality'
import { loadFaceLandmarker, ModelLoadError, type LandmarkerHandle, type ModelLoadProgress } from './landmarker'

export type AnalysisErrorCode =
  | 'no-face'
  | 'multiple-faces'
  | 'pose-too-large'
  | 'face-too-small'
  | 'face-cut-off'
  | 'poor-lighting'
  | 'invalid-landmarks'
  | 'model-load-failed'
  | 'resource-error'
  | 'detection-failed'
  | 'aborted'

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode
  readonly faceCount?: number
  /** Quality report attached when a capture-quality check rejected the photo. */
  readonly quality?: QualityReport
  /**
   * What the interface shows under the error title, in the visitor's language
   * (`t(error.msg)`). `message` is English for developers and logs only — never render it.
   */
  readonly msg: Msg

  constructor(
    code: AnalysisErrorCode,
    message: string,
    details: { faceCount?: number; quality?: QualityReport; cause?: unknown; msg?: Msg } = {},
  ) {
    super(message, details.cause !== undefined ? { cause: details.cause } : undefined)
    this.name = 'AnalysisError'
    this.code = code
    this.faceCount = details.faceCount
    this.quality = details.quality
    this.msg =
      details.msg ??
      (code === 'multiple-faces' && details.faceCount !== undefined
        ? msg('analysisErrors.detail.multiple-faces', { count: details.faceCount })
        : msg(`analysisErrors.detail.${code}`))
  }
}

export type AnalysisStage = 'loading-model' | 'detecting' | 'checking-faces' | 'measuring'

export interface AnalyzeOptions {
  signal?: AbortSignal
  onStage?: (stage: AnalysisStage) => void
  onModelProgress?: (progress: ModelLoadProgress) => void
}

/** Overridable collaborators, so the pipeline can be tested without a browser. */
export interface AnalyzeDeps {
  loadLandmarker: (
    onProgress?: (progress: ModelLoadProgress) => void,
    signal?: AbortSignal,
  ) => Promise<LandmarkerHandle>
  sampleFacePixels: typeof samplePixelStats
  cropTile: (source: HTMLCanvasElement, rect: Rect) => HTMLCanvasElement
  yieldToMain: () => Promise<void>
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectedFace {
  landmarks: Landmark[]
  box: FaceBox
  matrix: TransformMatrix | null
  blendshapes: Record<string, number>
  source: 'full' | 'tile'
}

/** Tiles are 60 % of the image, laid out 2 × 2, so smaller faces get a larger share of the model input. */
const TILE_FRACTION = 0.6
/** Skip the extra tile scan for tiny images (faces there are too small to help anyway). */
const MIN_SIDE_FOR_TILES = 400
/** Another face only counts when at least this wide compared with the largest face. */
const SIGNIFICANT_FACE_RATIO = 0.3

const defaultDeps: AnalyzeDeps = {
  loadLandmarker: loadFaceLandmarker,
  sampleFacePixels: samplePixelStats,
  cropTile: (source, rect) => {
    const tile = document.createElement('canvas')
    tile.width = Math.round(rect.width)
    tile.height = Math.round(rect.height)
    const context = tile.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, tile.width, tile.height)
    return tile
  },
  yieldToMain: () => new Promise((resolve) => setTimeout(resolve, 0)),
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new AnalysisError('aborted', 'The analysis was cancelled.')
}

function toBlendshapeMap(result: FaceLandmarkerResult, index: number): Record<string, number> {
  const categories = result.faceBlendshapes?.[index]?.categories ?? []
  return Object.fromEntries(categories.map((category) => [category.categoryName, category.score]))
}

function toDetectedFaces(
  result: FaceLandmarkerResult,
  size: ImageSize,
  source: DetectedFace['source'],
  map: (landmark: Landmark) => Landmark = (landmark) => landmark,
): DetectedFace[] {
  return (result.faceLandmarks ?? []).flatMap((rawLandmarks, index) => {
    const landmarks = rawLandmarks.map((landmark) => map({ x: landmark.x, y: landmark.y, z: landmark.z }))
    const box = computeFaceBox(landmarks, size)
    if (!box) return []
    return [
      {
        landmarks,
        box,
        matrix: result.facialTransformationMatrixes?.[index] ?? null,
        blendshapes: toBlendshapeMap(result, index),
        source,
      },
    ]
  })
}

const boxWidth = (box: FaceBox) => box.x1 - box.x0
const boxArea = (box: FaceBox) => Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0)
const centerOf = (box: FaceBox) => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })
const contains = (box: FaceBox, p: { x: number; y: number }) =>
  p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1

export function boxIoU(a: FaceBox, b: FaceBox): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return 0
  const intersection = w * h
  return intersection / (boxArea(a) + boxArea(b) - intersection)
}

/** The same physical face seen in the full image and in a tile: overlapping boxes or one centre inside the other. */
export function isSameFace(a: FaceBox, b: FaceBox): boolean {
  return boxIoU(a, b) > 0.25 || contains(a, centerOf(b)) || contains(b, centerOf(a))
}

/** Merges detections of the same face coming from the full image and from tiles. */
export function mergeFaces(faces: DetectedFace[]): DetectedFace[] {
  // Full-image detections first (best context), then larger faces first.
  const ordered = [...faces].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'full' ? -1 : 1
    return boxArea(b.box) - boxArea(a.box)
  })
  const kept: DetectedFace[] = []
  for (const face of ordered) {
    if (!kept.some((existing) => isSameFace(existing.box, face.box))) kept.push(face)
  }
  return kept
}

async function detectFaces(
  handle: LandmarkerHandle,
  canvas: HTMLCanvasElement,
  size: ImageSize,
  deps: AnalyzeDeps,
  signal?: AbortSignal,
): Promise<DetectedFace[]> {
  const faces = toDetectedFaces(handle.landmarker.detect(canvas), size, 'full')

  // The model's built-in face finder only looks at the whole image at low resolution, so it
  // misses small faces in group photos. A cheap 2 × 2 tile scan finds them.
  if (Math.min(size.width, size.height) >= MIN_SIDE_FOR_TILES) {
    const tileWidth = size.width * TILE_FRACTION
    const tileHeight = size.height * TILE_FRACTION
    for (const gy of [0, 1]) {
      for (const gx of [0, 1]) {
        throwIfAborted(signal)
        await deps.yieldToMain()
        const x0 = gx * (size.width - tileWidth)
        const y0 = gy * (size.height - tileHeight)
        const tile = deps.cropTile(canvas, { x: x0, y: y0, width: tileWidth, height: tileHeight })
        try {
          const result = handle.landmarker.detect(tile)
          faces.push(
            ...toDetectedFaces(result, size, 'tile', (landmark) => ({
              x: (x0 + landmark.x * tileWidth) / size.width,
              y: (y0 + landmark.y * tileHeight) / size.height,
              // z shares the x scale of the image it was computed on.
              z: landmark.z !== undefined ? (landmark.z * tileWidth) / size.width : undefined,
            })),
          )
        } finally {
          tile.width = 0
          tile.height = 0
        }
      }
    }
  }
  return mergeFaces(faces)
}

function expressionFrom(blendshapes: Record<string, number>): ExpressionScores | null {
  if (Object.keys(blendshapes).length === 0) return null
  const get = (name: string) => blendshapes[name] ?? 0
  return {
    smile: Math.max(get('mouthSmileLeft'), get('mouthSmileRight')),
    jawOpen: get('jawOpen'),
    blink: Math.max(get('eyeBlinkLeft'), get('eyeBlinkRight')),
  }
}

const RESOURCE_PATTERN = /memory|alloc|out of|oom|context lost|webgl|gpu|resource/i

function errorForFailedChecks(failed: QualityCheck[], quality: QualityReport): AnalysisError {
  const first = failed[0]!
  const code: AnalysisErrorCode =
    first.id === 'face-size'
      ? 'face-too-small'
      : first.id === 'frame'
        ? 'face-cut-off'
        : first.id === 'yaw' || first.id === 'pitch'
          ? 'pose-too-large'
          : 'poor-lighting'
  // The specific failed check explains the problem, in the visitor's language.
  return new AnalysisError(code, translate('en', first.detail), { quality, msg: first.detail })
}

/**
 * Runs the full analysis of one photo, entirely in the browser.
 *
 * Throws `AnalysisError` with a specific `code` whenever the photo cannot be
 * measured reliably (no face, several faces, turned head, too small, too dark…).
 * It never returns made-up numbers for such photos.
 */
export async function analyzeFace(
  canvas: HTMLCanvasElement,
  options: AnalyzeOptions = {},
  deps: AnalyzeDeps = defaultDeps,
): Promise<AnalysisResult> {
  const { signal, onStage, onModelProgress } = options
  const size: ImageSize = { width: canvas.width, height: canvas.height }
  if (!(size.width > 0 && size.height > 0)) {
    throw new AnalysisError('detection-failed', 'The photo has no pixels to analyze.')
  }
  throwIfAborted(signal)

  onStage?.('loading-model')
  let handle: LandmarkerHandle
  try {
    handle = await deps.loadLandmarker(onModelProgress, signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AnalysisError('aborted', 'The analysis was cancelled.')
    }
    throw new AnalysisError(
      'model-load-failed',
      error instanceof ModelLoadError
        ? error.message
        : 'The face-analysis model could not be loaded. Check your connection and try again.',
      { cause: error, ...(error instanceof ModelLoadError ? { msg: error.msg } : {}) },
    )
  }
  throwIfAborted(signal)

  onStage?.('detecting')
  await deps.yieldToMain()
  let faces: DetectedFace[]
  try {
    faces = await detectFaces(handle, canvas, size, deps, signal)
  } catch (error) {
    if (error instanceof AnalysisError) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (RESOURCE_PATTERN.test(message)) {
      throw new AnalysisError(
        'resource-error',
        'This device ran out of resources while analyzing the photo. Close other tabs or try a smaller photo.',
        { cause: error },
      )
    }
    throw new AnalysisError('detection-failed', 'The face detector failed while reading this photo. Please try again.', {
      cause: error,
    })
  }
  throwIfAborted(signal)

  onStage?.('checking-faces')
  if (faces.length === 0) {
    throw new AnalysisError('no-face', 'No face was found in this photo.')
  }
  const largest = Math.max(...faces.map((face) => boxWidth(face.box)))
  const significant = faces.filter((face) => boxWidth(face.box) >= largest * SIGNIFICANT_FACE_RATIO)
  if (significant.length > 1) {
    throw new AnalysisError(
      'multiple-faces',
      `${significant.length} faces were found. GoldenFace measures one face at a time.`,
      { faceCount: significant.length, msg: msg('analysisErrors.detail.multiple-faces', { count: significant.length }) },
    )
  }
  const face = significant[0]!

  onStage?.('measuring')
  await deps.yieldToMain()
  const pose = poseFromTransformMatrix(face.matrix) ?? poseFromLandmarks(face.landmarks, size)
  const quality = evaluateQuality({
    landmarks: face.landmarks,
    size,
    pose,
    pixels: deps.sampleFacePixels(canvas, size, face.box),
    expression: expressionFrom(face.blendshapes),
  })
  const failed = failedChecks(quality)
  if (failed.length > 0) throw errorForFailedChecks(failed, quality)

  try {
    const measurements = computeMeasurements(face.landmarks, size)
    return {
      imageSize: size,
      landmarks: face.landmarks,
      measurements,
      quality,
      connections: handle.connections,
      model: { name: 'MediaPipe Face Landmarker', delegate: handle.delegate },
      analyzedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof InvalidLandmarksError) {
      throw new AnalysisError('invalid-landmarks', 'The detected landmarks were incomplete, so no measurements were made.', {
        cause: error,
      })
    }
    throw error
  }
}
