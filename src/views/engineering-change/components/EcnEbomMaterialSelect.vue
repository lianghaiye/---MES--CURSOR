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
    title="选择BOM物料"
    pick-mode="material"
    :flat-nodes="flatNodes"
    :line-items="lineItems"
    :root-label="rootLabel"
    :bom-picker-lines="bomPickerLines"
    @confirm="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { filterBomLineOptions } from '@/utils/ecnProductSource'
import EcnBomParentPickModal from './EcnBomParentPickModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  bomPickerLines: { type: Array, default: () => [] },
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootLabel: { type: String, default: '' },
  fallbackName: { type: String, default: '' },
  placeholder: { type: String, default: '搜索编码/名称' },
})

const emit = defineEmits(['select', 'clear'])

const pickerOpen = ref(false)
const searchKeyword = ref('')

const displayOptions = computed(() => {
  const filtered = filterBomLineOptions(props.bomPickerLines, searchKeyword.value)
  const options = filtered.map((line) => ({
    label: line.materialName || line.materialCode,
    value: line.id,
    line,
  }))
  if (
    props.value &&
    !options.some((o) => o.value === props.value) &&
    (props.fallbackName || props.value)
  ) {
    const hit = props.bomPickerLines.find((l) => l.id === props.value)
    options.unshift({
      label: hit?.materialName || props.fallbackName || props.value,
      value: props.value,
      line: hit || null,
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

function onSelectChange(lineId) {
  if (!lineId) {
    emit('clear')
    return
  }
  const line = props.bomPickerLines.find((l) => l.id === lineId)
  if (line) emit('select', line)
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(payload) {
  if (payload?.line) emit('select', payload.line)
}
</script>

<script>
export default { name: 'EcnEbomMaterialSelect' }
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
