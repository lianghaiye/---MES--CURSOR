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
      :scroll="{ x: 1480 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="priceChangeStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'deltaAmountExTax'">
          <span :class="deltaClass(record.deltaAmountExTax)">
            {{ formatPriceChangeMoney(record.deltaAmountExTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'deltaAmountInTax'">
          <span :class="deltaClass(record.deltaAmountInTax)">
            {{ formatPriceChangeMoney(record.deltaAmountInTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'newAmountExTax'">
          {{ formatPriceChangeAbsMoney(record.newAmountExTax) }}
        </template>
        <template v-else-if="column.key === 'newAmountInTax'">
          {{ formatPriceChangeAbsMoney(record.newAmountInTax) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <a-table
          size="small"
          bordered
          row-key="salesLineId"
          :columns="lineColumns"
          :data-source="record.lines || []"
          :pagination="false"
          :scroll="{ x: 1460 }"
        >
          <template #bodyCell="{ column, record: line }">
            <template v-if="isLineMoney(column.key)">
              {{ formatPriceChangeAbsMoney(line[column.key]) }}
            </template>
            <template v-else-if="column.key === 'oldLineDiscountRate'">
              {{ formatPriceChangeDiscount(line.oldLineDiscountRate) }}
            </template>
            <template v-else-if="column.key === 'newLineDiscountRate'">
              {{ formatPriceChangeDiscount(line.newLineDiscountRate) }}
            </template>
            <template v-else-if="column.key === 'deltaAmountExTax'">
              <span :class="deltaClass(line.deltaAmountExTax)">
                {{ formatPriceChangeMoney(line.deltaAmountExTax) }}
              </span>
            </template>
            <template v-else-if="column.key === 'deltaAmountInTax'">
              <span :class="deltaClass(line.deltaAmountInTax)">
                {{ formatPriceChangeMoney(line.deltaAmountInTax) }}
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
export default { name: 'SalesPriceChangeHistoryPanel' }
</script>

<script setup>
import { computed } from 'vue'
import { listPriceChangesByOrderId, salesPriceChangeState } from '@/store/salesPriceChangeStore'
import {
  formatPriceChangeAbsMoney,
  formatPriceChangeDiscount,
  formatPriceChangeMoney,
  normalizePriceChangeRecord,
  priceChangeStatusColor,
} from '@/utils/salesPriceChange'

const props = defineProps({
  order: { type: Object, required: true },
})

const records = computed(() => {
  void salesPriceChangeState.orders
  return listPriceChangesByOrderId(props.order?.id).map((row) => normalizePriceChangeRecord(row))
})

const columns = [
  { title: '变更单号', dataIndex: 'changeNo', width: 150 },
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
  'oldLineDiscountAmount',
  'newLineDiscountAmount',
])

function isLineMoney(key) {
  return lineMoneyKeys.has(key)
}

const lineColumns = [
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 64, align: 'right' },
  { title: '原单价（不含税）', key: 'oldUnitPriceExTax', width: 122, align: 'right' },
  { title: '原单价（含税）', key: 'oldUnitPriceInTax', width: 110, align: 'right' },
  { title: '新单价（不含税）', key: 'newUnitPriceExTax', width: 122, align: 'right' },
  { title: '新单价（含税）', key: 'newUnitPriceInTax', width: 110, align: 'right' },
  { title: '原折扣', key: 'oldLineDiscountRate', width: 80, align: 'right' },
  { title: '新折扣', key: 'newLineDiscountRate', width: 80, align: 'right' },
  { title: '原行优惠', key: 'oldLineDiscountAmount', width: 100, align: 'right' },
  { title: '新行优惠', key: 'newLineDiscountAmount', width: 100, align: 'right' },
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
