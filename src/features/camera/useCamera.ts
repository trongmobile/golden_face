import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasFromSource } from '@/features/image-upload/image-utils'
import { checkCameraSupport, describeCameraError, type CameraError } from './camera-errors'

export type FacingMode = 'user' | 'environment'
export type CameraStatus = 'idle' | 'starting' | 'active' | 'error'

export interface UseCameraResult {
  status: CameraStatus
  error: CameraError | null
  facingMode: FacingMode
  /** True when more than one camera is available, so switching makes sense. */
  canSwitch: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  start: (mode?: FacingMode) => Promise<void>
  stop: () => void
  switchCamera: () => Promise<void>
  /** Grabs the current frame as an un-mirrored canvas, or null when no frame is available. */
  capture: () => HTMLCanvasElement | null
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Camera access with deterministic cleanup: every started stream is stopped when
 * the camera is closed, restarted, or the component unmounts — including a stream
 * that only arrives after the component has already gone away.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<CameraError | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>('user')
  const [canSwitch, setCanSwitch] = useState(false)

  const release = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const stop = useCallback(() => {
    generationRef.current += 1 // invalidates any start() still waiting for permission
    release()
    if (mountedRef.current) {
      setStatus('idle')
      setCanSwitch(false)
    }
  }, [release])

  const start = useCallback(
    async (mode: FacingMode = 'user') => {
      const unsupported = checkCameraSupport()
      if (unsupported) {
        setError(unsupported)
        setStatus('error')
        return
      }

      const generation = ++generationRef.current
      release()
      setError(null)
      setStatus('starting')
      setFacingMode(mode)

      const request = (video: MediaTrackConstraints | boolean) =>
        navigator.mediaDevices.getUserMedia({ video, audio: false })

      let stream: MediaStream
      try {
        try {
          stream = await request({ facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 960 } })
        } catch (firstError) {
          // Constraints the device cannot satisfy: retry with the most permissive request.
          if (firstError instanceof DOMException && firstError.name === 'OverconstrainedError') {
            stream = await request(true)
          } else {
            throw firstError
          }
        }
      } catch (failure) {
        if (generation === generationRef.current && mountedRef.current) {
          setError(describeCameraError(failure))
          setStatus('error')
        }
        return
      }

      // The user closed the camera (or left the page) while the permission prompt was open.
      if (generation !== generationRef.current || !mountedRef.current) {
        stopStream(stream)
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        try {
          await video.play()
        } catch {
          // Autoplay can be refused; the stream stays attached and the user can still capture.
        }
      }
      if (generation !== generationRef.current || !mountedRef.current) return
      setStatus('active')

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (generation === generationRef.current && mountedRef.current) {
          setCanSwitch(devices.filter((device) => device.kind === 'videoinput').length > 1)
        }
      } catch {
        // Not being able to list cameras only hides the "switch" button.
      }
    },
    [release],
  )

  const switchCamera = useCallback(async () => {
    await start(facingMode === 'user' ? 'environment' : 'user')
  }, [facingMode, start])

  const capture = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null
    return canvasFromSource(video, video.videoWidth, video.videoHeight)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const onPageHide = () => release()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      mountedRef.current = false
      generationRef.current += 1
      window.removeEventListener('pagehide', onPageHide)
      release()
    }
  }, [release])

  return { status, error, facingMode, canSwitch, videoRef, start, stop, switchCamera, capture }
}
