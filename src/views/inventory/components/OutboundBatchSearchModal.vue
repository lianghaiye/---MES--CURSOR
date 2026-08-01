<template>
  <a-modal
    :open="open"
    title="自主选批"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="入库时间">
        <a-range-picker
          v-model:value="dateRange"
          show-time
          format="YYYY-MM-DD HH:mm"
          style="width: 360px"
          allow-clear
        />
      </a-form-item>
      <a-form-item>
        <a-input
          v-model:value="keyword"
          allow-clear
          placeholder="搜索批次号 / 物料名称"
          style="width: 200px"
        />
      </a-form-item>
    </a-form>

    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="filteredRows"
      :pagination="{ pageSize: 8, size: 'small' }"
      :row-selection="rowSelection"
      :scroll="{ y: 320 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'currentLength'">
          {{ formatQty(record.currentLength) }}{{ record.unit || unitLabel }}
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>
      </template>
    </a-table>
  </a-modal>
</template>

<script>
export default { name: 'OutboundBatchSearchModal' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { listBatches, stockBatchState } from '@/store/stockBatchStore'
import { formatQty } from '@/utils/numberFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  warehouse: { type: String, default: '' },
  itemCode: { type: String, default: '' },
  itemName: { type: String, default: '' },
  unitLabel: { type: String, default: '' },
  selectedIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const dateRange = ref([])
const keyword = ref('')
const selectedRowKeys = ref([])

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '当前仓库数量', key: 'currentLength', width: 120 },
  { title: '入库时间', key: 'createdAt', width: 150 },
]

const allRows = computed(() => {
  void stockBatchState.batches
  if (!props.warehouse || !props.itemCode) return []
  return listBatches({
    warehouse: props.warehouse,
    itemCode: props.itemCode,
    inStockOnly: true,
  })
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      if (ta !== tb) return tb - ta
      return (Number(a.currentLength) || 0) - (Number(b.currentLength) || 0)
    })
})

const filteredRows = computed(() => {
  let list = allRows.value
  const range = dateRange.value
  if (Array.isArray(range) && range[0] && range[1]) {
    const start = dayjs(range[0]).valueOf()
    const end = dayjs(range[1]).valueOf()
    list = list.filter((b) => {
      const t = dayjs(b.createdAt).valueOf()
      return t >= start && t <= end
    })
  }
  const kw = String(keyword.value || '')
    .trim()
    .toLowerCase()
  if (kw) {
    list = list.filter((b) => {
      const text = `${b.batchNo || ''} ${b.itemName || ''} ${b.itemCode || ''}`.toLowerCase()
      return text.includes(kw)
    })
  }
  return list
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    selectedRowKeys.value = [...(props.selectedIds || [])]
    dateRange.value = []
    keyword.value = ''
  },
)

function formatTime(val) {
  if (!val) return '—'
  return dayjs(val).format('YYYY-MM-DD HH:mm')
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  emit('confirm', [...selectedRowKeys.value])
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.search-form {
  margin-bottom: 12px;
  row-gap: 8px;
}
</style>
