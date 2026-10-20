import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { AnalysisError, type AnalysisErrorCode } from '@/features/face-analysis/analyze'
import { AnalysisErrorPanel } from '@/features/face-analysis/components/AnalysisErrorPanel'
import { ResultsView } from '@/features/face-analysis/components/ResultsView'
import { LM } from '@/features/face-analysis/landmarks'
import { computeMeasurements } from '@/features/face-analysis/measurements'
import { renderReportCanvas } from '@/features/face-analysis/report'
import { I18nProvider, translate, type Lang } from '@/i18n'
import { fakeAnalysisResult } from './helpers/fake-result'
import { SYNTHETIC_SIZE, syntheticLandmarks } from './helpers/synthetic-face'

const originalGetContext = HTMLCanvasElement.prototype.getContext

function image() {
  const canvas = document.createElement('canvas')
  canvas.width = SYNTHETIC_SIZE.width
  canvas.height = SYNTHETIC_SIZE.height
  return canvas
}

function renderResults(lang: Lang, result = fakeAnalysisResult()) {
  return render(
    <I18nProvider initialLang={lang}>
      <LanguageSwitcher />
      <ResultsView image={image()} result={result} onAnalyzeAnother={vi.fn()} onClear={vi.fn()} />
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('results page in Vietnamese', () => {
  it('translates headings, metric cards, thirds, symmetry and the quality panel', () => {
    renderResults('vi')
    expect(screen.getByRole('heading', { level: 1, name: 'Tỷ lệ khuôn mặt của bạn' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Chiều dài ÷ chiều rộng khuôn mặt' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Ba phần theo chiều dọc' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Khóe miệng' })).toBeInTheDocument()
    expect(screen.getByText('Chất lượng ảnh chụp')).toBeInTheDocument()
    expect(screen.getByText('Tải báo cáo PNG')).toBeInTheDocument()
  })

  it('leaves no English interface text or raw message keys behind', () => {
    const { container } = renderResults('vi')
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/Your facial proportions|Analysis complete|Overlay layers|Not measured|Capture quality/)
    expect(text).not.toMatch(/\b(?:results|metrics|quality|layout|analysisErrors)\.[a-zA-Z-]+\.[a-zA-Z-]+/)
  })

  it('shows the reason a measurement was skipped in Vietnamese', () => {
    const landmarks = syntheticLandmarks({ [LM.irisCentreRight]: null })
    const result = fakeAnalysisResult({ measurements: computeMeasurements(landmarks, SYNTHETIC_SIZE) })
    renderResults('vi', result)
    const skipped = screen.getAllByText('Không đo được')
    expect(skipped.length).toBeGreaterThan(0)
  })

  it('re-translates everything, including stored analysis messages, when the language changes', async () => {
    const user = userEvent.setup()
    const result = fakeAnalysisResult()
    renderResults('en', result)
    expect(screen.getByRole('heading', { level: 1, name: 'Your facial proportions' })).toBeInTheDocument()
    const englishNotes = screen.getByText(/The photo has enough pixels|The photo is small/)
    expect(englishNotes).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Tỷ lệ khuôn mặt của bạn' })).toBeInTheDocument()
    expect(screen.queryByText(/The photo has enough pixels|The photo is small/)).not.toBeInTheDocument()
    expect(screen.getByText(/Ảnh có đủ điểm ảnh|Ảnh khá nhỏ/)).toBeInTheDocument()
  })
})

describe('analysis error panel', () => {
  const CODES: AnalysisErrorCode[] = [
    'no-face',
    'multiple-faces',
    'pose-too-large',
    'face-too-small',
    'face-cut-off',
    'poor-lighting',
    'invalid-landmarks',
    'model-load-failed',
    'resource-error',
    'detection-failed',
    'aborted',
  ]

  it.each(CODES)('renders %s with real text in both languages', (code) => {
    for (const lang of ['en', 'vi'] as const) {
      const { container, unmount } = render(
        <I18nProvider initialLang={lang}>
          <AnalysisErrorPanel
            error={new AnalysisError(code, 'developer message', { faceCount: 3 })}
            onEdit={vi.fn()}
            onRetry={vi.fn()}
            onChoosePhoto={vi.fn()}
          />
        </I18nProvider>,
      )
      const text = container.textContent ?? ''
      expect(text, `${code} in ${lang}`).not.toMatch(/analysisErrors\./)
      expect(text).not.toContain('developer message')
      unmount()
    }
  })

  it('says how many faces were found, in Vietnamese', () => {
    render(
      <I18nProvider initialLang="vi">
        <AnalysisErrorPanel
          error={new AnalysisError('multiple-faces', 'x', { faceCount: 3 })}
          onEdit={vi.fn()}
          onRetry={vi.fn()}
          onChoosePhoto={vi.fn()}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('Tìm thấy 3 khuôn mặt trong ảnh này.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn ảnh khác' })).toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading', { level: 2 })).toHaveTextContent('Tìm thấy nhiều hơn một khuôn mặt')
  })
})

describe('analysis messages', () => {
  it('every quality check resolves to real text in both languages', () => {
    const result = fakeAnalysisResult()
    for (const lang of ['en', 'vi'] as const) {
      for (const check of result.quality.checks) {
        expect(translate(lang, check.label), `${lang} label ${check.id}`).not.toMatch(/^quality\./)
        expect(translate(lang, check.detail), `${lang} detail ${check.id}`).not.toMatch(/^quality\./)
      }
    }
  })

  it('every skipped-measurement reason resolves to real text in both languages', () => {
    const landmarks = syntheticLandmarks({ [LM.irisCentreRight]: null, [LM.chin]: null })
    const { metrics, skippedSegments } = computeMeasurements(landmarks, SYNTHETIC_SIZE)
    const reasons = [
      ...Object.values(skippedSegments),
      ...metrics.flatMap((metric) => (metric.status === 'skipped' ? [metric.reason] : [])),
    ]
    expect(reasons.length).toBeGreaterThan(0)
    for (const lang of ['en', 'vi'] as const) {
      for (const reason of reasons) expect(translate(lang, reason)).not.toMatch(/^metrics\./)
    }
  })
})

describe('PNG report text', () => {
  function drawnText(lang: Lang): string[] {
    vi.restoreAllMocks()
    const drawn: string[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const context = (originalGetContext as unknown as (this: HTMLCanvasElement) => CanvasRenderingContext2D).call(this)
      return new Proxy(context, {
        get: (target, key) =>
          key === 'fillText'
            ? (text: string) => {
                drawn.push(text)
              }
            : Reflect.get(target, key),
      })
    } as never)
    const result = fakeAnalysisResult()
    renderReportCanvas({
      image: image(),
      result,
      measurements: result.measurements,
      layers: new Set(['measurements']),
      t: (input, params) => translate(lang, input, params),
      locale: lang,
    })
    return drawn
  }

  it('is drawn in English by default and in Vietnamese on request', () => {
    expect(drawnText('en')).toContain('Facial proportion report')
    const vi = drawnText('vi')
    expect(vi).toContain('Báo cáo tỷ lệ khuôn mặt')
    expect(vi).toContain('Chiều dài ÷ chiều rộng khuôn mặt')
    expect(vi.join(' ')).not.toMatch(/Facial proportion|Vertical thirds|Please read/)
  })
})
