import type { Doctor, MarksMap, Constraints, ScheduleResult, DoctorType } from './types'
import { getDaysInMonth, getDayOfWeek } from './types'

// Check if a day is marked as holiday by ANY doctor
function isHolidayDay(dayIndex: number, marks: MarksMap): boolean {
  for (const doctorId in marks) {
    if (marks[doctorId]?.[dayIndex] === 'holiday') return true
  }
  return false
}

// ─── CSP Solver for On-Call Scheduling ───
// Uses backtracking search with constraint propagation (AC-3),
// MRV heuristic for variable ordering, and soft-constraint scoring
// for optimal fairness.

interface CSPState {
  // domains[dayIndex] = set of possible doctorIds for that day
  domains: Set<number>[]
  // assignment[dayIndex] = doctorId or null
  assignment: (number | null)[]
}

// ── Hard Constraints ──

function isConsistent(
  dayIndex: number,
  doctorId: number,
  assignment: (number | null)[],
  marks: MarksMap,
  constraints: Constraints,
  daysInMonth: number,
  year?: number,
  month?: number,
  doctorTypes?: Record<number, DoctorType>,
): boolean {
  // Block / leave / sick mark
  const mark = marks[doctorId]?.[dayIndex]
  if (mark === 'block' || mark === 'leave' || mark === 'sick') return false

  // No consecutive / min gap
  for (let offset = 1; offset <= constraints.minGap; offset++) {
    if (dayIndex - offset >= 0 && assignment[dayIndex - offset] === doctorId) return false
    if (dayIndex + offset < daysInMonth && assignment[dayIndex + offset] === doctorId) return false
  }

  // Max shifts
  let count = 0
  for (let d = 0; d < daysInMonth; d++) {
    if (assignment[d] === doctorId) count++
  }
  if (count >= constraints.maxShifts) return false

  // Hard constraint: eidikevomenoi must not exceed fair share of Fri/Sat/Sun/Holidays
  if (year !== undefined && month !== undefined && doctorTypes && marks && doctorTypes[doctorId] === 'eidikevomenos') {
    const dow = getDayOfWeek(year, month, dayIndex + 1)
    const isHoliday = isHolidayDay(dayIndex, marks)
    const isSpecialDay = dow === 5 || dow === 6 || dow === 0 || isHoliday

    if (isSpecialDay) {
      const eidCount = Object.entries(doctorTypes).filter(([_, t]) => t === 'eidikevomenos').length
      if (eidCount > 0) {
        // For Fri/Sat/Sun: fair share per day type
        if (dow === 5 || dow === 6 || dow === 0) {
          let totalDayType = 0
          for (let d = 0; d < daysInMonth; d++) {
            if (getDayOfWeek(year, month, d + 1) === dow) totalDayType++
          }
          const maxPerDoctor = Math.ceil(totalDayType / eidCount)
          let dayTypeCount = 0
          for (let d = 0; d < daysInMonth; d++) {
            if (assignment[d] === doctorId && getDayOfWeek(year, month, d + 1) === dow) dayTypeCount++
          }
          if (dayTypeCount >= maxPerDoctor) return false
        }

        // For holidays: fair share of holiday days
        if (isHoliday) {
          let totalHolidays = 0
          for (let d = 0; d < daysInMonth; d++) {
            if (isHolidayDay(d, marks)) totalHolidays++
          }
          const maxHolPerDoctor = Math.ceil(totalHolidays / eidCount)
          let holCount = 0
          for (let d = 0; d < daysInMonth; d++) {
            if (assignment[d] === doctorId && isHolidayDay(d, marks)) holCount++
          }
          if (holCount >= maxHolPerDoctor) return false
        }
      }
    }
  }

  return true
}

// ── AC-3: Arc Consistency ──
// Prunes domains by removing values that can't satisfy binary constraints

function ac3(
  state: CSPState,
  marks: MarksMap,
  constraints: Constraints,
  daysInMonth: number,
  year: number,
  month: number,
): boolean {
  // Queue of arcs: [day_i, day_j] where day_j constrains day_i
  const queue: [number, number][] = []

  // Build arcs: days within minGap of each other are constrained
  for (let i = 0; i < daysInMonth; i++) {
    for (let offset = 1; offset <= constraints.minGap; offset++) {
      if (i + offset < daysInMonth) {
        queue.push([i, i + offset])
        queue.push([i + offset, i])
      }
    }
  }

  while (queue.length > 0) {
    const [xi, xj] = queue.shift()!
    if (revise(state, xi, xj)) {
      if (state.domains[xi]!.size === 0) return false // Domain wipeout
      // Add all neighbors of xi (except xj) back to queue
      for (let offset = 1; offset <= constraints.minGap; offset++) {
        const prev = xi - offset
        const next = xi + offset
        if (prev >= 0 && prev !== xj) queue.push([prev, xi])
        if (next < daysInMonth && next !== xj) queue.push([next, xi])
      }
    }
  }
  return true
}

function revise(state: CSPState, xi: number, xj: number): boolean {
  let revised = false
  for (const val of [...state.domains[xi]!]) {
    // Check if there exists at least one value in domain[xj] that is consistent
    // The constraint: same doctor can't be on both xi and xj (within gap)
    let hasSupport = false
    for (const valJ of state.domains[xj]!) {
      if (valJ !== val || state.domains[xj]!.size > 1) {
        hasSupport = true
        break
      }
    }
    if (!hasSupport) {
      state.domains[xi]!.delete(val)
      revised = true
    }
  }
  return revised
}

// ── MRV Heuristic: pick unassigned day with smallest domain ──

function selectUnassignedDay(state: CSPState): number | null {
  let bestDay = -1
  let bestSize = Infinity

  for (let d = 0; d < state.assignment.length; d++) {
    if (state.assignment[d] !== null) continue
    const size = state.domains[d]!.size
    if (size < bestSize) {
      bestSize = size
      bestDay = d
    }
  }

  return bestDay === -1 ? null : bestDay
}

// ── Soft Constraint Scoring ──
// Lower score = better assignment. Used to order domain values.

function softScore(
  doctorId: number,
  dayIndex: number,
  assignment: (number | null)[],
  marks: MarksMap,
  doctorIds: number[],
  doctorTypes: Record<number, DoctorType>,
  year: number,
  month: number,
  daysInMonth: number,
): number {
  let score = 0

  const dow = getDayOfWeek(year, month, dayIndex + 1)

  // Count current assignments per doctor
  const counts: Record<number, number> = {}
  const friCounts: Record<number, number> = {}
  const satCounts: Record<number, number> = {}
  const sunCounts: Record<number, number> = {}

  for (const id of doctorIds) {
    counts[id] = 0
    friCounts[id] = 0
    satCounts[id] = 0
    sunCounts[id] = 0
  }

  for (let d = 0; d < daysInMonth; d++) {
    const assigned = assignment[d]
    if (assigned == null) continue
    counts[assigned] = (counts[assigned] ?? 0) + 1
    const dw = getDayOfWeek(year, month, d + 1)
    if (dw === 5) friCounts[assigned] = (friCounts[assigned] ?? 0) + 1
    if (dw === 6) satCounts[assigned] = (satCounts[assigned] ?? 0) + 1
    if (dw === 0) sunCounts[assigned] = (sunCounts[assigned] ?? 0) + 1
  }

  // Prefer want marks — agrotikos wants have higher priority
  if (marks[doctorId]?.[dayIndex] === 'want') {
    score -= doctorTypes[doctorId] === 'agrotikos' ? 200 : 100
  }

  // Prefer doctor with fewer total shifts (fairness)
  score += (counts[doctorId] ?? 0) * 20

  // For eidikevomenoi: strongly prefer at least 1 Fri, 1 Sat, 1 Sun; penalize imbalance
  if (doctorTypes[doctorId] === 'eidikevomenos') {
    if (dow === 5) {
      if ((friCounts[doctorId] ?? 0) === 0) score -= 80 // needs a Friday → big reward
      else score += (friCounts[doctorId] ?? 0) * 40 // already has one → mild penalty for 2nd
    }
    if (dow === 6) {
      if ((satCounts[doctorId] ?? 0) === 0) score -= 80
      else score += (satCounts[doctorId] ?? 0) * 40
    }
    if (dow === 0) {
      if ((sunCounts[doctorId] ?? 0) === 0) score -= 80
      else score += (sunCounts[doctorId] ?? 0) * 40
    }
  } else {
    if (dow === 5) score += (friCounts[doctorId] ?? 0) * 50
    if (dow === 6) score += (satCounts[doctorId] ?? 0) * 50
    if (dow === 0) score += (sunCounts[doctorId] ?? 0) * 50
  }

  // Holiday fairness
  if (isHolidayDay(dayIndex, marks)) {
    let holCount = 0
    for (let d = 0; d < daysInMonth; d++) {
      if (assignment[d] === doctorId && isHolidayDay(d, marks)) holCount++
    }
    if (doctorTypes[doctorId] === 'eidikevomenos') {
      if (holCount === 0) score -= 80
      else score += holCount * 40
    } else {
      score += holCount * 50
    }
  }

  return score
}

// ── Main Solver ──

export function generateSchedule(
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
  constraints: Constraints,
): ScheduleResult {
  const daysInMonth = getDaysInMonth(year, month)
  const doctorIds = doctors.map(d => d.id)

  // Build doctor type lookup
  const doctorTypes: Record<number, DoctorType> = {}
  for (const d of doctors) doctorTypes[d.id] = d.type

  // Separate agrotikos and eidikevomenoi
  const agrotikoiIds = doctors.filter(d => d.type === 'agrotikos').map(d => d.id)
  const eidikevomenoiIds = doctors.filter(d => d.type === 'eidikevomenos').map(d => d.id)

  // Pre-assign agrotikos: they ONLY work on their "want" days
  const preAssignment: (number | null)[] = new Array(daysInMonth).fill(null)
  for (const agId of agrotikoiIds) {
    for (let d = 0; d < daysInMonth; d++) {
      if (marks[agId]?.[d] === 'want' && preAssignment[d] === null) {
        preAssignment[d] = agId
      }
    }
  }

  // Initialize domains — agrotikos excluded from non-want days
  const domains: Set<number>[] = []
  for (let d = 0; d < daysInMonth; d++) {
    if (preAssignment[d] !== null) {
      // Day already assigned to agrotikos
      domains.push(new Set([preAssignment[d]!]))
    } else {
      const domain = new Set<number>()
      // Only eidikevomenoi for unassigned days
      for (const id of eidikevomenoiIds) {
        const m = marks[id]?.[d]
        if (m !== 'block' && m !== 'leave' && m !== 'sick') {
          domain.add(id)
        }
      }
      domains.push(domain)
    }
  }

  const initialState: CSPState = {
    domains,
    assignment: [...preAssignment],
  }

  // Run AC-3 for initial pruning
  ac3(initialState, marks, constraints, daysInMonth, year, month)

  // Backtracking search
  const result = backtrack(initialState, marks, constraints, daysInMonth, doctorIds, doctorTypes, year, month, 0)

  if (result) {
    return buildResult(result, doctors, year, month, marks)
  }

  // Fallback: relaxed solve (reduce minGap to 1)
  const relaxedConstraints = { ...constraints, minGap: 1 }
  const relaxedDomains: Set<number>[] = []
  for (let d = 0; d < daysInMonth; d++) {
    if (preAssignment[d] !== null) {
      relaxedDomains.push(new Set([preAssignment[d]!]))
    } else {
      const domain = new Set<number>()
      for (const id of eidikevomenoiIds) {
        const m = marks[id]?.[d]
        if (m !== 'block' && m !== 'leave' && m !== 'sick') domain.add(id)
      }
      relaxedDomains.push(domain)
    }
  }

  const relaxedState: CSPState = {
    domains: relaxedDomains,
    assignment: [...preAssignment],
  }

  const relaxedResult = backtrack(relaxedState, marks, relaxedConstraints, daysInMonth, doctorIds, doctorTypes, year, month, 0)

  if (relaxedResult) {
    return buildResult(relaxedResult, doctors, year, month, marks)
  }

  // Last resort: greedy fallback
  return greedyFallback(doctors, year, month, marks, constraints)
}

let nodeCount = 0
const MAX_NODES = 50000 // Prevent infinite search

function backtrack(
  state: CSPState,
  marks: MarksMap,
  constraints: Constraints,
  daysInMonth: number,
  doctorIds: number[],
  doctorTypes: Record<number, DoctorType>,
  year: number,
  month: number,
  depth: number,
): (number | null)[] | null {
  if (depth === 0) nodeCount = 0

  // Check if complete
  const unassigned = selectUnassignedDay(state)
  if (unassigned === null) return [...state.assignment]

  nodeCount++
  if (nodeCount > MAX_NODES) return null

  // Order domain values by soft score (best first)
  const domainValues = [...state.domains[unassigned]!]
  domainValues.sort((a, b) =>
    softScore(a, unassigned, state.assignment, marks, doctorIds, doctorTypes, year, month, daysInMonth)
    - softScore(b, unassigned, state.assignment, marks, doctorIds, doctorTypes, year, month, daysInMonth),
  )

  for (const doctorId of domainValues) {
    if (!isConsistent(unassigned, doctorId, state.assignment, marks, constraints, daysInMonth, year, month, doctorTypes)) {
      continue
    }

    // Assign
    state.assignment[unassigned] = doctorId

    // Forward checking: prune domains of neighboring days
    const savedDomains = state.domains.map(d => new Set(d))
    let consistent = true

    // Remove doctorId from neighboring days within gap
    for (let offset = 1; offset <= constraints.minGap; offset++) {
      const prev = unassigned - offset
      const next = unassigned + offset
      if (prev >= 0 && state.assignment[prev] === null) {
        state.domains[prev]!.delete(doctorId)
        if (state.domains[prev]!.size === 0) { consistent = false; break }
      }
      if (next < daysInMonth && state.assignment[next] === null) {
        state.domains[next]!.delete(doctorId)
        if (state.domains[next]!.size === 0) { consistent = false; break }
      }
    }

    if (consistent) {
      const result = backtrack(state, marks, constraints, daysInMonth, doctorIds, doctorTypes, year, month, depth + 1)
      if (result) return result
    }

    // Undo
    state.assignment[unassigned] = null
    state.domains = savedDomains.map(d => new Set(d))
    // Restore saved domains back into state
    for (let i = 0; i < daysInMonth; i++) {
      state.domains[i] = savedDomains[i]!
    }
  }

  return null
}

// ── Greedy Fallback (original algorithm, kept as safety net) ──

function greedyFallback(
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
  constraints: Constraints,
): ScheduleResult {
  const daysInMonth = getDaysInMonth(year, month)
  const schedule: (number | null)[] = new Array(daysInMonth).fill(null)
  const doctorIds = doctors.map(d => d.id)

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }

  const counts: Record<number, number> = {}
  for (const id of doctorIds) counts[id] = 0

  for (let d = 0; d < daysInMonth; d++) {
    const shuffled = shuffle(doctorIds)
    const candidates = shuffled.filter(id => {
      const m = marks[id]?.[d]
      if (m === 'block' || m === 'leave' || m === 'sick') return false
      if ((counts[id] ?? 0) >= constraints.maxShifts) return false
      for (let off = 1; off <= Math.max(1, constraints.minGap); off++) {
        if (d - off >= 0 && schedule[d - off] === id) return false
      }
      return true
    })
    candidates.sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0))
    if (candidates.length > 0) {
      schedule[d] = candidates[0]!
      counts[candidates[0]!]!++
    }
  }

  return buildResult(schedule, doctors, year, month, marks)
}

// ── Build Result ──

function buildResult(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
): ScheduleResult {
  const daysInMonth = getDaysInMonth(year, month)
  const counts: Record<number, number> = {}
  const friCounts: Record<number, number> = {}
  const satCounts: Record<number, number> = {}
  const sunCounts: Record<number, number> = {}
  const holidayCounts: Record<number, number> = {}
  const wantsFulfilled: Record<number, number> = {}
  const wantsTotal: Record<number, number> = {}
  const leaveCounts: Record<number, number> = {}
  const sickCounts: Record<number, number> = {}

  for (const d of doctors) {
    counts[d.id] = 0
    friCounts[d.id] = 0
    satCounts[d.id] = 0
    sunCounts[d.id] = 0
    holidayCounts[d.id] = 0
    wantsFulfilled[d.id] = 0
    wantsTotal[d.id] = 0
    leaveCounts[d.id] = 0
    sickCounts[d.id] = 0
  }

  for (const d of doctors) {
    for (let i = 0; i < daysInMonth; i++) {
      const mark = marks[d.id]?.[i]
      if (mark === 'want') wantsTotal[d.id]!++
      if (mark === 'leave') leaveCounts[d.id] = (leaveCounts[d.id] ?? 0) + 1
      if (mark === 'sick') sickCounts[d.id] = (sickCounts[d.id] ?? 0) + 1
    }
  }

  for (let i = 0; i < daysInMonth; i++) {
    const docId = schedule[i]
    if (docId == null) continue
    counts[docId] = (counts[docId] ?? 0) + 1
    const dow = getDayOfWeek(year, month, i + 1)
    if (dow === 5) friCounts[docId] = (friCounts[docId] ?? 0) + 1
    if (dow === 6) satCounts[docId] = (satCounts[docId] ?? 0) + 1
    if (dow === 0) sunCounts[docId] = (sunCounts[docId] ?? 0) + 1
    if (isHolidayDay(i, marks)) holidayCounts[docId] = (holidayCounts[docId] ?? 0) + 1
    if (marks[docId]?.[i] === 'want') {
      wantsFulfilled[docId] = (wantsFulfilled[docId] ?? 0) + 1
    }
  }

  return { schedule, counts, friCounts, satCounts, sunCounts, holidayCounts, wantsFulfilled, wantsTotal, leaveCounts, sickCounts }
}

export function recalculateStats(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
): Omit<ScheduleResult, 'schedule'> {
  return buildResult(schedule, doctors, year, month, marks)
}
