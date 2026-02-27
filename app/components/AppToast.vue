<script setup lang="ts">
import { useAppState } from '~/composables/useAppState'

const { toastMessage } = useAppState()
</script>

<template>
  <Transition
    enter-active-class="toast-enter-active"
    enter-from-class="translate-y-6 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="toast-leave-active"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="translate-y-6 opacity-0 scale-95"
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

<style scoped>
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}
</style>
