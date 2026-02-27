<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  CalendarDays,
  List,
  BarChart3,
  CalendarRange,
  Bookmark,
  Settings,
} from 'lucide-vue-next'
import { useAppState } from '~/composables/useAppState'
import { useTheme } from '~/composables/useTheme'
import { useHaptics } from '~/composables/useHaptics'

const { initState, isLoaded, undo, redo } = useAppState()
useTheme()
const haptics = useHaptics()

const activeTab = ref(0)

function switchTab(i: number) {
  if (activeTab.value !== i) {
    activeTab.value = i
    haptics.light()
  }
}

const tabs = [
  { label: 'Ημερολόγιο', icon: CalendarDays },
  { label: 'Λίστα', icon: List },
  { label: 'Στατιστικά', icon: BarChart3 },
  { label: 'Τρίμηνο', icon: CalendarRange },
  { label: 'Επιθυμίες', icon: Bookmark },
  { label: 'Ρυθμίσεις', icon: Settings },
]

function handleKeydown(e: KeyboardEvent) {
  const isMeta = e.metaKey || e.ctrlKey
  if (!isMeta || e.key.toLowerCase() !== 'z') return

  // Don't intercept when typing in input/textarea
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  e.preventDefault()
  if (e.shiftKey) {
    redo()
  }
  else {
    undo()
  }
}

onMounted(() => {
  initState()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="min-h-[100dvh] bg-background font-sans flex flex-col">
    <AppHeader />

    <div v-if="isLoaded" class="flex-1 flex">
      <!-- Desktop sidebar -->
      <aside class="hidden md:flex flex-col w-[260px] bg-surface border-r border-border p-3 gap-1 sticky top-[49px] h-[calc(100dvh-49px)] overflow-y-auto">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          class="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-all min-h-[44px]"
          :class="activeTab === i
            ? 'bg-accent-soft text-accent font-semibold'
            : 'text-muted hover:bg-background hover:text-foreground'"
          @click="switchTab(i)"
        >
          <component :is="tab.icon" class="w-[18px] h-[18px] flex-shrink-0" />
          <span class="text-[14px]">{{ tab.label }}</span>
        </button>
      </aside>

      <!-- Main content -->
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-4 pb-24 md:pb-6">
        <CalendarPanel v-if="activeTab === 0" />
        <ListPanel v-else-if="activeTab === 1" />
        <StatsPanel v-else-if="activeTab === 2" />
        <QuarterPanel v-else-if="activeTab === 3" />
        <MarksPanel v-else-if="activeTab === 4" />
        <SettingsPanel v-else-if="activeTab === 5" />
      </main>
    </div>

    <!-- Loading -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-muted animate-pulse text-[14px]">Φόρτωση...</div>
    </div>

    <!-- Mobile bottom tabs -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border safe-bottom"
         style="background-color: var(--color-surface); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
      <div class="flex">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          class="flex-1 flex flex-col items-center gap-1 py-2 transition-colors min-h-[52px]"
          :class="activeTab === i ? 'text-accent' : 'text-muted'"
          @click="switchTab(i)"
        >
          <component :is="tab.icon" class="w-[20px] h-[20px]" :stroke-width="activeTab === i ? 2.5 : 1.8" />
          <span class="text-[10px] font-medium leading-none">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <AppToast />
    <PwaInstallPrompt />
  </div>
</template>
