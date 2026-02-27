<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Sun, Moon, Monitor, Undo2, Redo2, Share2 } from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useTheme } from '~/composables/useTheme'
import { useShare } from '~/composables/useShare'
import { MONTH_NAMES } from '~/utils/types'

const { month, year, setMonth, undo, redo, canUndo, canRedo } = useAppState()
const { theme, cycleTheme } = useTheme()
const { isReadOnly } = useShare()

const emit = defineEmits<{
  share: []
}>()

// Track navigation direction for slide animation
const slideDirection = ref<'left' | 'right'>('right')
const monthKey = ref(0)

watch([month, year], (_new, _old) => {
  // Direction is set before this watcher fires (from prevMonth/nextMonth)
  monthKey.value++
})

function prevMonth() {
  slideDirection.value = 'right' // content slides right (going back)
  let m = month.value - 1
  let y = year.value
  if (m < 0) { m = 11; y-- }
  setMonth(m, y)
}

function nextMonth() {
  slideDirection.value = 'left' // content slides left (going forward)
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
      <!-- Left: theme toggle + undo/redo -->
      <div class="flex items-center gap-0.5">
        <button
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          @click="cycleTheme"
        >
          <Sun v-if="theme === 'light'" class="w-[18px] h-[18px] text-muted" />
          <Moon v-else-if="theme === 'dark'" class="w-[18px] h-[18px] text-muted" />
          <Monitor v-else class="w-[18px] h-[18px] text-muted" />
        </button>

        <template v-if="!isReadOnly">
          <button
            class="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] transition-all"
            :class="canUndo ? 'hover:bg-background active:scale-95 text-muted' : 'text-muted/30 cursor-default'"
            :disabled="!canUndo"
            title="Αναίρεση (⌘Z)"
            @click="undo"
          >
            <Undo2 class="w-[16px] h-[16px]" />
          </button>

          <button
            class="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] transition-all"
            :class="canRedo ? 'hover:bg-background active:scale-95 text-muted' : 'text-muted/30 cursor-default'"
            :disabled="!canRedo"
            title="Επανάληψη (⌘⇧Z)"
            @click="redo"
          >
            <Redo2 class="w-[16px] h-[16px]" />
          </button>
        </template>
      </div>

      <!-- Month navigation with slide transition -->
      <div class="flex items-center gap-2">
        <button
          v-if="!isReadOnly"
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          @click="prevMonth"
        >
          <ChevronLeft class="w-[18px] h-[18px] text-muted" />
        </button>

        <div class="text-center min-w-[130px] overflow-hidden relative">
          <Transition
            :enter-active-class="`month-slide-enter-active`"
            :enter-from-class="slideDirection === 'left' ? 'month-slide-enter-left' : 'month-slide-enter-right'"
            enter-to-class="month-slide-enter-to"
            :leave-active-class="`month-slide-leave-active`"
            leave-from-class="month-slide-leave-from"
            :leave-to-class="slideDirection === 'left' ? 'month-slide-leave-left' : 'month-slide-leave-right'"
            mode="out-in"
          >
            <div :key="`${year}-${month}`">
              <div class="text-[16px] font-semibold text-foreground leading-tight tracking-tight">
                {{ MONTH_NAMES[month] }}
              </div>
              <div class="text-[11px] text-muted font-medium">{{ year }}</div>
            </div>
          </Transition>
        </div>

        <button
          v-if="!isReadOnly"
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          @click="nextMonth"
        >
          <ChevronRight class="w-[18px] h-[18px] text-muted" />
        </button>
      </div>

      <!-- Right: share button -->
      <div class="flex items-center justify-end">
        <button
          v-if="!isReadOnly"
          id="share-btn"
          class="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] hover:bg-background active:scale-95 transition-all"
          title="Κοινοποίηση"
          @click="emit('share')"
        >
          <Share2 class="w-[18px] h-[18px] text-muted" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Month slide transitions */
.month-slide-enter-active,
.month-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.month-slide-enter-to,
.month-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.month-slide-enter-left {
  opacity: 0;
  transform: translateX(24px);
}

.month-slide-enter-right {
  opacity: 0;
  transform: translateX(-24px);
}

.month-slide-leave-left {
  opacity: 0;
  transform: translateX(-24px);
}

.month-slide-leave-right {
  opacity: 0;
  transform: translateX(24px);
}
</style>
