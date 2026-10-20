import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACCEPT_ATTRIBUTE,
  ImageFileError,
  MAX_FILE_BYTES,
  sniffImageType,
  validateImageFile,
} from '@/features/image-upload/file-validation'
import { MIN_CROP_SIZE, resizeRect } from '@/features/image-upload/crop-utils'
import { translate } from '@/i18n'
import {
  FULL_RECT,
  applyEdits,
  canvasFromSource,
  clampRect,
  cropCanvas,
  decodeImageFile,
  fitWithin,
  isFullRect,
  releaseCanvas,
  rotateCanvas,
} from '@/features/image-upload/image-utils'

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]
const HTML = [...'<!doctype html><html>'].map((c) => c.charCodeAt(0))

const file = (bytes: number[], name: string, type: string) => new File([new Uint8Array(bytes)], name, { type })

describe('sniffImageType', () => {
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffImageType(new Uint8Array(JPEG))).toBe('image/jpeg')
    expect(sniffImageType(new Uint8Array(PNG))).toBe('image/png')
    expect(sniffImageType(new Uint8Array(WEBP))).toBe('image/webp')
  })

  it('rejects everything else', () => {
    expect(sniffImageType(new Uint8Array(HTML))).toBeNull()
    expect(sniffImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull() // GIF
    expect(sniffImageType(new Uint8Array([]))).toBeNull()
    // RIFF but not WEBP (e.g. WAV)
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBeNull()
  })
})

describe('validateImageFile', () => {
  it('accepts JPG, JPEG, PNG and WebP files', async () => {
    await expect(validateImageFile(file(JPEG, 'a.jpg', 'image/jpeg'))).resolves.toBe('image/jpeg')
    await expect(validateImageFile(file(JPEG, 'a.jpeg', 'image/jpeg'))).resolves.toBe('image/jpeg')
    await expect(validateImageFile(file(PNG, 'a.png', 'image/png'))).resolves.toBe('image/png')
    await expect(validateImageFile(file(WEBP, 'a.webp', 'image/webp'))).resolves.toBe('image/webp')
  })

  it('falls back to the extension when the browser reports no MIME type', async () => {
    await expect(validateImageFile(file(PNG, 'photo.PNG', ''))).resolves.toBe('image/png')
  })

  it('rejects empty files', async () => {
    await expect(validateImageFile(file([], 'a.jpg', 'image/jpeg'))).rejects.toMatchObject({ code: 'empty' })
  })

  it('rejects files over the size limit with the size in the message', async () => {
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' })
    const error = await validateImageFile(big).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ImageFileError)
    expect((error as ImageFileError).code).toBe('too-large')
    expect((error as ImageFileError).message).toMatch(/15 MB/)
  })

  it.each([
    ['a GIF', file([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3, 4], 'a.gif', 'image/gif')],
    ['a PDF', file([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3], 'a.pdf', 'application/pdf')],
    ['a text file', file(HTML, 'a.txt', 'text/plain')],
    ['an unknown extension without a type', file(JPEG, 'a.bin', '')],
  ])('rejects %s by declared type', async (_name, f) => {
    await expect(validateImageFile(f)).rejects.toMatchObject({ code: 'unsupported-type' })
  })

  it('rejects HTML disguised as a JPEG (content does not match)', async () => {
    const error = await validateImageFile(file(HTML, 'evil.jpg', 'image/jpeg')).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'unsupported-type' })
    expect((error as Error).message).toMatch(/real/)
  })

  it('exposes the accepted formats for the file input', () => {
    expect(ACCEPT_ATTRIBUTE).toContain('image/jpeg')
    expect(ACCEPT_ATTRIBUTE).toContain('image/png')
    expect(ACCEPT_ATTRIBUTE).toContain('image/webp')
    expect(ACCEPT_ATTRIBUTE).toContain('.jpeg')
  })
})

describe('geometry helpers', () => {
  it('fitWithin scales down the longest side only', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
    expect(fitWithin(1000, 3000, 1500)).toEqual({ width: 500, height: 1500 })
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 })
  })

  it('clampRect keeps a rectangle inside the image with a minimum size', () => {
    expect(clampRect({ x: -0.2, y: 0.9, width: 0.5, height: 0.5 })).toEqual({ x: 0, y: 0.5, width: 0.5, height: 0.5 })
    expect(clampRect({ x: 0.5, y: 0.5, width: 5, height: 0 })).toMatchObject({ width: 1, height: 0.05, x: 0 })
  })

  it('isFullRect recognises "no crop"', () => {
    expect(isFullRect(FULL_RECT)).toBe(true)
    expect(isFullRect({ x: 0.1, y: 0, width: 0.9, height: 1 })).toBe(false)
  })
})

describe('canvas editing', () => {
  const canvas = (w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }

  it('rotates by quarter turns, swapping dimensions for odd turns', () => {
    const source = canvas(300, 200)
    expect([rotateCanvas(source, 0).width, rotateCanvas(source, 0).height]).toEqual([300, 200])
    expect([rotateCanvas(source, 1).width, rotateCanvas(source, 1).height]).toEqual([200, 300])
    expect([rotateCanvas(source, 2).width, rotateCanvas(source, 2).height]).toEqual([300, 200])
    expect([rotateCanvas(source, 3).width, rotateCanvas(source, 3).height]).toEqual([200, 300])
  })

  it('crops to a normalised rectangle', () => {
    const cropped = cropCanvas(canvas(1000, 800), { x: 0.25, y: 0.5, width: 0.5, height: 0.25 })
    expect([cropped.width, cropped.height]).toEqual([500, 200])
  })

  it('applyEdits rotates first, then crops, without touching the source', () => {
    const source = canvas(1000, 500)
    const result = applyEdits(source, 1, { x: 0, y: 0, width: 1, height: 0.5 })
    // rotated: 500 × 1000, then keep the top half → 500 × 500
    expect([result.width, result.height]).toEqual([500, 500])
    expect([source.width, source.height]).toEqual([1000, 500])
  })

  it('canvasFromSource downsizes huge sources', () => {
    const copy = canvasFromSource(canvas(10, 10), 6000, 4000, 2048)
    expect([copy.width, copy.height]).toEqual([2048, 1365])
  })

  it('releaseCanvas frees the pixel buffer and tolerates null', () => {
    const c = canvas(100, 100)
    releaseCanvas(c)
    expect([c.width, c.height]).toEqual([0, 0])
    expect(() => releaseCanvas(null)).not.toThrow()
    expect(() => releaseCanvas(undefined)).not.toThrow()
  })
})

describe('resizeRect (crop dragging)', () => {
  const start = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 }

  it('moves the whole frame but keeps it inside the image', () => {
    const moved = resizeRect(start, 'move', 0.1, -0.05)
    expect(moved.x).toBeCloseTo(0.3, 9)
    expect(moved.y).toBeCloseTo(0.15, 9)
    expect([moved.width, moved.height]).toEqual([0.5, 0.5])
    expect(resizeRect(start, 'move', 5, 5)).toMatchObject({ x: 0.5, y: 0.5 })
    expect(resizeRect(start, 'move', -5, -5)).toMatchObject({ x: 0, y: 0 })
  })

  it('resizes from each edge and corner while the opposite side stays fixed', () => {
    const east = resizeRect(start, 'e', 0.1, 0)
    expect(east.x).toBeCloseTo(0.2, 9)
    expect(east.width).toBeCloseTo(0.6, 9)
    const west = resizeRect(start, 'w', -0.1, 0)
    expect(west.x).toBeCloseTo(0.1, 9)
    expect(west.width).toBeCloseTo(0.6, 9)
    const nw = resizeRect(start, 'nw', 0.1, 0.1)
    expect(nw.x).toBeCloseTo(0.3, 9)
    expect(nw.y).toBeCloseTo(0.3, 9)
    expect(nw.x + nw.width).toBeCloseTo(0.7, 9)
    expect(nw.y + nw.height).toBeCloseTo(0.7, 9)
    const se = resizeRect(start, 'se', 0.1, 0.2)
    expect(se.width).toBeCloseTo(0.6, 9)
    expect(se.height).toBeCloseTo(0.7, 9)
  })

  it('never shrinks below the minimum or grows past the image', () => {
    expect(resizeRect(start, 'e', -5, 0).width).toBeCloseTo(MIN_CROP_SIZE, 9)
    expect(resizeRect(start, 'w', 5, 0).width).toBeCloseTo(MIN_CROP_SIZE, 9)
    const grown = resizeRect(start, 'se', 5, 5)
    expect(grown.x + grown.width).toBeLessThanOrEqual(1 + 1e-9)
    expect(grown.y + grown.height).toBeLessThanOrEqual(1 + 1e-9)
  })
})

describe('decodeImageFile', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('decodes with EXIF orientation and closes the bitmap', async () => {
    const close = vi.fn()
    const createImageBitmap = vi.fn(async () => ({ width: 640, height: 480, close }))
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const canvas = await decodeImageFile(file(JPEG, 'a.jpg', 'image/jpeg'))
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' })
    expect([canvas.width, canvas.height]).toEqual([640, 480])
    expect(close).toHaveBeenCalled()
  })

  it('scales large photos down to the working size', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({ width: 8000, height: 6000, close: () => undefined }))
    const canvas = await decodeImageFile(file(JPEG, 'a.jpg', 'image/jpeg'))
    expect(Math.max(canvas.width, canvas.height)).toBe(2048)
    expect(canvas.width / canvas.height).toBeCloseTo(8000 / 6000, 2)
  })

  it('reports corrupted images as unreadable', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError')
    })
    // The <img> fallback cannot decode either in jsdom.
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }),
    )
    const ImageStub = class {
      decoding = ''
      naturalWidth = 0
      naturalHeight = 0
      src = ''
      decode() {
        return Promise.reject(new Error('decode failed'))
      }
    }
    vi.stubGlobal('Image', ImageStub)
    await expect(decodeImageFile(file(JPEG, 'broken.jpg', 'image/jpeg'))).rejects.toMatchObject({ code: 'unreadable' })
  })

  it('falls back to an <img> element and revokes its temporary URL', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:temp', revokeObjectURL: revoke }))
    vi.stubGlobal(
      'Image',
      class {
        decoding = ''
        naturalWidth = 320
        naturalHeight = 240
        src = ''
        decode() {
          return Promise.resolve()
        }
      },
    )
    const canvas = await decodeImageFile(file(JPEG, 'a.jpg', 'image/jpeg'))
    expect([canvas.width, canvas.height]).toEqual([320, 240])
    expect(revoke).toHaveBeenCalledWith('blob:temp')
  })
})

describe('ImageFileError messages', () => {
  it('carry a language-independent message, with the English text kept for developers', async () => {
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' })
    const error = (await validateImageFile(big).catch((e: unknown) => e)) as ImageFileError
    expect(error.msg.key).toBe('upload.errors.tooLarge')
    expect(error.msg.params).toMatchObject({ limit: 15 })
    expect(error.message).toBe(translate('en', error.msg))
    expect(translate('vi', error.msg)).toMatch(/Giới hạn là 15 MB/)
    expect(translate('vi', error.msg)).not.toMatch(/\{/)
  })

  it.each([
    ['empty', file([], 'a.jpg', 'image/jpeg'), 'upload.errors.empty', /Tệp này trống/],
    ['unsupported type', file([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3], 'a.pdf', 'application/pdf'), 'upload.errors.unsupportedType', /không được hỗ trợ/],
    ['disguised HTML', file(HTML, 'evil.jpg', 'image/jpeg'), 'upload.errors.notRealImage', /không giống ảnh JPG, PNG hoặc WebP thật/],
  ])('translates the %s error into Vietnamese', async (_name, f, key, vietnamese) => {
    const error = (await validateImageFile(f).catch((e: unknown) => e)) as ImageFileError
    expect(error).toBeInstanceOf(ImageFileError)
    expect(error.msg.key).toBe(key)
    expect(translate('vi', error.msg)).toMatch(vietnamese)
  })

  it('reports an undecodable image with a translatable message', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new DOMException('bad', 'InvalidStateError')
    })
    vi.stubGlobal('Image', class {
      decoding = ''
      src = ''
      decode() {
        return Promise.reject(new Error('nope'))
      }
    })
    const error = (await decodeImageFile(file(JPEG, 'a.jpg', 'image/jpeg')).catch((e: unknown) => e)) as ImageFileError
    expect(error.msg.key).toBe('upload.errors.cannotOpen')
    expect(translate('vi', error.msg)).toMatch(/Không thể mở ảnh này/)
  })
})
