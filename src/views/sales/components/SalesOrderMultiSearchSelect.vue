<template>
  <a-select
    :value="modelValue"
    mode="multiple"
    show-search
    allow-clear
    :size="size"
    :placeholder="placeholder"
    :disabled="disabled"
    style="width: 100%"
    :filter-option="false"
    :options="displayOptions"
    :max-tag-count="maxTagCount"
    option-filter-prop="label"
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

  <SalesOrderSelectModal
    v-model:open="pickerOpen"
    multiple
    :preferred-customer-name="preferredCustomerName"
    :preferred-order-nos="preferredOrderNos"
    :selected-order-nos="modelValue"
    @confirm="onPickedFromModal"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { salesOrderState } from '@/store/salesOrderStore'
import {
  SALES_ORDER_DROPDOWN_QUICK_LIMIT,
  buildSalesOrderDisplayOptions,
  getAllSalesOrderOptions,
} from '@/utils/salesOrderPicker'
import SalesOrderSelectModal from '@/views/production/components/SalesOrderSelectModal.vue'

defineOptions({ name: 'SalesOrderMultiSearchSelect' })

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  /** 下拉候选；不传则用全部销售订单 */
  options: { type: Array, default: undefined },
  placeholder: { type: String, default: '搜索订单号/客户，可多选' },
  size: { type: String, default: 'middle' },
  disabled: { type: Boolean, default: false },
  maxTagCount: { type: [Number, String], default: 2 },
  preferredCustomerName: { type: String, default: '' },
  /** 弹窗优先展示的订单号（如合同已关联订单） */
  preferredOrderNos: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')

const allOptions = computed(() => {
  if (Array.isArray(props.options) && props.options.length) {
    return props.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
      order: opt.order,
    }))
  }
  return getAllSalesOrderOptions(salesOrderState.orders)
})

const displayOptions = computed(() =>
  buildSalesOrderDisplayOptions({
    options: allOptions.value,
    keyword: searchKeyword.value,
    selectedValues: props.modelValue,
    quickLimit: SALES_ORDER_DROPDOWN_QUICK_LIMIT,
  }),
)

function onSearch(keyword) {
  searchKeyword.value = keyword
}

function onDropdownVisibleChange(visible) {
  if (!visible) searchKeyword.value = ''
}

function onSelectChange(nextValue) {
  const nos = Array.isArray(nextValue) ? nextValue.filter(Boolean) : []
  emit('update:modelValue', nos)
  emit('change', nos)
}

function openPicker() {
  if (props.disabled) return
  pickerOpen.value = true
}

function onPickedFromModal(orders) {
  const list = Array.isArray(orders) ? orders : orders ? [orders] : []
  const nos = list.map((o) => o?.orderNo).filter(Boolean)
  if (!nos.length) return
  const merged = [...new Set([...(props.modelValue || []), ...nos])]
  emit('update:modelValue', merged)
  emit('change', merged)
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
