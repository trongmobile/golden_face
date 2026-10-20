import { msg, type Msg, type MsgKey } from '@/i18n'

export type CameraErrorKind =
  | 'insecure'
  | 'unsupported'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'unknown'

/** Both texts are language-independent messages: render them with `t(error.title)` / `t(error.message)`. */
export interface CameraError {
  kind: CameraErrorKind
  title: Msg
  message: Msg
}

const KEYS: Record<CameraErrorKind, { title: MsgKey; message: MsgKey }> = {
  insecure: { title: 'camera.errors.insecure.title', message: 'camera.errors.insecure.message' },
  unsupported: { title: 'camera.errors.unsupported.title', message: 'camera.errors.unsupported.message' },
  denied: { title: 'camera.errors.denied.title', message: 'camera.errors.denied.message' },
  'not-found': { title: 'camera.errors.notFound.title', message: 'camera.errors.notFound.message' },
  'in-use': { title: 'camera.errors.inUse.title', message: 'camera.errors.inUse.message' },
  unknown: { title: 'camera.errors.unknown.title', message: 'camera.errors.unknown.message' },
}

export function cameraError(kind: CameraErrorKind): CameraError {
  return { kind, title: msg(KEYS[kind].title), message: msg(KEYS[kind].message) }
}

/** Maps a getUserMedia failure to a user-facing error. */
export function describeCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return cameraError('denied')
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return cameraError('not-found')
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return cameraError('in-use')
    default:
      return cameraError('unknown')
  }
}

/** Reports whether camera capture can work at all in the current context. */
export function checkCameraSupport(): CameraError | null {
  if (typeof window !== 'undefined' && window.isSecureContext === false) return cameraError('insecure')
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return cameraError('unsupported')
  return null
}
