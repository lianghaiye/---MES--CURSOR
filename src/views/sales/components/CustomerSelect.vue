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
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCustomerOptions } from '@/store/customerStore'
import {
  consumeCreatedCustomerFromPicker,
  customerPickerBridge,
  isCustomerPickerReturnRoute,
} from '@/store/customerPickerBridge'
import SelectCustomerModal from './SelectCustomerModal.vue'

const QUICK_LIMIT = 8

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请搜索或选择客户名称' },
  size: { type: String, default: 'small' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const route = useRoute()
const pickerOpen = ref(false)
const searchKeyword = ref('')

const allOptions = computed(() => getCustomerOptions())

/**
 * 仅当「当前激活页」就是发起新增客户的表单页时回填，
 * 避免其它 keep-alive 的 CustomerSelect 抢先消费，也避免在客户新建页误回填。
 */
function tryApplyCreatedCustomer() {
  if (props.disabled) return
  const created = customerPickerBridge.created
  if (!created?.name) return
  if (!isCustomerPickerReturnRoute(route.fullPath || route.path)) return
  const consumed = consumeCreatedCustomerFromPicker()
  if (!consumed?.name) return
  emit('update:modelValue', consumed.name)
  emit('change', consumed.name)
}

watch(
  () => customerPickerBridge.created,
  () => tryApplyCreatedCustomer(),
)

onMounted(() => tryApplyCreatedCustomer())
onActivated(() => tryApplyCreatedCustomer())

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
