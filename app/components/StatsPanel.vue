<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '~/composables/useAppState'
import { useScheduleStore } from '~/composables/useScheduleStore'
import { DOCTOR_COLORS, DOCTOR_TYPE_LABELS, getDayOfWeek } from '~/utils/types'

const { doctors, schedule, stats, month, year } = useAppState()
const scheduleStore = useScheduleStore()

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
    const leave = stats.value!.leaveCounts?.[doc.id] ?? 0
    const sick = stats.value!.sickCounts?.[doc.id] ?? 0
    return { ...doc, total, fri, sat, sun, holiday, weekday, wantsFulfilled, wantsTotal, wishPercent, leave, sick }
  })
})

// Cross-month cumulative stats
interface CumulativeDocStat {
  id: number
  name: string
  colorIndex: number
  totalShifts: number
  totalWeekends: number
  totalHolidays: number
  monthCount: number
}

const cumulativeStats = computed(() => {
  const savedMonths = scheduleStore.listSavedMonths()
  if (savedMonths.length < 2) return null // Only show if 2+ months

  const docMap = new Map<number, CumulativeDocStat>()

  for (const [y, m] of savedMonths) {
    const data = scheduleStore.loadMonth(y, m)
    if (!data?.schedule) continue

    const daysInM = new Date(y, m + 1, 0).getDate()

    for (const doc of data.doctors) {
      if (!docMap.has(doc.id)) {
        docMap.set(doc.id, {
          id: doc.id,
          name: doc.name,
          colorIndex: doc.colorIndex,
          totalShifts: 0,
          totalWeekends: 0,
          totalHolidays: 0,
          monthCount: 0,
        })
      }
      const entry = docMap.get(doc.id)!
      let hasShift = false

      for (let d = 0; d < daysInM; d++) {
        if (data.schedule[d] === doc.id) {
          entry.totalShifts++
          hasShift = true
          const dow = getDayOfWeek(y, m, d + 1)
          // Fri=5, Sat=6, Sun=0
          if (dow === 5 || dow === 6 || dow === 0) {
            entry.totalWeekends++
          }
          // Check if holiday mark exists
          const isHoliday = Object.values(data.marks).some(
            (docMarks: Record<number, string | undefined>) => docMarks?.[d] === 'holiday',
          )
          if (isHoliday) {
            entry.totalHolidays++
          }
        }
      }
      if (hasShift) entry.monthCount++
    }
  }

  const entries = [...docMap.values()].filter(e => e.totalShifts > 0)
  if (entries.length === 0) return null

  const avgShifts = entries.reduce((s, e) => s + e.totalShifts, 0) / entries.length
  const avgWeekends = entries.reduce((s, e) => s + e.totalWeekends, 0) / entries.length
  const maxShifts = Math.max(...entries.map(e => e.totalShifts))

  return {
    entries: entries.sort((a, b) => b.totalShifts - a.totalShifts),
    avgShifts,
    avgWeekends,
    maxShifts,
    monthCount: savedMonths.filter(([y, m]) => {
      const d = scheduleStore.loadMonth(y, m)
      return d?.schedule?.some((s: number | null) => s !== null)
    }).length,
  }
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
          <div v-if="doc.leave > 0">
            <span class="text-muted">Άδεια</span>
            <span class="ml-1 font-semibold" style="color: #D97706">{{ doc.leave }}</span>
          </div>
          <div v-if="doc.sick > 0">
            <span class="text-muted">Αναρρ.</span>
            <span class="ml-1 font-semibold" style="color: #DC2626">{{ doc.sick }}</span>
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
    <!-- Cross-month cumulative stats -->
    <div v-if="cumulativeStats" class="mt-8">
      <h2 class="section-title mb-3">Συνολικά ({{ cumulativeStats.monthCount }} μήνες)</h2>

      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="doc in cumulativeStats.entries"
          :key="doc.id"
          class="card p-4"
          :style="{ borderLeft: `3px solid ${DOCTOR_COLORS[doc.colorIndex]}` }"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-[14px] font-semibold text-foreground">{{ doc.name }}</div>
            <div class="text-[20px] font-bold tracking-tight" :style="{ color: DOCTOR_COLORS[doc.colorIndex] }">
              {{ doc.totalShifts }}
            </div>
          </div>

          <!-- Bar chart -->
          <div class="mb-2">
            <div class="h-[8px] rounded-full overflow-hidden" style="background-color: var(--color-bg)">
              <div
                class="h-full rounded-full transition-all duration-500 ease-out"
                :style="{
                  width: cumulativeStats.maxShifts > 0 ? `${(doc.totalShifts / cumulativeStats.maxShifts) * 100}%` : '0%',
                  backgroundColor: doc.totalShifts > cumulativeStats.avgShifts * 1.1
                    ? 'var(--color-danger)'
                    : doc.totalShifts < cumulativeStats.avgShifts * 0.9
                      ? 'var(--color-positive)'
                      : DOCTOR_COLORS[doc.colorIndex],
                }"
              />
            </div>
          </div>

          <!-- Breakdown -->
          <div class="flex gap-4 text-[12px] flex-wrap">
            <div>
              <span class="text-muted">Εφημερίες</span>
              <span
                class="ml-1 font-semibold"
                :class="doc.totalShifts > cumulativeStats.avgShifts * 1.1
                  ? 'text-danger'
                  : doc.totalShifts < cumulativeStats.avgShifts * 0.9
                    ? 'text-positive'
                    : 'text-foreground'"
              >{{ doc.totalShifts }}</span>
            </div>
            <div>
              <span class="text-muted">ΠΣΚ</span>
              <span
                class="ml-1 font-semibold"
                :class="doc.totalWeekends > cumulativeStats.avgWeekends * 1.1
                  ? 'text-danger'
                  : doc.totalWeekends < cumulativeStats.avgWeekends * 0.9
                    ? 'text-positive'
                    : 'text-foreground'"
              >{{ doc.totalWeekends }}</span>
            </div>
            <div v-if="doc.totalHolidays > 0">
              <span class="text-muted">Αργίες</span>
              <span class="ml-1 font-semibold text-accent">{{ doc.totalHolidays }}</span>
            </div>
            <div>
              <span class="text-muted">Μήνες</span>
              <span class="ml-1 font-semibold text-foreground">{{ doc.monthCount }}</span>
            </div>
          </div>

          <!-- Deviation indicator -->
          <div class="mt-1 text-[11px]">
            <span
              v-if="doc.totalShifts > cumulativeStats.avgShifts * 1.1"
              class="text-danger font-medium"
            >↑ πάνω από μ.ό. ({{ Math.round(cumulativeStats.avgShifts) }})</span>
            <span
              v-else-if="doc.totalShifts < cumulativeStats.avgShifts * 0.9"
              class="text-positive font-medium"
            >↓ κάτω από μ.ό. ({{ Math.round(cumulativeStats.avgShifts) }})</span>
            <span v-else class="text-muted">≈ μ.ό. ({{ Math.round(cumulativeStats.avgShifts) }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
