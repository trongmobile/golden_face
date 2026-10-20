import { vi } from 'vitest'

export interface FakeTrack {
  kind: 'video'
  stop: ReturnType<typeof vi.fn>
  readyState: 'live' | 'ended'
}

export interface FakeStream {
  id: string
  tracks: FakeTrack[]
  getTracks: () => FakeTrack[]
}

export interface CameraMock {
  getUserMedia: ReturnType<typeof vi.fn>
  enumerateDevices: ReturnType<typeof vi.fn>
  streams: FakeStream[]
  /** Every track that was ever handed out has been stopped. */
  allTracksStopped: () => boolean
  /** Resolve a getUserMedia call that was started with `deferred: true`. */
  resolveNext: () => void
  restore: () => void
}

let counter = 0

function makeStream(): FakeStream {
  const tracks: FakeTrack[] = [1, 2].map(() => {
    const track: FakeTrack = { kind: 'video', readyState: 'live', stop: vi.fn() }
    track.stop.mockImplementation(() => {
      track.readyState = 'ended'
    })
    return track
  })
  return { id: `stream-${++counter}`, tracks, getTracks: () => tracks }
}

/**
 * Installs a fake `navigator.mediaDevices`, plus the media-element bits jsdom lacks
 * (`srcObject`, `play`, `videoWidth`).
 */
export function installCameraMock(
  options: {
    devices?: number
    reject?: { name: string } | null
    deferred?: boolean
    videoSize?: { width: number; height: number }
  } = {},
): CameraMock {
  const { devices = 2, reject = null, deferred = false, videoSize = { width: 640, height: 480 } } = options
  const streams: FakeStream[] = []
  const pending: Array<() => void> = []

  const getUserMedia = vi.fn((_constraints: MediaStreamConstraints) => {
    if (reject) return Promise.reject(Object.assign(new Error(reject.name), { name: reject.name }))
    const stream = makeStream()
    streams.push(stream)
    if (deferred) {
      return new Promise<FakeStream>((resolve) => pending.push(() => resolve(stream)))
    }
    return Promise.resolve(stream)
  })
  const enumerateDevices = vi.fn(async () =>
    Array.from({ length: devices }, (_, i) => ({ kind: 'videoinput', deviceId: `cam-${i}`, label: '', groupId: '' })),
  )

  const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  })

  const proto = HTMLMediaElement.prototype as unknown as Record<string, unknown>
  const savedProto = {
    play: proto.play,
    pause: proto.pause,
    srcObject: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject'),
    videoWidth: Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoWidth'),
    videoHeight: Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoHeight'),
  }
  proto.play = vi.fn(() => Promise.resolve())
  proto.pause = vi.fn()
  const sources = new WeakMap<object, unknown>()
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    get(this: object) {
      return sources.get(this) ?? null
    },
    set(this: object, value: unknown) {
      sources.set(this, value)
    },
  })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => videoSize.width })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => videoSize.height })

  return {
    getUserMedia,
    enumerateDevices,
    streams,
    allTracksStopped: () => streams.every((stream) => stream.tracks.every((track) => track.stop.mock.calls.length > 0)),
    resolveNext: () => pending.shift()?.(),
    restore: () => {
      if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices)
      else delete (navigator as unknown as Record<string, unknown>).mediaDevices
      proto.play = savedProto.play
      proto.pause = savedProto.pause
      for (const [target, key, descriptor] of [
        [HTMLMediaElement.prototype, 'srcObject', savedProto.srcObject],
        [HTMLVideoElement.prototype, 'videoWidth', savedProto.videoWidth],
        [HTMLVideoElement.prototype, 'videoHeight', savedProto.videoHeight],
      ] as const) {
        if (descriptor) Object.defineProperty(target, key, descriptor)
        else delete (target as unknown as Record<string, unknown>)[key]
      }
    },
  }
}
