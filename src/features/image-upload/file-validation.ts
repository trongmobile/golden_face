export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

/** Value for the `accept` attribute of the file input. */
export const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024)

export type ImageFileErrorCode = 'empty' | 'too-large' | 'unsupported-type' | 'unreadable' | 'too-many-files'

export class ImageFileError extends Error {
  readonly code: ImageFileErrorCode

  constructor(code: ImageFileErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ImageFileError'
    this.code = code
  }
}

const EXTENSION_TO_MIME: Record<string, AcceptedMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Identifies an image by its first bytes, so a renamed text/HTML file is rejected. */
export function sniffImageType(bytes: Uint8Array): AcceptedMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  // "RIFF" ???? "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

function declaredType(file: File): AcceptedMimeType | null {
  if ((ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) return file.type as AcceptedMimeType
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  // Some browsers report an empty MIME type; fall back to the extension in that case only.
  if (file.type === '') return EXTENSION_TO_MIME[extension] ?? null
  return null
}

export async function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * Checks the declared type, the real content type (magic bytes) and the size.
 * Resolves when the file is acceptable, otherwise throws `ImageFileError`.
 */
export async function validateImageFile(file: File): Promise<AcceptedMimeType> {
  if (file.size === 0) {
    throw new ImageFileError('empty', 'This file is empty. Please choose a different photo.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageFileError(
      'too-large',
      `This photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_FILE_MB} MB — try a smaller or compressed copy.`,
    )
  }
  const declared = declaredType(file)
  if (!declared) {
    throw new ImageFileError('unsupported-type', 'Unsupported file type. Please use a JPG, PNG or WebP image.')
  }
  let head: Uint8Array
  try {
    head = await readBytes(file.slice(0, 16))
  } catch (error) {
    throw new ImageFileError('unreadable', 'This file could not be read. Please try again.', { cause: error })
  }
  const actual = sniffImageType(head)
  if (!actual) {
    throw new ImageFileError(
      'unsupported-type',
      'This file does not look like a real JPG, PNG or WebP image, so it cannot be analyzed.',
    )
  }
  return actual
}
