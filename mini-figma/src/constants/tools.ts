import type { Tool } from '../types/shape'

/** Описание инструмента для тулбара. */
export interface ToolDefinition {
  id: Tool
  label: string
  /** Клавиша-шорткат, показывается в тулбаре. */
  shortcut: string
}

/** Список инструментов — единственный источник правды для тулбара. */
export const TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
]

/** Инструмент, выбранный при старте. */
export const DEFAULT_TOOL: Tool = 'select'

/**
 * Соответствие клавиш инструментам (нижний регистр): V → select, R → rectangle, O → ellipse.
 * Клавиши правятся в одном месте — в TOOLS выше — и мапа строится отсюда,
 * чтобы не было расхождений между тулбаром и горячими клавишами.
 */
export const TOOL_KEY_MAP: Record<string, Tool> = Object.fromEntries(
  TOOLS.map((tool) => [tool.shortcut.toLowerCase(), tool.id] as const),
)