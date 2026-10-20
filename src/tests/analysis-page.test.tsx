import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisError } from '@/features/face-analysis/analyze'
import { AnalysisPage } from '@/pages/Analysis'
import type { AnalysisResult } from '@/types'
import { installCameraMock, type CameraMock } from './helpers/camera-mock'
import { fakeAnalysisResult } from './helpers/fake-result'

const { analyzeFaceMock, releaseLandmarkerMock } = vi.hoisted(() => ({
  analyzeFaceMock: vi.fn(),
  releaseLandmarkerMock: vi.fn(async () => undefined),
}))

vi.mock('@/features/face-analysis/analyze', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/face-analysis/analyze')>()),
  analyzeFace: analyzeFaceMock,
}))
vi.mock('@/features/face-analysis/landmarker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/face-analysis/landmarker')>()),
  releaseFaceLandmarker: releaseLandmarkerMock,
}))

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1])
const jpeg = (name = 'me.jpg') => new File([JPEG], name, { type: 'image/jpeg' })

function renderPage(path = '/analysis') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AnalysisPage />
    </MemoryRouter>,
  )
}

async function uploadAndAnalyze(user: ReturnType<typeof userEvent.setup>, file = jpeg()) {
  await user.upload(screen.getByTestId('photo-input'), file)
  await screen.findByRole('heading', { name: 'Check your photo' })
  await user.click(screen.getByRole('button', { name: 'Analyze this photo' }))
}

let camera: CameraMock
beforeEach(() => {
  vi.stubGlobal('createImageBitmap', async () => ({ width: 1000, height: 1000, close: () => undefined }))
  analyzeFaceMock.mockReset()
  releaseLandmarkerMock.mockClear()
  camera = installCameraMock()
})
afterEach(() => {
  camera.restore()
  vi.unstubAllGlobals()
})

describe('choosing a photo', () => {
  it('starts with an upload area, a camera option and photo tips', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Analyze a photo' })).toBeInTheDocument()
    expect(screen.getByText('Drag & drop a photo here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open camera' })).toBeInTheDocument()
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument()
    expect(screen.getByText(/Face the camera straight on/)).toBeInTheDocument()
  })

  it('restricts the picker to JPG, PNG and WebP', () => {
    renderPage()
    const accept = screen.getByTestId('photo-input').getAttribute('accept')!
    for (const type of ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg']) expect(accept).toContain(type)
  })

  it('shows a preview step with the photo size after a valid upload', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), jpeg('portrait.jpg'))
    expect(await screen.findByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
    expect(screen.getByText('portrait.jpg')).toBeInTheDocument()
    expect(screen.getByText(/1000 × 1000 px/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Photo preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate right' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Crop area/ })).toBeInTheDocument()
    expect(analyzeFaceMock).not.toHaveBeenCalled() // nothing runs until the user confirms
  })

  it('rejects unsupported files with a clear message and stays on the upload step', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Unsupported file type/)
    expect(screen.queryByRole('heading', { name: 'Check your photo' })).not.toBeInTheDocument()
  })

  it('rejects a file that is not really an image even if named .jpg', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), new File(['<html></html>'], 'fake.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/does not look like a real/)
  })

  it('rejects oversized files', async () => {
    const user = userEvent.setup()
    renderPage()
    const big = new File([new Uint8Array(16 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByTestId('photo-input'), big)
    expect(await screen.findByRole('alert')).toHaveTextContent(/15 MB/)
  })

  it('reports an image the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new DOMException('bad', 'InvalidStateError')
    })
    vi.stubGlobal(
      'Image',
      class {
        decoding = ''
        src = ''
        decode() {
          return Promise.reject(new Error('bad'))
        }
      },
    )
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }))
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), jpeg('broken.jpg'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be opened/)
  })

  it('accepts a photo dropped onto the upload area', async () => {
    renderPage()
    const zone = screen.getByText('Drag & drop a photo here').closest('div')!
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } })
    expect(screen.getByText('Drop your photo here')).toBeInTheDocument()
    fireEvent.drop(zone, { dataTransfer: { files: [jpeg('dropped.jpg')] } })
    expect(await screen.findByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
    expect(screen.getByText('dropped.jpg')).toBeInTheDocument()
  })

  it('asks for one photo at a time when several are dropped', async () => {
    renderPage()
    const zone = screen.getByText('Drag & drop a photo here').parentElement!
    fireEvent.drop(zone, { dataTransfer: { files: [jpeg('a.jpg'), jpeg('b.jpg')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/one photo at a time/)
  })

  it('can go back and choose a different photo', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), jpeg())
    await user.click(await screen.findByRole('button', { name: 'Choose a different photo' }))
    expect(screen.getByRole('heading', { name: 'Analyze a photo' })).toBeInTheDocument()
  })

  it('rotates the preview and resets the crop', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), jpeg())
    await screen.findByRole('heading', { name: 'Check your photo' })
    await user.click(screen.getByRole('button', { name: 'Rotate right' }))
    await user.click(screen.getByRole('button', { name: 'Rotate left' }))
    expect(screen.getByRole('button', { name: 'Reset crop' })).toBeDisabled()
  })

  it('lets keyboard users crop with the arrow keys', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByTestId('photo-input'), jpeg())
    await screen.findByRole('heading', { name: 'Check your photo' })
    const frame = screen.getByRole('group', { name: /Crop area/ })
    expect(screen.getByRole('button', { name: 'Reset crop' })).toBeDisabled()
    // Alt + arrow shrinks the frame from the bottom-right, enabling "Reset crop".
    frame.focus()
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(screen.getByRole('button', { name: 'Reset crop' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Reset crop' }))
    expect(screen.getByRole('button', { name: 'Reset crop' })).toBeDisabled()
  })
})

describe('analysing and showing results', () => {
  it('runs the analysis on the edited photo and shows the results', async () => {
    const result = fakeAnalysisResult()
    analyzeFaceMock.mockImplementation(async (_canvas, options) => {
      options?.onStage?.('detecting')
      return result
    })
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    expect(await screen.findByRole('heading', { name: 'Your facial proportions' })).toBeInTheDocument()
    expect(analyzeFaceMock).toHaveBeenCalledTimes(1)
    const [canvas] = analyzeFaceMock.mock.calls[0]!
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect([canvas.width, canvas.height]).toEqual([1000, 1000])
    // The honest framing is always on screen.
    expect(screen.getByText(/not a beauty score/i)).toBeInTheDocument()
  })

  it('shows progress while the model loads and offers cancel', async () => {
    let finish!: (r: AnalysisResult) => void
    analyzeFaceMock.mockImplementation(
      (_c, options) =>
        new Promise((resolve) => {
          options.onStage('loading-model')
          options.onModelProgress({ stage: 'downloading', loaded: 1_000_000, total: 4_000_000 })
          finish = resolve
        }),
    )
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    expect(await screen.findByText('Preparing the face model')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Analysis progress' })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByText(/downloaded once/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    await act(async () => finish(fakeAnalysisResult()))
    expect(await screen.findByRole('heading', { name: 'Your facial proportions' })).toBeInTheDocument()
  })

  it('Cancel aborts the analysis and returns to the photo step', async () => {
    let signal: AbortSignal | undefined
    analyzeFaceMock.mockImplementation((_c, options) => {
      signal = options.signal
      return new Promise(() => undefined)
    })
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(signal?.aborted).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
  })

  it('ignores a result that arrives after the analysis was cancelled', async () => {
    let finish!: (r: AnalysisResult) => void
    analyzeFaceMock.mockImplementation((_c, _o) => new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await act(async () => finish(fakeAnalysisResult()))
    expect(screen.getByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your facial proportions' })).not.toBeInTheDocument()
  })

  it('"Clear photo & results" removes everything and frees the canvases', async () => {
    analyzeFaceMock.mockResolvedValue(fakeAnalysisResult())
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await screen.findByRole('heading', { name: 'Your facial proportions' })
    const analysed = analyzeFaceMock.mock.calls[0]![0] as HTMLCanvasElement
    expect(analysed.width).toBe(1000)
    await user.click(screen.getByRole('button', { name: /Clear photo & results/ }))
    expect(screen.getByRole('heading', { name: 'Analyze a photo' })).toBeInTheDocument()
    // Shown on screen and announced through the polite live region.
    expect(screen.getAllByText(/removed from this page/i).length).toBeGreaterThanOrEqual(1)
    expect(analysed.width).toBe(0) // pixel memory released
    expect(screen.queryByRole('img', { name: /Your photo with facial landmarks/ })).not.toBeInTheDocument()
  })

  it('"Analyze another photo" starts over', async () => {
    analyzeFaceMock.mockResolvedValue(fakeAnalysisResult())
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await user.click(await screen.findByRole('button', { name: 'Analyze another photo' }))
    expect(screen.getByRole('heading', { name: 'Analyze a photo' })).toBeInTheDocument()
  })

  it('aborts work and releases the model when leaving the page', async () => {
    let signal: AbortSignal | undefined
    analyzeFaceMock.mockImplementation((_c, options) => {
      signal = options.signal
      return new Promise(() => undefined)
    })
    const user = userEvent.setup()
    const { unmount } = renderPage()
    await uploadAndAnalyze(user)
    await screen.findByRole('button', { name: 'Cancel' })
    unmount()
    expect(signal?.aborted).toBe(true)
    expect(releaseLandmarkerMock).toHaveBeenCalled()
  })

  it('never writes the photo or results to browser storage', async () => {
    const localSet = vi.spyOn(Storage.prototype, 'setItem')
    analyzeFaceMock.mockResolvedValue(fakeAnalysisResult())
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await screen.findByRole('heading', { name: 'Your facial proportions' })
    expect(localSet).not.toHaveBeenCalled()
    expect(document.cookie).toBe('')
  })
})

describe('error states', () => {
  const failWith = (error: AnalysisError) => analyzeFaceMock.mockRejectedValue(error)

  it('explains a photo with no face and offers next steps', async () => {
    failWith(new AnalysisError('no-face', 'No face was found in this photo.'))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('No face found')).toBeInTheDocument()
    expect(within(alert).getByText(/No measurements were made/)).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: /Edit & crop/ })).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Choose another photo' })).toBeInTheDocument()
    expect(screen.queryByText(/similarity/i)).not.toBeInTheDocument()
  })

  it('explains multiple faces with the count', async () => {
    failWith(new AnalysisError('multiple-faces', '3 faces', { faceCount: 3 }))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('More than one face found')).toBeInTheDocument()
    expect(within(alert).getByText('3 faces were found in this photo.')).toBeInTheDocument()
  })

  it.each([
    ['pose-too-large', 'The face is turned too far'],
    ['face-too-small', 'The face is too small'],
    ['face-cut-off', 'The face is cut off'],
    ['poor-lighting', 'The lighting is too poor'],
    ['invalid-landmarks', 'The face could not be measured'],
    ['resource-error', 'This device ran out of resources'],
    ['detection-failed', 'Something went wrong while reading the photo'],
  ] as const)('shows a tailored message for %s', async (code, title) => {
    failWith(new AnalysisError(code, 'details'))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    expect(await screen.findByText(title)).toBeInTheDocument()
  })

  it('"Edit & crop" returns to the edit step with the same photo', async () => {
    failWith(new AnalysisError('no-face', 'No face'))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user, jpeg('keep.jpg'))
    await user.click(await screen.findByRole('button', { name: /Edit & crop/ }))
    expect(await screen.findByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
    expect(screen.getByText('keep.jpg')).toBeInTheDocument()
  })

  it('a model download failure offers "Try again", which re-runs the analysis', async () => {
    analyzeFaceMock.mockRejectedValueOnce(new AnalysisError('model-load-failed', 'The model could not be downloaded.'))
    analyzeFaceMock.mockResolvedValueOnce(fakeAnalysisResult())
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    expect(await screen.findByText('The face model could not be loaded')).toBeInTheDocument()
    expect(screen.getByText(/internet connection/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Your facial proportions' })).toBeInTheDocument()
    expect(analyzeFaceMock).toHaveBeenCalledTimes(2)
  })

  it('wraps an unexpected exception into a friendly error instead of crashing', async () => {
    analyzeFaceMock.mockRejectedValue(new TypeError('x is not a function'))
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    expect(await screen.findByText('Something went wrong while reading the photo')).toBeInTheDocument()
  })

  it('shows the failing quality checks for quality-based rejections', async () => {
    const quality = fakeAnalysisResult().quality
    failWith(
      new AnalysisError('pose-too-large', 'The head is turned about 30° sideways.', {
        quality: { ...quality, checks: [{ id: 'yaw', label: 'Facing the camera', status: 'fail', detail: 'Turned.' }] },
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await uploadAndAnalyze(user)
    await screen.findByRole('alert')
    expect(screen.getByText('See the quality checks')).toBeInTheDocument()
  })
})

describe('camera entry points', () => {
  it('opens the camera dialog and requests access when "Open camera" is pressed', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Open camera' }))
    expect(await screen.findByRole('dialog', { name: 'Take a photo' })).toBeInTheDocument()
    await screen.findByRole('button', { name: 'Take photo' })
    expect(camera.getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('takes a photo with the camera and continues to the edit step', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Open camera' }))
    await user.click(await screen.findByRole('button', { name: 'Take photo' }))
    await user.click(screen.getByRole('button', { name: 'Use this photo' }))
    expect(await screen.findByRole('heading', { name: 'Check your photo' })).toBeInTheDocument()
    expect(screen.getByText('Camera photo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('"Take a Photo" from the home page opens the dialog but waits for a click before asking permission', async () => {
    const user = userEvent.setup()
    renderPage('/analysis?source=camera')
    expect(await screen.findByRole('dialog', { name: 'Take a photo' })).toBeInTheDocument()
    expect(camera.getUserMedia).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Start camera' }))
    await screen.findByRole('button', { name: 'Take photo' })
    expect(camera.getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('closing the dialog from the page releases the camera', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Open camera' }))
    await screen.findByRole('button', { name: 'Take photo' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('explains when the camera is unavailable and keeps upload available', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    renderPage()
    expect(screen.getByText(/not supported here/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open camera' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeInTheDocument()
  })
})
