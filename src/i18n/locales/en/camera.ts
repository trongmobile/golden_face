export const camera = {
  modal: {
    title: 'Take a photo',
    description: 'Face the camera, keep a relaxed expression and use even lighting.',
  },
  intro:
    'GoldenFace needs permission to use your camera. The picture stays on this device and the camera switches off as soon as you take it.',
  startCamera: 'Start camera',
  waiting: 'Waiting for camera access — choose “Allow” when your browser asks.',
  tryAgain: 'Try again',
  uploadInstead: 'Upload a photo instead',
  livePreview: 'Live camera preview',
  capturedPhoto: 'The photo you just took',
  notReady: 'The camera is not ready yet. Wait for the preview to appear, then try again.',
  centerHint: 'Center your face in the oval and look straight at the lens.',
  switchCamera: 'Switch camera',
  takePhoto: 'Take photo',
  cancel: 'Cancel',
  retake: 'Retake',
  usePhoto: 'Use this photo',
  errors: {
    insecure: {
      title: 'Camera needs a secure connection',
      message:
        'Browsers only allow camera access on HTTPS pages (or localhost). Open this site over https:// or upload a photo instead.',
    },
    unsupported: {
      title: 'Camera is not supported here',
      message:
        'This browser cannot access a camera. Try a current version of Chrome, Edge, Firefox or Safari, or upload a photo instead.',
    },
    denied: {
      title: 'Camera permission was blocked',
      message:
        'GoldenFace cannot use the camera because permission was denied. Allow camera access for this site in your browser settings (usually the lock icon in the address bar), then try again — or upload a photo instead.',
    },
    notFound: {
      title: 'No camera found',
      message: 'No camera was detected on this device. Connect a camera, or upload a photo instead.',
    },
    inUse: {
      title: 'The camera is busy',
      message:
        'The camera could not be started, possibly because another app or tab is using it. Close other apps that use the camera and try again.',
    },
    unknown: {
      title: 'The camera could not be started',
      message: 'Something went wrong while starting the camera. Please try again, or upload a photo instead.',
    },
  },
}
