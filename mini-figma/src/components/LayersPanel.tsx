import type { Shape } from '../types/shape'

interface LayersPanelProps {
  shapes: Shape[]
  selectedIds: string[]
  /** Клик по слою выделяет фигуру на канвасе. */
  onSelect(id: string): void
}

/** Панель слоёв: список всех фигур. Клик по слою выделяет фигуру на канвасе. */
export function LayersPanel({ shapes, selectedIds, onSelect }: LayersPanelProps) {
  return (
    <aside className="fixed right-[16.5rem] top-3 z-10 w-56 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
      <h2 className="mb-3 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        Layers
      </h2>
      {shapes.length === 0 ? (
        <p className="text-sm text-zinc-500">No layers yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {[...shapes].reverse().map((shape) => {
            const isSelected = selectedIds.includes(shape.id)
            return (
              <li key={shape.id}>
                <button
                  type="button"
                  onClick={() => onSelect(shape.id)}
                  aria-pressed={isSelected}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-sky-500/15 font-medium text-sky-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: shape.fill }}
                  />
                  <span className="truncate">{shape.type} · {shape.id.slice(0, 6)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}