/** Capture-quality checks (quality.ts) and the panel that lists them. */
export const quality = {
  checks: {
    resolution: {
      label: 'Photo resolution',
      warn: 'The photo is small ({px} px on its short side). Fine details may be imprecise.',
      pass: 'The photo has enough pixels for landmark detection.',
    },
    faceSize: {
      label: 'Face size',
      fail: 'The face is only about {px} px wide — too small to measure reliably. Move closer or crop the photo around the face.',
      warn: 'The face is about {px} px wide. A larger face (200 px or more) gives steadier measurements.',
      pass: 'The face is about {px} px wide.',
    },
    frame: {
      label: 'Face fully in frame',
      fail: 'Part of the face is cut off by the edge of the photo, so some landmarks would be guesses. Leave space around the head.',
      pass: 'The whole face outline is inside the photo.',
    },
    yaw: {
      label: 'Facing the camera (left / right)',
      labelNoPose: 'Facing the camera',
      pass: 'Head turn is about {deg}° — close to frontal.',
      turned:
        'The head is turned about {deg}° sideways. Turning distorts widths and makes the face look asymmetric. Look straight into the lens.',
      unknown: 'The head pose could not be estimated, so a turned head cannot be ruled out.',
    },
    pitch: {
      label: 'Head level (up / down)',
      pass: 'Head tilt up/down is about {deg}°.',
      tipped:
        'The head is tipped about {deg}° up or down, which changes the vertical proportions. Keep the chin level.',
    },
    roll: {
      label: 'Head tilt (sideways)',
      warn: 'The head is tilted about {deg}° sideways. Measurements are corrected for this, but a level head is more accurate.',
      pass: 'Sideways tilt is about {deg}° (automatically corrected).',
    },
    brightness: {
      label: 'Lighting level',
      pass: 'The face is evenly exposed — neither too dark nor too bright.',
      dark: 'The face is dark. Landmarks are less precise in low light; face a window or lamp.',
      bright: 'The face is overexposed. Bright glare hides edges; avoid direct flash or strong backlight.',
    },
    lightingBalance: {
      label: 'Even lighting',
      warn: 'One side of the face is much brighter than the other. Strong side light creates shadows that blur the outline.',
      pass: 'Both sides of the face are lit similarly.',
    },
    contrast: {
      label: 'Contrast',
      warn: 'The face looks flat or washed out, which makes feature edges harder to locate.',
      pass: 'There is enough contrast to see facial features.',
    },
    sharpness: {
      label: 'Sharpness',
      warn: 'The photo looks blurry or heavily smoothed. Hold the camera steady and focus on the face.',
      pass: 'The face is in focus.',
    },
    expression: {
      label: 'Neutral expression',
      warn: 'The expression looks like: {issues}. Expressions move the mouth, cheeks and jaw, so mouth-related ratios in particular will differ from a relaxed face.',
      pass: 'The expression looks relaxed.',
    },
  },
  expressionIssues: {
    smiling: 'smiling',
    mouthOpen: 'mouth open',
    eyesClosing: 'eyes closing',
  },
  panel: {
    capture: 'Capture quality',
    reliability: {
      good: {
        label: 'Good',
        text: 'No capture problems were found. Remaining differences come from the natural limits of measuring a 2D photo.',
      },
      fair: {
        label: 'Fair',
        text: 'A few conditions may shift the numbers slightly. Read the notes below and retake the photo if you want steadier results.',
      },
      limited: {
        label: 'Limited',
        text: 'Several capture conditions may noticeably affect the numbers. Treat the results as rough and consider retaking the photo.',
      },
    },
    status: {
      pass: 'OK',
      warn: 'Note',
      fail: 'Problem',
    },
    footnote:
      'These checks are simple heuristics, not a confidence score from the model. Hands, hair, glasses or masks that cover part of the face cannot be detected reliably — the model estimates the hidden landmarks. Landmarks by {name} ({delegate} delegate).',
  },
}
