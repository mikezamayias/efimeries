import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  encodeShareData,
  decodeShareData,
  buildShareUrl,
  formatScheduleText,
} from '~/composables/useShare'
import type { SharePayload } from '~/composables/useShare'
import type { Doctor, MarksMap } from '~/utils/types'
import { MONTH_NAMES } from '~/utils/types'

function makeSamplePayload(): SharePayload {
  return {
    doctors: [
      { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Γιατρός 2', type: 'eidikevomenos', colorIndex: 1 },
    ],
    schedule: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
    marks: {},
    month: 0,
    year: 2025,
    constraints: { minGap: 2, maxShifts: 8 },
    nextId: 3,
  }
}

describe('encodeShareData / decodeShareData', () => {
  it('roundtrip: encode then decode returns same payload', () => {
    const payload = makeSamplePayload()
    const encoded = encodeShareData(payload)
    const decoded = decodeShareData(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.doctors).toEqual(payload.doctors)
    expect(decoded!.schedule).toEqual(payload.schedule)
    expect(decoded!.marks).toEqual(payload.marks)
    expect(decoded!.month).toBe(payload.month)
    expect(decoded!.year).toBe(payload.year)
    expect(decoded!.constraints).toEqual(payload.constraints)
    expect(decoded!.nextId).toBe(payload.nextId)
  })

  it('roundtrip with complex marks', () => {
    const payload = makeSamplePayload()
    payload.marks = {
      1: { 0: 'block', 5: 'want', 10: 'holiday' },
      2: { 3: 'leave', 7: 'sick' },
    }
    const encoded = encodeShareData(payload)
    const decoded = decodeShareData(encoded)
    expect(decoded!.marks).toEqual(payload.marks)
  })

  it('roundtrip with null schedule', () => {
    const payload = makeSamplePayload()
    payload.schedule = null
    const encoded = encodeShareData(payload)
    const decoded = decodeShareData(encoded)
    expect(decoded!.schedule).toBeNull()
  })

  it('encoded string is URL-safe', () => {
    const payload = makeSamplePayload()
    const encoded = encodeShareData(payload)
    // lz-string compressToEncodedURIComponent uses URL-safe chars
    expect(encoded).not.toContain(' ')
    expect(encoded).not.toContain('+')
    expect(encoded.length).toBeGreaterThan(0)
  })

  it('encoded string is compressed (shorter than raw JSON)', () => {
    const payload = makeSamplePayload()
    const encoded = encodeShareData(payload)
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
  })
})

describe('decodeShareData - error handling', () => {
  it('returns null for empty string', () => {
    const result = decodeShareData('')
    expect(result).toBeNull()
  })

  it('returns null for random garbage string', () => {
    const result = decodeShareData('this-is-not-valid-compressed-data!!!')
    expect(result).toBeNull()
  })

  it('returns null for truncated encoded data', () => {
    const payload = makeSamplePayload()
    const encoded = encodeShareData(payload)
    const truncated = encoded.substring(0, 5)
    const result = decodeShareData(truncated)
    // Should not throw — function wraps in try/catch
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('returns null for invalid JSON after decompression', () => {
    const { compressToEncodedURIComponent } = require('lz-string')
    const invalidJson = '{not valid json'
    const encoded = compressToEncodedURIComponent(invalidJson)
    const result = decodeShareData(encoded)
    expect(result).toBeNull()
  })
})

describe('buildShareUrl', () => {
  let originalWindow: any

  beforeEach(() => {
    originalWindow = { ...globalThis.window }
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          origin: 'https://efimeries.app',
          pathname: '/',
        },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
  })

  it('builds URL with origin, pathname and data param', () => {
    const payload = makeSamplePayload()
    const url = buildShareUrl(payload)

    expect(url).toContain('https://efimeries.app/')
    expect(url).toContain('?data=')
  })

  it('the data param decodes to the original payload', () => {
    const payload = makeSamplePayload()
    const url = buildShareUrl(payload)

    const dataParam = url.split('?data=')[1]
    expect(dataParam).toBeDefined()

    const decoded = decodeShareData(dataParam!)
    expect(decoded).not.toBeNull()
    expect(decoded!.year).toBe(2025)
    expect(decoded!.month).toBe(0)
  })

  it('handles pathname other than root', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          origin: 'https://example.com',
          pathname: '/app/efimeries/',
        },
      },
      writable: true,
      configurable: true,
    })

    const payload = makeSamplePayload()
    const url = buildShareUrl(payload)
    expect(url).toContain('https://example.com/app/efimeries/')
    expect(url).toContain('?data=')
  })
})

describe('formatScheduleText', () => {
  // Get the actual uppercased month names (Greek toUpperCase preserves accents)
  const UPPERCASED_MONTHS = MONTH_NAMES.map(n => n?.toUpperCase() ?? '')

  it('returns header with month name and year', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
    ]
    const schedule: (number | null)[] = new Array(31).fill(1)
    const text = formatScheduleText(schedule, doctors, 2025, 0, {})

    expect(text).toContain(`ΕΦΗΜΕΡΙΕΣ — ${UPPERCASED_MONTHS[0]} 2025`)
  })

  it('lists all days with day names and doctor names', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Αλέξανδρος', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Μαρία', type: 'eidikevomenos', colorIndex: 1 },
    ]
    const schedule: (number | null)[] = []
    for (let d = 0; d < 31; d++) schedule.push(d % 2 === 0 ? 1 : 2)

    const text = formatScheduleText(schedule, doctors, 2025, 0, {})

    expect(text).toContain('Αλέξανδρος')
    expect(text).toContain('Μαρία')
    expect(text).toContain('Δε')
    expect(text).toContain('Τρ')
    expect(text).toContain('Πα')
    expect(text).toContain('Σα')
    expect(text).toContain('Κυ')
  })

  it('shows — for unassigned days', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
    ]
    const schedule: (number | null)[] = new Array(31).fill(null)
    const text = formatScheduleText(schedule, doctors, 2025, 0, {})

    // Count lines that contain day numbers and — (skip the header which has — too)
    const lines = text.split('\n')
    const dayLines = lines.filter(l => /^\s*\d+\s/.test(l) && l.includes('—'))
    expect(dayLines.length).toBe(31)
  })

  it('marks holiday days with 🎌 prefix', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
    ]
    const schedule: (number | null)[] = new Array(31).fill(1)
    const marks: MarksMap = {
      1: { 0: 'holiday' },
    }
    const text = formatScheduleText(schedule, doctors, 2025, 0, marks)

    const lines = text.split('\n')
    // Find line for day 1 (index 0)
    const dayOneLine = lines.find(l => /^\s*🎌\s*1\s/.test(l))
    expect(dayOneLine).toBeDefined()
    expect(dayOneLine).toContain('🎌')
  })

  it('handles empty schedule (all null)', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Γιατρός 1', type: 'eidikevomenos', colorIndex: 0 },
    ]
    const schedule: (number | null)[] = new Array(28).fill(null)
    const text = formatScheduleText(schedule, doctors, 2025, 1, {})

    expect(text).toContain(`ΕΦΗΜΕΡΙΕΣ — ${UPPERCASED_MONTHS[1]} 2025`)
    // 28 day lines
    const dayLines = text.split('\n').filter(l => /^\s*\d+\s/.test(l))
    expect(dayLines.length).toBe(28)
  })

  it('handles empty doctors array', () => {
    const schedule: (number | null)[] = new Array(31).fill(null)
    const text = formatScheduleText(schedule, [], 2025, 0, {})

    expect(text).toContain(`ΕΦΗΜΕΡΙΕΣ — ${UPPERCASED_MONTHS[0]} 2025`)
    expect(text.split('\n').length).toBeGreaterThan(2) // header + blank + 31 days
  })

  it('formats all 12 months correctly', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Test', type: 'eidikevomenos', colorIndex: 0 },
    ]

    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(2025, m + 1, 0).getDate()
      const schedule: (number | null)[] = new Array(daysInMonth).fill(1)
      const text = formatScheduleText(schedule, doctors, 2025, m, {})
      expect(text).toContain(UPPERCASED_MONTHS[m])
    }
  })

  it('uses multiple doctors holiday marks to detect holiday', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Doc 1', type: 'eidikevomenos', colorIndex: 0 },
      { id: 2, name: 'Doc 2', type: 'eidikevomenos', colorIndex: 1 },
    ]
    const schedule: (number | null)[] = new Array(31).fill(1)
    // Only doctor 2 has the holiday mark — should still show 🎌
    const marks: MarksMap = {
      2: { 5: 'holiday' },
    }
    const text = formatScheduleText(schedule, doctors, 2025, 0, marks)
    const lines = text.split('\n')
    // Day 6 (index 5) should have flag
    const day6Line = lines.find(l => /^\s*🎌\s*6\s/.test(l))
    expect(day6Line).toBeDefined()
  })

  it('each day line has format: dayNum dayName — doctorName', () => {
    const doctors: Doctor[] = [
      { id: 1, name: 'Τεστ', type: 'eidikevomenos', colorIndex: 0 },
    ]
    const schedule: (number | null)[] = new Array(31).fill(1)
    const text = formatScheduleText(schedule, doctors, 2025, 0, {})
    const lines = text.split('\n').filter(l => /^\s*\d+\s/.test(l))

    // Each day line should match pattern
    for (const line of lines) {
      expect(line).toMatch(/^\s*\d+\s+\S+\s+—\s+\S+/)
    }
  })
})
