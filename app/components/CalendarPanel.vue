<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, FileSpreadsheet, FileText, CalendarDays, Ban, Star } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import {
  DOCTOR_COLORS,
  DAY_NAMES,
  getDayOfWeek,
  getFirstDayOfWeek,
} from '~/utils/types'
import { exportToExcel, exportToPDF, exportToICS } from '~/utils/exports'

const {
  doctors, month, year, marks, schedule, stats, daysInMonth,
  generate, assignDay,
} = useAppState()

const selectedDay = ref<number | null>(null)
const sheetOpen = ref(false)
const showExports = ref(false)
const icsSheetOpen = ref(false)

const firstDow = computed(() => getFirstDayOfWeek(year.value, month.value))

const gridCells = computed(() => {
  const cells: { day: number | null; index: number }[] = []
  for (let i = 0; i < firstDow.value; i++) cells.push({ day: null, index: -1 })
  for (let d = 0; d < daysInMonth.value; d++) cells.push({ day: d + 1, index: d })
  return cells
})

function getDoctorForDay(dayIndex: number) {
  if (!schedule.value) return null
  const id = schedule.value[dayIndex]
  if (id == null) return null
  return doctors.value.find(d => d.id === id) ?? null
}

function getDoctorColor(dayIndex: number): string {
  const doc = getDoctorForDay(dayIndex)
  if (!doc) return '#999'
  return DOCTOR_COLORS[doc.colorIndex] ?? '#999'
}

function isWeekendDay(dayIndex: number): boolean {
  const dow = getDayOfWeek(year.value, month.value, dayIndex + 1)
  return dow === 0 || dow === 6
}

function getDayMark(dayIndex: number): 'block' | 'want' | 'holiday' | null {
  for (const doc of doctors.value) {
    const mark = marks.value[doc.id]?.[dayIndex]
    if (mark) return mark
  }
  return null
}

function isHoliday(dayIndex: number): boolean {
  for (const doc of doctors.value) {
    if (marks.value[doc.id]?.[dayIndex] === 'holiday') return true
  }
  return false
}

function openSheet(dayIndex: number) {
  if (!schedule.value) return
  selectedDay.value = dayIndex
  sheetOpen.value = true
}

function selectDoctor(doctorId: number | null) {
  if (selectedDay.value !== null) assignDay(selectedDay.value, doctorId)
  sheetOpen.value = false
}

function getMarkForDoctor(doctorId: number, dayIndex: number): 'block' | 'want' | undefined {
  return marks.value[doctorId]?.[dayIndex]
}

async function doExportExcel() {
  if (!schedule.value) return
  await exportToExcel(schedule.value, doctors.value, year.value, month.value, marks.value)
  showExports.value = false
}

async function doExportPDF() {
  if (!schedule.value) return
  await exportToPDF(schedule.value, doctors.value, year.value, month.value, marks.value)
  showExports.value = false
}

function openICSSelector() {
  showExports.value = false
  icsSheetOpen.value = true
}

function doExportICS(doctorId?: number | null) {
  if (!schedule.value) return
  exportToICS(schedule.value, doctors.value, year.value, month.value, doctorId)
  icsSheetOpen.value = false
}
</script>

<template>
  <div class="space-y-3">
    <!-- Generate & Export -->
    <div class="flex gap-2">
      <button class="btn-primary flex-1 flex items-center justify-center gap-2 text-[14px]" @click="generate">
        <Sparkles class="w-[16px] h-[16px]" />
        Δημιουργία Προγράμματος
      </button>
      <button
        v-if="schedule"
        class="btn-secondary flex items-center justify-center w-[48px] h-[48px]"
        @click="showExports = !showExports"
      >
        <FileSpreadsheet class="w-[18px] h-[18px]" />
      </button>
    </div>

    <!-- Export options -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showExports && schedule" class="flex gap-2">
        <button class="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-[13px]" @click="doExportExcel">
          <FileSpreadsheet class="w-[16px] h-[16px] text-positive" />
          Excel
        </button>
        <button class="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-[13px]" @click="doExportPDF">
          <FileText class="w-[16px] h-[16px] text-danger" />
          PDF
        </button>
        <button class="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-[13px]" @click="openICSSelector">
          <CalendarDays class="w-[16px] h-[16px] text-accent" />
          ICS
        </button>
      </div>
    </Transition>

    <!-- Calendar Grid -->
    <div class="card overflow-hidden">
      <!-- Day headers -->
      <div class="grid grid-cols-7 border-b border-border">
        <div
          v-for="(dayName, i) in DAY_NAMES"
          :key="dayName"
          class="text-center text-[11px] font-semibold py-2"
          :class="i === 5 || i === 6 ? 'text-weekend-text' : 'text-muted'"
        >
          {{ dayName }}
        </div>
      </div>

      <!-- Day cells -->
      <div class="grid grid-cols-7">
        <div
          v-for="(cell, ci) in gridCells"
          :key="ci"
          class="aspect-square flex flex-col items-center justify-center gap-[2px] p-[2px] relative
                 border-b border-r border-border transition-colors duration-100"
          :class="[
            cell.day === null
              ? 'bg-background'
              : 'cursor-pointer hover:bg-accent-soft active:scale-[0.97]',
            cell.day !== null && isWeekendDay(cell.index) ? 'bg-weekend-bg' : (cell.day !== null ? 'bg-surface' : ''),
            cell.day !== null && isHoliday(cell.index) ? 'ring-1 ring-inset ring-accent/20' : '',
          ]"
          @click="cell.day !== null && openSheet(cell.index)"
        >
          <template v-if="cell.day !== null">
            <span
              class="text-[12px] font-semibold leading-none"
              :class="isWeekendDay(cell.index) ? 'text-weekend-text' : 'text-foreground'"
            >
              {{ cell.day }}
            </span>

            <div
              v-if="getDoctorForDay(cell.index)"
              class="chip max-w-full overflow-hidden text-ellipsis"
              :style="{
                backgroundColor: getDoctorColor(cell.index) + '1A',
                color: getDoctorColor(cell.index),
              }"
            >
              {{ getDoctorForDay(cell.index)?.name?.slice(0, 5) }}
            </div>
            <div v-else-if="schedule" class="text-[10px] text-muted">—</div>

            <!-- Mark dots -->
            <div class="absolute bottom-[2px] right-[3px] flex gap-[2px]">
              <span v-if="getDayMark(cell.index) === 'want'" class="w-[5px] h-[5px] rounded-full bg-positive" />
              <span v-if="getDayMark(cell.index) === 'block'" class="w-[5px] h-[5px] rounded-full bg-danger" />
              <span v-if="getDayMark(cell.index) === 'holiday'" class="w-[5px] h-[5px] rounded-full bg-accent" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ICS doctor selection -->
    <BottomSheet :open="icsSheetOpen" title="Εξαγωγή ICS" @close="icsSheetOpen = false">
      <div class="space-y-1">
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-background transition-colors min-h-[48px]"
          @click="doExportICS(null)"
        >
          <CalendarDays class="w-[16px] h-[16px] text-accent" />
          <span class="text-[14px] font-medium text-foreground">Όλοι</span>
        </button>
        <button
          v-for="doc in doctors"
          :key="doc.id"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-background transition-colors min-h-[48px]"
          @click="doExportICS(doc.id)"
        >
          <div class="w-[10px] h-[10px] rounded-full flex-shrink-0" :style="{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }" />
          <span class="text-[14px] font-medium text-foreground">{{ doc.name }}</span>
        </button>
      </div>
    </BottomSheet>

    <!-- Day assignment sheet -->
    <BottomSheet :open="sheetOpen" :title="`Ημέρα ${selectedDay !== null ? selectedDay + 1 : ''}`" @close="sheetOpen = false">
      <div class="space-y-1">
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-background transition-colors min-h-[48px]"
          @click="selectDoctor(null)"
        >
          <div class="w-[10px] h-[10px] rounded-full bg-border" />
          <span class="text-[14px] text-muted">Κανένας</span>
        </button>
        <button
          v-for="doc in doctors"
          :key="doc.id"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] hover:bg-background transition-colors min-h-[48px]"
          :class="{ 'bg-accent-soft': schedule && selectedDay !== null && schedule[selectedDay] === doc.id }"
          @click="selectDoctor(doc.id)"
        >
          <div class="w-[10px] h-[10px] rounded-full flex-shrink-0" :style="{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }" />
          <span class="text-[14px] font-medium text-foreground flex-1 text-left">{{ doc.name }}</span>
          <Star v-if="selectedDay !== null && getMarkForDoctor(doc.id, selectedDay) === 'want'" class="w-[14px] h-[14px] text-positive" />
          <Ban v-if="selectedDay !== null && getMarkForDoctor(doc.id, selectedDay) === 'block'" class="w-[14px] h-[14px] text-danger" />
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
