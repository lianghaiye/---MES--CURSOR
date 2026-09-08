<template>
  <SelectBomPickerModal
    :open="open"
    title="请选择BOM模板"
    confirm-warning="请选择一条 BOM 模板"
    :row-filter="activeBomRowFilter"
    @update:open="emit('update:open', $event)"
    @confirm="onPicked"
  />
</template>

<script setup>
import { message } from 'ant-design-vue'
import { isBomActive } from '@/mock/productBomOptions'
import { applyBomTemplateImport } from '@/utils/bomImport'
import SelectBomPickerModal from './SelectBomPickerModal.vue'

const props = defineProps({
  open: Boolean,
  hasRoot: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:open', 'imported'])

function activeBomRowFilter(bom) {
  return isBomActive(bom)
}

function onPicked(bom) {
  const result = applyBomTemplateImport(bom, props.hasRoot, props.flatNodes)
  if (!result) {
    message.error('无法加载该 BOM 结构')
    return
  }
  emit('imported', result)
}
</script>

<script>
export default { name: 'ImportBomTemplateModal' }
</script>
