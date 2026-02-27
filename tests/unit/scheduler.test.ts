import { describe, it, expect } from 'vitest'
import { generateSchedule, recalculateStats } from '~/utils/scheduler'
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

  it('multiple agrotikos with overlapping wants — each contested day goes to one agrotikos', () => {
    // 5 eidikevomenoi (enough capacity) + 2 agrotikos
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Eid 3', type: 'eidikevomenos', colorIndex: 2 },
      { id: 4, name: 'Eid 4', type: 'eidikevomenos', colorIndex: 3 },
      { id: 5, name: 'Eid 5', type: 'eidikevomenos', colorIndex: 4 },
      { id: 6, name: 'Agr 1', type: 'agrotikos', colorIndex: 5 },
      { id: 7, name: 'Agr 2', type: 'agrotikos', colorIndex: 6 },
    ]
    // Both agrotikos want day 0 and 10; only agrotikos 7 wants day 20
    const marks: MarksMap = {
      6: { 0: 'want', 10: 'want' },
      7: { 0: 'want', 10: 'want', 20: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // Contested days: one agrotikos gets each (first in iteration order)
    expect([6, 7]).toContain(result.schedule[0])
    expect([6, 7]).toContain(result.schedule[10])
    // Day 20 is only wanted by agrotikos 7
    expect(result.schedule[20]).toBe(7)
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

  it('non-eidikevomenos holiday scoring branch is exercised (agrotikos on holiday)', () => {
    // 5 eidikevomenoi + 1 agrotikos, agrotikos wants some holiday days
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Eid 3', type: 'eidikevomenos', colorIndex: 2 },
      { id: 4, name: 'Eid 4', type: 'eidikevomenos', colorIndex: 3 },
      { id: 5, name: 'Eid 5', type: 'eidikevomenos', colorIndex: 4 },
      { id: 6, name: 'Agr 1', type: 'agrotikos', colorIndex: 5 },
    ]
    const marks: MarksMap = {
      1: { 0: 'holiday', 5: 'holiday', 10: 'holiday' },
      2: { 0: 'holiday', 5: 'holiday', 10: 'holiday' },
      3: { 0: 'holiday', 5: 'holiday', 10: 'holiday' },
      4: { 0: 'holiday', 5: 'holiday', 10: 'holiday' },
      5: { 0: 'holiday', 5: 'holiday', 10: 'holiday' },
      6: { 0: 'want', 5: 'want' },
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // Agrotikos should be on their want days
    expect(result.schedule[0]).toBe(6)
    expect(result.schedule[5]).toBe(6)
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

  it('handles 0 doctors gracefully', () => {
    const doctors: Doctor[] = []
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // No doctors means no assignments
    for (const day of result.schedule) {
      expect(day).toBeNull()
    }
  })

  it('handles more doctors than days', () => {
    // 35 eidikevomenoi for 28 days (Feb)
    const doctors = makeAllEidikDoctors(35)
    const result = generateSchedule(doctors, 2025, 1, {}, makeConstraints({ maxShifts: 2 }))
    expect(result.schedule).toHaveLength(28)
    // All days should be assigned
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBe(28)
  })

  it('handles all days blocked for all doctors — produces empty schedule', () => {
    const doctors = makeAllEidikDoctors(3)
    const marks: MarksMap = {}
    for (const d of doctors) {
      marks[d.id] = {}
      for (let day = 0; day < 31; day++) {
        marks[d.id]![day] = 'block'
      }
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // All null since everyone is blocked everywhere
    for (const day of result.schedule) {
      expect(day).toBeNull()
    }
  })
})

describe('generateSchedule - fallback paths', () => {
  it('relaxed fallback succeeds when CSP fails with minGap=2 but works with minGap=1', () => {
    // 2 eidikevomenoi + 1 agrotikos (to hit relaxed preAssignment branch)
    // minGap=2 impossible for 2 eidikevomenoi to fill all remaining days
    // CSP fails → relaxed (minGap=1) can alternate: A-B-A-B
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Agr 1', type: 'agrotikos', colorIndex: 2 },
    ]
    const marks: MarksMap = {
      3: { 15: 'want' }, // agrotikos wants day 15 → pre-assigned
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints({ minGap: 2, maxShifts: 16 }))
    expect(result.schedule).toHaveLength(31)
    // Agrotikos should be on day 15
    expect(result.schedule[15]).toBe(3)
    // All days should be filled
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBe(31)
  })

  it('greedy fallback runs when both CSP and relaxed fail', () => {
    // 1 doctor, maxShifts=3 → only 3 days assignable
    // CSP fails (can't fill all days), relaxed fails too, greedy fills what it can
    const doctors = makeAllEidikDoctors(1)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ minGap: 2, maxShifts: 3 }))
    expect(result.schedule).toHaveLength(31)
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBeLessThanOrEqual(3)
    expect(assigned).toBeGreaterThan(0)
  })

  it('greedy respects maxShifts and minGap as best effort', () => {
    // 2 doctors, maxShifts=5 → CSP and relaxed both fail (capacity 10 < 31)
    // Greedy fills as many as possible
    const doctors = makeAllEidikDoctors(2)
    const result = generateSchedule(doctors, 2025, 0, {}, makeConstraints({ minGap: 2, maxShifts: 5 }))
    expect(result.schedule).toHaveLength(31)
    const assigned = result.schedule.filter(id => id !== null).length
    expect(assigned).toBeLessThanOrEqual(10)
    expect(assigned).toBeGreaterThan(0)
  })

  it('relaxed constraints triggered when CSP is overconstrained by blocking', () => {
    // 3 doctors with many blocked days
    const doctors = makeAllEidikDoctors(3)
    const marks: MarksMap = {}
    for (const d of doctors) {
      marks[d.id] = {}
      for (let day = 0; day < 31; day++) {
        if (day % 3 === (d.id - 1) % 3) continue // keep ~10 days
        marks[d.id]![day] = 'block'
      }
    }
    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints({ minGap: 2, maxShifts: 8 }))
    expect(result.schedule).toHaveLength(31)
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

describe('recalculateStats', () => {
  it('recalculates stats from a known schedule', () => {
    const doctors = makeAllEidikDoctors(4)
    // Manually create a schedule: 28 days (Feb 2025), cycling through doctors
    const daysInMonth = getDaysInMonth(2025, 1)
    const schedule: (number | null)[] = []
    for (let d = 0; d < daysInMonth; d++) {
      schedule.push(doctors[d % 4]!.id)
    }

    const marks: MarksMap = {
      1: { 0: 'want', 4: 'want' },
      2: { 1: 'want' },
    }

    const stats = recalculateStats(schedule, doctors, 2025, 1, marks)
    // Verify counts
    expect(stats.counts[1]).toBe(7) // days 0,4,8,12,16,20,24
    expect(stats.counts[2]).toBe(7) // days 1,5,9,13,17,21,25
    expect(stats.counts[3]).toBe(7) // days 2,6,10,14,18,22,26
    expect(stats.counts[4]).toBe(7) // days 3,7,11,15,19,23,27

    // Verify wants tracking
    expect(stats.wantsTotal[1]).toBe(2)
    expect(stats.wantsTotal[2]).toBe(1)
    expect(stats.wantsFulfilled[1]).toBe(2) // Doctor 1 is assigned on days 0 and 4
    expect(stats.wantsFulfilled[2]).toBe(1) // Doctor 2 is assigned on day 1
  })

  it('recalculates with leave and sick marks', () => {
    const doctors = makeAllEidikDoctors(2)
    const schedule: (number | null)[] = [1, null, 2, null, 1, null, 2]
    const marks: MarksMap = {
      1: { 1: 'leave', 3: 'leave' },
      2: { 5: 'sick' },
    }
    // July 2025 has 31 days, but we only have 7 entries — use a small test month
    // Use a known date context
    const stats = recalculateStats(schedule, doctors, 2025, 0, marks)
    expect(stats.leaveCounts[1]).toBe(2)
    expect(stats.sickCounts[2]).toBe(1)
  })

  it('returns correct holiday counts from schedule', () => {
    const doctors = makeAllEidikDoctors(3)
    // Schedule: doctor 1 on day 0 (holiday), doctor 2 on day 1
    const schedule: (number | null)[] = [1, 2, 3, 1, 2, 3]
    const marks: MarksMap = {
      1: { 0: 'holiday' },
      2: { 0: 'holiday' },
      3: { 0: 'holiday' },
    }
    const stats = recalculateStats(schedule, doctors, 2025, 0, marks)
    expect(stats.holidayCounts[1]).toBe(1) // doctor 1 on holiday day 0
    expect(stats.holidayCounts[2]).toBe(0)
    expect(stats.holidayCounts[3]).toBe(0)
  })
})

describe('generateSchedule - holiday soft scoring for non-eidikevomenos', () => {
  it('agrotikos pre-assigned on holiday want day (exercises non-eidikevomenos holiday branch)', () => {
    // 5 eidikevomenoi (enough capacity for CSP to succeed) + 1 agrotikos
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Eid 3', type: 'eidikevomenos', colorIndex: 2 },
      { id: 4, name: 'Eid 4', type: 'eidikevomenos', colorIndex: 3 },
      { id: 5, name: 'Eid 5', type: 'eidikevomenos', colorIndex: 4 },
      { id: 6, name: 'Agr 1', type: 'agrotikos', colorIndex: 5 },
    ]

    // Mark day 6 as holiday for ALL, agrotikos wants it
    const marks: MarksMap = {
      1: { 6: 'holiday' },
      2: { 6: 'holiday' },
      3: { 6: 'holiday' },
      4: { 6: 'holiday' },
      5: { 6: 'holiday' },
      6: { 6: 'want' },
    }

    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // Agrotikos (id=6) should be pre-assigned on day 6 since they want it
    expect(result.schedule[6]).toBe(6)
  })

  it('agrotikos on multiple holiday days exercises increasing penalty branch', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Eid 3', type: 'eidikevomenos', colorIndex: 2 },
      { id: 4, name: 'Eid 4', type: 'eidikevomenos', colorIndex: 3 },
      { id: 5, name: 'Eid 5', type: 'eidikevomenos', colorIndex: 4 },
      { id: 6, name: 'Agr 1', type: 'agrotikos', colorIndex: 5 },
    ]
    const marks: MarksMap = {
      1: { 6: 'holiday', 13: 'holiday' },
      2: { 6: 'holiday', 13: 'holiday' },
      3: { 6: 'holiday', 13: 'holiday' },
      4: { 6: 'holiday', 13: 'holiday' },
      5: { 6: 'holiday', 13: 'holiday' },
      6: { 6: 'want', 13: 'want' },
    }

    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    expect(result.schedule).toHaveLength(31)
    // Agrotikos should be pre-assigned on both holiday days
    expect(result.schedule[6]).toBe(6)
    expect(result.schedule[13]).toBe(6)
  })
})

describe('generateSchedule - non-eidikevomenos weekend scoring', () => {
  it('agrotikos pre-assigned on weekend want days (exercises non-eidikevomenos weekend branch)', () => {
    // 5 eidikevomenoi (enough capacity) + 1 agrotikos
    const doctors: Doctor[] = [
      { id: 1, name: 'Eid 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Eid 2', type: 'eidikevomenos', colorIndex: 1 },
      { id: 3, name: 'Eid 3', type: 'eidikevomenos', colorIndex: 2 },
      { id: 4, name: 'Eid 4', type: 'eidikevomenos', colorIndex: 3 },
      { id: 5, name: 'Eid 5', type: 'eidikevomenos', colorIndex: 4 },
      { id: 6, name: 'Agr 1', type: 'agrotikos', colorIndex: 5 },
    ]
    // Jan 2025: day index 3 (4th) is Saturday, day index 4 (5th) is Sunday
    const marks: MarksMap = {
      6: { 3: 'want', 4: 'want' },
    }

    const result = generateSchedule(doctors, 2025, 0, marks, makeConstraints())
    // Agrotikos (id=6) should be pre-assigned on their want weekend days
    expect(result.schedule[3]).toBe(6) // Saturday
    expect(result.schedule[4]).toBe(6) // Sunday
  })
})
