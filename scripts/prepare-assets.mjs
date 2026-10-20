// Copies the MediaPipe WASM runtime out of node_modules and makes sure the
// Face Landmarker model exists in /public, so the app can self-host both and
// never has to contact a third-party CDN at runtime.
//
// Runs automatically after `npm install` and can be re-run with
// `npm run prepare:assets`.
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmDest = join(root, 'public', 'mediapipe', 'wasm')
const modelDest = join(root, 'public', 'models', 'face_landmarker.task')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const MIN_MODEL_BYTES = 1_000_000

async function copyWasm() {
  if (!existsSync(wasmSrc)) {
    console.warn('[prepare-assets] @mediapipe/tasks-vision is not installed yet; skipping WASM copy.')
    return
  }
  await mkdir(wasmDest, { recursive: true })
  // `_module_` variants are only used for module workers (useModule = true),
  // which this app does not use, so skipping them saves ~27 MB of deploy size.
  const files = (await readdir(wasmSrc)).filter((file) => !file.includes('_module_'))
  for (const file of files) {
    await copyFile(join(wasmSrc, file), join(wasmDest, file))
  }
  console.log(`[prepare-assets] Copied ${files.length} MediaPipe WASM files to public/mediapipe/wasm`)
}

async function ensureModel() {
  if (existsSync(modelDest) && (await stat(modelDest)).size > MIN_MODEL_BYTES) {
    return
  }
  console.log('[prepare-assets] Downloading face_landmarker.task (~3.6 MB)…')
  try {
    const response = await fetch(MODEL_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength < MIN_MODEL_BYTES) throw new Error('Downloaded file is unexpectedly small')
    await mkdir(dirname(modelDest), { recursive: true })
    await writeFile(modelDest, buffer)
    console.log('[prepare-assets] Saved public/models/face_landmarker.task')
  } catch (error) {
    // Not fatal: the app falls back to the public Google-hosted copy at runtime.
    console.warn(`[prepare-assets] Could not download the model (${error.message}).`)
    console.warn('[prepare-assets] The app will fall back to the CDN copy at runtime.')
  }
}

await copyWasm()
await ensureModel()
