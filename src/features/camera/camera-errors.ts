export type CameraErrorKind =
  | 'insecure'
  | 'unsupported'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'unknown'

export interface CameraError {
  kind: CameraErrorKind
  title: string
  message: string
}

const ERRORS: Record<CameraErrorKind, Omit<CameraError, 'kind'>> = {
  insecure: {
    title: 'Camera needs a secure connection',
    message:
      'Browsers only allow camera access on HTTPS pages (or localhost). Open this site over https:// or upload a photo instead.',
  },
  unsupported: {
    title: 'Camera is not supported here',
    message: 'This browser cannot access a camera. Try a current version of Chrome, Edge, Firefox or Safari, or upload a photo instead.',
  },
  denied: {
    title: 'Camera permission was blocked',
    message:
      'GoldenFace cannot use the camera because permission was denied. Allow camera access for this site in your browser settings (usually the lock icon in the address bar), then try again — or upload a photo instead.',
  },
  'not-found': {
    title: 'No camera found',
    message: 'No camera was detected on this device. Connect a camera, or upload a photo instead.',
  },
  'in-use': {
    title: 'The camera is busy',
    message:
      'The camera could not be started, possibly because another app or tab is using it. Close other apps that use the camera and try again.',
  },
  unknown: {
    title: 'The camera could not be started',
    message: 'Something went wrong while starting the camera. Please try again, or upload a photo instead.',
  },
}

export function cameraError(kind: CameraErrorKind): CameraError {
  return { kind, ...ERRORS[kind] }
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
