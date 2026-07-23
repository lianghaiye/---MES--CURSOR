<template>
  <CreateWorkOrderModal
    variant="assembly"
    :open="open"
    :edit-record="editRecord"
    :page-mode="pageMode"
    :list-path="listPath || '/production/assembly-work-orders'"
    @update:open="(val) => emit('update:open', val)"
    @created="(wo) => emit('created', wo)"
    @updated="(payload) => emit('updated', payload)"
  />
</template>

<script setup>
import CreateWorkOrderModal from './CreateWorkOrderModal.vue'

defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'created', 'updated'])
</script>

<script>
export default { name: 'CreateAssemblyWorkOrderModal' }
</script>
