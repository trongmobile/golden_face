import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResultsView } from '@/features/face-analysis/components/ResultsView'
import { SymmetryPanel } from '@/features/face-analysis/components/SymmetryPanel'
import { ThirdsBar } from '@/features/face-analysis/components/ThirdsBar'
import { RatioChart } from '@/features/face-analysis/components/RatioChart'
import { LM } from '@/features/face-analysis/landmarks'
import { computeMeasurements } from '@/features/face-analysis/measurements'
import { renderReportCanvas } from '@/features/face-analysis/report'
import { fakeAnalysisResult } from './helpers/fake-result'
import { SYNTHETIC_SIZE, syntheticLandmarks } from './helpers/synthetic-face'

function setup(result = fakeAnalysisResult()) {
  const image = document.createElement('canvas')
  image.width = SYNTHETIC_SIZE.width
  image.height = SYNTHETIC_SIZE.height
  const onAnalyzeAnother = vi.fn()
  const onClear = vi.fn()
  const view = render(<ResultsView image={image} result={result} onAnalyzeAnother={onAnalyzeAnother} onClear={onClear} />)
  return { ...view, image, result, onAnalyzeAnother, onClear, user: userEvent.setup() }
}

function cardFor(label: string): HTMLElement {
  const heading = screen.getAllByRole('heading', { level: 4 }).find((h) => h.textContent === label)
  if (!heading) throw new Error(`No metric card titled "${label}"`)
  return heading.closest('article')!
}
beforeEach(() => {
  window.print = vi.fn()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('ResultsView content', () => {
  it('summarises the analysis with the honest framing', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Your facial proportions' })).toBeInTheDocument()
    expect(screen.getByText(/not a beauty score/i)).toBeInTheDocument()
    expect(screen.getByText(/no overall score is given/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /photo with facial landmarks/i })).toBeInTheDocument()
  })

  it('never shows a single overall percentage or beauty wording', () => {
    const { container } = setup()
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/beauty score:|attractiveness score|overall score:|how beautiful|rating/i)
    expect(text).not.toMatch(/Mức|nhan sắc/i)
  })

  it('lists every ratio with its raw value', () => {
    setup()
    const length = cardFor('Face length ÷ face width')
    expect(within(length).getAllByText('1.500').length).toBeGreaterThanOrEqual(1) // headline ratio and r
    const forehead = cardFor('Forehead width ÷ cheekbone width')
    expect(within(forehead).getByText('0.750')).toBeInTheDocument()
  })

  it('shows the φ comparison only for ratios that have a golden-ratio claim', () => {
    setup()
    const eligible = cardFor('Face length ÷ face width')
    expect(within(eligible).getByText('Compared with φ')).toBeInTheDocument()
    expect(within(eligible).getByText('Reference ratio φ')).toBeInTheDocument()
    expect(within(eligible).getByText('1.618')).toBeInTheDocument()
    expect(within(eligible).getByText('Relative deviation from φ')).toBeInTheDocument()
    expect(within(eligible).getByText('Geometric similarity to the reference golden ratio')).toBeInTheDocument()
    expect(within(eligible).getByText(/7\.3%/)).toBeInTheDocument() // |1.5 − φ| / φ = 7.29 %
    expect(within(eligible).getByText('80%')).toBeInTheDocument() // 100·exp(−3·0.0729)

    const plain = cardFor('Cheekbone width ÷ jaw width')
    expect(within(plain).queryByText('Reference ratio φ')).not.toBeInTheDocument()
    expect(within(plain).queryByText(/similarity/i)).not.toBeInTheDocument()
    expect(within(plain).getByText(/Plain proportion/)).toBeInTheDocument()
  })

  it('names the formula, landmarks and caveat in the expandable explanation', async () => {
    const { user } = setup()
    const eligible = cardFor('Mouth width ÷ nose width')
    await user.click(within(eligible).getByText('How is this measured?'))
    expect(within(eligible).getByText(/Landmarks 61 ↔ 291/)).toBeInTheDocument()
    expect(within(eligible).getByText(/Formula:/)).toBeInTheDocument()
    expect(within(eligible).getByText(/Smiling widens the mouth/)).toBeInTheDocument()
  })

  it('explains skipped measurements instead of inventing values', () => {
    setup()
    const upper = cardFor('Upper third ÷ middle third')
    expect(within(upper).getByText('Not measured')).toBeInTheDocument()
    expect(within(upper).getByText(/hairline cannot be located reliably/i)).toBeInTheDocument()
    expect(within(upper).queryByText(/\d\.\d{3}/)).not.toBeInTheDocument()
  })

  it('shows the capture-quality assessment and its limits', () => {
    setup()
    expect(screen.getByText('Capture quality')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText(/not a confidence score from the model/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot be detected reliably/i)).toBeInTheDocument()
  })

  it('explains the formula and the limits of a 2D photo', () => {
    setup()
    expect(screen.getByText('The formula.')).toBeInTheDocument()
    expect(screen.getByText(/k = 3/)).toBeInTheDocument()
    expect(screen.getByText(/not a medical threshold or a standard of beauty/i)).toBeInTheDocument()
    expect(screen.getByText(/angle of the head, expression, lighting/i)).toBeInTheDocument()
  })

  it('renders a text alternative for the chart', () => {
    setup()
    const chart = screen.getByRole('img', { name: /Bar chart comparing measured ratios/ })
    expect(chart.getAttribute('aria-label')).toMatch(/Face length ÷ width: measured 1.5/)
  })

  it('uses neutral colours: no red/green good-versus-bad styling on results', () => {
    const { container } = setup()
    const classes = Array.from(container.querySelectorAll('[class]')).map((el) => el.getAttribute('class') ?? '').join(' ')
    expect(classes).not.toMatch(/\b(?:text|bg|border)-(?:red|green|emerald|lime|rose)-/)
  })
})

describe('overlay controls', () => {
  it('toggles layers with pressed state', async () => {
    const { user } = setup()
    const measurements = screen.getByRole('button', { name: 'Measurements' })
    const symmetry = screen.getByRole('button', { name: 'Symmetry axis' })
    expect(measurements).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Vertical thirds' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Face contours' })).toHaveAttribute('aria-pressed', 'true')
    expect(symmetry).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Full mesh' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(symmetry)
    expect(symmetry).toHaveAttribute('aria-pressed', 'true')
    await user.click(measurements)
    expect(measurements).toHaveAttribute('aria-pressed', 'false')
  })

  it('zooms in steps between 100 % and 300 %', async () => {
    const { user } = setup()
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' })
    const reset = screen.getByRole('button', { name: 'Reset zoom' })
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(zoomOut).toBeDisabled()
    expect(reset).toBeDisabled()
    await user.click(zoomIn)
    expect(screen.getByText('150%')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /scroll to pan/i })).toBeInTheDocument()
    await user.click(zoomIn)
    await user.click(zoomIn)
    await user.click(zoomIn)
    expect(screen.getByText('300%')).toBeInTheDocument()
    expect(zoomIn).toBeDisabled()
    await user.click(reset)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('pins a measurement on the photo with the eye button, even while hovering the card', async () => {
    const { user } = setup()
    const eye = within(cardFor('Mouth width ÷ nose width')).getByRole('button', { name: /Keep showing Mouth width ÷ nose width on the photo/ })
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    await user.click(eye) // the pointer is hovering the card at this moment
    expect(eye).toHaveAttribute('aria-pressed', 'true')
    expect(eye).toHaveAccessibleName(/Stop showing Mouth width/)
    await user.click(eye)
    expect(eye).toHaveAttribute('aria-pressed', 'false')
  })

  it('emphasises a card while it is hovered or focused and drops it afterwards', async () => {
    const { user } = setup()
    const length = cardFor('Face length ÷ face width')
    expect(length).not.toHaveClass('border-champagne-500')
    await user.hover(length)
    expect(length).toHaveClass('border-champagne-500')
    await user.unhover(length)
    expect(length).not.toHaveClass('border-champagne-500')
  })

  it('keeps a pinned measurement emphasised after the pointer leaves', async () => {
    const { user } = setup()
    const mouth = cardFor('Mouth width ÷ nose width')
    await user.click(within(mouth).getByRole('button', { name: /Keep showing/ }))
    await user.unhover(mouth)
    await user.click(document.body)
    expect(mouth).toHaveClass('border-champagne-500')
  })
})

describe('marking the hairline by hand', () => {
  it('adds the upper third when the user marks a hairline, and removes it again', async () => {
    const { user } = setup()
    expect(within(cardFor('Upper third ÷ middle third')).getByText('Not measured')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark hairline' }))
    expect(screen.getByText(/Click the photo where your hairline is/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move hairline up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move hairline down' })).toBeInTheDocument()

    // The default starts just above the mesh top (above the brows) so the third is measured immediately.
    const upper = cardFor('Upper third ÷ middle third')
    expect(within(upper).queryByText('Not measured')).not.toBeInTheDocument()
    expect(within(upper).getByText(/\d\.\d{3}/)).toBeInTheDocument()
    expect(screen.queryByText(/The upper third is missing/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Remove hairline/ }))
    expect(within(cardFor('Upper third ÷ middle third')).getByText('Not measured')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark hairline' })).toBeInTheDocument()
  })

  it('moves the hairline with the buttons and updates the numbers', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Mark hairline' }))
    const value = () => within(cardFor('Upper third ÷ middle third')).getByText(/\d\.\d{3}/).textContent
    const before = value()
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Move hairline up' }))
    expect(value()).not.toBe(before)
    expect(Number(value())).toBeGreaterThan(Number(before))
  })

  it('warns when the marked hairline is not above the eyebrows', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Mark hairline' }))
    // Walk the hairline down past the brow line.
    for (let i = 0; i < 80; i++) await user.click(screen.getByRole('button', { name: 'Move hairline down' }))
    expect(screen.getByText('The marked hairline was not used')).toBeInTheDocument()
    expect(within(cardFor('Upper third ÷ middle third')).getByText('Not measured')).toBeInTheDocument()
  })
})

describe('actions', () => {
  it('prints the report', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Print/ }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('downloads a PNG report through a temporary URL that is revoked afterwards', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const createUrl = vi.fn(() => 'blob:report')
    const revokeUrl = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }))
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG report' }))
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(clicked).toHaveLength(1)
    expect(clicked[0]!.download).toMatch(/^goldenface-report-\d{4}-\d{2}-\d{2}\.png$/)
    expect(revokeUrl).toHaveBeenCalledWith('blob:report')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows an error (and keeps Print available) if the report image cannot be made', async () => {
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null))
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG report' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be created/)
    expect(screen.getByRole('button', { name: /Print/ })).toBeEnabled()
    toBlob.mockRestore()
  })

  it('calls back for "Analyze another photo" and "Clear photo & results"', async () => {
    const { user, onAnalyzeAnother, onClear } = setup()
    await user.click(screen.getByRole('button', { name: 'Analyze another photo' }))
    expect(onAnalyzeAnother).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /Clear photo & results/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('marks interactive-only chrome as non-printing so the printout stays clean', () => {
    const { container } = setup()
    expect(container.querySelectorAll('.no-print').length).toBeGreaterThan(2)
    expect(container.querySelector('.print-only')).not.toBeNull()
  })
})

describe('report image', () => {
  it('renders a report canvas at a fixed width with a positive height', () => {
    const image = document.createElement('canvas')
    image.width = SYNTHETIC_SIZE.width
    image.height = SYNTHETIC_SIZE.height
    const result = fakeAnalysisResult()
    const canvas = renderReportCanvas({
      image,
      result,
      measurements: result.measurements,
      layers: new Set(['measurements', 'levels', 'contours']),
    })
    expect(canvas.width).toBe(1240)
    expect(canvas.height).toBeGreaterThan(800)
  })
})

describe('child components', () => {
  it('ThirdsBar shows shares for the measured thirds and "Not measured" for the rest', () => {
    const { thirds } = computeMeasurements(syntheticLandmarks(), SYNTHETIC_SIZE)
    render(<ThirdsBar thirds={thirds} />)
    expect(screen.getByText('Not measured')).toBeInTheDocument()
    expect(screen.getAllByText('50%')).toHaveLength(2)
    expect(screen.getByRole('img')).toHaveAccessibleName(/Upper third: not measured, Middle third: 50%, Lower third: 50%/)
  })

  it('SymmetryPanel lists the pairs and warns about head rotation', () => {
    const result = fakeAnalysisResult()
    render(<SymmetryPanel symmetry={result.measurements.symmetry} quality={{ ...result.quality, pose: { yaw: 12, pitch: 0, roll: 0 } }} />)
    expect(screen.getByText('Head rotation inflates these numbers')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /Left–right differences/ })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Mouth corners' })).toBeInTheDocument()
    expect(screen.getByText(/neither expected nor/i)).toBeInTheDocument()
  })

  it('SymmetryPanel reports honestly when nothing could be measured', () => {
    const base = fakeAnalysisResult()
    const none = computeMeasurements(
      syntheticLandmarks(Object.fromEntries([LM.faceRight, LM.foreheadRight, LM.jawRight, LM.noseWingRight, LM.mouthCornerRight, LM.eyeInnerRight, 46, 105, 33].map((i) => [i, null]))),
      SYNTHETIC_SIZE,
    ).symmetry
    expect(none.pairs).toHaveLength(0)
    render(<SymmetryPanel symmetry={none} quality={base.quality} />)
    expect(screen.getByText('Symmetry was not measured')).toBeInTheDocument()
  })

  it('RatioChart explains when no golden-eligible ratio could be measured', () => {
    render(<RatioChart metrics={[]} />)
    expect(screen.getByText(/nothing to chart/i)).toBeInTheDocument()
  })
})
