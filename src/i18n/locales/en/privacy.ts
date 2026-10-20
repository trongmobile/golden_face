export const privacy = {
  metaTitle: 'Privacy Policy — GoldenFace',
  metaDescription:
    'GoldenFace processes photos on your device. Images and facial landmarks are never uploaded, stored or used for training.',
  heading: {
    eyebrow: 'Privacy policy & terms',
    title: 'Your photo stays on your device',
    description: 'This page describes what GoldenFace actually does with your data. Last updated 20 October 2026.',
  },
  short: {
    title: 'The short version',
    items: [
      'Photos are analyzed inside your browser. GoldenFace has no server that receives photos, so there is nowhere for an image or its facial landmarks to be uploaded.',
      'Nothing is saved: no accounts, no cookies, no localStorage or IndexedDB, no analytics and no advertising.',
      'Your photo is never used to train models, and GoldenFace never identifies who you are.',
    ],
  },
  photo: {
    title: 'What happens to your photo',
    processing:
      '<b>Processing.</b> A face-landmark model (Google MediaPipe Face Landmarker) runs in your browser using WebAssembly and, when available, your graphics hardware. It reads your photo from memory, finds 478 landmarks and GoldenFace computes the ratios locally.',
    storage:
      '<b>Storage.</b> The photo and results exist only in the memory of this tab. They are not written to localStorage, sessionStorage, IndexedDB or cookies. They disappear when you press “Clear photo & results”, choose another photo, leave the Analysis page, or close the tab.',
    temporaryFiles:
      '<b>Temporary files.</b> Temporary browser URLs created for decoding or downloading are released immediately after use.',
    reports:
      '<b>Reports.</b> The PNG report and the print/PDF output are generated on your device and contain your photo. Whoever you share them with can see it, so share with care.',
  },
  camera: {
    title: 'Camera',
    text: 'The camera starts only after you choose “Take a photo” and allow access in your browser. The video is shown on your screen and is not recorded or transmitted. The camera is switched off the moment you take the picture, close the dialog, or leave the page. Browsers require a secure connection (HTTPS, or localhost) for camera access.',
  },
  network: {
    title: 'What does touch the network',
    items: [
      'Loading the website itself (HTML, scripts, styles, fonts) from the host it is served from. Fonts are self-hosted; no Google Fonts or other third-party font services are used.',
      'Loading the face-analysis engine and model (about 4 MB) the first time you start an analysis, so the home page stays fast. They are served from the same site, which means the first analysis needs an internet connection. If that copy is unavailable, the app falls back to Google Cloud Storage (model) and jsDelivr (engine): those services can see your IP address and standard request headers, but never your photo.',
      'Like any website, the hosting provider may keep standard server logs (such as IP address and requested URL) under its own policy. GoldenFace does not receive or process these logs.',
    ],
  },
  notDo: {
    title: 'What GoldenFace does not do',
    items: [
      'It does not recognise or identify people, compare faces, or search for matches.',
      'It does not infer sensitive attributes such as ethnicity, health, age, gender or emotion. Expression scores from the model are used only on your device, to warn that a smile or open mouth can affect the measurements.',
      'It does not rate, rank or score attractiveness.',
    ],
  },
  terms: {
    title: 'Terms of use',
    purpose:
      '<b>Purpose.</b> GoldenFace is an entertainment tool that explores geometry. It is not medical, cosmetic, psychological or diagnostic advice, and its results must not be used to judge, rank, select or discriminate against anyone.',
    consent:
      '<b>Consent.</b> Only analyze photos of yourself, or of people who have agreed. Do not analyze photos of children without a parent’s or guardian’s permission.',
    accuracy:
      '<b>Accuracy.</b> Measurements come from a single 2D photo and an automatic model, and can be wrong. The service is provided “as is”, without warranty of any kind.',
    responsibility:
      '<b>Responsibility.</b> You are responsible for what you do with exported reports. The golden ratio is a geometric reference, not a standard of beauty.',
  },
  questions: {
    title: 'Questions',
    text: 'GoldenFace is open source. If something here does not match what you observe, please open an issue in the project repository so it can be corrected.',
  },
}
