import type { MarksMap, Constraints, Doctor, ShiftType } from '~/utils/types'
import { DEFAULT_CONSTRAINTS } from '~/utils/types'

const STORE_PREFIX = 'efimeries-month-'

export interface MonthScheduleData {
  doctors: Doctor[]
  marks: MarksMap
  schedule: (number | null)[] | null
  constraints: Constraints
  nextId: number
  shiftType?: ShiftType
}

function storageKey(year: number, month: number): string {
  return `${STORE_PREFIX}${year}-${month}`
}

export function useScheduleStore() {
  function saveMonth(year: number, month: number, data: MonthScheduleData) {
    try {
      localStorage.setItem(storageKey(year, month), JSON.stringify(data))
    }
    catch {
      // silently fail
    }
  }

  function loadMonth(year: number, month: number): MonthScheduleData | null {
    try {
      const raw = localStorage.getItem(storageKey(year, month))
      if (!raw) return null
      const data = JSON.parse(raw)
      // Ensure constraints have defaults
      if (data.constraints) {
        data.constraints = { ...DEFAULT_CONSTRAINTS, ...data.constraints }
      }
      return data as MonthScheduleData
    }
    catch {
      return null
    }
  }

  function hasMonth(year: number, month: number): boolean {
    return localStorage.getItem(storageKey(year, month)) !== null
  }

  /** List all saved month keys as [year, month] tuples */
  function listSavedMonths(): [number, number][] {
    const months: [number, number][] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORE_PREFIX)) {
        const parts = key.slice(STORE_PREFIX.length).split('-')
        if (parts.length === 2) {
          months.push([parseInt(parts[0]!, 10), parseInt(parts[1]!, 10)])
        }
      }
    }
    return months
  }

  function deleteMonth(year: number, month: number) {
    try {
      localStorage.removeItem(storageKey(year, month))
    }
    catch {
      // silently fail
    }
  }

  return {
    saveMonth,
    loadMonth,
    hasMonth,
    listSavedMonths,
    deleteMonth,
  }
}
