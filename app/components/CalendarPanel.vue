<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Sparkles, FileSpreadsheet, FileText, CalendarDays, Ban, Star, Palmtree, Thermometer, Printer } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useHaptics } from '~/composables/useHaptics'
import { useDragDrop } from '~/composables/useDragDrop'
import {
  DOCTOR_COLORS,
  DAY_NAMES,
  MONTH_NAMES,
  getDayOfWeek,
  getFirstDayOfWeek,
} from '~/utils/types'
import { exportToExcel, exportToPDF, exportToICS } from '~/utils/exports'

const props = withDefaults(defineProps<{
  readOnly?: boolean
}>(), {
  readOnly: false,
})

const {
  doctors, month, year, marks, schedule, stats, daysInMonth, shiftType,
  generate, assignDay, swapDays, holidayMap, showToast,
} = useAppState()

const haptics = useHaptics()

const selectedDay = ref<number | null>(null)
const sheetOpen = ref(false)
const showExports = ref(false)
const icsSheetOpen = ref(false)
const calendarGridRef = ref<HTMLElement | null>(null)

// ─── Staggered reveal animation ───
const revealedCells = ref<Set<number>>(new Set())
const isStaggering = ref(false)
let staggerTimeout: ReturnType<typeof setTimeout> | null = null

function startStaggeredReveal() {
  revealedCells.value = new Set()
  isStaggering.value = true
  const totalDays = daysInMonth.value
  for (let i = 0; i < totalDays; i++) {
    const t = setTimeout(() => {
      revealedCells.value = new Set([...revealedCells.value, i])
      if (i === totalDays - 1) {
        isStaggering.value = false
      }
    }, i * 20)
    staggerTimeout = t
  }
}

// ─── Drag & Drop ───

function handleSwap(from: number, to: number) {
  swapDays(from, to)
  haptics.medium()
  showToast('Μετακίνηση εφημερίας')
}

const { dragState, handleDragStart, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, handleDragEnd, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel } = useDragDrop(handleSwap)

/** Find the day index of the calendar cell at a given screen coordinate */
function getCellAtPoint(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  if (!el) return null
  const dayAttr = el.closest('[data-day-index]')?.getAttribute('data-day-index')
  if (dayAttr !== null && dayAttr !== undefined) return parseInt(dayAttr, 10)
  return null
}

// ─── Cell tap animation ───
const tappedCell = ref<number | null>(null)
let tapTimer: ReturnType<typeof setTimeout> | null = null

function tapCell(dayIndex: number) {
  tappedCell.value = dayIndex
  if (tapTimer) clearTimeout(tapTimer)
  tapTimer = setTimeout(() => { tappedCell.value = null }, 200)
}

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

function getDayMark(dayIndex: number): 'block' | 'want' | 'holiday' | 'leave' | 'sick' | null {
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

function openSheet(dayIndex: number) {
  if (!schedule.value) return
  tapCell(dayIndex)
  selectedDay.value = dayIndex
  sheetOpen.value = true
}

function selectDoctor(doctorId: number | null) {
  if (selectedDay.value !== null) assignDay(selectedDay.value, doctorId)
  sheetOpen.value = false
  haptics.medium()
}

function getMarkForDoctor(doctorId: number, dayIndex: number): 'block' | 'want' | 'leave' | 'sick' | undefined {
  const mark = marks.value[doctorId]?.[dayIndex]
  if (mark === 'block' || mark === 'want' || mark === 'leave' || mark === 'sick') return mark
  return undefined
}

// Wrapped generate with staggered reveal
function doGenerate() {
  generate()
  haptics.success()
  startStaggeredReveal()
}

async function doExportExcel() {
  if (!schedule.value) return
  await exportToExcel(schedule.value, doctors.value, year.value, month.value, marks.value, shiftType.value)
  showExports.value = false
}

async function doExportPDF() {
  if (!schedule.value) return
  await exportToPDF(schedule.value, doctors.value, year.value, month.value, marks.value, shiftType.value)
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

function doPrint() {
  window.print()
}

// On touch move, delegate to drag composable
function onGridTouchMove(e: TouchEvent) {
  handleTouchMove(e, getCellAtPoint)
}

// Helper: is this cell the drop target?
function isDropTarget(dayIndex: number): boolean {
  return dragState.value.isDragging && dragState.value.targetDayIndex === dayIndex && dragState.value.sourceDayIndex !== dayIndex
}

// Helper: is this cell the drag source?
function isDragSource(dayIndex: number): boolean {
  return dragState.value.isDragging && dragState.value.sourceDayIndex === dayIndex
}

// Cell visibility for stagger (always visible if not staggering)
function isCellRevealed(dayIndex: number): boolean {
  if (!isStaggering.value) return true
  return revealedCells.value.has(dayIndex)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Print header (hidden on screen, shown on print) -->
    <div class="print-header" style="display: none;">
      <h1>Εφημερίες — {{ MONTH_NAMES[month] }} {{ year }}</h1>
    </div>

    <!-- Generate & Export (hidden in read-only) -->
    <template v-if="!readOnly">
      <div class="flex gap-2 print-hide">
        <button
          id="generate-btn"
          class="btn-primary flex-1 flex items-center justify-center gap-2 text-[14px]"
          @click="doGenerate()"
        >
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
        <div v-if="showExports && schedule" class="flex gap-2 print-hide">
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
          <button class="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-[13px]" @click="doPrint">
            <Printer class="w-[16px] h-[16px] text-muted" />
            Εκτύπωση
          </button>
        </div>
      </Transition>
    </template>

    <!-- Calendar Grid -->
    <div ref="calendarGridRef" class="card overflow-hidden">
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
      <div
        class="grid grid-cols-7"
        @touchmove="onGridTouchMove"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchCancel"
      >
        <div
          v-for="(cell, ci) in gridCells"
          :key="ci"
          :data-day-index="cell.day !== null ? cell.index : undefined"
          :draggable="!readOnly && !!schedule && cell.day !== null && getDoctorForDay(cell.index) !== null"
          class="aspect-square flex flex-col items-center justify-center gap-[1px] p-[2px] relative
                 border-b border-r border-border transition-all duration-150"
          :class="[
            cell.day === null
              ? 'bg-background'
              : 'cursor-pointer hover:bg-accent-soft',
            cell.day !== null && isWeekendDay(cell.index) ? 'bg-weekend-bg' : (cell.day !== null ? 'bg-surface' : ''),
            cell.day !== null && isHoliday(cell.index) ? 'ring-1 ring-inset ring-accent/20' : '',
            cell.day !== null && hasLeaveOrSick(cell.index) === 'leave' ? 'ring-1 ring-inset ring-amber-400/30' : '',
            cell.day !== null && hasLeaveOrSick(cell.index) === 'sick' ? 'ring-1 ring-inset ring-red-400/30' : '',
            cell.day !== null && isDropTarget(cell.index) ? 'ring-2 ring-inset ring-accent bg-accent-soft scale-[1.02]' : '',
            cell.day !== null && isDragSource(cell.index) ? 'opacity-40' : '',
            cell.day !== null && tappedCell === cell.index ? 'scale-[0.95]' : '',
          ]"
          @click="cell.day !== null && !readOnly && !dragState.isDragging && openSheet(cell.index)"
          @dragstart="cell.day !== null && handleDragStart($event, cell.index)"
          @dragover="cell.day !== null && handleDragOver($event, cell.index)"
          @dragenter="cell.day !== null && handleDragEnter($event, cell.index)"
          @dragleave="cell.day !== null && handleDragLeave($event, cell.index)"
          @drop="cell.day !== null && handleDrop($event, cell.index)"
          @dragend="handleDragEnd($event)"
          @touchstart="cell.day !== null && !readOnly && schedule && getDoctorForDay(cell.index) !== null && handleTouchStart($event, cell.index, $event.currentTarget as HTMLElement)"
        >
          <template v-if="cell.day !== null">
            <span
              class="text-[12px] font-semibold leading-none"
              :class="isWeekendDay(cell.index) ? 'text-weekend-text' : 'text-foreground'"
            >
              {{ cell.day }}
            </span>

            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 scale-75"
              enter-to-class="opacity-100 scale-100"
            >
              <div
                v-if="getDoctorForDay(cell.index) && isCellRevealed(cell.index)"
                class="chip max-w-full overflow-hidden text-ellipsis"
                :style="{
                  backgroundColor: getDoctorColor(cell.index) + '1A',
                  color: getDoctorColor(cell.index),
                }"
              >
                {{ getDoctorForDay(cell.index)?.name?.slice(0, 5) }}
              </div>
              <div
                v-if="getDoctorForDay(cell.index)?.specialization && isCellRevealed(cell.index)"
                class="text-[7px] leading-tight font-medium truncate max-w-full px-[1px] text-center"
                :style="{ color: getDoctorColor(cell.index) }"
              >
                {{ getDoctorForDay(cell.index)!.specialization }}
              </div>
            </Transition>
            <div v-if="!getDoctorForDay(cell.index) && schedule && isCellRevealed(cell.index)" class="text-[10px] text-muted">—</div>

            <!-- Holiday name -->
            <div
              v-if="getHolidayName(cell.index)"
              class="text-[7px] leading-tight text-accent font-medium truncate max-w-full px-[1px] text-center"
            >
              {{ getHolidayName(cell.index) }}
            </div>

            <!-- Mark dots -->
            <div class="absolute bottom-[2px] right-[3px] flex gap-[2px]">
              <span v-if="getDayMark(cell.index) === 'want'" class="w-[5px] h-[5px] rounded-full bg-positive" />
              <span v-if="getDayMark(cell.index) === 'block'" class="w-[5px] h-[5px] rounded-full bg-danger" />
              <span v-if="getDayMark(cell.index) === 'holiday'" class="w-[5px] h-[5px] rounded-full bg-accent" />
              <span v-if="getDayMark(cell.index) === 'leave'" class="w-[5px] h-[5px] rounded-full" style="background-color: #F59E0B" />
              <span v-if="getDayMark(cell.index) === 'sick'" class="w-[5px] h-[5px] rounded-full" style="background-color: #EF4444" />
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

    <!-- Print footer (hidden on screen, shown on print) -->
    <div class="print-footer" style="display: none;">
      Εκτυπώθηκε: {{ new Date().toLocaleDateString('el-GR') }}
    </div>

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
          <Palmtree v-if="selectedDay !== null && getMarkForDoctor(doc.id, selectedDay) === 'leave'" class="w-[14px] h-[14px]" style="color: #F59E0B" />
          <Thermometer v-if="selectedDay !== null && getMarkForDoctor(doc.id, selectedDay) === 'sick'" class="w-[14px] h-[14px]" style="color: #EF4444" />
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
