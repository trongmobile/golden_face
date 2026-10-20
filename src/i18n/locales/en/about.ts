export const about = {
  metaTitle: 'About the Golden Ratio — GoldenFace',
  metaDescription:
    'What the golden ratio (φ ≈ 1.618) is, how GoldenFace compares facial measurements with it, and why it is not a standard of beauty.',
  heading: {
    eyebrow: 'About the golden ratio',
    title: 'A famous number, and an honest look at its limits',
    description: 'What φ is, how GoldenFace uses it, and why a face does not need to match it.',
  },
  what: {
    title: 'What is the golden ratio?',
    paragraph1:
      'Two quantities a and b (a > b) are in the golden ratio when <formula>(a + b) ÷ a = a ÷ b</formula>. That ratio is φ = (1 + √5) ÷ 2 ≈ <value>{phi}</value>.',
    paragraph2:
      'It was studied by Euclid as the “extreme and mean ratio”, popularised in the Renaissance by Luca Pacioli’s <i>De Divina Proportione</i>, and is linked to the Fibonacci sequence — the ratio of neighbouring Fibonacci numbers approaches φ. In the twentieth century some dentists, surgeons and designers proposed φ-based “ideal” face templates. These ideas are popular, but the evidence that φ describes attractive faces is weak.',
  },
  compare: {
    title: 'How GoldenFace compares a ratio with φ',
    step1: '<b>1. Ratio. </b>r = max(A, B) ÷ min(A, B), so r is never below 1.',
    step2: '<b>2. Deviation. </b>error = |r − φ| ÷ φ.',
    step3: '<b>3. Similarity. </b>similarity = 100 × e<sup>−k × error</sup>, with k = {k}.',
    note: 'k only controls how fast the percentage falls off: with k = {k}, a 10 % deviation scores about 74 and a 23 % deviation about 50. It is a presentation setting — not a medical threshold or a standard of beauty.',
    example:
      '<b>Example. </b>A = 1.45, B = 1 gives r = {ratio}, error = {error} %, similarity = {similarity} %. The percentage is called the “geometric similarity to the reference golden ratio” — never a beauty score.',
  },
  measures: {
    title: 'What GoldenFace measures',
    intro:
      'Distances are computed from the model’s landmarks in a face-aligned coordinate system, so head tilt, image size and position do not change them. Only ratios that have a recognised golden-ratio claim are compared with φ — the others are shown as plain proportions, because faces are not expected to equal 1.618 everywhere.',
    tableLabel: 'Measurements table (scrolls sideways on small screens)',
    tableCaption: 'Measurements, formulas and whether each is compared with the golden ratio',
    columnMeasurement: 'Measurement',
    columnFormula: 'Formula and landmarks',
    columnGolden: 'Compared with φ?',
    yes: 'Yes',
    no: 'No',
    note: '“Cheekbone width ÷ jaw width” and “jaw width ÷ cheekbone width” are reciprocals and carry identical information, so only one is shown. Landmark numbers refer to the 478-point MediaPipe face mesh. Geometric symmetry compares each left/right landmark pair with the facial midline and never treats perfect symmetry as better.',
  },
  limits: {
    title: 'Limits of the method',
    flatPhoto: {
      title: 'It is one 2D photo',
      text: 'A flat picture cannot capture depth. Camera distance, lens distortion, head angle, expression, lighting and image resolution all change measured widths and heights — a close-up selfie enlarges the nose relative to the ears, for example.',
    },
    estimates: {
      title: 'Landmarks are estimates',
      text: 'The model predicts where features are. Hair, glasses, beards, makeup and shadows can shift points by a few pixels, and covered areas are guessed by the model.',
    },
    hairline: {
      title: 'The hairline is not detected',
      text: 'Facial-landmark models do not place a reliable hairline. GoldenFace never estimates it: the upper third is skipped unless you mark the hairline yourself.',
    },
    notARule: {
      title: 'φ is not a rule for faces',
      text: 'Perception studies (for example Pallett, Link & Lee, 2010) found that preferred facial proportions sit close to population averages rather than at φ. Beauty and attraction depend on far more than geometry.',
    },
    noRanking: {
      title: 'No ranking, no judgement',
      text: 'GoldenFace never produces a “beauty score”. The only percentage shown is the geometric similarity of one ratio to φ, and it is shown for a few ratios only.',
    },
    closing: 'The golden ratio is a way to look at geometry — not a way to measure a person.',
    cta: 'Try an analysis',
  },
}
