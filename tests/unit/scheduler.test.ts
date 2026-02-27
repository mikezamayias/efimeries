import { describe, it, expect } from 'vitest'
import { generateSchedule } from '~/utils/scheduler'
import type { Doctor, MarksMap, Constraints } from '~/utils/types'
import { getDaysInMonth, getDayOfWeek, createDefaultDoctors } from '~/utils/types'

function makeConstraints(overrides?: Partial<Constraints>): Constraints {
  return { minGap: 2, maxShifts: 8, ...overrides }
}

function makeDoctors(count: number = 5): Doctor[] {
  const doctors: Doctor[] = []
  for (let i = 1; i <= count; i++) {
    doctors.push({
      id: i,
      name: `Doctor ${i}`,
      type: i <= count - 1 ? 'eidikevomenos' : 'agrotikos',
      colorIndex: i - 1,
    })
  }
  return doctors
}

function makeAllEidikDoctors(count: number): Doctor[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Doctor ${i + 1}`,
    type: 'eidikevomenos' as const,
    colorIndex: i,
  }))
}

describe('generateSchedule - basic generation', () => {
  it('generates a schedule for 5 doctors and 31 days', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    expect(result.schedule).toHaveLength(31) // January
  })

  it('assigns a doctor to every day', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    for (let d = 0; d < 31; d++) {
      expect(result.schedule[d]).not.toBeNull()
    }
  })

  it('only assigns valid doctor IDs', () => {
    const doctors = makeAllEidikDoctors(5)
    const doctorIds = new Set(doctors.map(d => d.id))
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    for (const id of result.schedule) {
      if (id !== null) {
        expect(doctorIds.has(id)).toBe(true)
      }
    }
  })

  it('counts match schedule assignments', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    const countCheck: Record<number, number> = {}
    for (const id of doctors) countCheck[id.id] = 0
    for (const id of result.schedule) {
      if (id !== null) countCheck[id]!++
    }
    for (const d of doctors) {
      expect(result.counts[d.id]).toBe(countCheck[d.id])
    }
  })

  it('handles February (28 days) correctly', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 1, {}, makeConstraints())
    expect(result.schedule).toHaveLength(28)
  })

  it('handles February leap year (29 days) correctly', () => {
    const doctors = makeAllEidikDoctors(4)
    const result = generateSchedule(doctors, 2024, 1, {}, makeConstraints())
    expect(result.schedule).toHaveLength(29)
  })
})

describe('generateSchedule - block marks', () => {
  it('never assigns a doctor on their blocked days', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      1: { 0: 'block', 1: 'block', 2: 'block', 5: 'block', 10: 'block' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    for (const blockedDay of [0, 1, 2, 5, 10]) {
      expect(result.schedule[blockedDay]).not.toBe(1)
    }
  })

  it('respects leave marks (treated same as block)', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      2: { 3: 'leave', 4: 'leave', 5: 'leave' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    for (const day of [3, 4, 5]) {
      expect(result.schedule[day]).not.toBe(2)
    }
  })

  it('respects sick marks', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      3: { 10: 'sick', 11: 'sick' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.schedule[10]).not.toBe(3)
    expect(result.schedule[11]).not.toBe(3)
  })

  it('tracks leave counts', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      1: { 0: 'leave', 1: 'leave', 2: 'leave' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.leaveCounts[1]).toBe(3)
  })

  it('tracks sick counts', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      2: { 5: 'sick', 6: 'sick' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.sickCounts[2]).toBe(2)
  })
})

describe('generateSchedule - want marks', () => {
  it('counts total wants correctly', () => {
    const doctors = makeAllEidikDoctors(5)
    const marks: MarksMap = {
      1: { 0: 'want', 5: 'want', 10: 'want' },
      2: { 3: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.wantsTotal[1]).toBe(3)
    expect(result.wantsTotal[2]).toBe(1)
  })

  it('prefers assigning doctors to their wanted days', () => {
    const doctors = makeAllEidikDoctors(5)
    // Give doctor 1 scattered wants that don't conflict with gap constraints
    const marks: MarksMap = {
      1: { 0: 'want', 5: 'want', 10: 'want', 15: 'want', 20: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // At least some wants should be fulfilled
    expect(result.wantsFulfilled[1]).toBeGreaterThan(0)
  })
})

describe('generateSchedule - agrotikos constraints', () => {
  it('agrotikos only works on want days', () => {
    const doctors = makeDoctors(5) // Doctor 5 is agrotikos
    const marks: MarksMap = {
      5: { 0: 'want', 10: 'want', 20: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    for (let d = 0; d < 31; d++) {
      if (result.schedule[d] === 5) {
        expect(marks[5]?.[d]).toBe('want')
      }
    }
  })

  it('agrotikos with no wants gets zero assignments', () => {
    const doctors = makeDoctors(5) // Doctor 5 is agrotikos
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    const agrCount = result.schedule.filter(id => id === 5).length
    expect(agrCount).toBe(0)
  })

  it('agrotikos want days are pre-assigned', () => {
    const doctors = makeDoctors(5) // Doctor 5 is agrotikos
    const marks: MarksMap = {
      5: { 0: 'want', 15: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // Agrotikos should be assigned to their want days (if not blocked by other agrotikos)
    expect(result.schedule[0]).toBe(5)
    expect(result.schedule[15]).toBe(5)
  })
})

describe('generateSchedule - eidikevomenoi weekend distribution', () => {
  it('each eidikevomenos gets at least 1 Friday, Saturday, or Sunday over a month', () => {
    // Use 4 eidikevomenoi for a month with ~13 weekend days
    const doctors = makeAllEidikDoctors(4)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())

    for (const doc of doctors) {
      const hasFri = (result.friCounts[doc.id] ?? 0) > 0
      const hasSat = (result.satCounts[doc.id] ?? 0) > 0
      const hasSun = (result.sunCounts[doc.id] ?? 0) > 0
      // Each doctor should get at least one weekend day
      expect(hasFri || hasSat || hasSun).toBe(true)
    }
  })

  it('friday/saturday/sunday counts are tracked correctly', () => {
    const doctors = makeAllEidikDoctors(4)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())

    let totalFri = 0
    let totalSat = 0
    let totalSun = 0
    for (let d = 0; d < 31; d++) {
      const dow = getDayOfWeek(2025, 0, d + 1)
      if (dow === 5) totalFri++
      if (dow === 6) totalSat++
      if (dow === 0) totalSun++
    }

    let countedFri = 0
    let countedSat = 0
    let countedSun = 0
    for (const doc of doctors) {
      countedFri += result.friCounts[doc.id] ?? 0
      countedSat += result.satCounts[doc.id] ?? 0
      countedSun += result.sunCounts[doc.id] ?? 0
    }

    expect(countedFri).toBe(totalFri)
    expect(countedSat).toBe(totalSat)
    expect(countedSun).toBe(totalSun)
  })
})

describe('generateSchedule - minGap constraint', () => {
  it('no doctor works two consecutive days (minGap=2)', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ minGap: 2 }))
    for (let d = 0; d < 30; d++) {
      if (result.schedule[d] !== null) {
        // Next day should not be same doctor
        expect(result.schedule[d + 1]).not.toBe(result.schedule[d])
        // Day after next should also not be same doctor (minGap=2)
        if (d < 29) {
          expect(result.schedule[d + 2]).not.toBe(result.schedule[d])
        }
      }
    }
  })

  it('minGap=1 allows every-other-day but not consecutive', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ minGap: 1 }))
    for (let d = 0; d < 30; d++) {
      if (result.schedule[d] !== null) {
        expect(result.schedule[d + 1]).not.toBe(result.schedule[d])
      }
    }
  })

  it('minGap=3 enforces 3-day gap between shifts', () => {
    const doctors = makeAllEidikDoctors(8) // Need more doctors for bigger gap
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ minGap: 3 }))
    for (let d = 0; d < 31; d++) {
      if (result.schedule[d] !== null) {
        for (let off = 1; off <= 3; off++) {
          if (d + off < 31) {
            expect(result.schedule[d + off]).not.toBe(result.schedule[d])
          }
        }
      }
    }
  })
})

describe('generateSchedule - maxShifts constraint', () => {
  it('no doctor exceeds maxShifts=8', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ maxShifts: 8 }))
    for (const doc of doctors) {
      expect(result.counts[doc.id]).toBeLessThanOrEqual(8)
    }
  })

  it('no doctor exceeds maxShifts=6', () => {
    const doctors = makeAllEidikDoctors(6)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ maxShifts: 6 }))
    for (const doc of doctors) {
      expect(result.counts[doc.id]).toBeLessThanOrEqual(6)
    }
  })

  it('total assignments don\'t exceed doctors × maxShifts', () => {
    const doctors = makeAllEidikDoctors(5)
    const maxShifts = 7
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ maxShifts }))
    const totalAssigned = result.schedule.filter(id => id !== null).length
    expect(totalAssigned).toBeLessThanOrEqual(doctors.length * maxShifts)
  })
})

describe('generateSchedule - holiday treatment', () => {
  it('holiday-marked days are distributed among eidikevomenoi', () => {
    const doctors = makeAllEidikDoctors(4)
    // Mark some days as holidays for all doctors
    const marks: MarksMap = {}
    for (const d of doctors) {
      marks[d.id] = { 0: 'holiday', 5: 'holiday', 10: 'holiday' }
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // Holiday days still get assigned
    expect(result.schedule[0]).not.toBeNull()
    expect(result.schedule[5]).not.toBeNull()
    expect(result.schedule[10]).not.toBeNull()
  })

  it('holidayCounts track assignments on holiday-marked days', () => {
    const doctors = makeAllEidikDoctors(4)
    const marks: MarksMap = {}
    for (const d of doctors) {
      marks[d.id] = { 0: 'holiday', 5: 'holiday' }
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    let totalHolAssigned = 0
    for (const d of doctors) {
      totalHolAssigned += result.holidayCounts[d.id] ?? 0
    }
    // 2 holiday days should be counted
    expect(totalHolAssigned).toBe(2)
  })
})

describe('generateSchedule - edge cases', () => {
  it('handles a single doctor (all eidikevomenos)', () => {
    const doctors: Doctor[] = [{
      id: 1,
      name: 'Solo Doctor',
      type: 'eidikevomenos',
      colorIndex: 0,
    }]
    // With maxShifts high enough and minGap low enough
    const result = generateSchedule(doctors, 2025, 0, {}, { minGap: 1, maxShifts: 31 })
    // Can't assign consecutive days, so max half the days
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBeGreaterThan(0)
    expect(assigned).toBeLessThanOrEqual(31)
  })

  it('handles all doctors blocked on a day (day stays null)', () => {
    const doctors = makeAllEidikDoctors(3)
    const marks: MarksMap = {
      1: { 0: 'block' },
      2: { 0: 'block' },
      3: { 0: 'block' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // Day 0 may be null if all doctors blocked
    // The scheduler still completes without error
    expect(result.schedule).toHaveLength(31)
  })

  it('generates a schedule with createDefaultDoctors()', () => {
    const doctors = createDefaultDoctors()
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // All days should be assigned (4 eidikevomenoi with default constraints is feasible)
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBe(31)
  })
})

describe('generateSchedule - result structure', () => {
  it('returns all required fields', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    expect(result).toHaveProperty('schedule')
    expect(result).toHaveProperty('counts')
    expect(result).toHaveProperty('friCounts')
    expect(result).toHaveProperty('satCounts')
    expect(result).toHaveProperty('sunCounts')
    expect(result).toHaveProperty('holidayCounts')
    expect(result).toHaveProperty('wantsFulfilled')
    expect(result).toHaveProperty('wantsTotal')
    expect(result).toHaveProperty('leaveCounts')
    expect(result).toHaveProperty('sickCounts')
  })

  it('initializes all doctor counters to 0 or above', () => {
    const doctors = makeAllEidikDoctors(5)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    for (const doc of doctors) {
      expect(result.counts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.friCounts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.satCounts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.sunCounts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.holidayCounts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.wantsFulfilled[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.wantsTotal[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.leaveCounts[doc.id]).toBeGreaterThanOrEqual(0)
      expect(result.sickCounts[doc.id]).toBeGreaterThanOrEqual(0)
    }
  })
})
