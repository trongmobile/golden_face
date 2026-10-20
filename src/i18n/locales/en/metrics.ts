/** Names and explanations of every measurement. Keys follow the ids in metric-catalog.ts / landmarks.ts. */
export const metrics = {
  segments: {
    'face-length': 'Face length',
    'face-width': 'Face (cheekbone) width',
    'forehead-width': 'Forehead width',
    'jaw-width': 'Jaw width',
    interpupillary: 'Interpupillary distance',
    intercanthal: 'Inter-canthal distance',
    'nose-width': 'Nose width',
    'mouth-width': 'Mouth width',
    'upper-lip': 'Upper-lip height',
    'lower-lip': 'Lower-lip height',
    'upper-third': 'Upper third (hairline → brows)',
    'middle-third': 'Middle third (brows → nose base)',
    'lower-third': 'Lower third (nose base → chin)',
  },
  items: {
    'face-length-width': {
      label: 'Face length ÷ face width',
      meaning:
        'How tall the face is compared with how wide it is. A value of about 1.0 is a roughly round face; larger values are longer faces.',
      formula: 'Face length ÷ face width (landmark 10 → 152, divided by landmark 234 ↔ 454)',
      goldenNote:
        'A frequently cited "golden face" claim is that the face is about φ times as long as it is wide, so this pair is compared with φ.',
      caveat:
        'Landmark 10 is on the forehead, below the true hairline, so the measured length is shorter than a hairline-to-chin length. Mark your hairline to measure from the hairline instead.',
    },
    'forehead-cheekbone': {
      label: 'Forehead width ÷ cheekbone width',
      meaning: 'How wide the upper forehead is relative to the widest part of the face.',
      formula: 'Forehead width (landmark 54 ↔ 284) ÷ face width (234 ↔ 454)',
      goldenNote: 'There is no recognised golden-ratio claim for this pair, so it is shown as a plain proportion.',
      caveat: 'Hair, hats and the hairline shape affect where the forehead outline is detected.',
    },
    'cheekbone-jaw': {
      label: 'Cheekbone width ÷ jaw width',
      meaning:
        'How much wider the face is at the cheekbones than at the jaw corners. Its reciprocal (jaw ÷ cheekbone) carries exactly the same information.',
      formula: 'Face width (landmark 234 ↔ 454) ÷ jaw width (172 ↔ 397)',
      goldenNote: 'There is no recognised golden-ratio claim for this pair, so it is shown as a plain proportion.',
      caveat: 'Beards, jaw tension, smiling and head tilt change the detected jaw outline.',
    },
    'interpupillary-face-width': {
      label: 'Eye distance ÷ face width',
      meaning: 'The distance between the pupils compared with the width of the face.',
      formula: 'Interpupillary distance (iris centres 468 ↔ 473) ÷ face width (234 ↔ 454)',
      goldenNote:
        'The classical canon for this region is a "five-eye" division, not φ, so it is shown as a plain proportion.',
    },
    'nose-intercanthal': {
      label: 'Nose width ÷ eye distance',
      meaning:
        'The width of the nostril wings compared with the gap between the inner corners of the eyes (inter-canthal distance).',
      formula: 'Nose width (landmark 129 ↔ 358) ÷ inter-canthal distance (133 ↔ 362)',
      goldenNote:
        'The classical canon for this pair is a ratio of 1 (nose width ≈ inter-canthal distance), not φ, so it is shown as a plain proportion.',
    },
    'mouth-nose': {
      label: 'Mouth width ÷ nose width',
      meaning: 'How wide the mouth is compared with the nose.',
      formula: 'Mouth width (landmark 61 ↔ 291) ÷ nose width (129 ↔ 358)',
      goldenNote: 'A frequently cited "golden face" claim is that the mouth is about φ times as wide as the nose.',
      caveat: 'Smiling widens the mouth and changes this ratio noticeably. A relaxed, neutral expression is best.',
    },
    'lip-ratio': {
      label: 'Lower lip ÷ upper lip height',
      meaning: 'The height of the lower lip compared with the upper lip, measured with the mouth closed.',
      formula: 'Lower-lip height (landmark 14 → 17) ÷ upper-lip height (0 → 13)',
      goldenNote: 'A frequently cited claim is that the lower lip is about φ times as tall as the upper lip.',
      caveat: 'Only measured when the mouth is closed. Lip makeup, smiling and lighting shift the detected lip borders.',
    },
    'third-upper-middle': {
      label: 'Upper third ÷ middle third',
      meaning: 'Compares the forehead region with the middle of the face.',
      formula: 'Hairline → brow line ÷ brow line → nose base',
      goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
    },
    'third-middle-lower': {
      label: 'Middle third ÷ lower third',
      meaning: 'Compares the brow-to-nose region with the nose-to-chin region.',
      formula: 'Brow line → nose base (landmarks) ÷ nose base (2) → chin (152)',
      goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
      caveat: 'The brow line is the average height of the eyebrow landmarks, so eyebrow shape and makeup influence it.',
    },
    'third-upper-lower': {
      label: 'Upper third ÷ lower third',
      meaning: 'Compares the forehead region with the nose-to-chin region.',
      formula: 'Hairline → brow line ÷ nose base → chin',
      goldenNote: 'The classical canon divides the face into roughly equal thirds (ratio ≈ 1), not φ.',
    },
  },
  levels: {
    'mesh-top': 'Top of face mesh',
    hairline: 'Hairline (marked)',
    brow: 'Brow line',
    'nose-base': 'Nose base',
    chin: 'Chin',
  },
  symmetryPairs: {
    forehead: 'Forehead sides',
    'brow-outer': 'Outer brow ends',
    'brow-peak': 'Brow peaks',
    'eye-outer': 'Outer eye corners',
    'eye-inner': 'Inner eye corners',
    cheekbone: 'Cheekbone / face edge',
    'nose-wing': 'Nostril wings',
    'mouth-corner': 'Mouth corners',
    jaw: 'Jaw corners',
  },
  midlineFeatures: {
    glabella: 'Between the brows',
    'nose-tip': 'Nose tip',
    'upper-lip': 'Upper-lip centre',
    chin: 'Chin',
  },
  /** Where a measurement comes from, e.g. "Landmarks 234 ↔ 454" or "Brow line → Landmark 2". */
  source: {
    landmark: 'Landmark {index}',
    landmarks: 'Landmarks {right} ↔ {left}',
    browLine: 'Brow line',
    markedHairline: 'Marked hairline',
    range: '{from} → {to}',
  },
  /** Why a measurement was skipped. */
  reasons: {
    missingOne: 'Landmark {landmarks} could not be located reliably.',
    missingMany: 'Landmarks {landmarks} could not be located reliably.',
    irisUnavailable: 'Iris landmarks (468 / 473) are not available.',
    mouthOpen: 'The mouth is open, which changes lip height. A relaxed, closed mouth is needed to measure the lips.',
    hairlineNotEstimated:
      'The hairline cannot be located reliably from facial landmarks (hair, hats and lighting hide it), so the upper third is not estimated. Mark your hairline on the photo to include it.',
    browOrNoseMissing: 'The eyebrow or nose-base landmarks could not be located reliably.',
    requiredMissing: 'A required measurement is not available.',
    zeroOrInvalid: 'One of the two measurements is zero or invalid, so no ratio can be computed.',
    hairlineInvalid: 'The marked hairline position is not valid.',
    hairlineOutside: 'The marked hairline lies outside the photo.',
    hairlineBelowBrows: 'The marked hairline must be above the eyebrows.',
    pairOverlap: 'The left and right points overlap or are swapped.',
  },
}
