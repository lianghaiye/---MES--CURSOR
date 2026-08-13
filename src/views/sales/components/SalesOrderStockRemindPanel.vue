<template>
  <div class="stock-remind">
    <a-alert
      type="info"
      show-icon
      class="stock-remind-alert"
      :message="`订单库存状态：${orderStatus}`"
      :description="summaryText"
    />
    <a-table
      size="small"
      bordered
      row-key="lineId"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 960 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'planStrategy'">
          {{ record.planStrategy === 'mts' ? '以库存生产' : '按单生产' }}
        </template>
        <template v-else-if="column.key === 'others'">
          <template v-if="record.others?.length">
            <div v-for="o in record.others" :key="o.id" class="other-row">
              {{ o.salesOrderNo }} 占用 {{ o.qty }}
              <a-button
                v-if="canTransfer"
                type="link"
                size="small"
                @click="emit('transfer', { from: o, line: record.line })"
              >
                申请调拨
              </a-button>
            </div>
          </template>
          <span v-else class="muted">无他单占用</span>
        </template>
        <template v-else-if="column.key === 'freeQty'">
          {{ record.freeQty }}
          <span v-if="record.freeQty > 0" class="muted">（自由备货）</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  buildLineStockReminder,
  buildOrderInventoryStatus,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'

const props = defineProps({
  order: { type: Object, required: true },
  canTransfer: { type: Boolean, default: true },
})

const emit = defineEmits(['transfer'])

const columns = [
  { title: '产品编码', dataIndex: 'itemCode', width: 110 },
  { title: '产品名称', dataIndex: 'productName', ellipsis: true, width: 140 },
  { title: '需求', dataIndex: 'need', width: 72, align: 'right' },
  { title: '现存量', dataIndex: 'onHand', width: 80, align: 'right' },
  { title: '本单占用', dataIndex: 'myAlloc', width: 88, align: 'right' },
  { title: '自由备货', key: 'freeQty', dataIndex: 'freeQty', width: 110, align: 'right' },
  { title: '他单占用', key: 'others', width: 220 },
  { title: '库存状态', key: 'status', width: 96 },
  { title: '计划策略', key: 'planStrategy', width: 100 },
]

const rows = computed(() => {
  void salesStockAllocationState.allocations
  const order = props.order
  return (order?.lineItems || [])
    .filter((l) => l.productCode)
    .map((line) => {
      const r = buildLineStockReminder(line, order)
      return {
        ...r,
        lineId: line.id,
        line,
        productName: line.productName || '',
      }
    })
})

const orderStatus = computed(() => {
  void salesStockAllocationState.allocations
  return buildOrderInventoryStatus(props.order)
})

const summaryText = computed(() => {
  const parts = []
  const hasOther = rows.value.some((r) => r.otherQty > 0)
  const hasFree = rows.value.some((r) => r.freeQty > 0)
  if (hasFree) parts.push('存在未挂单的自由备货，可直接发货')
  if (hasOther) parts.push('存在他单占用，紧急时可申请跨单调拨（先发后偿还）')
  if (!parts.length) parts.push('按现存量与软占用计算；发货前占用挂在销售行上')
  return parts.join('；')
})

function statusColor(status) {
  if (status === '缺货') return 'error'
  if (status === '部分缺货') return 'warning'
  return 'success'
}
</script>

<style lang="less" scoped>
.stock-remind-alert {
  margin-bottom: 12px;
}
.other-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
