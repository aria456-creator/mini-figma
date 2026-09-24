import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DrawTool, Point, Shape as ShapeModel, Tool } from '../types/shape'
import { screenToWorld } from '../utils/geometry'
import { useViewport } from '../hooks/useViewport'
import { Shape } from './Shape'

interface CanvasProps {
  shapes: ShapeModel[]
  tool: Tool
  /** Черновик будущей фигуры (не null во время рисования перетаскиванием). */
  draft: ShapeModel | null
  /** Фигура, которую сейчас перетаскивают (не null во время движения). */
  movingId: string | null
  selectedIds: string[]
  onSelectShape(id: string): void
  onClearSelection(): void
  onStartDraft(tool: DrawTool, point: Point): void
  onUpdateDraft(point: Point): void
  onFinishDraft(): void
  onCancelDraft(): void
  onStartMove(id: string, point: Point): void
  onUpdateMove(point: Point): void
  onFinishMove(): void
}

/**
 * Холст на весь экран: сетка на фоне (привязана к миру через pan/zoom),
 * зум колесом и панорамирование пробелом + мышью. События мыши живут здесь:
 * камера (pan/zoom) — в useViewport, данные фигур, рисование и перемещение — в useShapes.
 * Экранные координаты переводятся в мировые через screenToWorld с учётом
 * pan/zoom, поэтому всё рисуется в координатах сетки и масштабируется вместе с ней.
 */
export function Canvas({
  shapes,
  tool,
  draft,
  movingId,
  selectedIds,
  onSelectShape,
  onClearSelection,
  onStartDraft,
  onUpdateDraft,
  onFinishDraft,
  onCancelDraft,
  onStartMove,
  onUpdateMove,
  onFinishMove,
}: CanvasProps) {
  const { containerRef, viewport, isSpaceDown, isPanning, handlers } = useViewport()

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Панорамирование (пробел + левая либо средняя кнопка) — прерогатива камеры
    if (isSpaceDown || event.button === 1) {
      handlers.handlePointerDown(event)
      return
    }
    if (event.button !== 0) return

    const screen = handlers.elementPoint(event.clientX, event.clientY)
    const world = screenToWorld(screen, viewport)

    if (tool !== 'select') {
      // Инструмент рисования: захватываем указатель и ведём черновик до отпускания
      event.currentTarget.setPointerCapture(event.pointerId)
      onStartDraft(tool, world)
      return
    }

    // Инструмент select: клик по фигуре выделяет её и начинает перетаскивание,
    // клик по пустому месту — снимает выделение
    const shapeId = (event.target as HTMLElement | null)
      ?.closest?.('[data-shape-id]')
      ?.getAttribute('data-shape-id')
    if (shapeId) {
      event.currentTarget.setPointerCapture(event.pointerId)
      onSelectShape(shapeId)
      onStartMove(shapeId, world)
      return
    }
    onClearSelection()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const screen = handlers.elementPoint(event.clientX, event.clientY)

    if (draft) {
      onUpdateDraft(screenToWorld(screen, viewport))
      return
    }
    if (movingId) {
      onUpdateMove(screenToWorld(screen, viewport))
      return
    }
    handlers.handlePointerMove(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      onFinishDraft()
      return
    }
    if (movingId) {
      onFinishMove()
      return
    }
    handlers.handlePointerUp(event)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      onCancelDraft()
      return
    }
    if (movingId) {
      onFinishMove()
      return
    }
    handlers.handlePointerUp(event)
  }

  const minor = 16 * viewport.zoom // точка сетки каждые 16 мировых px
  const major = minor * 5
  const gridPosition = `${-viewport.panX * viewport.zoom}px ${-viewport.panY * viewport.zoom}px`

  const cursor = isSpaceDown || isPanning
    ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
    : movingId ? 'cursor-grabbing'
    : tool === 'select' ? 'cursor-default'
    : 'cursor-crosshair'

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 select-none overflow-hidden bg-zinc-900 ${cursor}`}
      onWheel={handlers.handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px),' +
          'radial-gradient(circle, rgba(255,255,255,0.22) 1.5px, transparent 1.5px)',
        backgroundSize: `${minor}px ${minor}px, ${major}px ${major}px`,
        backgroundPosition: `${gridPosition}, ${gridPosition}`,
      }}
    >
      {/* Мир фигур: кликабельны только в режиме select */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {shapes.map((shape) => (
          <Shape
            key={shape.id}
            shape={shape}
            viewport={viewport}
            selected={selectedIds.includes(shape.id)}
            selectable={tool === 'select'}
          />
        ))}
        {/* Черновик рендерится тем же компонентом и тоже масштабируется с канвасом */}
        {draft && <Shape shape={draft} viewport={viewport} />}
      </div>

      {/* HUD: текущий зум */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-800/90 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-lg">
        {Math.round(viewport.zoom * 100)}%
        {isSpaceDown || isPanning ? ' · hold Space to pan' : ''}
      </div>
    </div>
  )
}