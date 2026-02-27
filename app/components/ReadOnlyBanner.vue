<script setup lang="ts">
import { Copy } from 'lucide-vue-next'

defineEmits<{
  import: []
}>()
</script>

<template>
  <div class="mx-4 mt-3 mb-1 px-4 py-3 rounded-[10px] flex items-center justify-between gap-3"
       style="background-color: var(--color-accent); opacity: 0.92;">
    <div class="flex-1 min-w-0">
      <div class="text-[13px] font-semibold text-white leading-tight">
        Προβολή μόνο — κοινοποιημένο πρόγραμμα
      </div>
    </div>
    <button
      class="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold bg-white/20 text-white hover:bg-white/30 active:scale-[0.97] transition-all whitespace-nowrap"
      @click="$emit('import')"
    >
      <Copy class="w-[14px] h-[14px]" />
      Αντιγραφή στα δεδομένα μου
    </button>
  </div>
</template>
