<script setup lang="ts">
import { useAppState } from '~/composables/useAppState'

const { toastMessage } = useAppState()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="toastMessage"
      class="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50
             px-5 py-3 rounded-[10px] shadow-lg
             text-[13px] font-medium max-w-[90vw] text-center"
      style="background-color: var(--color-text); color: var(--color-bg)"
    >
      {{ toastMessage }}
    </div>
  </Transition>
</template>
