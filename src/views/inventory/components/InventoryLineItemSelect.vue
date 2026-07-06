<template>
  <a-select
    :value="value || undefined"
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
    @selected="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  fallbackName: { type: String, default: '' },
  placeholder: { type: String, default: '搜索编码/名称' },
})

const emit = defineEmits(['select', 'clear'])

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
    value: row.code,
    item: row,
  }))
  if (
    props.value &&
    !options.some((o) => o.value === props.value) &&
    (props.fallbackName || props.value)
  ) {
    const hit = allRows.value.find((r) => r.code === props.value)
    options.unshift({
      label: hit ? `[${hit.code}] ${hit.name}` : props.fallbackName || props.value,
      value: props.value,
      item: hit || null,
    })
  }
  return options
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(open) {
  if (!open) searchKeyword.value = ''
}

function onSelectChange(code) {
  if (!code) {
    emit('clear')
    return
  }
  const hit = allRows.value.find((r) => r.code === code)
  if (hit) emit('select', hit)
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(items) {
  const payload = Array.isArray(items) ? items[0] : items
  if (!payload) return
  const hit =
    allRows.value.find(
      (r) => r.itemType === payload.itemType && String(r.itemId) === String(payload.id),
    ) || allRows.value.find((r) => r.code === payload.code)
  emit('select', hit || payload)
}
</script>

<script>
export default { name: 'InventoryLineItemSelect' }
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
