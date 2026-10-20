import { useRef, useState } from 'react'
import { ImagePlus, Loader2, UploadCloud } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { msg, useI18n, type Msg } from '@/i18n'
import { cn } from '@/utils/cn'
import { ACCEPT_ATTRIBUTE, MAX_FILE_MB } from './file-validation'

interface UploadDropzoneProps {
  onFile: (file: File) => void
  busy?: boolean
  /** An error from validating or opening the photo, as a translatable message. */
  error?: Msg | null
  /** Ref callback so the page can focus the button (e.g. after "Upload Photo" on the home page). */
  buttonRef?: React.Ref<HTMLButtonElement>
}

export function UploadDropzone({ onFile, busy = false, error, buttonRef }: UploadDropzoneProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<Msg | null>(null)
  const depth = useRef(0)

  const handleFiles = (files: FileList | null | undefined) => {
    setDropError(null)
    if (!files || files.length === 0) return
    if (files.length > 1) {
      setDropError(msg('upload.errors.tooManyFiles'))
      return
    }
    onFile(files[0]!)
  }

  return (
    <div>
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          depth.current += 1
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          depth.current = 0
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        data-dragging={dragging || undefined}
        data-testid="dropzone"
        className={cn(
          'flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-14',
          dragging ? 'border-accent-600 bg-accent-100' : 'border-line-strong bg-paper hover:border-accent-500',
        )}
      >
        <span className="grid size-14 place-items-center rounded-full bg-accent-100 text-accent-700">
          {busy ? (
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          ) : dragging ? (
            <ImagePlus className="size-6" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-6" aria-hidden="true" />
          )}
        </span>
        <p className="mt-5 font-display text-2xl font-medium text-ink">
          {dragging ? t('upload.dropzone.dropHere') : t('upload.dropzone.dragHere')}
        </p>
        <p className="mt-1 text-sm text-muted">{t('upload.dropzone.orChoose')}</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="photo-input"
          onChange={(event) => {
            handleFiles(event.target.files)
            // Allow choosing the same file again after an error or a reset.
            event.target.value = ''
          }}
        />
        <Button
          ref={buttonRef}
          className="mt-6"
          variant="primary"
          loading={busy}
          onClick={() => inputRef.current?.click()}
          icon={<ImagePlus className="size-4" aria-hidden="true" />}
        >
          {busy ? t('upload.dropzone.opening') : t('upload.dropzone.choose')}
        </Button>
        <p className="mt-4 text-xs text-muted">
          {t('upload.dropzone.hint', { limit: MAX_FILE_MB })}
        </p>
      </div>

      {(error || dropError) && (
        <Alert tone="error" className="mt-4" title={t('upload.dropzone.errorTitle')}>
          {t((error ?? dropError)!)}
        </Alert>
      )}
    </div>
  )
}
