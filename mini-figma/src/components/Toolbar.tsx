import type { Tool } from '../types/shape'
import { TOOLS } from '../constants/tools'

interface ToolbarProps {
  activeTool: Tool
  onSelectTool(tool: Tool): void
}

/** Панель инструментов слева. Пока каркас: список читается из constants/tools. */
export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
  return (
    <aside className="fixed left-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-zinc-700 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur">
      <p className="px-2 pb-1 pt-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        Tools
      </p>

      {TOOLS.map((def) => {
        const isActive = def.id === activeTool
        return (
          <button
            key={def.id}
            type="button"
            title={`${def.label} (${def.shortcut})`}
            onClick={() => onSelectTool(def.id)}
            className={`flex w-52 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-sky-500/15 font-medium text-sky-300 ring-1 ring-sky-400/40'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <ToolIcon tool={def.id} />
            <span className="flex-1 text-left">{def.label}</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
              {def.shortcut}
            </kbd>
          </button>
        )
      })}

      <p className="px-2 pb-1 pt-2 text-[10px] leading-relaxed text-zinc-600">
        Pan: hold <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-500">Space</kbd> + drag
        <br />
        Zoom: mouse wheel
      </p>
    </aside>
  )
}

/** Векторные иконки инструментов — единый набор (stroke), без эмодзи. */
function ToolIcon({ tool }: { tool: Tool }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (tool) {
    case 'rectangle':
      return (
        <svg {...common}>
          <rect x="2" y="3.5" width="12" height="9" rx="1" />
        </svg>
      )
    case 'ellipse':
      return (
        <svg {...common}>
          <ellipse cx="8" cy="8" rx="6" ry="4.5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M4.2 2v9.8l2.6-2.3 1.5 3.3 1.2-.6-1.5-3.2 2.9-.8z" />
        </svg>
      )
  }
}