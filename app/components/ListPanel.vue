<script setup lang="ts">
import { Star, Palmtree, Thermometer, Clock } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { DOCTOR_COLORS, DAY_NAMES, SHIFT_TYPES, getDayOfWeek, getDayOfWeekMondayBased } from '~/utils/types'

const { doctors, month, year, marks, schedule, daysInMonth, holidayMap, shiftType } = useAppState()

function getShiftHours(): string {
  const st = SHIFT_TYPES.find(s => s.value === shiftType.value)
  return st?.hours ?? '08:00 — 08:00'
}

function getDoctorForDay(dayIndex: number) {
  if (!schedule.value) return null
  const id = schedule.value[dayIndex]
  if (id == null) return null
  return doctors.value.find(d => d.id === id) ?? null
}

function isWeekend(dayIndex: number): boolean {
  const dow = getDayOfWeek(year.value, month.value, dayIndex + 1)
  return dow === 0 || dow === 6
}

function dayName(dayIndex: number): string {
  const dow = getDayOfWeekMondayBased(year.value, month.value, dayIndex + 1)
  return DAY_NAMES[dow] ?? ''
}

function isWantFulfilled(dayIndex: number): boolean {
  const docId = schedule.value?.[dayIndex]
  if (docId == null) return false
  return marks.value[docId]?.[dayIndex] === 'want'
}

function hasLeaveOrSick(dayIndex: number): 'leave' | 'sick' | null {
  for (const doc of doctors.value) {
    const mark = marks.value[doc.id]?.[dayIndex]
    if (mark === 'leave') return 'leave'
    if (mark === 'sick') return 'sick'
  }
  return null
}

function getHolidayName(dayIndex: number): string | null {
  return holidayMap.value[dayIndex] ?? null
}

function getRowBg(dayIndex: number): string {
  const ls = hasLeaveOrSick(dayIndex)
  if (ls === 'leave') return 'rgba(245,158,11,0.08)'
  if (ls === 'sick') return 'rgba(239,68,68,0.08)'
  if (isWeekend(dayIndex)) return 'var(--color-weekend-bg)'
  return 'var(--color-surface)'
}
</script>

<template>
  <div class="space-y-1">
    <div v-if="!schedule" class="card p-8 text-center">
      <p class="text-muted text-[14px]">Δεν υπάρχει πρόγραμμα. Δημιουργήστε πρώτα από το Ημερολόγιο.</p>
    </div>

    <template v-else>
      <div
        v-for="i in daysInMonth"
        :key="i"
        class="flex items-center gap-3 px-4 py-3 rounded-[8px] transition-colors"
        :style="{ backgroundColor: getRowBg(i - 1) }"
      >
        <div class="w-[48px] flex-shrink-0">
          <div
            class="text-[18px] font-semibold leading-none"
            :class="isWeekend(i - 1) ? 'text-weekend-text' : 'text-foreground'"
          >
            {{ i }}
          </div>
          <div class="text-[11px] font-medium mt-0.5"
               :style="{ color: isWeekend(i - 1) ? 'var(--color-weekend-text)' : 'var(--color-text-secondary)' }">
            {{ dayName(i - 1) }}
          </div>
          <!-- Holiday name in list -->
          <div v-if="getHolidayName(i - 1)" class="text-[9px] text-accent font-medium mt-0.5 truncate max-w-[48px]">
            {{ getHolidayName(i - 1) }}
          </div>
        </div>

        <div class="flex-1">
          <div class="flex items-center gap-2">
            <div
              v-if="getDoctorForDay(i - 1)"
              class="chip inline-flex"
              :style="{
                backgroundColor: DOCTOR_COLORS[getDoctorForDay(i - 1)!.colorIndex] + '1A',
                color: DOCTOR_COLORS[getDoctorForDay(i - 1)!.colorIndex],
              }"
            >
              {{ getDoctorForDay(i - 1)!.name }}
            </div>
            <span v-else class="text-[13px] text-muted">—</span>
            <span v-if="getDoctorForDay(i - 1)" class="text-[11px] text-muted flex items-center gap-0.5">
              <Clock class="w-[10px] h-[10px]" />
              {{ getShiftHours() }}
            </span>
          </div>
          <div
            v-if="getDoctorForDay(i - 1)?.specialization"
            class="text-[10px] text-muted mt-0.5"
          >
            {{ getDoctorForDay(i - 1)!.specialization }}
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <Palmtree v-if="hasLeaveOrSick(i - 1) === 'leave'" class="w-[14px] h-[14px]" style="color: #F59E0B" />
          <Thermometer v-if="hasLeaveOrSick(i - 1) === 'sick'" class="w-[14px] h-[14px]" style="color: #EF4444" />
          <Star v-if="isWantFulfilled(i - 1)" class="w-[14px] h-[14px] text-positive" />
        </div>
      </div>
    </template>
  </div>
</template>
