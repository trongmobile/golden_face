export const home = {
  metaTitle: 'GoldenFace — Golden Ratio Face Analyzer',
  metaDescription:
    'Free golden ratio face analyzer: measure your facial proportions from a photo, privately in your browser. A geometric curiosity, not a measure of beauty.',
  illustration: {
    label:
      'Illustration of a face outline inside a golden rectangle, with the golden spiral and measurement lines',
    eyes: 'eyes',
    nose: 'nose',
    mouth: 'mouth',
    lengthWidth: 'L : W',
  },
  hero: {
    badge: 'Facial proportion analyzer',
    title: 'Discover the Geometry of Your Face',
    subtitle: 'Explore facial proportions through the mathematics of the golden ratio.',
    upload: 'Upload Photo',
    camera: 'Take a Photo',
    privacyNote: 'Your photo is analyzed in your browser and is never uploaded or stored.',
  },
  how: {
    eyebrow: 'How it works',
    title: 'From photo to proportions in three steps',
    description:
      'Every step happens on your device, and every number can be traced back to the landmarks that produced it.',
  },
  steps: {
    add: {
      title: 'Add a photo',
      text: 'Upload a front-facing portrait or take one with your camera. You can rotate and crop it before analysis.',
    },
    detect: {
      title: 'Landmarks are detected on your device',
      text: 'A face-landmark model runs inside your browser and locates 478 points on the face. Nothing is sent to a server.',
    },
    explore: {
      title: 'Explore the geometry',
      text: 'See proportions, vertical thirds and left–right symmetry drawn on your photo, with the formula behind every number.',
    },
  },
  phi: {
    eyebrow: 'The golden ratio',
    title: 'A number worth knowing: <accent>φ ≈ 1.618</accent>',
    paragraph1:
      'Two quantities are in the golden ratio when the larger divided by the smaller equals the sum of both divided by the larger. It appears in geometry, in the Fibonacci sequence and, in popular accounts, in art and design.',
    paragraph2:
      'GoldenFace measures a handful of facial ratios and shows how far each one lies from φ. The comparison is a geometric exercise — nothing more.',
    link: 'How the numbers are calculated',
  },
  limits: {
    title: 'What this tool cannot tell you',
    items: [
      'It is one 2D photo. Camera distance, lens, angle, lighting and expression all change the numbers.',
      'Only a few ratios have a recognised golden-ratio claim. The rest are shown as plain proportions.',
      'Studies of perceived attractiveness do not show that closer-to-φ faces are judged more attractive.',
      'The hairline cannot be found reliably, so it is never guessed — you can mark it yourself.',
    ],
    note: 'The golden ratio is one geometric reference, not a standard of beauty. Results never rank or rate a face.',
  },
  privacy: {
    eyebrow: 'Privacy by design',
    title: 'Your photo stays yours.',
    text: 'GoldenFace has no server for photos: there is nowhere for your picture to be uploaded to.',
    cta: 'Read the privacy policy',
    onDevice: {
      title: 'On-device analysis',
      text: 'The model and your photo meet inside your browser.',
    },
    nothingStored: {
      title: 'Nothing is stored',
      text: 'No accounts, cookies or local storage. Only an anonymous visit counter.',
    },
    cameraOnRequest: {
      title: 'Camera on request',
      text: 'The camera only runs while you are taking the photo.',
    },
    noIdentification: {
      title: 'No identification',
      text: 'No face recognition and no guesses about who you are.',
    },
  },
  cta: {
    title: 'Ready to explore?',
    text: 'Use a front-facing photo with even lighting and a relaxed expression for the steadiest measurements.',
  },
}
