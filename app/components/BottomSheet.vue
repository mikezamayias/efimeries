<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 bg-black/40 z-[50]" @click="emit('close')" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="open"
        class="fixed bottom-0 left-0 right-0 z-[51] rounded-t-[16px] shadow-2xl max-h-[70vh] flex flex-col safe-bottom"
        style="background-color: var(--color-surface)"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-[36px] h-[4px] rounded-full" style="background-color: var(--color-border)" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-5 pb-3">
          <h3 class="text-[16px] font-semibold text-foreground">{{ title }}</h3>
          <button
            class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-background"
            @click="emit('close')"
          >
            <X class="w-[18px] h-[18px] text-muted" />
          </button>
        </div>

        <!-- Content -->
        <div class="overflow-y-auto px-5 pb-4">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
