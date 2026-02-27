<script setup lang="ts">
import { ref, computed } from 'vue'
import { Ban, Star, CalendarHeart, Palmtree, Thermometer } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useHaptics } from '~/composables/useHaptics'
import { DOCTOR_COLORS, getDayOfWeek } from '~/utils/types'
import type { Mark } from '~/utils/types'

const { doctors, month, year, marks, daysInMonth, setMark, setMarkRange } = useAppState()
const haptics = useHaptics()

const mode = ref<'block' | 'want' | 'holiday' | 'leave' | 'sick'>('block')

// Range selection state for leave/sick
const rangeStart = ref<{ doctorId: number; dayIndex: number } | null>(null)

function switchMode(m: 'block' | 'want' | 'holiday' | 'leave' | 'sick') {
  if (mode.value !== m) {
    mode.value = m
    rangeStart.value = null
    haptics.light()
  }
}

const isRangeMode = computed(() => mode.value === 'leave' || mode.value === 'sick')

function handleCellClick(doctorId: number, dayIndex: number) {
  if (isRangeMode.value) {
    // Range selection for leave/sick
    if (rangeStart.value && rangeStart.value.doctorId === doctorId) {
      // Second tap: fill range
      const current = marks.value[doctorId]?.[dayIndex]
      if (rangeStart.value.dayIndex === dayIndex) {
        // Same cell tapped twice: toggle single cell
        setMark(doctorId, dayIndex, current === mode.value ? undefined : mode.value as Mark)
      }
      else {
        setMarkRange(doctorId, rangeStart.value.dayIndex, dayIndex, mode.value as Mark)
      }
      rangeStart.value = null
      haptics.medium()
    }
    else {
      // First tap: set range start
      rangeStart.value = { doctorId, dayIndex }
      haptics.light()
    }
  }
  else {
    // Regular toggle
    const current = marks.value[doctorId]?.[dayIndex]
    setMark(doctorId, dayIndex, current === mode.value ? undefined : mode.value as Mark)
    haptics.light()
  }
}

function getMark(doctorId: number, dayIndex: number): Mark {
  return marks.value[doctorId]?.[dayIndex]
}

function isWeekend(dayIndex: number): boolean {
  const dow = getDayOfWeek(year.value, month.value, dayIndex + 1)
  return dow === 0 || dow === 6
}

function isRangeHighlight(doctorId: number, dayIndex: number): boolean {
  if (!rangeStart.value) return false
  return rangeStart.value.doctorId === doctorId && rangeStart.value.dayIndex === dayIndex
}

function getCellStyle(doctorId: number, dayIndex: number) {
  const mark = getMark(doctorId, dayIndex)
  const highlight = isRangeHighlight(doctorId, dayIndex)

  if (highlight) {
    return {
      backgroundColor: mode.value === 'leave' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
      color: mode.value === 'leave' ? '#D97706' : '#DC2626',
      outline: '2px solid',
      outlineColor: mode.value === 'leave' ? '#F59E0B' : '#EF4444',
      outlineOffset: '-2px',
      borderRadius: '6px',
    }
  }

  if (mark === 'block') return { backgroundColor: 'rgba(255,59,48,0.15)', color: 'var(--color-danger)' }
  if (mark === 'want') return { backgroundColor: 'rgba(52,199,89,0.15)', color: 'var(--color-positive)' }
  if (mark === 'holiday') return { backgroundColor: 'rgba(0,113,227,0.15)', color: 'var(--color-accent)' }
  if (mark === 'leave') return { backgroundColor: 'rgba(245,158,11,0.15)', color: '#D97706' }
  if (mark === 'sick') return { backgroundColor: 'rgba(239,68,68,0.15)', color: '#DC2626' }
  return { backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }
}

const modeLabel = computed(() => {
  switch (mode.value) {
    case 'block': return 'αποκλεισμό'
    case 'want': return 'επιθυμία'
    case 'holiday': return 'αργία'
    case 'leave': return 'άδεια (πατήστε αρχή → τέλος)'
    case 'sick': return 'αναρρωτική (πατήστε αρχή → τέλος)'
  }
})
</script>

<template>
  <div class="space-y-3">
    <!-- Mode toggle -->
    <div class="card flex flex-wrap gap-1 p-1">
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px] min-w-[80px]"
        :style="mode === 'block' ? { backgroundColor: 'var(--color-danger)', color: 'white' } : {}"
        :class="mode !== 'block' ? 'text-muted hover:text-foreground' : ''"
        @click="switchMode('block')"
      >
        <Ban class="w-[14px] h-[14px]" />
        Αποκλ.
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px] min-w-[80px]"
        :style="mode === 'want' ? { backgroundColor: 'var(--color-positive)', color: 'white' } : {}"
        :class="mode !== 'want' ? 'text-muted hover:text-foreground' : ''"
        @click="switchMode('want')"
      >
        <Star class="w-[14px] h-[14px]" />
        Επιθυμία
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px] min-w-[80px]"
        :style="mode === 'holiday' ? { backgroundColor: 'var(--color-accent)', color: 'white' } : {}"
        :class="mode !== 'holiday' ? 'text-muted hover:text-foreground' : ''"
        @click="switchMode('holiday')"
      >
        <CalendarHeart class="w-[14px] h-[14px]" />
        Αργία
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px] min-w-[80px]"
        :style="mode === 'leave' ? { backgroundColor: '#F59E0B', color: 'white' } : {}"
        :class="mode !== 'leave' ? 'text-muted hover:text-foreground' : ''"
        @click="switchMode('leave')"
      >
        <Palmtree class="w-[14px] h-[14px]" />
        Άδεια
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px] min-w-[80px]"
        :style="mode === 'sick' ? { backgroundColor: '#EF4444', color: 'white' } : {}"
        :class="mode !== 'sick' ? 'text-muted hover:text-foreground' : ''"
        @click="switchMode('sick')"
      >
        <Thermometer class="w-[14px] h-[14px]" />
        Αναρρ.
      </button>
    </div>

    <!-- Range selection indicator -->
    <div v-if="rangeStart" class="text-[12px] text-center font-medium" style="color: var(--color-accent)">
      Επιλέξτε τελευταία ημέρα για {{ mode === 'leave' ? 'άδεια' : 'αναρρωτική' }}
      ({{ rangeStart.dayIndex + 1 }} →)
    </div>

    <!-- Marks table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 px-3 py-2 text-left text-[11px] font-semibold text-muted min-w-[110px] border-b border-border"
                  style="background-color: var(--color-surface)">
                Γιατρός
              </th>
              <th
                v-for="d in daysInMonth"
                :key="d"
                class="px-0 py-2 text-center text-[11px] font-medium border-b border-border min-w-[34px]"
                :class="isWeekend(d - 1) ? 'text-weekend-text' : 'text-muted'"
                :style="isWeekend(d - 1) ? { backgroundColor: 'var(--color-weekend-bg)' } : {}"
              >
                {{ d }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in doctors" :key="doc.id" class="border-b border-border last:border-0">
              <td class="sticky left-0 z-10 px-3 py-2"
                  style="background-color: var(--color-surface)">
                <div class="flex items-center gap-2">
                  <div class="w-[8px] h-[8px] rounded-full flex-shrink-0" :style="{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }" />
                  <span class="text-[13px] font-medium text-foreground truncate">{{ doc.name }}</span>
                </div>
              </td>
              <td
                v-for="d in daysInMonth"
                :key="d"
                class="px-0 py-0.5 text-center"
              >
                <button
                  class="w-[32px] h-[32px] rounded-[6px] flex items-center justify-center transition-all
                         hover:bg-background active:scale-90 mx-auto"
                  :style="getCellStyle(doc.id, d - 1)"
                  @click="handleCellClick(doc.id, d - 1)"
                >
                  <Ban v-if="getMark(doc.id, d - 1) === 'block'" class="w-[12px] h-[12px]" />
                  <Star v-else-if="getMark(doc.id, d - 1) === 'want'" class="w-[12px] h-[12px]" />
                  <CalendarHeart v-else-if="getMark(doc.id, d - 1) === 'holiday'" class="w-[12px] h-[12px]" />
                  <Palmtree v-else-if="getMark(doc.id, d - 1) === 'leave'" class="w-[12px] h-[12px]" />
                  <Thermometer v-else-if="getMark(doc.id, d - 1) === 'sick'" class="w-[12px] h-[12px]" />
                  <span v-else class="text-[10px] opacity-20">·</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[11px] text-muted text-center">
      Πατήστε σε κελί για {{ modeLabel }}. Πατήστε ξανά για αφαίρεση.
    </p>
  </div>
</template>
