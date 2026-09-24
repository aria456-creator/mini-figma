import { useState } from 'react'
import type { Shape } from '../types/shape'

interface PropertiesPanelProps {
  selectedShapes: Shape[]
  /** Применить цвет ко всем выбранным фигурам. */
  onFillChange(fill: string): void
}

/**
 * Панель свойств справа: редактирование цвета заливки выбранных фигур.
 * Цвет применяется ко всем выбранным фигурам сразу.
 */
export function PropertiesPanel({ selectedShapes, onFillChange }: PropertiesPanelProps) {
  const fill = selectedShapes[0]?.fill ?? '#000000'
  // Текстовое поле hex ведёт свою строку, чтобы можно было печатать
  // посимвольно; в состояние фигур коммитится только валидная #rrggbb.
  const [hexText, setHexText] = useState(fill)
  // Синхронизация текстового поля с выбранной фигурой без эффекта:
  // состояние обновляется прямо во время рендера при смене fill
  const [lastFill, setLastFill] = useState(fill)
  if (fill !== lastFill) {
    setLastFill(fill)
    setHexText(fill)
  }

  const commitHex = (raw: string) => {
    setHexText(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      onFillChange(raw)
    }
  }

  return (
    <aside className="fixed right-3 top-3 z-10 w-60 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
      <h2 className="mb-3 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        Properties
      </h2>

      {selectedShapes.length === 0 ? (
        <p className="text-sm leading-relaxed text-zinc-500">
          Nothing selected. Pick a shape on the canvas to edit it here.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-300">
            {selectedShapes.length}{' '}
            {selectedShapes.length === 1 ? 'shape' : 'shapes'} selected
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-400">Fill color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fill}
                onChange={(event) => onFillChange(event.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 p-1"
                title="Pick a fill color"
              />
              <input
                type="text"
                value={hexText}
                onChange={(event) => commitHex(event.target.value)}
                spellCheck={false}
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs uppercase text-zinc-200 outline-none focus:border-sky-400/60 focus:ring-1 focus:ring-sky-400/40"
                title="Hex color, e.g. #3b82f6"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Applies to {selectedShapes.length === 1 ? 'the selected shape' : `all ${selectedShapes.length} selected shapes`}.
            </p>
          </label>
        </>
      )}
    </aside>
  )
}