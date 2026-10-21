<template>
  <a-select
    v-model:value="innerValue"
    show-search
    allow-clear
    option-filter-prop="label"
    :placeholder="placeholder"
    :size="size"
    :disabled="disabled"
    :options="selectOptions"
    :dropdown-match-select-width="true"
    style="width: 100%"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div>
        <component :is="menu" />
        <a-divider style="margin: 4px 0" />
        <div class="more-row" @mousedown.prevent @click="openPicker">
          <SearchOutlined />
          {{ props.moreText }}
        </div>
      </div>
    </template>
  </a-select>

  <SelectPersonModal
    v-model:open="pickerOpen"
    :selected="presetNames"
    :multiple="false"
    @confirm="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { mockEmployees } from '@/mock/workOrderMaster'
import SelectPersonModal from './SelectPersonModal.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择创建人' },
  size: { type: String, default: 'small' },
  moreText: { type: String, default: '选择更多' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select'])

const pickerOpen = ref(false)

const selectOptions = computed(() => {
  const opts = mockEmployees.map((emp) => ({
    label: emp.name,
    value: emp.name,
  }))
  const current = String(props.modelValue || '').trim()
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ label: current, value: current })
  }
  return opts
})

const innerValue = computed({
  get() {
    return props.modelValue || undefined
  },
  set(value) {
    if (!value) {
      emit('update:modelValue', '')
      emit('select', null)
      return
    }
    emit('update:modelValue', value)
    emit('select', value)
  },
})

const presetNames = computed(() => (props.modelValue ? [props.modelValue] : []))

function openPicker() {
  pickerOpen.value = true
}

function onPicked(names) {
  const name = names?.[0]
  if (!name) return
  emit('update:modelValue', name)
  emit('select', name)
}
</script>

<script>
export default { name: 'WorkOrderOwnerSelect' }
</script>

<style lang="less" scoped>
.more-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: #f5f5f5;
  }
}
</style>
