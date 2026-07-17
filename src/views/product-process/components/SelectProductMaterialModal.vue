<template>
  <a-modal
    :open="open"
    title="选择物品"
    width="720px"
    destroy-on-close
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-tabs v-model:activeKey="activeTab" size="small">
      <a-tab-pane key="product" tab="产品" />
      <a-tab-pane key="material" tab="物料" />
    </a-tabs>
    <a-input
      v-model:value="keyword"
      allow-clear
      size="small"
      placeholder="搜索名称或编码"
      style="margin-bottom: 8px"
    />
    <a-table
      :columns="columns"
      :data-source="filteredList"
      :custom-row="customRow"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 8, size: 'small' }"
      :row-selection="rowSelection"
    />
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'

const props = defineProps({
  open: Boolean,
  itemType: { type: String, default: 'product' },
  selectedId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const activeTab = ref('product')
const keyword = ref('')
const selectedKeys = ref([])

const columns = [
  { title: '编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 180 },
  { title: '规格型号', dataIndex: 'specModel', width: 140 },
  { title: '类别', dataIndex: 'categoryName', width: 100 },
]

const sourceList = computed(() => {
  if (activeTab.value === 'material') {
    return (materialInfoState.materials || []).map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      specModel: m.specModel,
      categoryName: m.categoryName,
      categoryKey: m.categoryKey,
      itemType: '物料',
    }))
  }
  return (productInfoState.products || []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    specModel: p.specModel,
    categoryName: p.categoryName,
    categoryKey: p.categoryKey,
    itemType: '产品',
  }))
})

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return sourceList.value
  return sourceList.value.filter(
    (r) =>
      r.name?.toLowerCase().includes(kw) ||
      r.code?.toLowerCase().includes(kw) ||
      r.specModel?.toLowerCase().includes(kw),
  )
})

function toggleRow(record) {
  const key = record.id
  if (selectedKeys.value.includes(key)) {
    selectedKeys.value = []
  } else {
    selectedKeys.value = [key]
  }
}

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (
        target?.closest?.('.ant-radio-wrapper') ||
        target?.closest?.('.ant-radio') ||
        target?.closest?.('input')
      ) {
        return
      }
      toggleRow(record)
    },
  }
}

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
}))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    activeTab.value = props.itemType === '物料' ? 'material' : 'product'
    keyword.value = ''
    selectedKeys.value = props.selectedId ? [props.selectedId] : []
  },
)

function handleOk() {
  const row = sourceList.value.find((r) => r.id === selectedKeys.value[0])
  if (!row) {
    message.warning('请选择物品')
    return
  }
  emit('confirm', row)
  emit('update:open', false)
}
</script>
