import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraModal } from '@/features/camera/CameraModal'
import { checkCameraSupport, describeCameraError } from '@/features/camera/camera-errors'
import { installCameraMock, type CameraMock } from './helpers/camera-mock'

let camera: CameraMock

beforeEach(() => {
  camera = installCameraMock()
})
afterEach(() => {
  camera.restore()
  vi.restoreAllMocks()
})

/** Opens/closes the modal the way the Analysis page does. */
function Harness({
  onCapture = () => undefined,
  autoStart = true,
  initiallyOpen = true,
}: {
  onCapture?: (canvas: HTMLCanvasElement) => void
  autoStart?: boolean
  initiallyOpen?: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <>
      <button onClick={() => setOpen(true)}>open camera</button>
      <CameraModal
        open={open}
        autoStart={autoStart}
        onClose={() => setOpen(false)}
        onCapture={(canvas) => {
          onCapture(canvas)
          setOpen(false)
        }}
      />
    </>
  )
}

const waitForLive = async () => {
  await screen.findByRole('button', { name: 'Take photo' })
}

describe('camera access', () => {
  it('asks for the front camera with video only and shows a live preview', async () => {
    render(<Harness />)
    await waitForLive()
    expect(camera.getUserMedia).toHaveBeenCalledTimes(1)
    const constraints = camera.getUserMedia.mock.calls[0]![0] as MediaStreamConstraints
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toMatchObject({ facingMode: { ideal: 'user' } })
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    expect(video.srcObject).toBe(camera.streams[0])
    expect(camera.streams[0]!.tracks.every((t) => t.stop.mock.calls.length === 0)).toBe(true)
  })

  it('shows a waiting state while the permission prompt is open', async () => {
    camera.restore()
    camera = installCameraMock({ deferred: true })
    render(<Harness />)
    expect(await screen.findByText(/Waiting for camera access/)).toBeInTheDocument()
    act(() => camera.resolveNext())
    await waitForLive()
    expect(screen.queryByText(/Waiting for camera access/)).not.toBeInTheDocument()
  })

  it('does not ask for permission until "Start camera" is pressed when autoStart is off', async () => {
    const user = userEvent.setup()
    render(<Harness autoStart={false} />)
    expect(camera.getUserMedia).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Start camera' }))
    await waitForLive()
    expect(camera.getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('offers to switch cameras only when more than one is available', async () => {
    render(<Harness />)
    await waitForLive()
    expect(await screen.findByRole('button', { name: 'Switch camera' })).toBeInTheDocument()
  })

  it('hides the switch button on a single-camera device', async () => {
    camera.restore()
    camera = installCameraMock({ devices: 1 })
    render(<Harness />)
    await waitForLive()
    await waitFor(() => expect(camera.enumerateDevices).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Switch camera' })).not.toBeInTheDocument()
  })

  it('switches to the rear camera and releases the front stream first', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(await screen.findByRole('button', { name: 'Switch camera' }))
    await waitFor(() => expect(camera.getUserMedia).toHaveBeenCalledTimes(2))
    expect((camera.getUserMedia.mock.calls[1]![0] as MediaStreamConstraints).video).toMatchObject({
      facingMode: { ideal: 'environment' },
    })
    expect(camera.streams[0]!.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
    expect(camera.streams[1]!.tracks.every((t) => t.stop.mock.calls.length === 0)).toBe(true)
  })

  it('retries with relaxed constraints when the device cannot satisfy the ideal ones', async () => {
    camera.getUserMedia.mockImplementationOnce(() =>
      Promise.reject(new DOMException('no match', 'OverconstrainedError')),
    )
    render(<Harness />)
    await waitForLive()
    expect(camera.getUserMedia).toHaveBeenCalledTimes(2)
    expect((camera.getUserMedia.mock.calls[1]![0] as MediaStreamConstraints).video).toBe(true)
  })
})

describe('releasing the camera', () => {
  it('stops every track when the dialog is closed with the close button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    expect(camera.allTracksStopped()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('stops every track when the dialog is closed with Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('stops every track when Cancel is pressed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('stops every track when the component unmounts (leaving the page)', async () => {
    const { unmount } = render(<Harness />)
    await waitForLive()
    unmount()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('stops a stream that only arrives after the dialog was already closed', async () => {
    camera.restore()
    camera = installCameraMock({ deferred: true })
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByText(/Waiting for camera access/)
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    // The user grants permission after closing — the late stream must be shut down at once.
    await act(async () => camera.resolveNext())
    expect(camera.streams).toHaveLength(1)
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('stops the camera when the page is hidden or unloaded', async () => {
    render(<Harness />)
    await waitForLive()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('reopening the dialog starts a fresh stream and closing releases it again', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByRole('button', { name: 'open camera' }))
    await waitForLive()
    expect(camera.streams).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('returns focus to the control that opened the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness initiallyOpen={false} />)
    const opener = screen.getByRole('button', { name: 'open camera' })
    await user.click(opener)
    await waitForLive()
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })
})

describe('capture, retake and confirm', () => {
  it('switches the camera off as soon as the photo is taken', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    expect(camera.allTracksStopped()).toBe(true)
    expect(screen.getByRole('img', { name: 'The photo you just took' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retake' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this photo' })).toBeInTheDocument()
  })

  it('"Use this photo" hands over a canvas at the camera resolution and closes the dialog', async () => {
    const user = userEvent.setup()
    const onCapture = vi.fn()
    render(<Harness onCapture={onCapture} />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await user.click(screen.getByRole('button', { name: 'Use this photo' }))
    expect(onCapture).toHaveBeenCalledTimes(1)
    const canvas = onCapture.mock.calls[0]![0] as HTMLCanvasElement
    expect([canvas.width, canvas.height]).toEqual([640, 480])
    // The receiver owns the canvas now: closing the dialog must not wipe it.
    expect(canvas.width).toBe(640)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('"Retake" discards the still, restarts the camera and keeps working', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await user.click(screen.getByRole('button', { name: 'Retake' }))
    await waitForLive()
    expect(camera.getUserMedia).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('img', { name: 'The photo you just took' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('releases the still image if the dialog is closed without using it', async () => {
    const user = userEvent.setup()
    const created: HTMLCanvasElement[] = []
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string, opts?: ElementCreationOptions) => {
      const element = originalCreate(tag, opts)
      if (tag === 'canvas') created.push(element as HTMLCanvasElement)
      return element
    }) as typeof document.createElement)
    render(<Harness />)
    await waitForLive()
    created.length = 0
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    // The first canvas created by the click is the captured frame itself.
    const frame = created[0]!
    expect(frame.width).toBe(640)
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(frame.width).toBe(0)
  })

  it('shows a hint instead of crashing when the video has no frame yet', async () => {
    camera.restore()
    camera = installCameraMock({ videoSize: { width: 0, height: 0 } })
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    expect(screen.getByText(/camera is not ready yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use this photo' })).not.toBeInTheDocument()
  })
})

describe('camera problems', () => {
  it.each([
    ['NotAllowedError', /permission was blocked/i, true],
    ['NotFoundError', /no camera found/i, true],
    ['NotReadableError', /camera is busy/i, true],
    ['SomethingElse', /could not be started/i, true],
  ])('explains %s and offers a way forward', async (name, title, canRetry) => {
    camera.restore()
    camera = installCameraMock({ reject: { name } })
    render(<Harness />)
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload a photo instead' })).toBeInTheDocument()
    expect(!!screen.queryByRole('button', { name: 'Try again' })).toBe(canRetry)
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument()
  })

  it('"Try again" after a denial asks again and recovers once permission is granted', async () => {
    camera.getUserMedia.mockImplementationOnce(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByText(/permission was blocked/i)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitForLive()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('"Upload a photo instead" closes the dialog', async () => {
    camera.restore()
    camera = installCameraMock({ reject: { name: 'NotAllowedError' } })
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Upload a photo instead' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reports a browser without camera support', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    render(<Harness />)
    expect(await screen.findByText(/not supported here/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('reports an insecure (non-HTTPS) page', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    try {
      render(<Harness />)
      expect(await screen.findByText(/needs a secure connection/i)).toBeInTheDocument()
      expect(camera.getUserMedia).not.toHaveBeenCalled()
    } finally {
      delete (window as unknown as Record<string, unknown>).isSecureContext
    }
  })
})

describe('camera-errors helpers', () => {
  it('maps DOM exception names to error kinds', () => {
    expect(describeCameraError(new DOMException('', 'NotAllowedError')).kind).toBe('denied')
    expect(describeCameraError(new DOMException('', 'SecurityError')).kind).toBe('denied')
    expect(describeCameraError(new DOMException('', 'NotFoundError')).kind).toBe('not-found')
    expect(describeCameraError(new DOMException('', 'NotReadableError')).kind).toBe('in-use')
    expect(describeCameraError(new Error('x')).kind).toBe('unknown')
    expect(describeCameraError('weird').kind).toBe('unknown')
  })

  it('checkCameraSupport reflects the environment', () => {
    expect(checkCameraSupport()).toBeNull()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    expect(checkCameraSupport()?.kind).toBe('unsupported')
  })
})

describe('dialog accessibility', () => {
  it('is a labelled modal dialog and keeps keyboard focus inside', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    const dialog = screen.getByRole('dialog', { name: 'Take a photo' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('closes when the backdrop is clicked', async () => {
    render(<Harness />)
    await waitForLive()
    const backdrop = document.querySelector('[aria-hidden="true"].bg-ink\\/60') as HTMLElement
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(camera.allTracksStopped()).toBe(true)
  })

  it('locks page scrolling while open and restores it afterwards', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await waitForLive()
    expect(document.body.style.overflow).toBe('hidden')
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
