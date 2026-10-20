import type { AnalysisResult } from '@/types'
import { computeMeasurements } from '@/features/face-analysis/measurements'
import { evaluateQuality } from '@/features/face-analysis/quality'
import { SYNTHETIC_SIZE, syntheticLandmarks } from './synthetic-face'

export function fakeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const landmarks = syntheticLandmarks()
  return {
    imageSize: SYNTHETIC_SIZE,
    landmarks,
    measurements: computeMeasurements(landmarks, SYNTHETIC_SIZE),
    quality: evaluateQuality({
      landmarks,
      size: SYNTHETIC_SIZE,
      pose: { yaw: 2, pitch: 3, roll: 1 },
      pixels: { meanLuma: 130, stdLuma: 55, sharpness: 0.05, leftMean: 128, rightMean: 132 },
      expression: { smile: 0.05, jawOpen: 0.02, blink: 0.1 },
    }),
    connections: { tesselation: [], contours: [], faceOval: [] },
    model: { name: 'MediaPipe Face Landmarker', delegate: 'CPU' },
    analyzedAt: Date.UTC(2026, 9, 20, 12, 0, 0),
    ...overrides,
  }
}
