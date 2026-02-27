import { ref, computed } from 'vue'
import type { Doctor, MarksMap } from '~/utils/types'

export interface HistorySnapshot {
  doctors: Doctor[]
  marks: MarksMap
  schedule: (number | null)[] | null
  nextId: number
}

const MAX_HISTORY = 50

const undoStack = ref<HistorySnapshot[]>([])
const redoStack = ref<HistorySnapshot[]>([])

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function useHistory() {
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /** Push a snapshot to the undo stack. Clears redo by default (new user action). */
  function pushUndo(snapshot: HistorySnapshot, clearRedo = true) {
    const cloned = deepClone(snapshot)
    if (undoStack.value.length >= MAX_HISTORY) {
      undoStack.value = [...undoStack.value.slice(1), cloned]
    }
    else {
      undoStack.value = [...undoStack.value, cloned]
    }
    if (clearRedo) {
      redoStack.value = []
    }
  }

  function popUndo(): HistorySnapshot | undefined {
    if (undoStack.value.length === 0) return undefined
    const stack = [...undoStack.value]
    const snapshot = stack.pop()!
    undoStack.value = stack
    return snapshot
  }

  function pushRedo(snapshot: HistorySnapshot) {
    redoStack.value = [...redoStack.value, deepClone(snapshot)]
  }

  function popRedo(): HistorySnapshot | undefined {
    if (redoStack.value.length === 0) return undefined
    const stack = [...redoStack.value]
    const snapshot = stack.pop()!
    redoStack.value = stack
    return snapshot
  }

  function clearHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    canUndo,
    canRedo,
    pushUndo,
    popUndo,
    pushRedo,
    popRedo,
    clearHistory,
  }
}
