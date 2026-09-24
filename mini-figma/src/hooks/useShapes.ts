import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrawTool, Point, Shape } from '../types/shape'
import { normalizeRect } from '../utils/geometry'

/** Пара демо-фигур, чтобы канвас не был пустым до шага «рисование». */
const DEMO_SHAPES: Shape[] = [
  { id: 'demo-rect', type: 'rectangle', x: -180, y: -120, width: 260, height: 170, fill: '#ff4d6d' },
  { id: 'demo-ellipse', type: 'ellipse', x: 60, y: 20, width: 240, height: 150, fill: '#06b6d4' },
]

/** Заливка новых фигур по умолчанию (как у первой демо-фигуры). */
const DEFAULT_FILL = '#ff4d6d'

/**
 * Минимальный размер черновика в мировых px: «клик» без перетаскивания
 * не должен создавать вырожденную фигуру-точку.
 */
const MIN_DRAFT_EDGE = 4

/** Максимальная глубина истории отмены (шагов назад). */
const HISTORY_LIMIT = 100

/** Один шаг отмены: состояние фигур и выделения до мутации. */
interface HistoryEntry {
  shapes: Shape[]
  selectedIds: string[]
}

export interface UseShapesResult {
  shapes: Shape[]
  selectedIds: string[]
  /** Черновая фигура во время рисования перетаскиванием; null, когда не рисуем. */
  draftShape: Shape | null
  /** Фигура, которую сейчас перетаскивают мышью; null, когда ничего не двигаем. */
  movingId: string | null
  addShape(shape: Omit<Shape, 'id'>): string
  updateShape(id: string, patch: Partial<Omit<Shape, 'id'>>): void
  selectShape(id: string | null): void
  clearSelection(): void
  /** Начать перетаскивание: фиксируем смещение курсора от левого верхнего угла фигуры. */
  startMove(id: string, point: Point): void
  /** Обновить позицию по текущему курсору (координата уже приведена к миру). */
  updateMove(point: Point): void
  /** Завершить перетаскивание. */
  finishMove(): void
  /** Начать рисование: черновик от точки нажатия до текущего курсора. */
  startDraft(tool: DrawTool, point: Point): void
  /** Обновить черновик по текущему курсору (координата уже приведена к миру). */
  updateDraft(point: Point): void
  /** Зафиксировать черновик как фигуру; возвращает её id и выделяет её. */
  finishDraft(): string | null
  /** Отменить рисование, не создав фигуру. */
  cancelDraft(): void
  /** Отменить последнее изменение фигур (Ctrl+Z). */
  undo(): void
  /** Вернуть отменённое изменение (Ctrl+Shift+Z). */
  redo(): void
}

/**
 * Состояние фигур: список, добавление, изменение, выделение, рисование
 * и перемещение перетаскиванием, а также история изменений для Undo/Redo.
 * Черновик живёт в state для рендера и в ref — зеркале для pointer-обработчиков,
 * чтобы не зависеть от свежести замыканий.
 */
export function useShapes(initial: Shape[] = DEMO_SHAPES): UseShapesResult {
  const [shapes, setShapes] = useState<Shape[]>(initial)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [draftShape, setDraftShape] = useState<Shape | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  // Зеркала черновика: startDraft/updateDraft/finishDraft вызываются из
  // pointer-обработчиков, между событиями которых может не быть перерендера.
  const draftRef = useRef<Shape | null>(null)
  const draftStartRef = useRef<Point | null>(null)

  // Перетаскивание: точка фиксирует id фигуры и смещение курсора от её угла.
  // Смещение вычисляется один раз в startMove и не меняется во время движения.
  const moveStartRef = useRef<{ id: string; offset: Point } | null>(null)

  // История отмены. Снимок берётся не в startMove, а при первом изменении
  // жеста (pendingSnapshotRef) — «клик» по фигуре без движения не плодит
  // пустые шаги отмены. Стеки живут в ref, т.к. UI не показывает их длину.
  const shapesRef = useRef<Shape[]>(shapes)
  const selectedIdsRef = useRef<string[]>(selectedIds)
  useEffect(() => {
    shapesRef.current = shapes
    selectedIdsRef.current = selectedIds
  }, [shapes, selectedIds])
  const historyPast = useRef<HistoryEntry[]>([])
  const historyFuture = useRef<HistoryEntry[]>([])
  const pendingSnapshotRef = useRef(false)

  /** Записать снимок состояния до мутации; пустая мутация шага не создаёт. */
  const snapshotHistory = useCallback(() => {
    const entry: HistoryEntry = {
      shapes: shapesRef.current,
      selectedIds: selectedIdsRef.current,
    }
    const last = historyPast.current[historyPast.current.length - 1]
    if (last && last.shapes === entry.shapes && last.selectedIds === entry.selectedIds) return
    historyPast.current.push(entry)
    if (historyPast.current.length > HISTORY_LIMIT) historyPast.current.shift()
    historyFuture.current = []
  }, [])

  const addShape = useCallback(
    (shape: Omit<Shape, 'id'>): string => {
      snapshotHistory()
      const id = crypto.randomUUID()
      setShapes((prev) => [...prev, { ...shape, id }])
      return id
    },
    [snapshotHistory],
  )

  const updateShape = useCallback(
    (id: string, patch: Partial<Omit<Shape, 'id'>>) => {
      if (moveStartRef.current) {
        // Перетаскивание: снимок берём один раз, при первом изменении позиции
        // (в startMove только «взводим» pendingSnapshotRef)
        if (pendingSnapshotRef.current) {
          pendingSnapshotRef.current = false
          snapshotHistory()
        }
      } else {
        // Одиночная мутация вне жеста (смена цвета) — свой шаг отмены
        snapshotHistory()
      }
      setShapes((prev) =>
        prev.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)),
      )
    },
    [snapshotHistory],
  )

  const selectShape = useCallback((id: string | null) => {
    setSelectedIds(id === null ? [] : [id])
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const startDraft = useCallback((tool: DrawTool, point: Point) => {
    draftStartRef.current = point
    const draft: Shape = {
      // id черновика не попадает в финальную фигуру — addShape генерирует свой
      id: 'draft',
      type: tool,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      fill: DEFAULT_FILL,
    }
    draftRef.current = draft
    setDraftShape(draft)
  }, [])

  const updateDraft = useCallback((point: Point) => {
    const start = draftStartRef.current
    const prev = draftRef.current
    if (!start || !prev) return
    // Нормализация через geometry: координаты могут «уходить» влево/вверх
    const next: Shape = { ...prev, ...normalizeRect(start, point) }
    draftRef.current = next
    setDraftShape(next)
  }, [])

  const finishDraft = useCallback((): string | null => {
    const draft = draftRef.current
    draftRef.current = null
    draftStartRef.current = null
    setDraftShape(null)

    if (!draft || draft.width < MIN_DRAFT_EDGE || draft.height < MIN_DRAFT_EDGE) {
      return null
    }

    const id = addShape({
      type: draft.type,
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      fill: draft.fill,
    })
    // Новая фигура сразу выделяется — цвет можно менять в панели справа
    selectShape(id)
    return id
  }, [addShape, selectShape])

  const cancelDraft = useCallback(() => {
    draftRef.current = null
    draftStartRef.current = null
    setDraftShape(null)
  }, [])

  const startMove = useCallback(
    (id: string, point: Point) => {
      const shape = shapes.find((s) => s.id === id)
      if (!shape) return
      // Взводим отложенный снимок истории: он будет взят при первом
      // движении (в updateShape), а «клик» без движения шаг истории не создаст.
      pendingSnapshotRef.current = true
      // Смещение курсора от левого верхнего угла фигуры: при движении
      // просто вычитаем его из мировой позиции курсора.
      moveStartRef.current = {
        id,
        offset: { x: point.x - shape.x, y: point.y - shape.y },
      }
      setMovingId(id)
    },
    [shapes],
  )

  const updateMove = useCallback(
    (point: Point) => {
      const move = moveStartRef.current
      if (!move) return
      updateShape(move.id, {
        x: point.x - move.offset.x,
        y: point.y - move.offset.y,
      })
    },
    [updateShape],
  )

  const finishMove = useCallback(() => {
    pendingSnapshotRef.current = false
    moveStartRef.current = null
    setMovingId(null)
  }, [])

  const undo = useCallback(() => {
    const prev = historyPast.current.pop()
    if (!prev) return
    // Текущее состояние уходит в «будущее», чтобы его можно было вернуть redo
    historyFuture.current.push({
      shapes: shapesRef.current,
      selectedIds: selectedIdsRef.current,
    })
    // Если нажали Ctrl+Z во время перетаскивания — корректно его завершаем
    pendingSnapshotRef.current = false
    moveStartRef.current = null
    setMovingId(null)
    setShapes(prev.shapes)
    setSelectedIds(prev.selectedIds)
  }, [])

  const redo = useCallback(() => {
    const next = historyFuture.current.pop()
    if (!next) return
    historyPast.current.push({
      shapes: shapesRef.current,
      selectedIds: selectedIdsRef.current,
    })
    if (historyPast.current.length > HISTORY_LIMIT) historyPast.current.shift()
    pendingSnapshotRef.current = false
    moveStartRef.current = null
    setMovingId(null)
    setShapes(next.shapes)
    setSelectedIds(next.selectedIds)
  }, [])

  return {
    shapes,
    selectedIds,
    draftShape,
    movingId,
    addShape,
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
  }
}