<template>
  <a-select
    :value="innerKey || undefined"
    show-search
    allow-clear
    size="small"
    :placeholder="placeholder"
    style="width: 100%"
    :filter-option="false"
    :options="displayOptions"
    :dropdown-match-select-width="360"
    @search="onSearch"
    @dropdown-visible-change="onDropdownVisibleChange"
    @change="onSelectChange"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <a-divider style="margin: 4px 0" />
        <div class="search-more-row" @mousedown.prevent @click="openPicker">搜索更多...</div>
      </div>
    </template>
  </a-select>

  <SelectBomMaterialModal
    v-model:open="pickerOpen"
    title="选择产品"
    :multiple="false"
    hide-add-material
    ecn-new-material-mode
    picker-default-item-type="产品"
    @selected="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  buildBomSubItemPickerRows,
  filterBomSubItemPickerRows,
} from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择 产品' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const DROPDOWN_LIMIT = 8

const allRows = computed(() => buildBomSubItemPickerRows())

const displayOptions = computed(() => {
  const kw = searchKeyword.value.trim()
  const filtered = filterBomSubItemPickerRows(allRows.value, kw)
  const sliced = kw ? filtered.slice(0, 50) : filtered.slice(0, DROPDOWN_LIMIT)
  const options = sliced.map((row) => ({
    label: `[${row.code}] ${row.name}`,
    value: row.rowKey,
    item: row,
  }))
  if (props.modelValue && !options.some((o) => o.item?.name === props.modelValue)) {
    const hit =
      allRows.value.find((r) => r.name === props.modelValue) ||
      allRows.value.find((r) => r.code === props.modelValue)
    if (hit) {
      options.unshift({
        label: `[${hit.code}] ${hit.name}`,
        value: hit.rowKey,
        item: hit,
      })
    }
  }
  return options
})

const innerKey = computed(() => {
  if (!props.modelValue) return ''
  const hit =
    allRows.value.find((r) => r.name === props.modelValue) ||
    allRows.value.find((r) => r.code === props.modelValue)
  return hit?.rowKey || ''
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(open) {
  if (!open) searchKeyword.value = ''
}

function onSelectChange(rowKey) {
  if (!rowKey) {
    emit('update:modelValue', '')
    emit('select', null)
    return
  }
  const item = allRows.value.find((r) => r.rowKey === rowKey)
  if (!item) return
  emit('update:modelValue', item.name)
  emit('select', item)
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(items) {
  const payload = Array.isArray(items) ? items[0] : items
  if (!payload) return
  const item =
    allRows.value.find(
      (r) => r.itemType === payload.itemType && String(r.itemId) === String(payload.id),
    ) || payload
  emit('update:modelValue', item.name || payload.name)
  emit('select', {
    itemType: item.itemType || payload.itemType,
    itemId: item.itemId || payload.id,
    code: item.code || payload.code,
    name: item.name || payload.name,
    specModel: item.specModel || payload.specModel || '',
    material: item.material || payload.material || '',
    drawingNo: item.drawingNo || payload.drawingNo || '',
  })
}
</script>

<script>
export default { name: 'ProductMaterialSelect' }
</script>

<style lang="less" scoped>
.search-more-row {
  padding: 8px 12px;
  text-align: center;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: #f5f5f5;
  }
}
</style>
