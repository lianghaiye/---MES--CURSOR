<template>
  <LongTextEditCell :value="value" :max-preview-len="maxPreviewLen" @edit="$emit('edit')" />
</template>

<script setup>
import LongTextEditCell from '@/components/LongTextEditCell.vue'

defineProps({
  value: { type: String, default: '' },
  maxPreviewLen: { type: Number, default: 28 },
})

defineEmits(['edit'])
</script>
