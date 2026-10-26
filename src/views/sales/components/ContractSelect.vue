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
    :dropdown-match-select-width="360"
    @search="onSearch"
    @dropdown-visible-change="onDropdownVisibleChange"
    @blur="onBlur"
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

  <SelectContractModal
    v-model:open="pickerOpen"
    :selected="modelValue"
    :lock-contract-type="lockContractType"
    :preferred-customer-name="preferredCustomerName"
    @confirm="onPickedFromModal"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { getActiveSalesContractOptions, getSalesContractByNo } from '@/store/salesContractStore'
import SelectContractModal from './SelectContractModal.vue'

const QUICK_LIMIT = 8

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索或输入合同编号' },
  size: { type: String, default: 'small' },
  disabled: { type: Boolean, default: false },
  /** 锁定合同类型过滤建议项 */
  lockContractType: { type: String, default: '' },
  preferredCustomerName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')

const allOptions = computed(() => {
  const type =
    props.lockContractType === '标准合同' || props.lockContractType === '框架合同'
      ? props.lockContractType
      : ''
  // 建议项：先按客户过滤；无命中时仍展示同类型生效合同，便于存量编号对照
  const byCustomer = getActiveSalesContractOptions(props.preferredCustomerName || '', type)
  if (byCustomer.length || !props.preferredCustomerName) return byCustomer
  return getActiveSalesContractOptions('', type)
})

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
          .includes(kw),
    )
  }
  const sliced = kw ? list.slice(0, 50) : list.slice(0, QUICK_LIMIT)
  const result = [...sliced]
  if (selected && !result.some((opt) => opt.value === selected)) {
    const hit =
      allOptions.value.find((opt) => opt.value === selected) ||
      (getSalesContractByNo(selected)
        ? {
            label: `${selected} · ${getSalesContractByNo(selected).contractName || '已选'}`,
            value: selected,
          }
        : { label: selected, value: selected })
    result.unshift(hit)
  }
  return result
})

function onSearch(keyword) {
  searchKeyword.value = keyword
}

/** 下拉关闭或失焦时，把当前输入的编号自动写入，无需再点「使用手填」 */
function commitPendingInput() {
  const kw = searchKeyword.value.trim()
  if (!kw || kw === props.modelValue) return
  emitValue(kw)
  searchKeyword.value = ''
}

function onDropdownVisibleChange(visible) {
  if (!visible) commitPendingInput()
}

function onBlur() {
  // 失焦时下拉可能已关；若仍有未提交关键字则落值
  commitPendingInput()
}

function emitValue(nextValue) {
  const value = nextValue || ''
  emit('update:modelValue', value)
  const contract = value ? getSalesContractByNo(value) : null
  emit('change', value, contract)
}

function onSelectChange(nextValue) {
  searchKeyword.value = ''
  emitValue(nextValue || '')
}

function openPicker() {
  if (props.disabled) return
  pickerOpen.value = true
}

function onPickedFromModal(contract) {
  const no = contract?.contractNo
  if (!no) return
  searchKeyword.value = ''
  emit('update:modelValue', no)
  emit('change', no, contract)
}
</script>

<script>
export default { name: 'ContractSelect' }
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
