// Greek public holidays: fixed + Orthodox Easter-based (Meeus algorithm)

import type { CustomHoliday } from '~/utils/types'

export interface Holiday {
  day: number
  name: string
}

// Fixed holidays (month is 1-indexed)
const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Πρωτοχρονιά' },
  { month: 1, day: 6, name: 'Θεοφάνεια' },
  { month: 3, day: 25, name: '25η Μαρτίου' },
  { month: 5, day: 1, name: 'Εργατική Πρωτομαγιά' },
  { month: 8, day: 15, name: 'Κοίμηση Θεοτόκου' },
  { month: 10, day: 28, name: '28η Οκτωβρίου' },
  { month: 12, day: 25, name: 'Χριστούγεννα' },
  { month: 12, day: 26, name: 'Σύναξη Θεοτόκου' },
]

// Easter-based holidays: offset in days from Easter Sunday
const EASTER_BASED_HOLIDAYS: { offset: number; name: string }[] = [
  { offset: -48, name: 'Καθαρά Δευτέρα' },
  { offset: -2, name: 'Μεγάλη Παρασκευή' },
  { offset: -1, name: 'Μεγάλο Σάββατο' },
  { offset: 0, name: 'Κυριακή Πάσχα' },
  { offset: 1, name: 'Δευτέρα Πάσχα' },
  { offset: 50, name: 'Αγίου Πνεύματος' },
]

/**
 * Calculate Orthodox Easter date using Meeus algorithm.
 * Returns a Date in Gregorian calendar.
 */
export function getOrthodoxEaster(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31) // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1

  // Julian to Gregorian conversion
  // For years 1900-2099, the difference is 13 days
  const century = Math.floor(year / 100)
  const julianToGregorianOffset = century - Math.floor(century / 4) - 2

  const julianDate = new Date(year, month - 1, day)
  julianDate.setDate(julianDate.getDate() + julianToGregorianOffset)

  return julianDate
}

/**
 * Get all Greek holidays that fall in a given month.
 * @param year - full year (e.g. 2025)
 * @param month - 0-indexed (0 = January)
 * @returns array of { day, name } for the given month
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays: Holiday[] = []

  // Fixed holidays
  for (const h of FIXED_HOLIDAYS) {
    if (h.month - 1 === month) {
      holidays.push({ day: h.day, name: h.name })
    }
  }

  // Easter-based holidays
  const easter = getOrthodoxEaster(year)
  for (const h of EASTER_BASED_HOLIDAYS) {
    const date = new Date(easter)
    date.setDate(date.getDate() + h.offset)
    if (date.getFullYear() === year && date.getMonth() === month) {
      holidays.push({ day: date.getDate(), name: h.name })
    }
  }

  // Sort by day
  holidays.sort((a, b) => a.day - b.day)

  return holidays
}

/**
 * Build a lookup map: dayIndex (0-based) → holiday name
 */
export function getHolidayMap(year: number, month: number): Record<number, string> {
  const map: Record<number, string> = {}
  for (const h of getHolidaysForMonth(year, month)) {
    map[h.day - 1] = h.name // dayIndex is 0-based
  }
  return map
}

/**
 * Merge auto-holidays with custom recurring holidays for a given month.
 * Custom holidays that fall in the month are added to the map (auto-holidays take precedence on collision).
 */
export function mergeCustomHolidays(
  year: number,
  month: number,
  customHolidays: CustomHoliday[],
): Record<number, string> {
  const map = getHolidayMap(year, month)
  for (const ch of customHolidays) {
    if (ch.month === month) {
      const dayIndex = ch.day - 1
      // Don't override built-in holidays
      if (!(dayIndex in map)) {
        map[dayIndex] = ch.name
      }
    }
  }
  return map
}
