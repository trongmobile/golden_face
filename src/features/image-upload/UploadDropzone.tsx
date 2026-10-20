import { useRef, useState } from 'react'
import { ImagePlus, Loader2, UploadCloud } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { ACCEPT_ATTRIBUTE, MAX_FILE_MB } from './file-validation'

interface UploadDropzoneProps {
  onFile: (file: File) => void
  busy?: boolean
  error?: string | null
  /** Ref callback so the page can focus the button (e.g. after "Upload Photo" on the home page). */
  buttonRef?: React.Ref<HTMLButtonElement>
}

export function UploadDropzone({ onFile, busy = false, error, buttonRef }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const depth = useRef(0)

  const handleFiles = (files: FileList | null | undefined) => {
    setDropError(null)
    if (!files || files.length === 0) return
    if (files.length > 1) {
      setDropError('Please add one photo at a time.')
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
          {dragging ? 'Drop your photo here' : 'Drag & drop a photo here'}
        </p>
        <p className="mt-1 text-sm text-muted">or choose one from your device</p>

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
          {busy ? 'Opening photo…' : 'Choose a photo'}
        </Button>
        <p className="mt-4 text-xs text-muted">
          JPG, PNG or WebP · up to {MAX_FILE_MB} MB · stays on your device
        </p>
      </div>

      {(error || dropError) && (
        <Alert tone="error" className="mt-4" title="This photo can’t be used">
          {error ?? dropError}
        </Alert>
      )}
    </div>
  )
}
