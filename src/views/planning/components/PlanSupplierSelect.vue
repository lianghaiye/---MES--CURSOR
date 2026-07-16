<template>
  <a-select
    :value="value || undefined"
    show-search
    allow-clear
    :size="size"
    :placeholder="placeholder"
    :disabled="disabled"
    :status="status"
    style="width: 100%"
    :filter-option="false"
    :options="displayOptions"
    :open="mergedOpen"
    :dropdown-match-select-width="320"
    @search="onSearch"
    @dropdown-visible-change="onDropdownVisibleChange"
    @change="onSelectChange"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <template v-if="!disabled">
          <a-divider style="margin: 4px 0" />
          <div class="search-more-row" @mousedown.prevent @click="openPicker">选择更多</div>
        </template>
      </div>
    </template>
  </a-select>

  <SelectSupplierModal v-model:open="pickerOpen" :selected="value" @confirm="onPickedFromModal" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  SUPPLIER_DROPDOWN_QUICK_LIMIT,
  buildSupplierDisplayOptions,
  getAllSupplierOptions,
} from '@/utils/supplierSelect'
import SelectSupplierModal from './SelectSupplierModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: '请搜索或选择' },
  size: { type: String, default: 'small' },
  /** 受控展开（单元格编辑场景） */
  open: { type: Boolean, default: undefined },
  /** 挂载后自动展开下拉 */
  autoOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  status: { type: String, default: undefined },
})

const emit = defineEmits(['update:value', 'change', 'dropdown-visible-change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const innerOpen = ref(false)

const allOptions = computed(() => getAllSupplierOptions())

const displayOptions = computed(() =>
  buildSupplierDisplayOptions({
    options: allOptions.value,
    keyword: searchKeyword.value,
    selectedValue: props.value,
    quickLimit: SUPPLIER_DROPDOWN_QUICK_LIMIT,
  }),
)

const mergedOpen = computed(() => (props.open === undefined ? innerOpen.value : props.open))

watch(
  () => props.open,
  (visible) => {
    if (visible === false) searchKeyword.value = ''
  },
)

onMounted(() => {
  if (props.autoOpen) {
    nextTick(() => {
      if (props.open === undefined) innerOpen.value = true
    })
  }
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(visible) {
  if (props.open === undefined) innerOpen.value = visible
  if (!visible) searchKeyword.value = ''
  emit('dropdown-visible-change', visible)
}

function onSelectChange(nextValue) {
  emit('update:value', nextValue || '')
  emit('change', nextValue || '')
}

function openPicker() {
  if (props.disabled) return
  if (props.open === undefined) innerOpen.value = false
  else emit('dropdown-visible-change', false)
  pickerOpen.value = true
}

function onPickedFromModal(supplierValue) {
  if (!supplierValue) return
  emit('update:value', supplierValue)
  emit('change', supplierValue)
}
</script>

<script>
export default { name: 'PlanSupplierSelect' }
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
