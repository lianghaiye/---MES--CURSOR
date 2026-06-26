<template>
  <a-select
    v-model:value="innerBomId"
    show-search
    allow-clear
    option-filter-prop="label"
    :placeholder="placeholder"
    :size="size"
    :options="selectOptions"
    :dropdown-match-select-width="true"
    style="width: 100%"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <a-divider style="margin: 4px 0" />
        <div class="more-row" @mousedown.prevent @click="openPicker">
          <SearchOutlined />
          搜索更多
        </div>
      </div>
    </template>
  </a-select>

  <SelectBomPickerModal
    v-model:open="pickerOpen"
    title="选择BOM"
    :product-id="productId"
    :row-filter="rowFilter"
    @confirm="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { productBomState, getProductBomById } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { enrichBomPickerRow } from '@/utils/bomPickerTable'
import { buildWorkOrderBomSelectOptions } from '@/utils/workOrderFormHelpers'
import SelectBomPickerModal from '@/views/product-process/components/SelectBomPickerModal.vue'

const props = defineProps({
  bomId: { type: String, default: '' },
  productId: { type: String, default: '' },
  placeholder: { type: String, default: '请选择物料清单' },
  size: { type: String, default: 'small' },
  rowFilter: { type: Function, default: null },
})

const emit = defineEmits(['update:bomId', 'select'])

const pickerOpen = ref(false)

const selectOptions = computed(() => {
  void productBomState.boms
  void productInfoState.products
  void materialInfoState.materials
  const opts = buildWorkOrderBomSelectOptions(props.productId)
  if (props.bomId && !opts.some((o) => o.value === props.bomId)) {
    const bom = getProductBomById(props.bomId)
    if (bom) {
      opts.unshift({
        label: enrichBomPickerRow(bom).pickerLabel,
        value: bom.id,
      })
    }
  }
  return opts
})

const innerBomId = computed({
  get() {
    return props.bomId || undefined
  },
  set(value) {
    emit('update:bomId', value || '')
    if (!value) {
      emit('select', null)
      return
    }
    const bom = getProductBomById(value)
    if (bom) emit('select', enrichBomPickerRow(bom))
  },
})

function openPicker() {
  pickerOpen.value = true
}

function onPicked(bom) {
  if (!bom?.id) return
  emit('update:bomId', bom.id)
  emit('select', bom)
}
</script>

<script>
export default { name: 'WorkOrderBomSelect' }
</script>

<style lang="less" scoped>
.more-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: #f5f5f5;
  }
}
</style>
