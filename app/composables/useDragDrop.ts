import { ref, onUnmounted } from 'vue'

export interface DragState {
  isDragging: boolean
  sourceDayIndex: number | null
  targetDayIndex: number | null
}

const LONG_PRESS_MS = 500

export function useDragDrop(onSwap: (from: number, to: number) => void) {
  const dragState = ref<DragState>({
    isDragging: false,
    sourceDayIndex: null,
    targetDayIndex: null,
  })

  // ─── HTML5 Drag & Drop (desktop) ───

  function handleDragStart(e: DragEvent, dayIndex: number) {
    if (!e.dataTransfer) return
    dragState.value = { isDragging: true, sourceDayIndex: dayIndex, targetDayIndex: null }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(dayIndex))

    // Ghost styling
    const el = e.target as HTMLElement
    if (el) {
      el.style.opacity = '0.5'
      setTimeout(() => { el.style.opacity = '' }, 0)
    }
  }

  function handleDragOver(e: DragEvent, dayIndex: number) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragState.value.targetDayIndex = dayIndex
  }

  function handleDragEnter(e: DragEvent, dayIndex: number) {
    e.preventDefault()
    dragState.value.targetDayIndex = dayIndex
  }

  function handleDragLeave(_e: DragEvent, dayIndex: number) {
    if (dragState.value.targetDayIndex === dayIndex) {
      dragState.value.targetDayIndex = null
    }
  }

  function handleDrop(e: DragEvent, dayIndex: number) {
    e.preventDefault()
    const from = dragState.value.sourceDayIndex
    if (from !== null && from !== dayIndex) {
      onSwap(from, dayIndex)
    }
    resetDrag()
  }

  function handleDragEnd(_e: DragEvent) {
    resetDrag()
  }

  // ─── Touch (mobile) - long press to drag ───

  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let touchActive = false
  let touchSourceIndex: number | null = null
  let touchClone: HTMLElement | null = null
  let touchStartX = 0
  let touchStartY = 0

  function handleTouchStart(e: TouchEvent, dayIndex: number, cellEl: HTMLElement) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY

    longPressTimer = setTimeout(() => {
      touchActive = true
      touchSourceIndex = dayIndex
      dragState.value = { isDragging: true, sourceDayIndex: dayIndex, targetDayIndex: null }

      // Create floating clone
      touchClone = cellEl.cloneNode(true) as HTMLElement
      const rect = cellEl.getBoundingClientRect()
      touchClone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        opacity: 0.85;
        z-index: 9999;
        pointer-events: none;
        transform: scale(1.08);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        border-radius: 8px;
        transition: transform 0.15s ease;
      `
      document.body.appendChild(touchClone)

      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(30)
    }, LONG_PRESS_MS)
  }

  function handleTouchMove(e: TouchEvent, getCellAtPoint: (x: number, y: number) => number | null) {
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY

    // Cancel long-press if finger moved too far before activation
    if (!touchActive && longPressTimer && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      clearTimeout(longPressTimer)
      longPressTimer = null
      return
    }

    if (!touchActive) return
    e.preventDefault()

    const x = e.touches[0].clientX
    const y = e.touches[0].clientY

    if (touchClone) {
      touchClone.style.left = `${x - touchClone.offsetWidth / 2}px`
      touchClone.style.top = `${y - touchClone.offsetHeight / 2}px`
    }

    const target = getCellAtPoint(x, y)
    dragState.value.targetDayIndex = target
  }

  function handleTouchEnd(_e: TouchEvent) {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }

    if (touchActive && touchSourceIndex !== null && dragState.value.targetDayIndex !== null) {
      if (touchSourceIndex !== dragState.value.targetDayIndex) {
        onSwap(touchSourceIndex, dragState.value.targetDayIndex)
      }
    }

    if (touchClone) {
      touchClone.remove()
      touchClone = null
    }

    touchActive = false
    touchSourceIndex = null
    resetDrag()
  }

  function handleTouchCancel() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    if (touchClone) {
      touchClone.remove()
      touchClone = null
    }
    touchActive = false
    touchSourceIndex = null
    resetDrag()
  }

  function resetDrag() {
    dragState.value = { isDragging: false, sourceDayIndex: null, targetDayIndex: null }
  }

  onUnmounted(() => {
    if (longPressTimer) clearTimeout(longPressTimer)
    if (touchClone) touchClone.remove()
  })

  return {
    dragState,
    // Desktop
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    // Touch
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  }
}
