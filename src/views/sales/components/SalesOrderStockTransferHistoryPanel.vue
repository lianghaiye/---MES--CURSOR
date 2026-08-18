<template>
  <div class="stock-transfer-history">
    <a-alert
      type="info"
      show-icon
      class="history-alert"
      :message="alertMessage"
      :description="summaryText"
    />

    <div class="block-title">跨单调拨记录</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="transferColumns"
      :data-source="transfers"
      :pagination="false"
      :locale="{ emptyText: '本单无跨单调拨记录' }"
      :scroll="{ x: 880 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'direction'">
          <a-tag :color="record.direction === 'in' ? 'processing' : 'warning'">
            {{ record.direction === 'in' ? '从他单调入' : '调出给他单' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'peerOrder'">
          {{ record.direction === 'in' ? record.fromOrderNo : record.toOrderNo }}
        </template>
        <template v-else-if="column.key === 'requireRepay'">
          {{ record.requireRepay === false ? '无需偿还' : '需偿还' }}
        </template>
      </template>
    </a-table>

    <div class="block-title">借调偿还状态</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="debtColumns"
      :data-source="debts"
      :pagination="false"
      :locale="{ emptyText: '本单无借调债务记录' }"
      :scroll="{ x: 880 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="record.role === 'borrower' ? 'orange' : 'blue'">
            {{ record.role === 'borrower' ? '本单借入（待还他单）' : '本单借出（待他单偿还）' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'peerOrder'">
          {{ record.role === 'borrower' ? record.creditorOrderNo : record.debtorOrderNo }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'closed' ? 'success' : 'warning'">
            {{ record.status === 'closed' ? '已还清' : '未还清' }}
          </a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'SalesOrderStockTransferHistoryPanel' }
</script>

<script setup>
import { computed } from 'vue'
import {
  listOrderStockDebts,
  listOrderStockTransfers,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'

const props = defineProps({
  order: { type: Object, required: true },
  /** ended：已完成订单履历；review：审核页查看调拨结果 */
  variant: { type: String, default: 'ended' },
})

const alertMessage = computed(() =>
  props.variant === 'review'
    ? '审核参考：以下为本单已确认的跨单调拨与偿还约定'
    : '订单已结束：以下为库存占用与跨单借调履历（非实时现存量）',
)

const transferColumns = [
  { title: '方向', key: 'direction', width: 120 },
  { title: '产品编码', dataIndex: 'itemCode', width: 110 },
  { title: '产品名称', dataIndex: 'itemName', ellipsis: true, width: 140 },
  { title: '数量', dataIndex: 'qty', width: 72, align: 'right' },
  { title: '对方订单', key: 'peerOrder', width: 140 },
  { title: '偿还约定', key: 'requireRepay', width: 100 },
  { title: '时间', dataIndex: 'createdAt', width: 140 },
]

const debtColumns = [
  { title: '角色', key: 'role', width: 160 },
  { title: '产品编码', dataIndex: 'itemCode', width: 110 },
  { title: '产品名称', dataIndex: 'itemName', ellipsis: true, width: 140 },
  { title: '应还', dataIndex: 'owedQty', width: 72, align: 'right' },
  { title: '已还', dataIndex: 'repaidQty', width: 72, align: 'right' },
  { title: '剩余', dataIndex: 'remainQty', width: 72, align: 'right' },
  { title: '对方订单', key: 'peerOrder', width: 140 },
  { title: '状态', key: 'status', width: 90 },
]

const transfers = computed(() => {
  void salesStockAllocationState.transfers
  return listOrderStockTransfers(props.order?.id)
})

const debts = computed(() => {
  void salesStockAllocationState.debts
  return listOrderStockDebts(props.order?.id)
})

const summaryText = computed(() => {
  const inQty = transfers.value
    .filter((t) => t.direction === 'in')
    .reduce((s, t) => s + (Number(t.qty) || 0), 0)
  const outQty = transfers.value
    .filter((t) => t.direction === 'out')
    .reduce((s, t) => s + (Number(t.qty) || 0), 0)
  const openDebt = debts.value.filter((d) => d.status !== 'closed').length
  const parts = []
  if (inQty > 0) parts.push(`曾从他单调入合计 ${inQty}`)
  if (outQty > 0) parts.push(`曾调出给他单合计 ${outQty}`)
  if (openDebt > 0) parts.push(`尚有 ${openDebt} 笔未还清债务`)
  if (!parts.length) parts.push('本单无跨单借调记录')
  return parts.join('；')
})
</script>

<style lang="less" scoped>
.history-alert {
  margin-bottom: 12px;
}

.block-title {
  margin: 12px 0 8px;
  font-weight: 500;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}
</style>
