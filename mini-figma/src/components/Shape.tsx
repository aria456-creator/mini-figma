import type { Shape as ShapeModel } from '../types/shape'
import { worldToScreen, type Viewport } from '../utils/geometry'

interface ShapeProps {
  shape: ShapeModel
  viewport: Viewport
  selected?: boolean
  /**
   * Прозрачность фигуры для кликов: включается только при активном
   * инструменте select, чтобы клики доходили до канваса при рисовании.
   */
  selectable?: boolean
}

/** Позиции 8 маркеров вокруг выделенной фигуры (в % от её экранных размеров). */
const HANDLES = [
  { key: 'tl', x: '0%', y: '0%' },
  { key: 'tc', x: '50%', y: '0%' },
  { key: 'tr', x: '100%', y: '0%' },
  { key: 'rc', x: '100%', y: '50%' },
  { key: 'br', x: '100%', y: '100%' },
  { key: 'bc', x: '50%', y: '100%' },
  { key: 'bl', x: '0%', y: '100%' },
  { key: 'lc', x: '0%', y: '50%' },
] as const

/**
 * Рендер одной фигуры. Позиция и размер на экране считаются через worldToScreen,
 * поэтому фигура привязана к сетке и масштабируется вместе с канвасом
 * при зуме и панорамировании. У выделенной фигуры рисуется рамка и маркеры
 * по углам/серединам сторон (маркеры — чистые декорации, не интерактив).
 */
export function Shape({ shape, viewport, selected = false, selectable = false }: ShapeProps) {
  const topLeft = worldToScreen({ x: shape.x, y: shape.y }, viewport)
  const bottomRight = worldToScreen(
    { x: shape.x + shape.width, y: shape.y + shape.height },
    viewport,
  )

  const borderRadius = shape.type === 'ellipse' ? '50%' : '4px'

  return (
    <div
      className="absolute"
      aria-label={`${shape.type} shape`}
      data-shape-id={shape.id}
      data-shape-type={shape.type}
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
        backgroundColor: shape.fill,
        borderRadius,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        pointerEvents: selectable ? 'auto' : 'none',
        cursor: selected ? 'move' : selectable ? 'pointer' : undefined,
      }}
    >
      {selected && (
        <>
          {/* Рамка вокруг фигуры */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-sky-400"
            style={{ borderRadius }}
          />
          {/* Маркеры: 4 угла + 4 середины сторон */}
          {HANDLES.map((handle) => (
            <span
              key={handle.key}
              aria-hidden
              className="pointer-events-none absolute h-2 w-2 rounded-[2px] border border-sky-300 bg-zinc-50 shadow-md"
              style={{ left: handle.x, top: handle.y, transform: 'translate(-50%, -50%)' }}
            />
          ))}
        </>
      )}
    </div>
  )
}