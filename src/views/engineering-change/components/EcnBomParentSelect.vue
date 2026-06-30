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

  <EcnBomParentPickModal
    v-model:open="pickerOpen"
    :flat-nodes="flatNodes"
    :line-items="lineItems"
    :root-label="rootLabel"
    @confirm="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  flattenBomOverviewPickerRows,
  filterBomOverviewPickerRows,
} from '@/utils/ecnProductSource'
import EcnBomParentPickModal from './EcnBomParentPickModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootLabel: { type: String, default: '' },
  placeholder: { type: String, default: '搜索编码/名称' },
})

const emit = defineEmits(['update:value', 'change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')

const allRows = computed(() =>
  flattenBomOverviewPickerRows(props.flatNodes, props.lineItems, props.rootLabel),
)

const displayOptions = computed(() => {
  const kw = searchKeyword.value.trim()
  let rows = allRows.value
  if (kw) {
    rows = filterBomOverviewPickerRows(allRows.value, {
      itemName: kw,
      materialCode: kw,
      specModel: kw,
    })
  } else {
    rows = rows.slice(0, 8)
  }
  const options = rows.map((row) => ({
    label: row.itemName && row.itemName !== '—' ? row.itemName : row.pickValue,
    value: row.pickValue,
  }))
  if (props.value && !options.some((o) => o.value === props.value)) {
    options.unshift({ label: props.value, value: props.value })
  }
  return options
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(open) {
  if (!open) searchKeyword.value = ''
}

function onSelectChange(val) {
  emit('update:value', val || '')
  emit('change', val || '')
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(payload) {
  const path = payload?.parentPath || ''
  emit('update:value', path)
  emit('change', path)
}
</script>

<script>
export default { name: 'EcnBomParentSelect' }
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
