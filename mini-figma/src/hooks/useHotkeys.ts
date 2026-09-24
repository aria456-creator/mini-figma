import { useEffect, useRef } from 'react'
import type { Tool } from '../types/shape'
import { TOOL_KEY_MAP } from '../constants/tools'

export interface HotkeyHandlers {
  /** V/R/O → инструменты. Какие клавиши каким инструментам — решает TOOL_KEY_MAP в constants/tools.ts. */
  onTool?(tool: Tool): void
  /** Ctrl+Z — отменить последнее изменение фигур. */
  onUndo?(): void
  /** Ctrl+Shift+Z — вернуть отменённое изменение. */
  onRedo?(): void
}

/** Элементы, в которых печать не должна перехватываться горячими клавишами. */
const EDITABLE_TAG = /^(INPUT|TEXTAREA|SELECT)$/

/**
 * Горячие клавиши как в Figma. Клавиши инструментов диспетчеризуются по
 * TOOL_KEY_MAP (список — в constants/tools.ts, в одном месте с тулбаром),
 * история — Ctrl+Z / Ctrl+Shift+Z. Слушатель вешается на window один раз,
 * свежие обработчики читаются из ref — никакой переподписки при каждом рендере.
 */
export function useHotkeys({ onTool, onUndo, onRedo }: HotkeyHandlers = {}): void {
  const handlersRef = useRef({ onTool, onUndo, onRedo })
  useEffect(() => {
    handlersRef.current = { onTool, onUndo, onRedo }
  }, [onTool, onUndo, onRedo])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Печать в полях (например, hex-инпут цвета) — не наше дело
      const target = event.target as HTMLElement | null
      if (target && (EDITABLE_TAG.test(target.tagName) || target.isContentEditable)) return
      if (event.repeat || event.altKey) return

      // Раскладка-независимая клавиша: event.code ('KeyR') надёжнее event.key ('к' на русской раскладке)
      const codeKey = event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase() : null
      const key = codeKey ?? event.key.toLowerCase()
      const combo =
        (event.ctrlKey || event.metaKey ? 'ctrl+' : '') +
        (event.shiftKey ? 'shift+' : '') +
        key

      if (combo === 'ctrl+z') {
        event.preventDefault()
        handlersRef.current.onUndo?.()
        return
      }
      if (combo === 'ctrl+shift+z') {
        event.preventDefault()
        handlersRef.current.onRedo?.()
        return
      }

      // Клавиши инструментов — только без Ctrl/Meta (например, Ctrl+V — не про нас)
      if (event.ctrlKey || event.metaKey) return

      const tool = TOOL_KEY_MAP[key]
      if (tool) {
        event.preventDefault()
        handlersRef.current.onTool?.(tool)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}