export interface CustomHoliday {
  id: number
  name: string
  month: number  // 0-indexed
  day: number
}

export type DoctorType = 'eidikevomenos' | 'agrotikos'

export interface Doctor {
  id: number
  name: string
  type: DoctorType
  colorIndex: number // 0-9, maps to DOCTOR_COLORS
}

export type Mark = 'block' | 'want' | 'holiday' | 'leave' | 'sick' | undefined

// marks[doctorId][dayIndex] = Mark
export type MarksMap = Record<number, Record<number, Mark>>

export interface Constraints {
  minGap: number       // minimum days between shifts (default 2)
  maxShifts: number    // max shifts per month (default 8)
}

export interface ScheduleResult {
  schedule: (number | null)[]    // doctorId per day (0-indexed, length = days in month)
  counts: Record<number, number>
  friCounts: Record<number, number>
  satCounts: Record<number, number>
  sunCounts: Record<number, number>
  holidayCounts: Record<number, number>
  wantsFulfilled: Record<number, number>
  wantsTotal: Record<number, number>
  leaveCounts: Record<number, number>
  sickCounts: Record<number, number>
}

export interface AppState {
  doctors: Doctor[]
  month: number        // 0-indexed (0 = January)
  year: number
  marks: MarksMap
  constraints: Constraints
  nextId: number
  schedule: (number | null)[] | null
}

// Apple HIG-inspired colors. Rendered as text + 10% opacity bg in chips.
export const DOCTOR_COLORS = [
  '#007AFF', '#34C759', '#AF52DE', '#FF3B30', '#FF9500',
  '#FF2D55', '#5AC8FA', '#FFCC00', '#5856D6', '#FF6482',
] as const

export const DOCTOR_TYPE_LABELS: Record<DoctorType, string> = {
  eidikevomenos: 'Ειδικευόμενος',
  agrotikos: 'Αγροτικός',
}

// Monday-first order for European calendar
export const DAY_NAMES = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'] as const
export const MONTH_NAMES = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
] as const

export const DEFAULT_CONSTRAINTS: Constraints = {
  minGap: 2, // minimum 2: no consecutive (1) and no every-other-day (2)
  maxShifts: 8,
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay() // 0=Sun, 6=Sat
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = getDayOfWeek(year, month, day)
  return dow === 0 || dow === 6
}

export function isSaturday(year: number, month: number, day: number): boolean {
  return getDayOfWeek(year, month, day) === 6
}

export function isSunday(year: number, month: number, day: number): boolean {
  return getDayOfWeek(year, month, day) === 0
}

// Returns Monday-based index: 0=Mon, 1=Tue, ..., 6=Sun
export function getFirstDayOfWeek(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay() // 0=Sun, 6=Sat
  return dow === 0 ? 6 : dow - 1
}

// Returns Monday-based index: 0=Mon, ..., 6=Sun
export function getDayOfWeekMondayBased(year: number, month: number, day: number): number {
  const dow = new Date(year, month, day).getDay()
  return dow === 0 ? 6 : dow - 1
}

export function createDefaultDoctors(): Doctor[] {
  return [
    { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
    { id: 2, name: 'Γιατρός 2', type: 'eidikevomenos', colorIndex: 1 },
    { id: 3, name: 'Γιατρός 3', type: 'eidikevomenos', colorIndex: 2 },
    { id: 4, name: 'Γιατρός 4', type: 'eidikevomenos', colorIndex: 3 },
    { id: 5, name: 'Γιατρός 5', type: 'agrotikos', colorIndex: 4 },
  ]
}
