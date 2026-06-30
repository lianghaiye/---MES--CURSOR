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
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { filterBomLineOptions } from '@/utils/ecnProductSource'

const props = defineProps({
  value: { type: String, default: '' },
  lines: { type: Array, default: () => [] },
  fallbackName: { type: String, default: '' },
  placeholder: { type: String, default: '搜索编码/名称' },
})

const emit = defineEmits(['select', 'clear'])

const searchKeyword = ref('')

const displayOptions = computed(() => {
  const filtered = filterBomLineOptions(props.lines, searchKeyword.value)
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
    const hit = props.lines.find((l) => l.id === props.value)
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
  const line = props.lines.find((l) => l.id === lineId)
  if (line) emit('select', line)
}
</script>

<script>
export default { name: 'EcnBomLineSelect' }
</script>
