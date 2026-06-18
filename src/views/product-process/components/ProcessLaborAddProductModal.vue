<template>
  <a-modal
    :open="open"
    title="新增产品"
    width="760px"
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
      placeholder="搜索产品/规格/材质..."
      style="margin-bottom: 8px"
    />
    <a-table
      :columns="columns"
      :data-source="filteredList"
      row-key="pickKey"
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
  excludeKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const activeTab = ref('product')
const keyword = ref('')
const selectedKeys = ref([])

const columns = [
  { title: '编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 160 },
  { title: '规格型号', dataIndex: 'specModel', width: 120 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '类别', dataIndex: 'categoryName', width: 100 },
]

const excludeSet = computed(() => new Set(props.excludeKeys || []))

const sourceList = computed(() => {
  const list = []
  ;(productInfoState.products || []).forEach((p) => {
    const pickKey = `product-${p.id}`
    if (excludeSet.value.has(pickKey)) return
    list.push({
      pickKey,
      id: p.id,
      code: p.code,
      name: p.name,
      specModel: p.specModel,
      material: p.material,
      categoryName: p.categoryName,
      itemType: '产品',
    })
  })
  ;(materialInfoState.materials || []).forEach((m) => {
    const pickKey = `material-${m.id}`
    if (excludeSet.value.has(pickKey)) return
    list.push({
      pickKey,
      id: m.id,
      code: m.code,
      name: m.name,
      specModel: m.specModel,
      material: m.material,
      categoryName: m.categoryName,
      itemType: '物料',
    })
  })
  return list
})

const tabFilteredList = computed(() => {
  const type = activeTab.value === 'material' ? '物料' : '产品'
  return sourceList.value.filter((r) => r.itemType === type)
})

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const base = tabFilteredList.value
  if (!kw) return base
  return base.filter(
    (r) =>
      r.name?.toLowerCase().includes(kw) ||
      r.code?.toLowerCase().includes(kw) ||
      r.specModel?.toLowerCase().includes(kw) ||
      r.material?.toLowerCase().includes(kw),
  )
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
}))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    activeTab.value = 'product'
    keyword.value = ''
    selectedKeys.value = []
  },
)

watch(activeTab, () => {
  selectedKeys.value = []
})

function handleOk() {
  const picked = sourceList.value.filter((r) => selectedKeys.value.includes(r.pickKey))
  if (!picked.length) {
    message.warning('请选择要添加的产品或物料')
    return
  }
  emit('confirm', picked)
  emit('update:open', false)
}
</script>
