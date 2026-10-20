import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Bytes that look like a MediaPipe .task bundle: two padding bytes, then a zip signature. */
const MODEL = new Uint8Array(5000)
MODEL.set([0, 0, 0x50, 0x4b, 0x03, 0x04])
const HTML = new TextEncoder().encode('<!doctype html><html>'.padEnd(5000, ' '))

const LOCAL_MODEL = '/models/face_landmarker.task'
const CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

function streamResponse(bytes: Uint8Array, init: ResponseInit = {}) {
  const chunks = [bytes.slice(0, 2000), bytes.slice(2000)]
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'content-length': String(bytes.length) }, ...init })
}

interface Setup {
  fetchMock: ReturnType<typeof vi.fn>
  createFromOptions: ReturnType<typeof vi.fn>
  forVisionTasks: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

async function load(
  routes: Record<string, () => Response | Promise<Response>>,
  options: { gpuFails?: boolean; cpuFails?: boolean } = {},
) {
  vi.resetModules()
  const close = vi.fn()
  const createFromOptions = vi.fn(async (_vision: unknown, opts: { baseOptions: { delegate: string } }) => {
    if (opts.baseOptions.delegate === 'GPU' && options.gpuFails) throw new Error('GPU unavailable')
    if (opts.baseOptions.delegate === 'CPU' && options.cpuFails) throw new Error('CPU unavailable')
    return { close, detect: vi.fn() }
  })
  const forVisionTasks = vi.fn(async (base: string) => ({
    wasmLoaderPath: `${base}/vision_wasm_internal.js`,
    wasmBinaryPath: `${base}/vision_wasm_internal.wasm`,
  }))
  vi.doMock('@mediapipe/tasks-vision', () => ({
    FaceLandmarker: Object.assign(
      { createFromOptions },
      {
        FACE_LANDMARKS_TESSELATION: [{ start: 0, end: 1 }],
        FACE_LANDMARKS_CONTOURS: [{ start: 1, end: 2 }],
        FACE_LANDMARKS_FACE_OVAL: [{ start: 2, end: 3 }],
      },
    ),
    FilesetResolver: { forVisionTasks },
  }))
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    const route = Object.entries(routes).find(([key]) => url.endsWith(key) || url === key)
    if (!route) return new Response('not found', { status: 404 })
    return route[1]()
  })
  vi.stubGlobal('fetch', fetchMock)
  const mod = await import('@/features/face-analysis/landmarker')
  return { mod, mocks: { fetchMock, createFromOptions, forVisionTasks, close } as Setup }
}

const jsOk = () => new Response('//js', { status: 200, headers: { 'content-type': 'text/javascript' } })
const requested = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map(([url]) => String(url))

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.doUnmock('@mediapipe/tasks-vision')
  vi.unstubAllGlobals()
})

describe('looksLikeModelBundle', () => {
  it('accepts a zip bundle that has padding bytes before the signature', async () => {
    const { mod } = await load({})
    expect(mod.looksLikeModelBundle(MODEL)).toBe(true)
    const noPadding = new Uint8Array(2000)
    noPadding.set([0x50, 0x4b, 0x03, 0x04])
    expect(mod.looksLikeModelBundle(noPadding)).toBe(true)
  })

  it('rejects HTML error pages and tiny files', async () => {
    const { mod } = await load({})
    expect(mod.looksLikeModelBundle(HTML)).toBe(false)
    expect(mod.looksLikeModelBundle(new Uint8Array(10))).toBe(false)
    expect(mod.looksLikeModelBundle(new Uint8Array(5000))).toBe(false)
  })
})

describe('loadFaceLandmarker', () => {
  it('self-hosts the model and engine, so no third-party request is made', async () => {
    const { mod, mocks } = await load({
      [LOCAL_MODEL]: () => streamResponse(MODEL),
      '/vision_wasm_internal.js': jsOk,
    })
    const handle = await mod.loadFaceLandmarker()
    expect(handle.delegate).toBe('GPU')
    expect(requested(mocks.fetchMock).every((url) => !url.startsWith('http'))).toBe(true)
    expect(mocks.forVisionTasks).toHaveBeenCalledWith('/mediapipe/wasm')
  })

  it('passes the downloaded bytes to MediaPipe and enables blendshapes and the pose matrix', async () => {
    const { mod, mocks } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    await mod.loadFaceLandmarker()
    const options = mocks.createFromOptions.mock.calls[0]![1] as Record<string, unknown> & {
      baseOptions: { modelAssetBuffer: Uint8Array }
    }
    expect(options.baseOptions.modelAssetBuffer).toHaveLength(MODEL.length)
    expect(options).toMatchObject({
      runningMode: 'IMAGE',
      numFaces: 4,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    })
  })

  it('reports download progress and then the initialising stage', async () => {
    const { mod } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    const events: unknown[] = []
    await mod.loadFaceLandmarker((progress) => events.push(progress))
    expect(events[0]).toEqual({ stage: 'downloading', loaded: 2000, total: 5000 })
    expect(events).toContainEqual({ stage: 'downloading', loaded: 5000, total: 5000 })
    expect(events[events.length - 1]).toEqual({ stage: 'initializing' })
  })

  it('exposes the face connections as index pairs', async () => {
    const { mod } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    const { connections } = await mod.loadFaceLandmarker()
    expect(connections).toEqual({ tesselation: [[0, 1]], contours: [[1, 2]], faceOval: [[2, 3]] })
  })

  it('falls back to the CPU delegate when the GPU one cannot start', async () => {
    const { mod, mocks } = await load(
      { [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk },
      { gpuFails: true },
    )
    const handle = await mod.loadFaceLandmarker()
    expect(handle.delegate).toBe('CPU')
    expect(mocks.createFromOptions).toHaveBeenCalledTimes(2)
  })

  it('fails with a friendly error when neither delegate works', async () => {
    const { mod } = await load(
      { [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk },
      { gpuFails: true, cpuFails: true },
    )
    await expect(mod.loadFaceLandmarker()).rejects.toBeInstanceOf(mod.ModelLoadError)
  })

  it('uses the public CDN copy when the self-hosted file is missing', async () => {
    const { mod, mocks } = await load({ [CDN_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    await mod.loadFaceLandmarker()
    expect(requested(mocks.fetchMock)).toContain(CDN_MODEL)
  })

  it('does not accept an HTML page served in place of the model', async () => {
    const { mod, mocks } = await load({
      [LOCAL_MODEL]: () => streamResponse(HTML),
      [CDN_MODEL]: () => streamResponse(MODEL),
      '/vision_wasm_internal.js': jsOk,
    })
    await mod.loadFaceLandmarker()
    expect(requested(mocks.fetchMock)).toContain(CDN_MODEL)
  })

  it('falls back to the CDN engine when the self-hosted engine is missing', async () => {
    const { mod, mocks } = await load({
      [LOCAL_MODEL]: () => streamResponse(MODEL),
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm/vision_wasm_internal.js': jsOk,
    })
    await mod.loadFaceLandmarker()
    expect(mocks.forVisionTasks).toHaveBeenCalledTimes(2)
    expect(mocks.forVisionTasks.mock.calls[1]![0]).toMatch(/cdn\.jsdelivr\.net/)
  })

  it('rejects an engine location that answers with an HTML page', async () => {
    const { mod } = await load({
      [LOCAL_MODEL]: () => streamResponse(MODEL),
      '/vision_wasm_internal.js': () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    })
    await expect(mod.loadFaceLandmarker()).rejects.toMatchObject({ message: expect.stringMatching(/engine could not be loaded/) })
  })

  it('reports a model that cannot be downloaded anywhere', async () => {
    const { mod } = await load({ '/vision_wasm_internal.js': jsOk })
    await expect(mod.loadFaceLandmarker()).rejects.toMatchObject({
      name: 'ModelLoadError',
      message: expect.stringMatching(/internet connection/),
    })
  })

  it('can be retried after a failure', async () => {
    let available = false
    const { mod, mocks } = await load({
      [LOCAL_MODEL]: () => (available ? streamResponse(MODEL) : new Response('x', { status: 500 })),
      [CDN_MODEL]: () => (available ? streamResponse(MODEL) : new Response('x', { status: 500 })),
      '/vision_wasm_internal.js': jsOk,
    })
    await expect(mod.loadFaceLandmarker()).rejects.toBeInstanceOf(mod.ModelLoadError)
    available = true
    await expect(mod.loadFaceLandmarker()).resolves.toMatchObject({ delegate: 'GPU' })
    expect(mocks.createFromOptions).toHaveBeenCalledTimes(1)
  })

  it('loads once and shares the result between callers', async () => {
    const { mod, mocks } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    const [a, b] = await Promise.all([mod.loadFaceLandmarker(), mod.loadFaceLandmarker()])
    expect(a).toBe(b)
    await mod.loadFaceLandmarker()
    expect(mocks.createFromOptions).toHaveBeenCalledTimes(1)
    expect(requested(mocks.fetchMock).filter((url) => url.endsWith('.task'))).toHaveLength(1)
  })

  it('rejects with AbortError when the caller cancels, without breaking the shared load', async () => {
    const { mod } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    const controller = new AbortController()
    const cancelled = mod.loadFaceLandmarker(undefined, controller.signal)
    controller.abort()
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    await expect(mod.loadFaceLandmarker()).resolves.toMatchObject({ delegate: 'GPU' })
  })

  it('rejects immediately for an already-aborted signal', async () => {
    const { mod } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    const controller = new AbortController()
    controller.abort()
    await expect(mod.loadFaceLandmarker(undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('releaseFaceLandmarker', () => {
  it('closes the model so its WebAssembly memory is freed, and a later load starts fresh', async () => {
    const { mod, mocks } = await load({ [LOCAL_MODEL]: () => streamResponse(MODEL), '/vision_wasm_internal.js': jsOk })
    await mod.loadFaceLandmarker()
    await mod.releaseFaceLandmarker()
    expect(mocks.close).toHaveBeenCalledTimes(1)
    await mod.loadFaceLandmarker()
    expect(mocks.createFromOptions).toHaveBeenCalledTimes(2)
  })

  it('is safe to call when nothing was loaded', async () => {
    const { mod } = await load({})
    await expect(mod.releaseFaceLandmarker()).resolves.toBeUndefined()
  })
})
