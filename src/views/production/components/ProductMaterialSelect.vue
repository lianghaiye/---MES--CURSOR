<template>
  <a-select
    v-model:value="innerKey"
    show-search
    allow-clear
    option-filter-prop="label"
    :placeholder="placeholder"
    :size="size"
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
          查看更多
        </div>
      </div>
    </template>
  </a-select>

  <SelectWarehouseItemModal
    v-model:open="pickerOpen"
    :multiple="false"
    :selected-items="presetItems"
    @confirm="onPicked"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import SelectWarehouseItemModal from '@/views/basic-config/components/SelectWarehouseItemModal.vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择 产品' },
  size: { type: String, default: 'small' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const pickerOpen = ref(false)

const allItems = computed(() => {
  void productInfoState.products
  void materialInfoState.materials
  return buildWarehousePickableItems()
})

const selectOptions = computed(() =>
  allItems.value.map((item) => ({
    label: item.name,
    value: item.rowKey,
    item,
  })),
)

const innerKey = computed({
  get() {
    if (!props.modelValue) return undefined
    const hit =
      allItems.value.find((it) => it.name === props.modelValue) ||
      allItems.value.find((it) => it.code === props.modelValue)
    return hit?.rowKey
  },
  set(key) {
    if (!key) {
      emit('update:modelValue', '')
      return
    }
    const item = allItems.value.find((it) => it.rowKey === key)
    emit('update:modelValue', item?.name || '')
    if (item) emit('select', item)
  },
})

const presetItems = computed(() => {
  if (!innerKey.value) return []
  const item = allItems.value.find((it) => it.rowKey === innerKey.value)
  return item
    ? [
        {
          itemType: item.itemType,
          itemId: item.itemId,
          code: item.code,
          name: item.name,
        },
      ]
    : []
})

function openPicker() {
  pickerOpen.value = true
}

function onPicked(items) {
  const item = items[0]
  if (!item) return
  emit('update:modelValue', item.name)
  emit('select', item)
}
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
