import { ref, watch, computed } from 'vue'
import type { Doctor, DoctorType, MarksMap, Constraints, ScheduleResult } from '~/utils/types'
import {
  DOCTOR_COLORS,
  DEFAULT_CONSTRAINTS,
  getDaysInMonth,
  createDefaultDoctors,
} from '~/utils/types'
import { generateSchedule, recalculateStats } from '~/utils/scheduler'
import { useHistory } from '~/composables/useHistory'
import type { HistorySnapshot } from '~/composables/useHistory'

const STORAGE_KEY = 'efimeries-state'

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
    }
    catch {
      // silently fail
    }
  }, 800)
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      isLoaded.value = true
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
    showToast('Φορτώθηκαν αποθηκευμένα δεδομένα')
  }
  catch {
    isLoaded.value = true
  }
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
  const daysInMonth = computed(() => getDaysInMonth(year.value, month.value))

  // Auto-save on changes
  watch([doctors, month, year, marks, constraints, schedule], () => {
    if (isLoaded.value) saveState()
  }, { deep: true })

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

  function setMark(doctorId: number, dayIndex: number, mark: 'block' | 'want' | undefined) {
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
    // Month navigation is a context switch — clear history
    history.clearHistory()
    month.value = m
    year.value = y
    schedule.value = null
    stats.value = null
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
    generate,
    assignDay,
    setMark,
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
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
