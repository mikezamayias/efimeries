import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  getDayOfWeek,
  isWeekend,
  isSaturday,
  isSunday,
  getFirstDayOfWeek,
  getDayOfWeekMondayBased,
  createDefaultDoctors,
  DOCTOR_COLORS,
  DAY_NAMES,
  MONTH_NAMES,
  DEFAULT_CONSTRAINTS,
} from '~/utils/types'

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2025, 0)).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2025, 3)).toBe(30)
  })

  it('returns 30 for June', () => {
    expect(getDaysInMonth(2025, 5)).toBe(30)
  })

  it('returns 31 for December', () => {
    expect(getDaysInMonth(2025, 11)).toBe(31)
  })

  it('handles century leap year (2000)', () => {
    expect(getDaysInMonth(2000, 1)).toBe(29)
  })

  it('handles century non-leap year (1900)', () => {
    expect(getDaysInMonth(1900, 1)).toBe(28)
  })
})

describe('getDayOfWeek', () => {
  it('returns 0 for Sunday', () => {
    // 2025-01-05 is a Sunday
    expect(getDayOfWeek(2025, 0, 5)).toBe(0)
  })

  it('returns 6 for Saturday', () => {
    // 2025-01-04 is a Saturday
    expect(getDayOfWeek(2025, 0, 4)).toBe(6)
  })

  it('returns 1 for Monday', () => {
    // 2025-01-06 is a Monday
    expect(getDayOfWeek(2025, 0, 6)).toBe(1)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(2025, 0, 4)).toBe(true)
  })

  it('returns true for Sunday', () => {
    expect(isWeekend(2025, 0, 5)).toBe(true)
  })

  it('returns false for Monday', () => {
    expect(isWeekend(2025, 0, 6)).toBe(false)
  })

  it('returns false for Wednesday', () => {
    expect(isWeekend(2025, 0, 8)).toBe(false)
  })

  it('returns false for Friday', () => {
    expect(isWeekend(2025, 0, 3)).toBe(false)
  })
})

describe('isSaturday', () => {
  it('returns true for Saturday', () => {
    expect(isSaturday(2025, 0, 4)).toBe(true)
  })

  it('returns false for Sunday', () => {
    expect(isSaturday(2025, 0, 5)).toBe(false)
  })

  it('returns false for Friday', () => {
    expect(isSaturday(2025, 0, 3)).toBe(false)
  })
})

describe('isSunday', () => {
  it('returns true for Sunday', () => {
    expect(isSunday(2025, 0, 5)).toBe(true)
  })

  it('returns false for Saturday', () => {
    expect(isSunday(2025, 0, 4)).toBe(false)
  })

  it('returns false for Monday', () => {
    expect(isSunday(2025, 0, 6)).toBe(false)
  })
})

describe('getFirstDayOfWeek', () => {
  it('returns Monday-based index for January 2025 (Wednesday)', () => {
    // Jan 1, 2025 is Wednesday → Monday-based index 2
    expect(getFirstDayOfWeek(2025, 0)).toBe(2)
  })

  it('returns 0 when month starts on Monday', () => {
    // September 2025 starts on Monday
    expect(getFirstDayOfWeek(2025, 8)).toBe(0)
  })

  it('returns 6 when month starts on Sunday', () => {
    // June 2025 starts on Sunday
    expect(getFirstDayOfWeek(2025, 5)).toBe(6)
  })

  it('returns 5 when month starts on Saturday', () => {
    // March 2025 starts on Saturday
    expect(getFirstDayOfWeek(2025, 2)).toBe(5)
  })
})

describe('getDayOfWeekMondayBased', () => {
  it('returns 0 for Monday', () => {
    // 2025-01-06 is Monday
    expect(getDayOfWeekMondayBased(2025, 0, 6)).toBe(0)
  })

  it('returns 4 for Friday', () => {
    // 2025-01-03 is Friday
    expect(getDayOfWeekMondayBased(2025, 0, 3)).toBe(4)
  })

  it('returns 5 for Saturday', () => {
    // 2025-01-04 is Saturday
    expect(getDayOfWeekMondayBased(2025, 0, 4)).toBe(5)
  })

  it('returns 6 for Sunday', () => {
    // 2025-01-05 is Sunday
    expect(getDayOfWeekMondayBased(2025, 0, 5)).toBe(6)
  })
})

describe('createDefaultDoctors', () => {
  it('returns 5 doctors', () => {
    const doctors = createDefaultDoctors()
    expect(doctors).toHaveLength(5)
  })

  it('assigns unique IDs', () => {
    const doctors = createDefaultDoctors()
    const ids = doctors.map(d => d.id)
    expect(new Set(ids).size).toBe(5)
  })

  it('assigns unique color indices', () => {
    const doctors = createDefaultDoctors()
    const colors = doctors.map(d => d.colorIndex)
    expect(new Set(colors).size).toBe(5)
  })

  it('has 4 eidikevomenoi and 1 agrotikos', () => {
    const doctors = createDefaultDoctors()
    const eidik = doctors.filter(d => d.type === 'eidikevomenos')
    const agrot = doctors.filter(d => d.type === 'agrotikos')
    expect(eidik).toHaveLength(4)
    expect(agrot).toHaveLength(1)
  })

  it('all doctors have Greek names', () => {
    const doctors = createDefaultDoctors()
    for (const d of doctors) {
      expect(d.name).toMatch(/Γιατρός/)
    }
  })
})

describe('constants', () => {
  it('DOCTOR_COLORS has 10 entries', () => {
    expect(DOCTOR_COLORS).toHaveLength(10)
  })

  it('DAY_NAMES has 7 entries starting with Monday', () => {
    expect(DAY_NAMES).toHaveLength(7)
    expect(DAY_NAMES[0]).toBe('Δε')
    expect(DAY_NAMES[6]).toBe('Κυ')
  })

  it('MONTH_NAMES has 12 entries', () => {
    expect(MONTH_NAMES).toHaveLength(12)
    expect(MONTH_NAMES[0]).toBe('Ιανουάριος')
    expect(MONTH_NAMES[11]).toBe('Δεκέμβριος')
  })

  it('DEFAULT_CONSTRAINTS has sensible defaults', () => {
    expect(DEFAULT_CONSTRAINTS.minGap).toBe(2)
    expect(DEFAULT_CONSTRAINTS.maxShifts).toBe(8)
  })
})
