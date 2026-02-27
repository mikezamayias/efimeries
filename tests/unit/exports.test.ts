import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Doctor, MarksMap } from '~/utils/types'

function makeDoctors(): Doctor[] {
  return [
    { id: 1, name: 'Αλέξανδρος', type: 'eidikevomenos', colorIndex: 0 },
    { id: 2, name: 'Μαρία', type: 'eidikevomenos', colorIndex: 1 },
    { id: 3, name: 'Ιωάννης', type: 'agrotikos', colorIndex: 2 },
  ]
}

function makeSchedule31(): (number | null)[] {
  const schedule: (number | null)[] = []
  const ids = [1, 2, 1, 2]
  for (let d = 0; d < 31; d++) {
    schedule.push(ids[d % ids.length]!)
  }
  schedule[10] = 3
  schedule[20] = 3
  return schedule
}

describe('exportToICS', () => {
  let capturedBlobContent: string
  let clickedDownload: string
  let OriginalBlob: typeof Blob

  beforeEach(() => {
    capturedBlobContent = ''
    clickedDownload = ''

    // Save original Blob
    OriginalBlob = globalThis.Blob

    // Replace Blob constructor to capture content while still returning a real Blob
    globalThis.Blob = class MockBlob extends OriginalBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        if (parts) {
          capturedBlobContent = parts.map(p => (typeof p === 'string' ? p : '')).join('')
        }
      }
    } as any

    // Mock URL.createObjectURL / revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()

    // Mock document.createElement('a')
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = originalCreateElement('a')
        Object.defineProperty(el, 'click', {
          value: vi.fn(() => {
            clickedDownload = el.download
          }),
        })
        return el
      }
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    globalThis.Blob = OriginalBlob
    vi.restoreAllMocks()
  })

  it('generates valid ICS content with VCALENDAR header', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule = makeSchedule31()

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('BEGIN:VCALENDAR')
    expect(capturedBlobContent).toContain('VERSION:2.0')
    expect(capturedBlobContent).toContain('PRODID:-//Efimeries ESY//EN')
    expect(capturedBlobContent).toContain('CALSCALE:GREGORIAN')
    expect(capturedBlobContent).toContain('END:VCALENDAR')
  })

  it('generates VEVENT for each assigned day', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule = makeSchedule31()

    exportToICS(schedule, doctors, 2025, 0)

    const eventCount = (capturedBlobContent.match(/BEGIN:VEVENT/g) ?? []).length
    const assignedDays = schedule.filter(id => id !== null).length
    expect(eventCount).toBe(assignedDays)
  })

  it('uses correct date format (YYYYMMDD) for DTSTART', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1 // Jan 1st

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('DTSTART;VALUE=DATE:20250101')
    expect(capturedBlobContent).toContain('DTEND;VALUE=DATE:20250102')
  })

  it('includes doctor name in SUMMARY', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('SUMMARY:Εφημερία: Αλέξανδρος')
  })

  it('filters by doctorId when specified', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule = makeSchedule31()

    exportToICS(schedule, doctors, 2025, 0, 1) // Only doctor 1

    expect(capturedBlobContent).toContain('Αλέξανδρος')
    expect(capturedBlobContent).not.toContain('Μαρία')
    expect(capturedBlobContent).not.toContain('Ιωάννης')
  })

  it('includes doctor name in filename when filtered', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule = makeSchedule31()

    exportToICS(schedule, doctors, 2025, 0, 2)

    expect(clickedDownload).toContain('Μαρία')
  })

  it('skips null days in schedule', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1
    schedule[15] = 2

    exportToICS(schedule, doctors, 2025, 0)

    const eventCount = (capturedBlobContent.match(/BEGIN:VEVENT/g) ?? []).length
    expect(eventCount).toBe(2)
  })

  it('handles end-of-month date rollover correctly', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[30] = 1 // Jan 31st → DTEND should be Feb 1st

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('DTSTART;VALUE=DATE:20250131')
    expect(capturedBlobContent).toContain('DTEND;VALUE=DATE:20250201')
  })

  it('generates unique UIDs for each event', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1
    schedule[5] = 2

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('UID:efimeries-2025-0-0@esy')
    expect(capturedBlobContent).toContain('UID:efimeries-2025-0-5@esy')
  })

  it('uses no filter when doctorId is null', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule = makeSchedule31()

    exportToICS(schedule, doctors, 2025, 0, null)

    expect(capturedBlobContent).toContain('Αλέξανδρος')
    expect(capturedBlobContent).toContain('Μαρία')
    expect(capturedBlobContent).toContain('Ιωάννης')
  })

  it('includes DESCRIPTION field with date info', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1

    exportToICS(schedule, doctors, 2025, 0)

    expect(capturedBlobContent).toContain('DESCRIPTION:Εφημερία 1/1/2025 - Αλέξανδρος')
  })

  it('default filename without doctor name when no filter', async () => {
    const { exportToICS } = await import('~/utils/exports')
    const doctors = makeDoctors()
    const schedule: (number | null)[] = new Array(31).fill(null)
    schedule[0] = 1

    exportToICS(schedule, doctors, 2025, 0)

    expect(clickedDownload).toContain('Εφημερίες')
    expect(clickedDownload).toContain('2025')
    expect(clickedDownload).toContain('.ics')
  })
})
