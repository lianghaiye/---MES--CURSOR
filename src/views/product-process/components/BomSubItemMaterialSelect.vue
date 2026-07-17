<template>
  <a-auto-complete
    v-model:value="nameDraft"
    :options="displayOptions"
    allow-clear
    size="small"
    :placeholder="placeholder"
    style="width: 100%"
    :filter-option="false"
    :dropdown-match-select-width="320"
    :get-popup-container="getPopupContainer"
    @search="onSearch"
    @select="onSelectOption"
    @change="onChange"
    @dropdown-visible-change="onDropdownVisibleChange"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <a-divider style="margin: 4px 0" />
        <div class="search-more-row" @mousedown.prevent @click="openPicker">搜索更多...</div>
      </div>
    </template>
  </a-auto-complete>

  <SelectBomMaterialModal
    v-model:open="pickerOpen"
    :include-spu-templates="true"
    :multiple="false"
    :spu-can-sell-only="false"
    @selected="onPicked"
  />
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { materialInfoState } from '@/store/materialInfoStore'
import { filterBomPickableMaterials, getBomPickableMaterials } from '@/utils/bomMaterialPicker'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  fallbackName: { type: String, default: '' },
  placeholder: { type: String, default: '搜索编码/名称' },
})

const emit = defineEmits(['select', 'clear', 'rename'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const nameDraft = ref(props.fallbackName || '')
const selecting = ref(false)
const DROPDOWN_LIMIT = 8

watch(
  () => props.fallbackName,
  (val) => {
    if (selecting.value) return
    nameDraft.value = val || ''
  },
)

const displayOptions = computed(() => {
  void materialInfoState.materials
  const kw = searchKeyword.value.trim()
  const filtered = filterBomPickableMaterials(null, kw)
  const sliced = kw ? filtered.slice(0, 50) : filtered.slice(0, DROPDOWN_LIMIT)
  const options = sliced.map((m) => ({
    value: m.code,
    label: `[${m.code}] ${m.name}`,
    material: m,
  }))
  // 当前已选物料若不在列表中，置顶保留，便于对照
  if (
    props.value &&
    !options.some((o) => o.value === props.value) &&
    (props.fallbackName || props.value)
  ) {
    const hit = getBomPickableMaterials().find((m) => m.code === props.value)
    options.unshift({
      value: props.value,
      label: hit ? `[${hit.code}] ${hit.name}` : props.fallbackName || props.value,
      material: hit || null,
    })
  }
  return options
})

function getPopupContainer() {
  return document.body
}

function onSearch(keyword) {
  searchKeyword.value = keyword ?? ''
}

function onDropdownVisibleChange(open) {
  if (open) {
    // 展开时先展示默认列表（与原先 Select 一致）；输入框仍保留当前名称可编辑
    nextTick(() => {
      searchKeyword.value = ''
    })
  } else {
    searchKeyword.value = ''
  }
}

function onSelectOption(code, option) {
  selecting.value = true
  const hit = option?.material || getBomPickableMaterials().find((m) => m.code === code) || null
  if (hit) {
    emit('select', hit)
    nextTick(() => {
      nameDraft.value = hit.name || ''
      selecting.value = false
    })
    return
  }
  selecting.value = false
}

function onChange(val) {
  if (selecting.value) return
  const next = val ?? ''
  nameDraft.value = next
  emit('rename', next)
  if (!String(next).trim()) emit('clear')
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(items) {
  const item = Array.isArray(items) ? items[0] : items
  if (!item) return
  selecting.value = true
  emit('select', item)
  nextTick(() => {
    nameDraft.value = item.name || ''
    selecting.value = false
  })
}
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
