<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '~/composables/useAppState'
import { useScheduleStore } from '~/composables/useScheduleStore'
import {
  MONTH_NAMES,
  DAY_NAMES,
  DOCTOR_COLORS,
  getDaysInMonth,
  getFirstDayOfWeek,
  getDayOfWeek,
} from '~/utils/types'
import type { Doctor } from '~/utils/types'

const { month, year, doctors, setMonth } = useAppState()
const scheduleStore = useScheduleStore()

interface QuarterMonth {
  year: number
  month: number
  label: string
  days: number
  firstDow: number
  schedule: (number | null)[] | null
}

const quarterMonths = computed<QuarterMonth[]>(() => {
  const months: QuarterMonth[] = []
  for (let i = 0; i < 3; i++) {
    let m = month.value + i
    let y = year.value
    if (m > 11) { m -= 12; y++ }
    const data = i === 0
      ? null // current month — handled separately
      : scheduleStore.loadMonth(y, m)
    const schedule = i === 0
      ? getCurrentSchedule()
      : (data?.schedule ?? null)
    months.push({
      year: y,
      month: m,
      label: `${MONTH_NAMES[m]} ${y}`,
      days: getDaysInMonth(y, m),
      firstDow: getFirstDayOfWeek(y, m),
      schedule,
    })
  }
  return months
})

function getCurrentSchedule(): (number | null)[] | null {
  // Import from useAppState directly
  const { schedule } = useAppState()
  return schedule.value
}

function getGridCells(qm: QuarterMonth): { day: number | null; index: number }[] {
  const cells: { day: number | null; index: number }[] = []
  for (let i = 0; i < qm.firstDow; i++) cells.push({ day: null, index: -1 })
  for (let d = 0; d < qm.days; d++) cells.push({ day: d + 1, index: d })
  return cells
}

function getDayColor(qm: QuarterMonth, dayIndex: number): string {
  if (!qm.schedule || dayIndex < 0) return 'transparent'
  const docId = qm.schedule[dayIndex]
  if (docId == null) return 'transparent'
  const doc = doctors.value.find(d => d.id === docId)
  if (!doc) return 'transparent'
  return DOCTOR_COLORS[doc.colorIndex] ?? 'transparent'
}

function isWeekend(y: number, m: number, dayIndex: number): boolean {
  const dow = getDayOfWeek(y, m, dayIndex + 1)
  return dow === 0 || dow === 6
}

function navigateToMonth(qm: QuarterMonth) {
  setMonth(qm.month, qm.year)
}

// Cross-month stats
const crossMonthStats = computed(() => {
  const statMap: Record<number, { name: string; colorIndex: number; total: number }>  = {}
  for (const doc of doctors.value) {
    statMap[doc.id] = { name: doc.name, colorIndex: doc.colorIndex, total: 0 }
  }
  for (const qm of quarterMonths.value) {
    if (!qm.schedule) continue
    for (let d = 0; d < qm.days; d++) {
      const docId = qm.schedule[d]
      if (docId != null && statMap[docId]) {
        statMap[docId]!.total++
      }
    }
  }
  return Object.entries(statMap)
    .filter(([_, s]) => s.total > 0)
    .map(([id, s]) => ({ id: Number(id), ...s }))
    .sort((a, b) => b.total - a.total)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Mini calendars -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div
        v-for="qm in quarterMonths"
        :key="`${qm.year}-${qm.month}`"
        class="card overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
        @click="navigateToMonth(qm)"
      >
        <!-- Month header -->
        <div class="px-3 py-2 border-b border-border">
          <div class="text-[13px] font-semibold text-foreground">{{ qm.label }}</div>
          <div v-if="!qm.schedule" class="text-[10px] text-muted">Δεν υπάρχει πρόγραμμα</div>
        </div>

        <!-- Mini day headers -->
        <div class="grid grid-cols-7 px-1">
          <div
            v-for="(dayName, i) in DAY_NAMES"
            :key="dayName"
            class="text-center text-[8px] font-semibold py-1"
            :class="i === 5 || i === 6 ? 'text-weekend-text' : 'text-muted'"
          >
            {{ dayName }}
          </div>
        </div>

        <!-- Mini grid -->
        <div class="grid grid-cols-7 px-1 pb-1">
          <div
            v-for="(cell, ci) in getGridCells(qm)"
            :key="ci"
            class="aspect-square flex items-center justify-center"
          >
            <template v-if="cell.day !== null">
              <div
                class="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[9px] font-medium"
                :style="{
                  backgroundColor: getDayColor(qm, cell.index) !== 'transparent'
                    ? getDayColor(qm, cell.index) + '2A'
                    : 'transparent',
                  color: getDayColor(qm, cell.index) !== 'transparent'
                    ? getDayColor(qm, cell.index)
                    : (isWeekend(qm.year, qm.month, cell.index) ? 'var(--color-weekend-text)' : 'var(--color-text-secondary)'),
                }"
              >
                {{ cell.day }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Cross-month stats -->
    <div v-if="crossMonthStats.length > 0" class="card p-4">
      <h3 class="text-[13px] font-semibold text-foreground mb-3">Στατιστικά τριμήνου</h3>
      <div class="space-y-2">
        <div v-for="s in crossMonthStats" :key="s.id" class="flex items-center gap-3">
          <div class="w-[8px] h-[8px] rounded-full flex-shrink-0" :style="{ backgroundColor: DOCTOR_COLORS[s.colorIndex] }" />
          <span class="text-[13px] text-foreground flex-1 truncate">{{ s.name }}</span>
          <span class="text-[15px] font-bold" :style="{ color: DOCTOR_COLORS[s.colorIndex] }">{{ s.total }}</span>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted text-center">
      Πατήστε σε μήνα για πλοήγηση. Τα δεδομένα αποθηκεύονται ανά μήνα.
    </p>
  </div>
</template>
