import { describe, it, expect } from 'vitest'
import {
  getOrthodoxEaster,
  getHolidaysForMonth,
  getHolidayMap,
  mergeCustomHolidays,
} from '~/utils/holidays'

describe('getOrthodoxEaster', () => {
  it('returns May 5 for 2024', () => {
    const easter = getOrthodoxEaster(2024)
    expect(easter.getFullYear()).toBe(2024)
    expect(easter.getMonth()).toBe(4) // May (0-indexed)
    expect(easter.getDate()).toBe(5)
  })

  it('returns April 20 for 2025', () => {
    const easter = getOrthodoxEaster(2025)
    expect(easter.getFullYear()).toBe(2025)
    expect(easter.getMonth()).toBe(3) // April
    expect(easter.getDate()).toBe(20)
  })

  it('returns April 12 for 2026', () => {
    const easter = getOrthodoxEaster(2026)
    expect(easter.getFullYear()).toBe(2026)
    expect(easter.getMonth()).toBe(3) // April
    expect(easter.getDate()).toBe(12)
  })

  it('returns April 2 for 2023', () => {
    const easter = getOrthodoxEaster(2023)
    expect(easter.getFullYear()).toBe(2023)
    expect(easter.getMonth()).toBe(3) // April
    expect(easter.getDate()).toBe(16)
  })

  it('returns April 28 for 2019', () => {
    const easter = getOrthodoxEaster(2019)
    expect(easter.getFullYear()).toBe(2019)
    expect(easter.getMonth()).toBe(3) // April
    expect(easter.getDate()).toBe(28)
  })
})

describe('getHolidaysForMonth - fixed holidays', () => {
  it('returns Πρωτοχρονιά and Θεοφάνεια for January', () => {
    const holidays = getHolidaysForMonth(2025, 0) // January
    const names = holidays.map(h => h.name)
    expect(names).toContain('Πρωτοχρονιά')
    expect(names).toContain('Θεοφάνεια')
  })

  it('returns 25η Μαρτίου for March', () => {
    const holidays = getHolidaysForMonth(2025, 2) // March
    const names = holidays.map(h => h.name)
    expect(names).toContain('25η Μαρτίου')
  })

  it('returns Εργατική Πρωτομαγιά for May', () => {
    const holidays = getHolidaysForMonth(2025, 4) // May
    const names = holidays.map(h => h.name)
    expect(names).toContain('Εργατική Πρωτομαγιά')
  })

  it('returns Κοίμηση Θεοτόκου for August', () => {
    const holidays = getHolidaysForMonth(2025, 7) // August
    const names = holidays.map(h => h.name)
    expect(names).toContain('Κοίμηση Θεοτόκου')
  })

  it('returns 28η Οκτωβρίου for October', () => {
    const holidays = getHolidaysForMonth(2025, 9) // October
    const names = holidays.map(h => h.name)
    expect(names).toContain('28η Οκτωβρίου')
  })

  it('returns Χριστούγεννα and Σύναξη Θεοτόκου for December', () => {
    const holidays = getHolidaysForMonth(2025, 11) // December
    const names = holidays.map(h => h.name)
    expect(names).toContain('Χριστούγεννα')
    expect(names).toContain('Σύναξη Θεοτόκου')
  })

  it('Πρωτοχρονιά is on day 1', () => {
    const holidays = getHolidaysForMonth(2025, 0)
    const protochronia = holidays.find(h => h.name === 'Πρωτοχρονιά')
    expect(protochronia?.day).toBe(1)
  })

  it('Θεοφάνεια is on day 6', () => {
    const holidays = getHolidaysForMonth(2025, 0)
    const theofaneia = holidays.find(h => h.name === 'Θεοφάνεια')
    expect(theofaneia?.day).toBe(6)
  })
})

describe('getHolidaysForMonth - Easter-based holidays', () => {
  // 2025: Easter is April 20
  it('Καθαρά Δευτέρα falls 48 days before Easter (March 3, 2025)', () => {
    const holidays = getHolidaysForMonth(2025, 2) // March
    const kathara = holidays.find(h => h.name === 'Καθαρά Δευτέρα')
    expect(kathara).toBeDefined()
    expect(kathara?.day).toBe(3)
  })

  it('Κυριακή Πάσχα is in April for 2025', () => {
    const holidays = getHolidaysForMonth(2025, 3) // April
    const pascha = holidays.find(h => h.name === 'Κυριακή Πάσχα')
    expect(pascha).toBeDefined()
    expect(pascha?.day).toBe(20)
  })

  it('Δευτέρα Πάσχα is April 21, 2025', () => {
    const holidays = getHolidaysForMonth(2025, 3) // April
    const deutera = holidays.find(h => h.name === 'Δευτέρα Πάσχα')
    expect(deutera).toBeDefined()
    expect(deutera?.day).toBe(21)
  })

  it('Μεγάλη Παρασκευή is April 18, 2025', () => {
    const holidays = getHolidaysForMonth(2025, 3) // April
    const megali = holidays.find(h => h.name === 'Μεγάλη Παρασκευή')
    expect(megali).toBeDefined()
    expect(megali?.day).toBe(18)
  })

  it('Αγίου Πνεύματος is 50 days after Easter (June 9, 2025)', () => {
    const holidays = getHolidaysForMonth(2025, 5) // June
    const agPnevmatos = holidays.find(h => h.name === 'Αγίου Πνεύματος')
    expect(agPnevmatos).toBeDefined()
    expect(agPnevmatos?.day).toBe(9)
  })

  // 2024: Easter is May 5 — Καθαρά Δευτέρα is March 18
  it('Καθαρά Δευτέρα for 2024 is March 18', () => {
    const holidays = getHolidaysForMonth(2024, 2) // March
    const kathara = holidays.find(h => h.name === 'Καθαρά Δευτέρα')
    expect(kathara).toBeDefined()
    expect(kathara?.day).toBe(18)
  })

  // 2024: Αγίου Πνεύματος is June 24
  it('Αγίου Πνεύματος for 2024 is June 24', () => {
    const holidays = getHolidaysForMonth(2024, 5) // June
    const agPnevmatos = holidays.find(h => h.name === 'Αγίου Πνεύματος')
    expect(agPnevmatos).toBeDefined()
    expect(agPnevmatos?.day).toBe(24)
  })
})

describe('getHolidaysForMonth - sorting', () => {
  it('returns holidays sorted by day', () => {
    // January has New Year (1) and Epiphany (6)
    const holidays = getHolidaysForMonth(2025, 0)
    for (let i = 1; i < holidays.length; i++) {
      expect(holidays[i]!.day).toBeGreaterThanOrEqual(holidays[i - 1]!.day)
    }
  })
})

describe('getHolidaysForMonth - no holidays', () => {
  it('returns empty array for months with no holidays (e.g., February 2025 has none)', () => {
    // February 2025: no fixed holidays, Καθαρά Δευτέρα is March 3
    const holidays = getHolidaysForMonth(2025, 1) // February
    expect(holidays).toHaveLength(0)
  })
})

describe('getHolidayMap', () => {
  it('returns 0-indexed day keys', () => {
    const map = getHolidayMap(2025, 0) // January
    // Πρωτοχρονιά is day 1 → index 0
    expect(map[0]).toBe('Πρωτοχρονιά')
    // Θεοφάνεια is day 6 → index 5
    expect(map[5]).toBe('Θεοφάνεια')
  })

  it('returns empty object for months with no holidays', () => {
    const map = getHolidayMap(2025, 1) // February 2025
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('includes Easter-based holidays', () => {
    // April 2025: Pascha (20), Megali Paraskevi (18), Megalo Savvato (19), Deutera Pascha (21)
    const map = getHolidayMap(2025, 3) // April
    expect(map[19]).toBe('Κυριακή Πάσχα') // day 20, index 19
    expect(map[17]).toBe('Μεγάλη Παρασκευή') // day 18, index 17
  })
})

describe('mergeCustomHolidays', () => {
  it('adds custom holidays to the map', () => {
    const custom = [
      { id: 1, name: 'Τοπική Αργία', month: 0, day: 15 },
    ]
    const map = mergeCustomHolidays(2025, 0, custom)
    expect(map[14]).toBe('Τοπική Αργία') // day 15, index 14
  })

  it('does not override built-in holidays', () => {
    const custom = [
      { id: 1, name: 'Custom', month: 0, day: 1 }, // conflicts with Πρωτοχρονιά
    ]
    const map = mergeCustomHolidays(2025, 0, custom)
    expect(map[0]).toBe('Πρωτοχρονιά') // built-in takes precedence
  })

  it('only adds holidays for matching month', () => {
    const custom = [
      { id: 1, name: 'Wrong Month', month: 5, day: 10 },
    ]
    const map = mergeCustomHolidays(2025, 0, custom)
    expect(map[9]).toBeUndefined()
  })
})
