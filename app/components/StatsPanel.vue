<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '~/composables/useAppState'
import { DOCTOR_COLORS, DOCTOR_TYPE_LABELS } from '~/utils/types'

const { doctors, schedule, stats } = useAppState()

const doctorStats = computed(() => {
  if (!stats.value || !schedule.value) return []
  return doctors.value.map((doc) => {
    const total = stats.value!.counts[doc.id] ?? 0
    const fri = stats.value!.friCounts[doc.id] ?? 0
    const sat = stats.value!.satCounts[doc.id] ?? 0
    const sun = stats.value!.sunCounts[doc.id] ?? 0
    const holiday = stats.value!.holidayCounts[doc.id] ?? 0
    const weekday = total - fri - sat - sun
    const wantsFulfilled = stats.value!.wantsFulfilled[doc.id] ?? 0
    const wantsTotal = stats.value!.wantsTotal[doc.id] ?? 0
    const wishPercent = wantsTotal > 0 ? Math.round((wantsFulfilled / wantsTotal) * 100) : -1
    return { ...doc, total, fri, sat, sun, holiday, weekday, wantsFulfilled, wantsTotal, wishPercent }
  })
})
</script>

<template>
  <div>
    <div v-if="!schedule" class="card p-8 text-center">
      <p class="text-muted text-[14px]">Δεν υπάρχει πρόγραμμα. Δημιουργήστε πρώτα από το Ημερολόγιο.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="doc in doctorStats"
        :key="doc.id"
        class="card p-4"
        :style="{ borderLeft: `3px solid ${DOCTOR_COLORS[doc.colorIndex]}` }"
      >
        <!-- Name & Total -->
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-[14px] font-semibold text-foreground">{{ doc.name }}</div>
            <div class="text-[11px] text-muted mt-0.5">{{ DOCTOR_TYPE_LABELS[doc.type] }}</div>
          </div>
          <div class="text-[24px] font-bold tracking-tight" :style="{ color: DOCTOR_COLORS[doc.colorIndex] }">
            {{ doc.total }}
          </div>
        </div>

        <!-- Breakdown -->
        <div class="flex gap-4 text-[13px] mb-3 flex-wrap">
          <div>
            <span class="text-muted">Δε-Πε</span>
            <span class="ml-1 font-semibold text-foreground">{{ doc.weekday }}</span>
          </div>
          <div>
            <span class="text-muted">Παρ</span>
            <span class="ml-1 font-semibold text-weekend-text">{{ doc.fri }}</span>
          </div>
          <div>
            <span class="text-muted">Σαβ</span>
            <span class="ml-1 font-semibold text-weekend-text">{{ doc.sat }}</span>
          </div>
          <div>
            <span class="text-muted">Κυρ</span>
            <span class="ml-1 font-semibold text-weekend-text">{{ doc.sun }}</span>
          </div>
          <div v-if="doc.holiday > 0">
            <span class="text-muted">Αργ</span>
            <span class="ml-1 font-semibold text-accent">{{ doc.holiday }}</span>
          </div>
        </div>

        <!-- Wish bar -->
        <div v-if="doc.wishPercent >= 0">
          <div class="flex items-center justify-between text-[11px] mb-1">
            <span class="text-muted">Επιθυμίες</span>
            <span class="font-medium text-foreground">{{ doc.wantsFulfilled }}/{{ doc.wantsTotal }}</span>
          </div>
          <div class="h-[4px] rounded-full overflow-hidden" style="background-color: var(--color-bg)">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{
                width: `${doc.wishPercent}%`,
                backgroundColor: doc.wishPercent === 100 ? 'var(--color-positive)' : 'var(--color-accent)',
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
