import { useRef } from 'react'
import { Crop, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CanvasPreview } from '@/components/ui/CanvasPreview'
import { FULL_RECT, isFullRect, type Photo, type QuarterTurns } from './image-utils'
import { resizeRect, type DragMode, type PhotoEdits } from './crop-utils'

interface PhotoEditorProps {
  photo: Photo
  edits: PhotoEdits
  onChange: (edits: PhotoEdits) => void
}

const HANDLES: { mode: DragMode; className: string; cursor: string; label: string }[] = [
  { mode: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize', label: 'top-left corner' },
  { mode: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize', label: 'top edge' },
  { mode: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize', label: 'top-right corner' },
  { mode: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize', label: 'right edge' },
  { mode: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize', label: 'bottom-right corner' },
  { mode: 's', className: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize', label: 'bottom edge' },
  { mode: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize', label: 'bottom-left corner' },
  { mode: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize', label: 'left edge' },
]

export function PhotoEditor({ photo, edits, onChange }: PhotoEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ mode: DragMode; startX: number; startY: number; start: PhotoEdits['crop'] } | null>(null)

  const { crop } = edits
  const cropped = !isFullRect(crop)

  const rotate = (direction: 1 | -1) =>
    onChange({ turns: ((edits.turns + direction + 4) % 4) as QuarterTurns, crop: FULL_RECT })

  const beginDrag = (event: React.PointerEvent, mode: DragMode) => {
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    drag.current = { mode, startX: event.clientX, startY: event.clientY, start: crop }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const active = drag.current
    const stage = stageRef.current
    if (!active || !stage) return
    const bounds = stage.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    const dx = (event.clientX - active.startX) / bounds.width
    const dy = (event.clientY - active.startY) / bounds.height
    onChange({ ...edits, crop: resizeRect(active.start, active.mode, dx, dy) })
  }

  const endDrag = () => {
    drag.current = null
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.02 : 0.01
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = delta[event.key]
    if (!move) return
    event.preventDefault()
    // Arrow keys move the box; with Alt they resize it from the bottom-right corner.
    onChange({ ...edits, crop: resizeRect(crop, event.altKey ? 'se' : 'move', move[0], move[1]) })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => rotate(-1)} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
          Rotate left
        </Button>
        <Button size="sm" variant="secondary" onClick={() => rotate(1)} icon={<RotateCw className="size-4" aria-hidden="true" />}>
          Rotate right
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!cropped}
          onClick={() => onChange({ ...edits, crop: FULL_RECT })}
          icon={<Undo2 className="size-4" aria-hidden="true" />}
        >
          Reset crop
        </Button>
        <p className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          <Crop className="size-3.5" aria-hidden="true" />
          Drag the frame to crop around the face
        </p>
      </div>

      <div className="mt-4 flex justify-center rounded-card bg-ink/5 p-2 sm:p-4">
        <div ref={stageRef} className="relative inline-block max-w-full touch-none select-none">
          <CanvasPreview
            source={photo.canvas}
            turns={edits.turns}
            label="Photo preview"
            maxSide={1100}
            className="block max-h-[62dvh] w-auto max-w-full rounded-lg"
          />
          {/* Dim everything outside the crop frame (kept inside the photo, so nothing else on the page is dimmed). */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 bg-ink/55" style={{ height: `${crop.y * 100}%` }} />
            <div className="absolute inset-x-0 bottom-0 bg-ink/55" style={{ height: `${(1 - crop.y - crop.height) * 100}%` }} />
            <div
              className="absolute left-0 bg-ink/55"
              style={{ top: `${crop.y * 100}%`, height: `${crop.height * 100}%`, width: `${crop.x * 100}%` }}
            />
            <div
              className="absolute right-0 bg-ink/55"
              style={{ top: `${crop.y * 100}%`, height: `${crop.height * 100}%`, width: `${(1 - crop.x - crop.width) * 100}%` }}
            />
          </div>
          <div
            role="group"
            tabIndex={0}
            aria-label="Crop area. Arrow keys move it; Alt plus arrow keys resize it."
            onKeyDown={onKeyDown}
            onPointerDown={(event) => beginDrag(event, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute cursor-move rounded-sm border-2 border-white"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
          >
            {/* rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white" />
            </div>
            {HANDLES.map((handle) => (
              <span
                key={handle.mode}
                aria-hidden="true"
                data-handle={handle.mode}
                onPointerDown={(event) => beginDrag(event, handle.mode)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`absolute size-5 rounded-full border-2 border-white bg-navy shadow ${handle.className}`}
                style={{ cursor: handle.cursor }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
