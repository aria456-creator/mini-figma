import { useState } from 'react'
import type { Tool } from './types/shape'
import { DEFAULT_TOOL } from './constants/tools'
import { useShapes } from './hooks/useShapes'
import { useHotkeys } from './hooks/useHotkeys'
import { Canvas } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayersPanel } from './components/LayersPanel'

/**
 * Сборка экрана: канвас на весь экран + три панели поверх.
 * Камера живёт внутри Canvas (useViewport), данные фигур — здесь (useShapes),
 * чтобы панели могли их потреблять.
 */
export default function App() {
  const [tool, setTool] = useState<Tool>(DEFAULT_TOOL)
  const {
    shapes,
    selectedIds,
    draftShape,
    movingId,
    updateShape,
    selectShape,
    clearSelection,
    startDraft,
    updateDraft,
    finishDraft,
    cancelDraft,
    startMove,
    updateMove,
    finishMove,
    undo,
    redo,
  } = useShapes()
  useHotkeys({
    // Клавиши инструментов берутся из TOOL_KEY_MAP (V/R/O) — список в constants/tools.ts
    onTool: (tool) => setTool(tool),
    onUndo: undo,
    onRedo: redo,
  })

  const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id))

  const handleFillChange = (fill: string) => {
    selectedIds.forEach((id) => updateShape(id, { fill }))
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-900 font-sans text-zinc-200 antialiased">
      <Canvas
        shapes={shapes}
        tool={tool}
        draft={draftShape}
        movingId={movingId}
        selectedIds={selectedIds}
        onSelectShape={(id) => selectShape(id)}
        onClearSelection={clearSelection}
        onStartDraft={startDraft}
        onUpdateDraft={updateDraft}
        onFinishDraft={finishDraft}
        onCancelDraft={cancelDraft}
        onStartMove={startMove}
        onUpdateMove={updateMove}
        onFinishMove={finishMove}
      />
      <Toolbar activeTool={tool} onSelectTool={setTool} />
      <PropertiesPanel selectedShapes={selectedShapes} onFillChange={handleFillChange} />
      <LayersPanel shapes={shapes} selectedIds={selectedIds} onSelect={(id) => selectShape(id)} />
    </div>
  )
}