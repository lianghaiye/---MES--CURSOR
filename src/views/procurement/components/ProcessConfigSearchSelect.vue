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
          <div class="search-more-row" @mousedown.prevent @click="openPicker">搜索更多</div>
        </template>
      </div>
    </template>
  </a-select>

  <ProcessSelectModal v-model:open="pickerOpen" :multiple="false" @confirm="onPickedFromModal" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { getProcessById, processConfigState } from '@/store/processConfigStore'
import {
  PROCESS_CONFIG_DROPDOWN_QUICK_LIMIT,
  PROCESS_CONFIG_SELECT_PLACEHOLDER,
  buildProcessConfigDisplayOptions,
  getAllProcessConfigOptions,
} from '@/utils/processConfigPicker'
import ProcessSelectModal from '@/views/production/components/ProcessSelectModal.vue'

const props = defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: PROCESS_CONFIG_SELECT_PLACEHOLDER },
  size: { type: String, default: 'small' },
  open: { type: Boolean, default: undefined },
  autoOpen: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:value', 'change', 'dropdown-visible-change'])

const pickerOpen = ref(false)
const searchKeyword = ref('')
const innerOpen = ref(false)

const allOptions = computed(() => getAllProcessConfigOptions(processConfigState.processes))

const displayOptions = computed(() =>
  buildProcessConfigDisplayOptions({
    options: allOptions.value,
    keyword: searchKeyword.value,
    selectedValue: props.value,
    quickLimit: PROCESS_CONFIG_DROPDOWN_QUICK_LIMIT,
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

function emitSelected(processId) {
  const id = processId || ''
  emit('update:value', id)
  emit('change', id, id ? getProcessById(id) : null)
}

function onSelectChange(nextValue) {
  emitSelected(nextValue || '')
}

function openPicker() {
  if (props.disabled) return
  if (props.open === undefined) innerOpen.value = false
  else emit('dropdown-visible-change', false)
  pickerOpen.value = true
}

function onPickedFromModal(process) {
  const row = Array.isArray(process) ? process[0] : process
  if (!row?.id) return
  emitSelected(row.id)
}
</script>

<script>
export default { name: 'ProcessConfigSearchSelect' }
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
