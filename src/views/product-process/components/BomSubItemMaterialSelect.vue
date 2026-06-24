<template>
  <a-select
    :value="value || undefined"
    show-search
    allow-clear
    size="small"
    placeholder="搜索编码/名称"
    style="width: 100%"
    :filter-option="false"
    :options="displayOptions"
    :dropdown-match-select-width="320"
    @search="onSearch"
    @dropdown-visible-change="onDropdownVisibleChange"
    @change="onSelectChange"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <a-divider style="margin: 4px 0" />
        <div class="search-more-row" @mousedown.prevent @click="openPicker">
          搜索更多...
        </div>
      </div>
    </template>
  </a-select>

  <SelectBomMaterialModal v-model:open="pickerOpen" @selected="onPicked" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { materialInfoState } from '@/store/materialInfoStore'
import { filterBomPickableMaterials, getBomPickableMaterials } from '@/utils/bomMaterialPicker'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  fallbackName: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const DROPDOWN_LIMIT = 8

const displayOptions = computed(() => {
  void materialInfoState.materials
  const kw = searchKeyword.value.trim()
  const filtered = filterBomPickableMaterials(null, kw)
  const sliced = kw ? filtered.slice(0, 50) : filtered.slice(0, DROPDOWN_LIMIT)
  const options = sliced.map((m) => ({
    label: `[${m.code}] ${m.name}`,
    value: m.code,
    material: m,
  }))
  if (
    props.value &&
    !options.some((o) => o.value === props.value) &&
    (props.fallbackName || props.value)
  ) {
    const hit = getBomPickableMaterials().find((m) => m.code === props.value)
    options.unshift({
      label: hit ? `[${hit.code}] ${hit.name}` : props.fallbackName || props.value,
      value: props.value,
      material: hit || null,
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
  if (!code) return
  const hit = getBomPickableMaterials().find((m) => m.code === code)
  if (hit) emit('select', hit)
}

function openPicker() {
  pickerOpen.value = true
}

function onPicked(items) {
  const item = Array.isArray(items) ? items[0] : items
  if (!item) return
  emit('select', item)
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
