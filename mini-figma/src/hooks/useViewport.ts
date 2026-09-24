import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from 'react'
import type { Point } from '../types/shape'
import { zoomAtPoint, type Viewport } from '../utils/geometry'

export interface ViewportHandlers {
  /** Клиентские координаты события → точка внутри канваса (в px). */
  elementPoint(clientX: number, clientY: number): Point
  handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void
  handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void
  handlePointerUp(event: ReactPointerEvent<HTMLDivElement>): void
  handleWheel(event: ReactWheelEvent<HTMLDivElement>): void
}

export interface UseViewportResult {
  /** Корневой div канваса — на него вешаются события мыши и сетка. */
  containerRef: RefObject<HTMLDivElement | null>
  viewport: Viewport
  /** Зажат ли пробел (режим панорамирования). */
  isSpaceDown: boolean
  /** Идёт ли сейчас перетаскивание канваса. */
  isPanning: boolean
  handlers: ViewportHandlers
}

/**
 * Камера канваса: панорамирование (пробел + левая кнопка, либо средняя кнопка),
 * зум колесом от 10% до 400%, центрирование мира при старте.
 * Чистая логика без интерфейса: Canvas лишь подключает handlers к DOM-событиям.
 */
export function useViewport(): UseViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<Viewport>(() => {
    // pan — мировая координата у левого верхнего угла экрана: screen = (world - pan) * zoom.
    // Чтобы мир (0, 0) оказался в центре, pan стартует с отрицательным знаком ещё до
    // первого ResizeObserver — иначе фигуры вокруг начала координат не видны на старте.
    const screen = typeof window === 'undefined' ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight }
    return {
      panX: -screen.width / 2,
      panY: -screen.height / 2,
      zoom: 1,
      width: 0,
      height: 0,
    }
  })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  // ref'ы — чтобы обработчики событий не пересоздавались на каждый рендер
  const spaceDownRef = useRef(false)
  const panningRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const centeredRef = useRef(false)

  // Размер канваса + центрирование при старте: мир (0, 0) — в центре экрана
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      const { width, height } = rect
      setViewport((prev) => {
        if (!centeredRef.current && width > 0 && height > 0) {
          centeredRef.current = true
          return { ...prev, width, height, panX: -width / 2, panY: -height / 2 }
        }
        return { ...prev, width, height }
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Пробел: включает режим панорамирования и не даёт странице скроллиться
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }
      event.preventDefault()
      spaceDownRef.current = true
      setIsSpaceDown(true)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      spaceDownRef.current = false
      setIsSpaceDown(false)
      // Пробел отпущен посреди перетаскивания — останавливаем панорамирование
      panningRef.current = false
      setIsPanning(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const elementPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
  }, [])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Панорамируем: левой кнопкой при зажатом пробеле или средней кнопкой
      const middleButton = event.button === 1
      if (!spaceDownRef.current && !middleButton) return
      if (event.button !== 0 && !middleButton) return

      event.currentTarget.setPointerCapture(event.pointerId)
      panningRef.current = true
      setIsPanning(true)
      lastPointRef.current = elementPoint(event.clientX, event.clientY)
    },
    [elementPoint],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!panningRef.current) return
      const point = elementPoint(event.clientX, event.clientY)
      const last = lastPointRef.current
      if (!last) {
        lastPointRef.current = point
        return
      }
      lastPointRef.current = point
      // Сдвиг курсора в px → сдвиг камеры в мировых координатах (делим на zoom)
      const dx = point.x - last.x
      const dy = point.y - last.y
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX - dx / prev.zoom,
        panY: prev.panY - dy / prev.zoom,
      }))
    },
    [elementPoint],
  )

  const handlePointerUp = useCallback(() => {
    panningRef.current = false
    lastPointRef.current = null
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      // Плавный, логарифмический фактор: deltaY < 0 → приближение
      const factor = Math.exp(-event.deltaY * 0.0015)
      setViewport((prev) =>
        zoomAtPoint(prev, elementPoint(event.clientX, event.clientY), factor),
      )
    },
    [elementPoint],
  )

  return {
    containerRef,
    viewport,
    isSpaceDown,
    isPanning,
    handlers: {
      elementPoint,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleWheel,
    },
  }
}