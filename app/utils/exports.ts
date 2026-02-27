import type { Doctor, MarksMap } from './types'
import { getDaysInMonth, getDayOfWeek, getFirstDayOfWeek, MONTH_NAMES, DAY_NAMES, DOCTOR_COLORS } from './types'

function getDoctorName(doctorId: number | null, doctors: Doctor[]): string {
  if (doctorId == null) return ''
  return doctors.find(d => d.id === doctorId)?.name ?? ''
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/** Check if a day is a holiday (any doctor has 'holiday' mark) */
function isDayHoliday(dayIndex: number, doctors: Doctor[], marks: MarksMap): boolean {
  for (const doc of doctors) {
    if (marks[doc.id]?.[dayIndex] === 'holiday') return true
  }
  return false
}

/** Get the XLSX font color object for a doctor */
function getDoctorFontColor(doc: Doctor): { rgb: string } {
  const color = DOCTOR_COLORS[doc.colorIndex] ?? '#000000'
  return { rgb: color.replace('#', '') }
}

export async function exportToExcel(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
) {
  const XLSX = (await import('xlsx-js-style')).default
  const daysInMonth = getDaysInMonth(year, month)
  const wb = XLSX.utils.book_new()

  // Style helpers
  const boldFont = { bold: true }
  const normalFont = { bold: false }
  const headerStyle = { font: { bold: true, sz: 12 } }
  const titleStyle = { font: { bold: true, sz: 14 } }

  function doctorColorFont(doc: Doctor, bold: boolean = false) {
    return { font: { color: getDoctorFontColor(doc), bold } }
  }

  // ── Sheet 1: Calendar Grid (like the handwritten board) ──
  const DAYS_HEADER = ['ΔΕΥΤΕΡΑ', 'ΤΡΙΤΗ', 'ΤΕΤΑΡΤΗ', 'ΠΕΜΠΤΗ', 'ΠΑΡΑΣΚΕΥΗ', 'ΣΑΒΒΑΤΟ', 'ΚΥΡΙΑΚΗ']

  const calData: any[][] = []
  calData.push([{ v: `ΕΦΗΜΕΡΙΕΣ — ${MONTH_NAMES[month]?.toUpperCase()} ${year}`, s: titleStyle }])
  calData.push([]) // blank row
  calData.push(DAYS_HEADER.map(h => ({ v: h, s: headerStyle })))

  // Build weeks (Monday-based)
  const firstDow = getFirstDayOfWeek(year, month) // 0=Mon, 6=Sun
  let currentDay = 1

  // First week - may have leading empty cells
  let week: any[] = new Array(7).fill(null)
  for (let col = firstDow; col < 7 && currentDay <= daysInMonth; col++) {
    const dayIndex = currentDay - 1
    const docId = schedule[dayIndex]
    const doc = doctors.find(d => d.id === docId)
    const name = getDoctorName(docId, doctors)
    const dow = getDayOfWeek(year, month, currentDay)
    const isWknd = dow === 0 || dow === 6
    const isHol = isDayHoliday(dayIndex, doctors, marks)
    const isBold = isWknd || isHol
    const prefix = isHol ? '🎌 ' : ''

    const cellStyle: any = { font: { bold: isBold } }
    if (doc) {
      cellStyle.font.color = getDoctorFontColor(doc)
    }

    week[col] = { v: `${prefix}${currentDay}\n${name}`, s: cellStyle }
    currentDay++
  }
  calData.push(week)

  // Remaining weeks
  while (currentDay <= daysInMonth) {
    week = new Array(7).fill(null)
    for (let col = 0; col < 7 && currentDay <= daysInMonth; col++) {
      const dayIndex = currentDay - 1
      const docId = schedule[dayIndex]
      const doc = doctors.find(d => d.id === docId)
      const name = getDoctorName(docId, doctors)
      const dow = getDayOfWeek(year, month, currentDay)
      const isWknd = dow === 0 || dow === 6
      const isHol = isDayHoliday(dayIndex, doctors, marks)
      const isBold = isWknd || isHol
      const prefix = isHol ? '🎌 ' : ''

      const cellStyle: any = { font: { bold: isBold } }
      if (doc) {
        cellStyle.font.color = getDoctorFontColor(doc)
      }

      week[col] = { v: `${prefix}${currentDay}\n${name}`, s: cellStyle }
      currentDay++
    }
    calData.push(week)
  }

  const wsCalendar = XLSX.utils.aoa_to_sheet(calData)

  // Set column widths
  wsCalendar['!cols'] = DAYS_HEADER.map(() => ({ wch: 18 }))

  // Set row heights for calendar cells (taller for day+name)
  wsCalendar['!rows'] = calData.map((_, i) => ({ hpt: i >= 3 ? 45 : 20 }))

  // Merge title across all columns
  wsCalendar['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]

  XLSX.utils.book_append_sheet(wb, wsCalendar, 'Ημερολόγιο')

  // ── Sheet 2: List view ──
  const listData: any[][] = []
  listData.push([
    { v: 'Ημέρα', s: headerStyle },
    { v: 'Ημερομηνία', s: headerStyle },
    { v: 'Ημέρα Εβδ.', s: headerStyle },
    { v: 'Εφημερεύων', s: headerStyle },
    { v: 'Τύπος', s: headerStyle },
    { v: 'Ωράριο', s: headerStyle },
  ])

  for (let i = 0; i < daysInMonth; i++) {
    const docId = schedule[i]
    const doc = doctors.find(d => d.id === docId)
    const dow = getDayOfWeek(year, month, i + 1)
    const mondayIdx = dow === 0 ? 6 : dow - 1
    const isWknd = dow === 0 || dow === 6
    const isHol = isDayHoliday(i, doctors, marks)
    const isBold = isWknd || isHol

    const rowStyle: any = { font: { bold: isBold } }
    const nameStyle: any = { font: { bold: isBold } }
    if (doc) {
      nameStyle.font.color = getDoctorFontColor(doc)
    }

    listData.push([
      { v: i + 1, s: rowStyle },
      { v: `${i + 1}/${month + 1}/${year}`, s: rowStyle },
      { v: DAY_NAMES[mondayIdx] ?? '', s: rowStyle },
      { v: (isHol ? '🎌 ' : '') + (getDoctorName(docId, doctors) || '—'), s: nameStyle },
      { v: doc ? (doc.type === 'eidikevomenos' ? 'Ειδικευόμενος' : 'Αγροτικός') : '', s: rowStyle },
      { v: '08:00 — 08:00', s: rowStyle },
    ])
  }

  const wsList = XLSX.utils.aoa_to_sheet(listData)
  wsList['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsList, 'Λίστα')

  // ── Sheet 3: Statistics ──
  const statsData: any[][] = []
  statsData.push([
    { v: 'Γιατρός', s: headerStyle },
    { v: 'Τύπος', s: headerStyle },
    { v: 'Σύνολο', s: headerStyle },
    { v: 'Δε-Πε', s: headerStyle },
    { v: 'Παρ.', s: headerStyle },
    { v: 'Σάβ.', s: headerStyle },
    { v: 'Κυρ.', s: headerStyle },
  ])

  for (const doc of doctors) {
    let total = 0, fri = 0, sat = 0, sun = 0
    for (let i = 0; i < daysInMonth; i++) {
      if (schedule[i] === doc.id) {
        total++
        const dow = getDayOfWeek(year, month, i + 1)
        if (dow === 5) fri++
        if (dow === 6) sat++
        if (dow === 0) sun++
      }
    }
    const weekday = total - fri - sat - sun
    statsData.push([
      { v: doc.name, s: doctorColorFont(doc) },
      { v: doc.type === 'eidikevomenos' ? 'Ειδικευόμενος' : 'Αγροτικός', s: normalFont },
      { v: total, s: normalFont },
      { v: weekday, s: normalFont },
      { v: fri, s: normalFont },
      { v: sat, s: normalFont },
      { v: sun, s: normalFont },
    ])
  }

  const wsStats = XLSX.utils.aoa_to_sheet(statsData)
  wsStats['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, wsStats, 'Στατιστικά')

  // ── Sheet 4: Official Program (Φύλλο Προγράμματος) ──
  const FULL_DAY_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']

  const progData: any[][] = []

  // Title
  progData.push([{ v: `ΠΡΟΓΡΑΜΜΑ ${MONTH_NAMES[month]?.toUpperCase()} ${year}`, s: titleStyle }])
  progData.push([]) // blank

  // Header: Date | Εφημερεύων | one column per doctor
  const progHeader: any[] = [
    { v: '', s: headerStyle },
    { v: 'ΕΦΗΜΕΡΕΥΩΝ', s: headerStyle },
  ]
  for (const doc of doctors) {
    progHeader.push({ v: doc.name.toUpperCase(), s: { font: { bold: true, color: getDoctorFontColor(doc) } } })
  }
  progData.push(progHeader)

  // Rows
  for (let i = 0; i < daysInMonth; i++) {
    const dow = getDayOfWeek(year, month, i + 1)
    const dayName = FULL_DAY_NAMES[dow] ?? ''
    const isWknd = dow === 0 || dow === 6
    const isHol = isDayHoliday(i, doctors, marks)
    const isBold = isWknd || isHol
    const prefix = isHol ? '🎌 ' : ''
    const dateStr = `${prefix}${dayName.toUpperCase()} ${String(i + 1).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`

    const docId = schedule[i]
    const assignedDoc = doctors.find(d => d.id === docId)
    const assignedName = assignedDoc?.name?.toUpperCase() ?? '—'

    const rowStyle: any = { font: { bold: isBold } }
    const assignedStyle: any = { font: { bold: isBold } }
    if (assignedDoc) {
      assignedStyle.font.color = getDoctorFontColor(assignedDoc)
    }

    const row: any[] = [
      { v: dateStr, s: rowStyle },
      { v: assignedName, s: assignedStyle },
    ]

    // For each doctor, show "ΟΧΙ" if they're NOT on call, blank if they ARE
    for (const doc of doctors) {
      if (doc.id === docId) {
        row.push({ v: 'ΕΦΗΜΕΡΙΑ', s: { font: { bold: isBold, color: getDoctorFontColor(doc) } } })
      } else {
        row.push({ v: 'ΟΧΙ', s: rowStyle })
      }
    }

    progData.push(row)
  }

  // Add blank rows then statistics summary
  progData.push([])
  progData.push([])
  progData.push([{ v: 'ΣΤΑΤΙΣΤΙΚΑ', s: headerStyle }])
  progData.push([])

  const countHeader: any[] = [{ v: '', s: headerStyle }]
  for (let n = 1; n <= 10; n++) countHeader.push({ v: String(n), s: headerStyle })
  progData.push(countHeader)

  for (const doc of doctors) {
    let total = 0
    for (let i = 0; i < daysInMonth; i++) {
      if (schedule[i] === doc.id) total++
    }
    const row: any[] = [{ v: doc.name.toUpperCase(), s: doctorColorFont(doc, true) }]
    for (let n = 1; n <= 10; n++) {
      row.push({ v: n <= total ? 'X' : String(n), s: normalFont })
    }
    progData.push(row)
  }

  const wsProg = XLSX.utils.aoa_to_sheet(progData)
  wsProg['!cols'] = [
    { wch: 24 }, // date
    { wch: 18 }, // assigned
    ...doctors.map(() => ({ wch: 16 })), // per-doctor columns
  ]

  // Merge title
  wsProg['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 + doctors.length } }]

  XLSX.utils.book_append_sheet(wb, wsProg, 'Πρόγραμμα')

  XLSX.writeFile(wb, `Εφημερίες_${MONTH_NAMES[month]}_${year}.xlsx`)
}

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export async function exportToPDF(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  marks: MarksMap,
) {
  const { jsPDF } = await import('jspdf')
  const daysInMonth = getDaysInMonth(year, month)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Load and embed Greek-compatible fonts
  const [regularBase64, boldBase64] = await Promise.all([
    loadFont('/fonts/NotoSans-Regular.ttf'),
    loadFont('/fonts/NotoSans-Bold.ttf'),
  ])

  doc.addFileToVFS('NotoSans-Regular.ttf', regularBase64)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64)
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')

  // Title
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(18)
  doc.text(`Εφημερίες — ${MONTH_NAMES[month]} ${year}`, 15, 20)

  doc.setFontSize(10)
  let y = 35

  // Header row
  doc.setFont('NotoSans', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Ημ.', 15, y)
  doc.text('Ημέρα', 30, y)
  doc.text('Εφημερεύων', 55, y)
  y += 2
  doc.line(15, y, 195, y)
  y += 6

  doc.setFont('NotoSans', 'normal')
  for (let i = 0; i < daysInMonth; i++) {
    if (y > 275) {
      doc.addPage()
      y = 20
    }
    const dow = getDayOfWeek(year, month, i + 1)
    const isWknd = dow === 0 || dow === 6
    const isHol = isDayHoliday(i, doctors, marks)
    const isBold = isWknd || isHol
    const docId = schedule[i]
    const doctor = doctors.find(d => d.id === docId)
    const name = getDoctorName(docId, doctors)

    if (isBold) {
      doc.setFont('NotoSans', 'bold')
    } else {
      doc.setFont('NotoSans', 'normal')
    }

    // Day number and day name in black
    doc.setTextColor(0, 0, 0)
    const dayLabel = isHol ? `🎌 ${i + 1}` : `${i + 1}`
    doc.text(dayLabel, 15, y)
    const mondayIdx = dow === 0 ? 6 : dow - 1
    doc.text(DAY_NAMES[mondayIdx] ?? '', 30, y)

    // Doctor name in their color
    if (doctor) {
      const rgb = hexToRgb(DOCTOR_COLORS[doctor.colorIndex] ?? '#000000')
      doc.setTextColor(rgb.r, rgb.g, rgb.b)
    }
    doc.text(name, 55, y)

    // Reset color
    doc.setTextColor(0, 0, 0)

    y += 6
  }

  // Reset font
  doc.setFont('NotoSans', 'normal')

  doc.save(`Εφημερίες_${MONTH_NAMES[month]}_${year}.pdf`)
}

export function exportToICS(
  schedule: (number | null)[],
  doctors: Doctor[],
  year: number,
  month: number,
  doctorId?: number | null,
) {
  const daysInMonth = getDaysInMonth(year, month)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Efimeries ESY//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (let i = 0; i < daysInMonth; i++) {
    const docId = schedule[i]
    if (docId == null) continue

    // Filter by doctor if specified
    if (doctorId != null && docId !== doctorId) continue

    const name = getDoctorName(docId, doctors)

    const fmtDate = (y: number, m: number, d: number) =>
      y.toString()
      + String(m).padStart(2, '0')
      + String(d).padStart(2, '0')

    const startStr = fmtDate(year, month + 1, i + 1)
    // DTEND for all-day is exclusive, so next day
    const endDate = new Date(year, month, i + 2)
    const endStr = fmtDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate())

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${startStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Εφημερία: ${name}`,
      `DESCRIPTION:Εφημερία ${i + 1}/${month + 1}/${year} - ${name}`,
      `UID:efimeries-${year}-${month}-${i}@esy`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url

  // Include doctor name in filename if filtered
  let filename = `Εφημερίες_${MONTH_NAMES[month]}_${year}`
  if (doctorId != null) {
    const doc = doctors.find(d => d.id === doctorId)
    if (doc) filename += `_${doc.name}`
  }
  a.download = `${filename}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
