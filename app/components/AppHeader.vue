<script setup lang="ts">
import { ChevronLeft, ChevronRight, Sun, Moon, Monitor } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useTheme } from '~/composables/useTheme'
import { MONTH_NAMES } from '~/utils/types'

const { month, year, setMonth } = useAppState()
const { theme, cycleTheme } = useTheme()

function prevMonth() {
  let m = month.value - 1
  let y = year.value
  if (m < 0) { m = 11; y-- }
  setMonth(m, y)
}

function nextMonth() {
  let m = month.value + 1
  let y = year.value
  if (m > 11) { m = 0; y++ }
  setMonth(m, y)
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border"
          style="background-color: var(--color-surface); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
    <div class="max-w-5xl mx-auto px-4 h-[49px] flex items-center justify-between">
      <!-- Theme toggle -->
      <button
        class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
        @click="cycleTheme"
      >
        <Sun v-if="theme === 'light'" class="w-[18px] h-[18px] text-muted" />
        <Moon v-else-if="theme === 'dark'" class="w-[18px] h-[18px] text-muted" />
        <Monitor v-else class="w-[18px] h-[18px] text-muted" />
      </button>

      <!-- Month navigation -->
      <div class="flex items-center gap-2">
        <button
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          @click="prevMonth"
        >
          <ChevronLeft class="w-[18px] h-[18px] text-muted" />
        </button>

        <div class="text-center min-w-[130px]">
          <div class="text-[16px] font-semibold text-foreground leading-tight tracking-tight">
            {{ MONTH_NAMES[month] }}
          </div>
          <div class="text-[11px] text-muted font-medium">{{ year }}</div>
        </div>

        <button
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          @click="nextMonth"
        >
          <ChevronRight class="w-[18px] h-[18px] text-muted" />
        </button>
      </div>

      <!-- Spacer for symmetry -->
      <div class="w-[44px]" />
    </div>
  </header>
</template>
