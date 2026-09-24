/**
 * Единый язык проекта: типы фигур, инструментов и координат.
 * Все модули говорят об этих сущностях одинаково — TypeScript ловит ошибки ещё до запуска.
 */

/** Вид геометрической фигуры. */
export type ShapeType = 'rectangle' | 'ellipse'

/** Инструмент, выбранный в тулбаре. */
export type Tool = 'select' | 'rectangle' | 'ellipse'

/** Инструменты рисования — те, что создают фигуру перетаскиванием на канвасе. */
export type DrawTool = Extract<Tool, 'rectangle' | 'ellipse'>

/** Точка в координатах мира (канваса). */
export interface Point {
  x: number
  y: number
}

/**
 * Базовая фигура. Позиция (x, y) и размеры заданы в «мировых» координатах,
 * поэтому фигуры не зависят от зума и панорамирования камеры.
 */
export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  fill: string
}