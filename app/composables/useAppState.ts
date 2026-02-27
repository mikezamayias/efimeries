import { ref, watch, computed } from 'vue'
import type { Doctor, DoctorType, Mark, MarksMap, Constraints, ScheduleResult, CustomHoliday } from '~/utils/types'
import {
  DOCTOR_COLORS,
  DEFAULT_CONSTRAINTS,
  getDaysInMonth,
  createDefaultDoctors,
} from '~/utils/types'
import { generateSchedule, recalculateStats } from '~/utils/scheduler'
import { useHistory } from '~/composables/useHistory'
import { useScheduleStore } from '~/composables/useScheduleStore'
import { getHolidayMap, mergeCustomHolidays } from '~/utils/holidays'
import type { HistorySnapshot } from '~/composables/useHistory'

const STORAGE_KEY = 'efimeries-state'
const HOLIDAYS_ENABLED_KEY = 'efimeries-auto-holidays'
const CUSTOM_HOLIDAYS_KEY = 'efimeries-custom-holidays'

// Singleton state
const doctors = ref<Doctor[]>(createDefaultDoctors())
const month = ref(new Date().getMonth())
const year = ref(new Date().getFullYear())
const marks = ref<MarksMap>({})
const constraints = ref<Constraints>({ ...DEFAULT_CONSTRAINTS })
const nextId = ref(6)
const schedule = ref<(number | null)[] | null>(null)
const stats = ref<Omit<ScheduleResult, 'schedule'> | null>(null)
const toastMessage = ref<string | null>(null)
const isLoaded = ref(false)
const autoHolidays = ref(true)
const customHolidays = ref<CustomHoliday[]>([])
let nextCustomHolidayId = 1

// Flag to suppress history recording during undo/redo restore
let isRestoring = false

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 3000)
}

function saveState() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      const data = {
        doctors: doctors.value,
        month: month.value,
        year: year.value,
        marks: marks.value,
        constraints: constraints.value,
        nextId: nextId.value,
        schedule: schedule.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

      // Also persist to per-month store
      const store = useScheduleStore()
      store.saveMonth(year.value, month.value, {
        doctors: doctors.value,
        marks: marks.value,
        schedule: schedule.value,
        constraints: constraints.value,
        nextId: nextId.value,
      })
    }
    catch {
      // silently fail
    }
  }, 800)
}

function loadState() {
  try {
    // Load auto-holidays preference
    const holidaysPref = localStorage.getItem(HOLIDAYS_ENABLED_KEY)
    if (holidaysPref !== null) {
      autoHolidays.value = holidaysPref !== 'false'
    }

    // Load custom holidays
    const customHolidaysRaw = localStorage.getItem(CUSTOM_HOLIDAYS_KEY)
    if (customHolidaysRaw) {
      try {
        const parsed = JSON.parse(customHolidaysRaw) as CustomHoliday[]
        customHolidays.value = parsed
        if (parsed.length > 0) {
          nextCustomHolidayId = Math.max(...parsed.map(h => h.id)) + 1
        }
      }
      catch { /* ignore corrupt data */ }
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      isLoaded.value = true
      applyAutoHolidays()
      return
    }
    const data = JSON.parse(raw)
    if (data.doctors) doctors.value = data.doctors
    if (data.month !== undefined) month.value = data.month
    if (data.year !== undefined) year.value = data.year
    if (data.marks) marks.value = data.marks
    if (data.constraints) constraints.value = { ...DEFAULT_CONSTRAINTS, ...data.constraints }
    if (data.nextId) nextId.value = data.nextId
    if (data.schedule) {
      schedule.value = data.schedule
      stats.value = recalculateStats(data.schedule, doctors.value, data.year ?? year.value, data.month ?? month.value, data.marks ?? marks.value)
    }
    isLoaded.value = true
    applyAutoHolidays()
    showToast('Φορτώθηκαν αποθηκευμένα δεδομένα')
  }
  catch {
    isLoaded.value = true
  }
}

/** Apply auto-holiday marks for the current month (without overriding manual marks) */
function applyAutoHolidays() {
  if (!autoHolidays.value && customHolidays.value.length === 0) return

  // Build combined holiday map: auto (if enabled) + custom
  let holidayMap: Record<number, string>
  if (autoHolidays.value) {
    holidayMap = mergeCustomHolidays(year.value, month.value, customHolidays.value)
  } else {
    // Only custom holidays when auto-holidays are off
    holidayMap = {}
    for (const ch of customHolidays.value) {
      if (ch.month === month.value) {
        holidayMap[ch.day - 1] = ch.name
      }
    }
  }
  if (Object.keys(holidayMap).length === 0) return

  const newMarks = { ...marks.value }

  // We use doctor ID 0 as a "system" marker for auto-holidays
  // But since we need holidays visible per-doctor in the scheduler,
  // we apply holiday marks to ALL doctors for those days (if not already manually marked)
  for (const doc of doctors.value) {
    if (!newMarks[doc.id]) newMarks[doc.id] = {}
    for (const dayIndexStr in holidayMap) {
      const dayIndex = parseInt(dayIndexStr, 10)
      const current = newMarks[doc.id]![dayIndex]
      // Don't override existing manual marks (block, want, leave, sick)
      if (current === undefined || current === 'holiday') {
        newMarks[doc.id]![dayIndex] = 'holiday'
      }
    }
  }

  marks.value = newMarks
}

// --- History helpers ---

function takeSnapshot(): HistorySnapshot {
  return {
    doctors: JSON.parse(JSON.stringify(doctors.value)),
    marks: JSON.parse(JSON.stringify(marks.value)),
    schedule: schedule.value ? [...schedule.value] : null,
    nextId: nextId.value,
  }
}

function restoreSnapshot(snapshot: HistorySnapshot) {
  isRestoring = true
  doctors.value = snapshot.doctors
  marks.value = snapshot.marks
  schedule.value = snapshot.schedule
  nextId.value = snapshot.nextId
  if (schedule.value) {
    stats.value = recalculateStats(schedule.value, doctors.value, year.value, month.value, marks.value)
  }
  else {
    stats.value = null
  }
  isRestoring = false
}

/** Snapshot state before running a mutation, then push to undo stack */
function recordAction(action: () => void) {
  if (isRestoring) {
    action()
    return
  }
  const { pushUndo } = useHistory()
  const before = takeSnapshot()
  action()
  pushUndo(before)
}

export function useAppState() {
  const history = useHistory()
  const scheduleStore = useScheduleStore()
  const daysInMonth = computed(() => getDaysInMonth(year.value, month.value))

  // Computed: holiday map for current month (auto + custom)
  const holidayMap = computed(() => {
    if (autoHolidays.value) {
      return mergeCustomHolidays(year.value, month.value, customHolidays.value)
    }
    // Only custom holidays when auto is off
    const map: Record<number, string> = {}
    for (const ch of customHolidays.value) {
      if (ch.month === month.value) {
        map[ch.day - 1] = ch.name
      }
    }
    return map
  })

  // Auto-save on changes
  watch([doctors, month, year, marks, constraints, schedule], () => {
    if (isLoaded.value) saveState()
  }, { deep: true })

  // Persist auto-holidays preference
  watch(autoHolidays, (val) => {
    localStorage.setItem(HOLIDAYS_ENABLED_KEY, String(val))
    if (val) {
      applyAutoHolidays()
    }
  })

  function generate() {
    recordAction(() => {
      const result = generateSchedule(
        doctors.value,
        year.value,
        month.value,
        marks.value,
        constraints.value,
      )
      schedule.value = result.schedule
      const { schedule: _, ...rest } = result
      stats.value = rest
    })
    showToast('Το πρόγραμμα δημιουργήθηκε')
  }

  function assignDay(dayIndex: number, doctorId: number | null) {
    if (!schedule.value) return
    recordAction(() => {
      schedule.value = [...schedule.value!]
      schedule.value[dayIndex] = doctorId
      stats.value = recalculateStats(schedule.value, doctors.value, year.value, month.value, marks.value)
    })
  }

  function setMark(doctorId: number, dayIndex: number, mark: Mark) {
    recordAction(() => {
      const newMarks = { ...marks.value }
      if (!newMarks[doctorId]) newMarks[doctorId] = {}
      if (mark === undefined) {
        delete newMarks[doctorId]![dayIndex]
      }
      else {
        newMarks[doctorId]![dayIndex] = mark
      }
      marks.value = newMarks
    })
  }

  /** Set marks for a range of days (used for leave/sick range selection) */
  function setMarkRange(doctorId: number, startDay: number, endDay: number, mark: Mark) {
    recordAction(() => {
      const newMarks = { ...marks.value }
      if (!newMarks[doctorId]) newMarks[doctorId] = {}
      const from = Math.min(startDay, endDay)
      const to = Math.max(startDay, endDay)
      for (let d = from; d <= to; d++) {
        if (mark === undefined) {
          delete newMarks[doctorId]![d]
        }
        else {
          newMarks[doctorId]![d] = mark
        }
      }
      marks.value = newMarks
    })
  }

  function addDoctor(name: string, type: DoctorType) {
    recordAction(() => {
      const usedColors = new Set(doctors.value.map(d => d.colorIndex))
      let colorIndex = 0
      for (let i = 0; i < DOCTOR_COLORS.length; i++) {
        if (!usedColors.has(i)) {
          colorIndex = i
          break
        }
      }
      doctors.value = [
        ...doctors.value,
        { id: nextId.value, name, type, colorIndex },
      ]
      nextId.value++
      // Apply auto-holidays to new doctor
      if (autoHolidays.value) {
        applyAutoHolidays()
      }
    })
  }

  function removeDoctor(id: number) {
    recordAction(() => {
      doctors.value = doctors.value.filter(d => d.id !== id)
      // Clean marks
      const newMarks = { ...marks.value }
      delete newMarks[id]
      marks.value = newMarks
      // Clean schedule
      if (schedule.value) {
        schedule.value = schedule.value.map(s => (s === id ? null : s))
        stats.value = recalculateStats(schedule.value, doctors.value, year.value, month.value, marks.value)
      }
    })
  }

  function updateDoctor(id: number, updates: Partial<Pick<Doctor, 'name' | 'type'>>) {
    recordAction(() => {
      doctors.value = doctors.value.map(d =>
        d.id === id ? { ...d, ...updates } : d,
      )
    })
  }

  function setMonth(m: number, y: number) {
    // Save current month to per-month store before switching
    scheduleStore.saveMonth(year.value, month.value, {
      doctors: doctors.value,
      marks: marks.value,
      schedule: schedule.value,
      constraints: constraints.value,
      nextId: nextId.value,
    })

    // Month navigation is a context switch — clear history
    history.clearHistory()
    month.value = m
    year.value = y

    // Try to restore from per-month store
    const saved = scheduleStore.loadMonth(m, y)
    // Note: loadMonth takes (year, month) — fixed order
    const restored = scheduleStore.loadMonth(y, m)
    if (restored) {
      doctors.value = restored.doctors
      marks.value = restored.marks
      schedule.value = restored.schedule
      constraints.value = restored.constraints
      nextId.value = restored.nextId
      if (restored.schedule) {
        stats.value = recalculateStats(restored.schedule, doctors.value, y, m, marks.value)
      }
      else {
        stats.value = null
      }
    }
    else {
      // New month — keep doctors, clear the rest
      schedule.value = null
      stats.value = null
      marks.value = {}
    }

    // Apply auto-holidays for new month
    applyAutoHolidays()
  }

  function resetAll() {
    recordAction(() => {
      doctors.value = createDefaultDoctors()
      marks.value = {}
      constraints.value = { ...DEFAULT_CONSTRAINTS }
      schedule.value = null
      stats.value = null
      nextId.value = 6
    })
    applyAutoHolidays()
    showToast('Επαναφορά ολοκληρώθηκε')
  }

  function importData(data: any) {
    recordAction(() => {
      if (data.doctors) doctors.value = data.doctors
      if (data.marks) marks.value = data.marks
      if (data.constraints) constraints.value = { ...DEFAULT_CONSTRAINTS, ...data.constraints }
      if (data.month !== undefined) month.value = data.month
      if (data.year !== undefined) year.value = data.year
      if (data.nextId) nextId.value = data.nextId
      schedule.value = null
      stats.value = null
    })
  }

  function undo() {
    const before = takeSnapshot()
    const snapshot = history.popUndo()
    if (!snapshot) return
    history.pushRedo(before)
    restoreSnapshot(snapshot)
    showToast('Αναίρεση')
  }

  function redo() {
    const before = takeSnapshot()
    const snapshot = history.popRedo()
    if (!snapshot) return
    history.pushUndo(before, false) // don't clear redo stack during redo
    restoreSnapshot(snapshot)
    showToast('Επανάληψη')
  }

  function saveCustomHolidays() {
    localStorage.setItem(CUSTOM_HOLIDAYS_KEY, JSON.stringify(customHolidays.value))
  }

  function addCustomHoliday(name: string, m: number, day: number) {
    customHolidays.value = [
      ...customHolidays.value,
      { id: nextCustomHolidayId++, name, month: m, day },
    ]
    saveCustomHolidays()
    applyAutoHolidays()
  }

  function removeCustomHoliday(id: number) {
    const removed = customHolidays.value.find(h => h.id === id)
    customHolidays.value = customHolidays.value.filter(h => h.id !== id)
    saveCustomHolidays()

    // Remove holiday marks for the removed custom holiday's day (if no other holiday on that day)
    if (removed && removed.month === month.value) {
      const dayIndex = removed.day - 1
      const stillHoliday = holidayMap.value[dayIndex] !== undefined
      if (!stillHoliday) {
        const newMarks = { ...marks.value }
        for (const doc of doctors.value) {
          if (newMarks[doc.id]?.[dayIndex] === 'holiday') {
            delete newMarks[doc.id]![dayIndex]
          }
        }
        marks.value = newMarks
      }
    }
  }

  function toggleAutoHolidays() {
    autoHolidays.value = !autoHolidays.value
    if (!autoHolidays.value) {
      // Remove auto-applied holiday marks (but keep custom holiday marks)
      const autoOnlyDays = getHolidayMap(year.value, month.value)
      // Build set of days that are custom holidays — these should stay
      const customDays = new Set<number>()
      for (const ch of customHolidays.value) {
        if (ch.month === month.value) customDays.add(ch.day - 1)
      }
      const newMarks = { ...marks.value }
      for (const doc of doctors.value) {
        if (!newMarks[doc.id]) continue
        for (const dayIndexStr in autoOnlyDays) {
          const dayIndex = parseInt(dayIndexStr, 10)
          if (newMarks[doc.id]![dayIndex] === 'holiday' && !customDays.has(dayIndex)) {
            delete newMarks[doc.id]![dayIndex]
          }
        }
      }
      marks.value = newMarks
    }
  }

  function initState() {
    loadState()
  }

  return {
    doctors,
    month,
    year,
    marks,
    constraints,
    schedule,
    stats,
    daysInMonth,
    toastMessage,
    isLoaded,
    autoHolidays,
    customHolidays,
    holidayMap,
    generate,
    assignDay,
    setMark,
    setMarkRange,
    addDoctor,
    removeDoctor,
    updateDoctor,
    setMonth,
    resetAll,
    importData,
    initState,
    showToast,
    undo,
    redo,
    toggleAutoHolidays,
    addCustomHoliday,
    removeCustomHoliday,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
