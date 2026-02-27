import { ref, watch, computed, onMounted } from 'vue'
import type { Doctor, DoctorType, MarksMap, Constraints, ScheduleResult } from '~/utils/types'
import {
  DOCTOR_COLORS,
  DEFAULT_CONSTRAINTS,
  getDaysInMonth,
  createDefaultDoctors,
} from '~/utils/types'
import { generateSchedule, recalculateStats } from '~/utils/scheduler'

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

export function useAppState() {
  const daysInMonth = computed(() => getDaysInMonth(year.value, month.value))

  // Auto-save on changes
  watch([doctors, month, year, marks, constraints, schedule], () => {
    if (isLoaded.value) saveState()
  }, { deep: true })

  function generate() {
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
    showToast('Το πρόγραμμα δημιουργήθηκε')
  }

  function assignDay(dayIndex: number, doctorId: number | null) {
    if (!schedule.value) return
    schedule.value = [...schedule.value]
    schedule.value[dayIndex] = doctorId
    stats.value = recalculateStats(schedule.value, doctors.value, year.value, month.value, marks.value)
  }

  function setMark(doctorId: number, dayIndex: number, mark: 'block' | 'want' | undefined) {
    const newMarks = { ...marks.value }
    if (!newMarks[doctorId]) newMarks[doctorId] = {}
    if (mark === undefined) {
      delete newMarks[doctorId]![dayIndex]
    }
    else {
      newMarks[doctorId]![dayIndex] = mark
    }
    marks.value = newMarks
  }

  function addDoctor(name: string, type: DoctorType) {
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
  }

  function removeDoctor(id: number) {
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
  }

  function updateDoctor(id: number, updates: Partial<Pick<Doctor, 'name' | 'type'>>) {
    doctors.value = doctors.value.map(d =>
      d.id === id ? { ...d, ...updates } : d,
    )
  }

  function setMonth(m: number, y: number) {
    month.value = m
    year.value = y
    schedule.value = null
    stats.value = null
  }

  function resetAll() {
    doctors.value = createDefaultDoctors()
    marks.value = {}
    constraints.value = { ...DEFAULT_CONSTRAINTS }
    schedule.value = null
    stats.value = null
    nextId.value = 6
    showToast('Επαναφορά ολοκληρώθηκε')
  }

  function importData(data: any) {
    if (data.doctors) doctors.value = data.doctors
    if (data.marks) marks.value = data.marks
    if (data.constraints) constraints.value = { ...DEFAULT_CONSTRAINTS, ...data.constraints }
    if (data.month !== undefined) month.value = data.month
    if (data.year !== undefined) year.value = data.year
    if (data.nextId) nextId.value = data.nextId
    schedule.value = null
    stats.value = null
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
  }
}
