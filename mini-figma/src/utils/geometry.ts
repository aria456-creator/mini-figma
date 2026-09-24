import type { Point } from '../types/shape'

/**
 * Камера: какая точка мира находится в левом верхнем углу экрана (panX, panY)
 * и во сколько раз увеличен мир (zoom).
 *
 * Формула преобразования (одинаковая для x и y):
 *   screen.x = (world.x - panX) * zoom
 *   world.x  = panX + screen.x / zoom
 */
export interface Viewport {
  panX: number
  panY: number
  zoom: number
  /** Текущий размер канваса в px — нужен для центрирования и сетки. */
  width: number
  height: number
}

/** Пределы зума: 10% – 400%. */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Экранные координаты мыши (относительно канваса) → мировые координаты.
 * Без этого пересчёта фигуры «уезжают» относительно курсора при зуме и панорамировании.
 */
export function screenToWorld(screen: Point, viewport: Viewport): Point {
  return {
    x: viewport.panX + screen.x / viewport.zoom,
    y: viewport.panY + screen.y / viewport.zoom,
  }
}

/** Мировые координаты → экранные (например, для позиционирования фигур в DOM). */
export function worldToScreen(world: Point, viewport: Viewport): Point {
  return {
    x: (world.x - viewport.panX) * viewport.zoom,
    y: (world.y - viewport.panY) * viewport.zoom,
  }
}

/**
 * Зум вокруг точки экрана: мировая точка под курсором остаётся на месте,
 * «прилипая» к курсору при приближении/отдалении.
 */
export function zoomAtPoint(
  viewport: Viewport,
  screen: Point,
  factor: number,
): Viewport {
  const nextZoom = clampZoom(viewport.zoom * factor)
  if (nextZoom === viewport.zoom) {
    return { ...viewport }
  }
  const world = screenToWorld(screen, viewport)
  return {
    ...viewport,
    zoom: nextZoom,
    panX: world.x - screen.x / nextZoom,
    panY: world.y - screen.y / nextZoom,
  }
}

/**
 * Прямоугольник по двум углам перетаскивания: если пользователь тянул
 * влево/вверх, координаты меняются местами, чтобы x/y всегда были
 * левым верхним углом, а width/height — неотрицательными.
 */
export function normalizeRect(a: Point, b: Point): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}