<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, RotateCcw, Download, Upload, Users, SlidersHorizontal, Package, CalendarHeart, MapPin, History, HelpCircle } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useHaptics } from '~/composables/useHaptics'
import { useScheduleStore } from '~/composables/useScheduleStore'
import { DOCTOR_COLORS, DOCTOR_TYPE_LABELS, MONTH_NAMES } from '~/utils/types'
import type { DoctorType } from '~/utils/types'

const {
  doctors, marks, constraints, month, year,
  addDoctor, removeDoctor, updateDoctor, resetAll, showToast,
  importData, autoHolidays, toggleAutoHolidays,
  customHolidays, addCustomHoliday, removeCustomHoliday,
  setMonth,
} = useAppState()

const scheduleStore = useScheduleStore()

const emit = defineEmits<{
  'restart-onboarding': []
}>()

const haptics = useHaptics()

const newName = ref('')
const newType = ref<DoctorType>('eidikevomenos')
const showConfirmReset = ref(false)
const editingId = ref<number | null>(null)
const editName = ref('')

// Custom holiday form
const newHolidayName = ref('')
const newHolidayMonth = ref(0)
const newHolidayDay = ref(1)

function handleAddCustomHoliday() {
  const name = newHolidayName.value.trim()
  if (!name) return
  addCustomHoliday(name, newHolidayMonth.value, newHolidayDay.value)
  newHolidayName.value = ''
  haptics.medium()
  showToast('Η αργία προστέθηκε')
}

function getDaysInMonthForPicker(m: number): number {
  // Use a non-leap year for consistent max days
  return new Date(2024, m + 1, 0).getDate()
}

function formatHolidayDate(m: number, d: number): string {
  return `${d} ${MONTH_NAMES[m]}`
}

function handleAdd() {
  const name = newName.value.trim()
  if (!name) return
  addDoctor(name, newType.value)
  newName.value = ''
}

function startEdit(id: number, name: string) {
  editingId.value = id
  editName.value = name
}

function saveEdit(id: number) {
  const name = editName.value.trim()
  if (name) updateDoctor(id, { name })
  editingId.value = null
}

function confirmReset() {
  resetAll()
  showConfirmReset.value = false
  haptics.heavy()
}

// History: refresh counter to trigger re-computation
const historyRefresh = ref(0)

const savedMonths = computed(() => {
  // eslint-disable-next-line no-unused-expressions
  historyRefresh.value // dependency for reactivity
  const months = scheduleStore.listSavedMonths()
  return months
    .map(([y, m]) => {
      const data = scheduleStore.loadMonth(y, m)
      const scheduledDays = data?.schedule
        ? data.schedule.filter((s: number | null) => s !== null).length
        : 0
      return { year: y, month: m, scheduledDays }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
})

function isCurrentMonth(y: number, m: number): boolean {
  return y === year.value && m === month.value
}

function loadSavedMonth(y: number, m: number) {
  setMonth(m, y)
  haptics.medium()
  showToast(`Φορτώθηκε: ${MONTH_NAMES[m]} ${y}`)
}

function deleteSavedMonth(y: number, m: number) {
  scheduleStore.deleteMonth(y, m)
  historyRefresh.value++
  haptics.heavy()
  showToast(`Διαγράφηκε: ${MONTH_NAMES[m]} ${y}`)
}

function exportData() {
  const data = { doctors: doctors.value, marks: marks.value, constraints: constraints.value, month: month.value, year: year.value }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `efimeries-data.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Εξαγωγή ολοκληρώθηκε')
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '')
      importData(JSON.parse(text))
      showToast('Εισαγωγή ολοκληρώθηκε')
    } catch { showToast('Σφάλμα κατά την εισαγωγή') }
  }
  input.click()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Doctors -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <Users class="w-[16px] h-[16px] text-muted" />
        Γιατροί
      </h2>

      <div class="space-y-2">
        <div
          v-for="doc in doctors"
          :key="doc.id"
          class="card flex items-center gap-3 px-4 py-3"
        >
          <div class="w-[12px] h-[12px] rounded-full flex-shrink-0" :style="{ backgroundColor: DOCTOR_COLORS[doc.colorIndex] }" />

          <div class="flex-1 min-w-0">
            <template v-if="editingId === doc.id">
              <input
                v-model="editName"
                class="w-full rounded-[6px] px-3 py-1.5 text-[14px] text-foreground border border-border
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                style="background-color: var(--color-bg)"
                @keyup.enter="saveEdit(doc.id)"
                @blur="saveEdit(doc.id)"
              >
            </template>
            <template v-else>
              <div class="text-[14px] font-medium text-foreground cursor-pointer hover:text-accent transition-colors"
                   @click="startEdit(doc.id, doc.name)">
                {{ doc.name }}
              </div>
            </template>
          </div>

          <select
            :value="doc.type"
            class="text-[12px] rounded-[6px] px-2 py-1.5 text-muted border border-border
                   focus:outline-none focus:ring-2 focus:ring-accent/30"
            style="background-color: var(--color-bg); color: var(--color-text-secondary)"
            @change="updateDoctor(doc.id, { type: ($event.target as HTMLSelectElement).value as DoctorType })"
          >
            <option value="eidikevomenos">{{ DOCTOR_TYPE_LABELS.eidikevomenos }}</option>
            <option value="agrotikos">{{ DOCTOR_TYPE_LABELS.agrotikos }}</option>
          </select>

          <button
            class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px]
                   text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            @click="removeDoctor(doc.id); haptics.heavy()"
          >
            <Trash2 class="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>

      <!-- Add doctor -->
      <div class="mt-3 card p-4">
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input
              v-model="newName"
              placeholder="Όνομα γιατρού..."
              class="flex-1 min-w-0 rounded-[8px] px-3 py-2.5 text-[14px] text-foreground border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                     placeholder:text-muted/50"
              style="background-color: var(--color-bg)"
              @keyup.enter="handleAdd"
            >
            <select
              v-model="newType"
              class="rounded-[8px] px-3 py-2.5 text-[13px] border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/30"
              style="background-color: var(--color-bg); color: var(--color-text)"
            >
              <option value="eidikevomenos">{{ DOCTOR_TYPE_LABELS.eidikevomenos }}</option>
              <option value="agrotikos">{{ DOCTOR_TYPE_LABELS.agrotikos }}</option>
            </select>
          </div>
          <button class="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px] text-[14px]" @click="handleAdd">
            <Plus class="w-[16px] h-[16px]" />
            Προσθήκη
          </button>
        </div>
      </div>
    </section>

    <!-- Constraints -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <SlidersHorizontal class="w-[16px] h-[16px] text-muted" />
        Κανόνες
      </h2>
      <div class="card p-4 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="text-[14px] font-medium text-foreground">Ελάχιστο κενό</div>
            <div class="text-[12px] text-muted mt-0.5">Ημέρες μεταξύ εφημεριών</div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="w-[36px] h-[36px] rounded-[6px] flex items-center justify-center
                     font-semibold text-foreground border border-border hover:bg-background active:scale-95"
              style="background-color: var(--color-bg)"
              @click="constraints.minGap = Math.max(2, constraints.minGap - 1)"
            >−</button>
            <span class="w-[28px] text-center text-[15px] font-semibold text-foreground">{{ constraints.minGap }}</span>
            <button
              class="w-[36px] h-[36px] rounded-[6px] flex items-center justify-center
                     font-semibold text-foreground border border-border hover:bg-background active:scale-95"
              style="background-color: var(--color-bg)"
              @click="constraints.minGap = Math.min(5, constraints.minGap + 1)"
            >+</button>
          </div>
        </div>

        <div class="h-px" style="background-color: var(--color-border)" />

        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="text-[14px] font-medium text-foreground">Μέγιστες εφημερίες</div>
            <div class="text-[12px] text-muted mt-0.5">Ανά γιατρό / μήνα</div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="w-[36px] h-[36px] rounded-[6px] flex items-center justify-center
                     font-semibold text-foreground border border-border hover:bg-background active:scale-95"
              style="background-color: var(--color-bg)"
              @click="constraints.maxShifts = Math.max(3, constraints.maxShifts - 1)"
            >−</button>
            <span class="w-[28px] text-center text-[15px] font-semibold text-foreground">{{ constraints.maxShifts }}</span>
            <button
              class="w-[36px] h-[36px] rounded-[6px] flex items-center justify-center
                     font-semibold text-foreground border border-border hover:bg-background active:scale-95"
              style="background-color: var(--color-bg)"
              @click="constraints.maxShifts = Math.min(15, constraints.maxShifts + 1)"
            >+</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Auto Holidays -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <CalendarHeart class="w-[16px] h-[16px] text-muted" />
        Αργίες
      </h2>
      <div class="card p-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="text-[14px] font-medium text-foreground">Αυτόματες αργίες</div>
            <div class="text-[12px] text-muted mt-0.5">Ελληνικές αργίες & Πάσχα</div>
          </div>
          <button
            class="relative w-[51px] h-[31px] rounded-full transition-colors duration-200 flex-shrink-0"
            :style="{ backgroundColor: autoHolidays ? 'var(--color-accent)' : 'var(--color-border)' }"
            @click="toggleAutoHolidays()"
          >
            <div
              class="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform duration-200"
              :style="{ transform: autoHolidays ? 'translateX(22px)' : 'translateX(2px)' }"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- Custom Holidays -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <MapPin class="w-[16px] h-[16px] text-muted" />
        Τοπικές Αργίες
      </h2>

      <!-- Existing custom holidays list -->
      <div v-if="customHolidays.length > 0" class="space-y-2 mb-3">
        <div
          v-for="ch in customHolidays"
          :key="ch.id"
          class="card flex items-center gap-3 px-4 py-3"
        >
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-medium text-foreground">{{ ch.name }}</div>
            <div class="text-[12px] text-muted mt-0.5">{{ formatHolidayDate(ch.month, ch.day) }}</div>
          </div>
          <button
            class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px]
                   text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            @click="removeCustomHoliday(ch.id); haptics.heavy()"
          >
            <Trash2 class="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>

      <div v-else class="card p-4 mb-3">
        <p class="text-[12px] text-muted text-center">Δεν υπάρχουν τοπικές αργίες.</p>
      </div>

      <!-- Add custom holiday form -->
      <div class="card p-4">
        <div class="flex flex-col gap-2">
          <input
            v-model="newHolidayName"
            placeholder="Όνομα αργίας..."
            class="w-full rounded-[8px] px-3 py-2.5 text-[14px] text-foreground border border-border
                   focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                   placeholder:text-muted/50"
            style="background-color: var(--color-bg)"
            @keyup.enter="handleAddCustomHoliday"
          >
          <div class="flex gap-2">
            <select
              v-model.number="newHolidayMonth"
              class="flex-1 rounded-[8px] px-3 py-2.5 text-[13px] border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/30"
              style="background-color: var(--color-bg); color: var(--color-text)"
            >
              <option v-for="(mName, mi) in MONTH_NAMES" :key="mi" :value="mi">{{ mName }}</option>
            </select>
            <select
              v-model.number="newHolidayDay"
              class="w-[80px] rounded-[8px] px-3 py-2.5 text-[13px] border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/30"
              style="background-color: var(--color-bg); color: var(--color-text)"
            >
              <option v-for="d in getDaysInMonthForPicker(newHolidayMonth)" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <button
            class="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px] text-[14px]"
            @click="handleAddCustomHoliday"
          >
            <Plus class="w-[16px] h-[16px]" />
            Προσθήκη Αργίας
          </button>
        </div>
      </div>
    </section>

    <!-- History -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <History class="w-[16px] h-[16px] text-muted" />
        Ιστορικό
      </h2>

      <div v-if="savedMonths.length === 0" class="card p-4">
        <p class="text-[12px] text-muted text-center">Δεν υπάρχουν αποθηκευμένοι μήνες.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="entry in savedMonths"
          :key="`${entry.year}-${entry.month}`"
          class="card flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background transition-colors"
          :class="{ 'ring-2 ring-accent/30': isCurrentMonth(entry.year, entry.month) }"
          @click="loadSavedMonth(entry.year, entry.month)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-medium text-foreground">
              {{ MONTH_NAMES[entry.month] }} {{ entry.year }}
            </div>
            <div class="text-[12px] text-muted mt-0.5">
              {{ entry.scheduledDays }} {{ entry.scheduledDays === 1 ? 'εφημερία' : 'εφημερίες' }}
              <span v-if="isCurrentMonth(entry.year, entry.month)" class="ml-1 text-accent font-medium">• τρέχων</span>
            </div>
          </div>
          <button
            class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px]
                   text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            @click.stop="deleteSavedMonth(entry.year, entry.month)"
          >
            <Trash2 class="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>
    </section>

    <!-- Export/Import -->
    <section>
      <h2 class="section-title mb-3 flex items-center gap-2">
        <Package class="w-[16px] h-[16px] text-muted" />
        Δεδομένα
      </h2>
      <div class="card p-4 space-y-3">
        <p class="text-[12px] text-muted">Εξαγωγή/εισαγωγή γιατρών, επιθυμιών και κανόνων.</p>
        <div class="flex gap-2">
          <button
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[8px] border border-border
                   text-[14px] text-foreground font-medium hover:bg-background active:scale-[0.98] transition-all min-h-[44px]"
            @click="exportData"
          >
            <Download class="w-[16px] h-[16px] text-muted" />
            Εξαγωγή
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[8px] border border-border
                   text-[14px] text-foreground font-medium hover:bg-background active:scale-[0.98] transition-all min-h-[44px]"
            @click="handleImport"
          >
            <Upload class="w-[16px] h-[16px] text-muted" />
            Εισαγωγή
          </button>
        </div>
      </div>
    </section>

    <!-- Onboarding restart -->
    <section>
      <div class="card p-4">
        <button
          class="w-full flex items-center justify-center gap-2 py-3 rounded-[8px] border border-border
                 text-[14px] text-foreground font-medium hover:bg-background active:scale-[0.98] transition-all min-h-[44px]"
          @click="emit('restart-onboarding'); haptics.medium()"
        >
          <HelpCircle class="w-[16px] h-[16px] text-accent" />
          Επανεκκίνηση οδηγού
        </button>
      </div>
    </section>

    <!-- Reset -->
    <section>
      <div class="card p-4">
        <div v-if="!showConfirmReset">
          <button
            class="w-full flex items-center justify-center gap-2 py-3 rounded-[8px] border
                   text-[14px] text-danger font-medium hover:bg-danger/5 active:scale-[0.98] transition-all min-h-[44px]"
            style="border-color: var(--color-danger)"
            @click="showConfirmReset = true"
          >
            <RotateCcw class="w-[16px] h-[16px]" />
            Επαναφορά όλων
          </button>
        </div>
        <div v-else class="space-y-3">
          <p class="text-[14px] text-danger font-medium text-center">
            Θα διαγραφούν όλα τα δεδομένα. Σίγουρα;
          </p>
          <div class="flex gap-2">
            <button class="btn-secondary flex-1 text-[14px]" @click="showConfirmReset = false">Ακύρωση</button>
            <button
              class="flex-1 text-white font-semibold rounded-[8px] px-5 py-3 text-[14px]
                     hover:opacity-90 active:scale-[0.98] transition-all"
              style="background-color: var(--color-danger)"
              @click="confirmReset"
            >Επιβεβαίωση</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
