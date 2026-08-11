<template>
  <a-select
    :value="value || undefined"
    show-search
    allow-clear
    :size="size"
    :placeholder="placeholder"
    :disabled="disabled"
    style="width: 100%"
    :filter-option="false"
    :options="displayOptions"
    :open="mergedOpen"
    :dropdown-match-select-width="360"
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

  <PurchaseOrderSelectModal v-model:open="pickerOpen" @confirm="onPickedFromModal" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import {
  PURCHASE_ORDER_DROPDOWN_QUICK_LIMIT,
  PURCHASE_ORDER_SELECT_PLACEHOLDER,
  buildPurchaseOrderDisplayOptions,
  getAllPurchaseOrderOptions,
} from '@/utils/purchaseOrderPicker'
import PurchaseOrderSelectModal from './PurchaseOrderSelectModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: PURCHASE_ORDER_SELECT_PLACEHOLDER },
  size: { type: String, default: 'small' },
  open: { type: Boolean, default: undefined },
  autoOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:value', 'change', 'dropdown-visible-change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const innerOpen = ref(false)

const allOptions = computed(() => getAllPurchaseOrderOptions(purchaseOrderState.orders))

const displayOptions = computed(() =>
  buildPurchaseOrderDisplayOptions({
    options: allOptions.value,
    keyword: searchKeyword.value,
    selectedValue: props.value,
    quickLimit: PURCHASE_ORDER_DROPDOWN_QUICK_LIMIT,
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

function onPickedFromModal(order) {
  if (!order?.orderNo) return
  emit('update:value', order.orderNo)
  emit('change', order.orderNo)
}
</script>

<script>
export default { name: 'PurchaseOrderSearchSelect' }
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
