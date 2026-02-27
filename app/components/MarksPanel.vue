<script setup lang="ts">
import { ref } from 'vue'
import { Ban, Star, CalendarHeart } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { DOCTOR_COLORS, getDayOfWeek } from '~/utils/types'

const { doctors, month, year, marks, daysInMonth, setMark } = useAppState()

const mode = ref<'block' | 'want' | 'holiday'>('block')

function toggleMark(doctorId: number, dayIndex: number) {
  const current = marks.value[doctorId]?.[dayIndex]
  setMark(doctorId, dayIndex, current === mode.value ? undefined : mode.value)
}

function getMark(doctorId: number, dayIndex: number): 'block' | 'want' | undefined {
  return marks.value[doctorId]?.[dayIndex]
}

function isWeekend(dayIndex: number): boolean {
  const dow = getDayOfWeek(year.value, month.value, dayIndex + 1)
  return dow === 0 || dow === 6
}
</script>

<template>
  <div class="space-y-3">
    <!-- Mode toggle -->
    <div class="card flex gap-1 p-1">
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px]"
        :style="mode === 'block' ? { backgroundColor: 'var(--color-danger)', color: 'white' } : {}"
        :class="mode !== 'block' ? 'text-muted hover:text-foreground' : ''"
        @click="mode = 'block'"
      >
        <Ban class="w-[14px] h-[14px]" />
        Αποκλεισμός
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px]"
        :style="mode === 'want' ? { backgroundColor: 'var(--color-positive)', color: 'white' } : {}"
        :class="mode !== 'want' ? 'text-muted hover:text-foreground' : ''"
        @click="mode = 'want'"
      >
        <Star class="w-[14px] h-[14px]" />
        Επιθυμία
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] font-medium text-[12px] transition-all min-h-[44px]"
        :style="mode === 'holiday' ? { backgroundColor: 'var(--color-accent)', color: 'white' } : {}"
        :class="mode !== 'holiday' ? 'text-muted hover:text-foreground' : ''"
        @click="mode = 'holiday'"
      >
        <CalendarHeart class="w-[14px] h-[14px]" />
        Αργία
      </button>
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
                  :style="{
                    backgroundColor: getMark(doc.id, d - 1) === 'block' ? 'rgba(255,59,48,0.15)'
                      : getMark(doc.id, d - 1) === 'want' ? 'rgba(52,199,89,0.15)'
                      : getMark(doc.id, d - 1) === 'holiday' ? 'rgba(0,113,227,0.15)' : 'transparent',
                    color: getMark(doc.id, d - 1) === 'block' ? 'var(--color-danger)'
                      : getMark(doc.id, d - 1) === 'want' ? 'var(--color-positive)'
                      : getMark(doc.id, d - 1) === 'holiday' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }"
                  @click="toggleMark(doc.id, d - 1)"
                >
                  <Ban v-if="getMark(doc.id, d - 1) === 'block'" class="w-[12px] h-[12px]" />
                  <Star v-else-if="getMark(doc.id, d - 1) === 'want'" class="w-[12px] h-[12px]" />
                  <CalendarHeart v-else-if="getMark(doc.id, d - 1) === 'holiday'" class="w-[12px] h-[12px]" />
                  <span v-else class="text-[10px] opacity-20">·</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[11px] text-muted text-center">
      Πατήστε σε κελί για {{ mode === 'block' ? 'αποκλεισμό' : mode === 'want' ? 'επιθυμία' : 'αργία' }}. Πατήστε ξανά για αφαίρεση.
    </p>
  </div>
</template>
