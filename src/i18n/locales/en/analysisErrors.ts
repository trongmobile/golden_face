/** Why an analysis failed, and what to do about it (AnalysisError codes in analyze.ts). */
export const analysisErrors = {
  /** The line under the title. Quality-based errors replace it with the specific failed check. */
  detail: {
    'no-face': 'No face was found in this photo.',
    'multiple-faces': '{count} faces were found in this photo.',
    'pose-too-large': 'The head is turned or tilted too far to measure reliably.',
    'face-too-small': 'The face is too small in this photo to measure reliably.',
    'face-cut-off': 'Part of the face is cut off by the edge of the photo.',
    'poor-lighting': 'The lighting makes the face too hard to measure reliably.',
    'invalid-landmarks': 'The detected landmarks were incomplete, so no measurements were made.',
    'model-load-failed': 'The face-analysis model could not be loaded. Check your connection and try again.',
    'resource-error':
      'This device ran out of resources while analyzing the photo. Close other tabs or try a smaller photo.',
    'detection-failed': 'The face detector failed while reading this photo. Please try again.',
    aborted: 'The analysis was cancelled.',
  },
  model: {
    download: 'The face-analysis model could not be downloaded. Check your internet connection and try again.',
    engineLoad: 'The face-analysis engine could not be loaded.',
    engineStart: 'The face-analysis engine could not start on this device.',
  },
  preparePhoto: 'The photo could not be prepared on this device.',
  analyzePhoto: 'The photo could not be analyzed. Please try again.',
  panel: {
    noMeasurements: 'No measurements were made, so there is nothing to score.',
    seeChecks: 'See the quality checks',
    onDevice: 'on-device',
    tryAgain: 'Try again',
    editCrop: 'Edit & crop this photo',
    chooseAnother: 'Choose another photo',
  },
  copy: {
    'no-face': {
      title: 'No face found',
      advice: [
        'Use a front-facing photo where your whole face is visible.',
        'Take off sunglasses, masks and anything covering the eyes, nose or mouth, and move hair away from the face.',
        'Make sure the face is lit — not in shadow or silhouette — and not too small in the picture.',
        'If the face is small, use Edit & crop to zoom in on it.',
      ],
    },
    'multiple-faces': {
      title: 'More than one face found',
      advice: [
        'GoldenFace measures one face at a time so it never mixes people up.',
        'Use a photo with a single person, or crop the photo tightly around one face.',
      ],
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
    },
    'model-load-failed': {
      title: 'The face model could not be loaded',
      advice: [
        'The model (about 4 MB) is downloaded the first time you analyze a photo. Check your internet connection and try again.',
      ],
    },
    'resource-error': {
      title: 'This device ran out of resources',
      advice: [
        'Close other tabs or apps and try again.',
        'A smaller photo uses less memory — crop it or choose a lower-resolution copy.',
      ],
    },
    'detection-failed': {
      title: 'Something went wrong while reading the photo',
      advice: ['Please try again, or choose a different photo.'],
    },
    aborted: {
      title: 'Analysis cancelled',
      advice: [] as string[],
    },
  },
}
