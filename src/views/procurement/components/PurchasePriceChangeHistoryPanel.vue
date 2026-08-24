<template>
  <div class="price-change-history">
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="records"
      :pagination="false"
      :locale="{ emptyText: '暂无价格变更记录' }"
      :scroll="{ x: 1280 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="purchasePriceChangeStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'deltaAmountExTax'">
          <span :class="deltaClass(record.deltaAmountExTax)">
            {{ formatPurchasePriceChangeMoney(record.deltaAmountExTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'deltaAmountInTax'">
          <span :class="deltaClass(record.deltaAmountInTax)">
            {{ formatPurchasePriceChangeMoney(record.deltaAmountInTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'newAmountExTax'">
          {{ formatPurchasePriceChangeAbsMoney(record.newAmountExTax) }}
        </template>
        <template v-else-if="column.key === 'newAmountInTax'">
          {{ formatPurchasePriceChangeAbsMoney(record.newAmountInTax) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <a-table
          size="small"
          bordered
          row-key="poLineId"
          :columns="lineColumns"
          :data-source="record.lines || []"
          :pagination="false"
          :scroll="{ x: 1200 }"
        >
          <template #bodyCell="{ column, record: line }">
            <template v-if="isLineMoney(column.key)">
              {{ formatPurchasePriceChangeAbsMoney(line[column.key]) }}
            </template>
            <template v-else-if="column.key === 'deltaAmountExTax'">
              <span :class="deltaClass(line.deltaAmountExTax)">
                {{ formatPurchasePriceChangeMoney(line.deltaAmountExTax) }}
              </span>
            </template>
            <template v-else-if="column.key === 'deltaAmountInTax'">
              <span :class="deltaClass(line.deltaAmountInTax)">
                {{ formatPurchasePriceChangeMoney(line.deltaAmountInTax) }}
              </span>
            </template>
            <template v-else>
              {{ line[column.dataIndex] ?? '—' }}
            </template>
          </template>
        </a-table>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'PurchasePriceChangeHistoryPanel' }
</script>

<script setup>
import { computed } from 'vue'
import {
  listPurchasePriceChangesByOrderId,
  purchasePriceChangeState,
} from '@/store/purchasePriceChangeStore'
import {
  formatPurchasePriceChangeAbsMoney,
  formatPurchasePriceChangeMoney,
  normalizePurchasePriceChangeRecord,
  purchasePriceChangeStatusColor,
} from '@/utils/purchasePriceChange'

const props = defineProps({
  order: { type: Object, required: true },
})

const records = computed(() => {
  void purchasePriceChangeState.orders
  return listPurchasePriceChangesByOrderId(props.order?.id).map((row) =>
    normalizePurchasePriceChangeRecord(row),
  )
})

const columns = [
  { title: '变更单号', dataIndex: 'changeNo', width: 160 },
  { title: '状态', key: 'status', width: 88 },
  { title: '原因', dataIndex: 'reasonType', width: 100 },
  { title: '说明', dataIndex: 'reason', ellipsis: true },
  { title: '变更后（不含税）', key: 'newAmountExTax', width: 148, align: 'right' },
  { title: '变更后（含税）', key: 'newAmountInTax', width: 136, align: 'right' },
  { title: '差额（不含税）', key: 'deltaAmountExTax', width: 136, align: 'right' },
  { title: '差额（含税）', key: 'deltaAmountInTax', width: 124, align: 'right' },
  { title: '申请人', dataIndex: 'creator', width: 88 },
  { title: '申请时间', dataIndex: 'createdAt', width: 148 },
  { title: '审核人', dataIndex: 'approver', width: 88 },
  { title: '审核时间', dataIndex: 'approvedAt', width: 148 },
]

const lineMoneyKeys = new Set([
  'oldUnitPriceExTax',
  'oldUnitPriceInTax',
  'newUnitPriceExTax',
  'newUnitPriceInTax',
])

function isLineMoney(key) {
  return lineMoneyKeys.has(key)
}

const lineColumns = [
  { title: '物料名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '物料编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '计价数量', dataIndex: 'qty', width: 88, align: 'right' },
  { title: '原单价（不含税）', key: 'oldUnitPriceExTax', width: 122, align: 'right' },
  { title: '原单价（含税）', key: 'oldUnitPriceInTax', width: 110, align: 'right' },
  { title: '新单价（不含税）', key: 'newUnitPriceExTax', width: 122, align: 'right' },
  { title: '新单价（含税）', key: 'newUnitPriceInTax', width: 110, align: 'right' },
  { title: '差额（不含税）', key: 'deltaAmountExTax', width: 118, align: 'right' },
  { title: '差额（含税）', key: 'deltaAmountInTax', width: 110, align: 'right' },
]

function deltaClass(val) {
  const n = Number(val) || 0
  if (n > 0) return 'delta-up'
  if (n < 0) return 'delta-down'
  return ''
}
</script>

<style lang="less" scoped>
.price-change-history {
  :deep(.ant-table-thead > tr > th) {
    white-space: nowrap;
  }
}

.delta-up {
  color: #cf1322;
}

.delta-down {
  color: #389e0d;
}
</style>
