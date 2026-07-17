<template>
  <a-select
    :value="modelValue || undefined"
    show-search
    allow-clear
    :size="size"
    :placeholder="placeholder"
    :disabled="disabled"
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
        <template v-if="!disabled">
          <a-divider style="margin: 4px 0" />
          <div class="search-more-row" @mousedown.prevent @click="openPicker">选择更多</div>
        </template>
      </div>
    </template>
  </a-select>

  <SelectCustomerModal
    v-model:open="pickerOpen"
    :selected="modelValue"
    @confirm="onPickedFromModal"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { getCustomerOptions } from '@/store/customerStore'
import SelectCustomerModal from './SelectCustomerModal.vue'

const QUICK_LIMIT = 8

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请搜索或选择客户名称' },
  size: { type: String, default: 'small' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')

const allOptions = computed(() => getCustomerOptions())

const displayOptions = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const selected = props.modelValue
  let list = allOptions.value
  if (kw) {
    list = list.filter(
      (opt) =>
        String(opt.label || '')
          .toLowerCase()
          .includes(kw) ||
        String(opt.value || '')
          .toLowerCase()
          .includes(kw) ||
        String(opt.code || '')
          .toLowerCase()
          .includes(kw),
    )
  }
  const sliced = kw ? list.slice(0, 50) : list.slice(0, QUICK_LIMIT)
  if (selected && !sliced.some((opt) => opt.value === selected)) {
    const hit = allOptions.value.find((opt) => opt.value === selected)
    if (hit) return [hit, ...sliced]
  }
  return sliced
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(visible) {
  if (!visible) searchKeyword.value = ''
}

function onSelectChange(nextValue) {
  emit('update:modelValue', nextValue || '')
  emit('change', nextValue || '')
}

function openPicker() {
  if (props.disabled) return
  pickerOpen.value = true
}

function onPickedFromModal(customer) {
  const name = customer?.name
  if (!name) return
  emit('update:modelValue', name)
  emit('change', name)
}
</script>

<script>
export default { name: 'CustomerSelect' }
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
