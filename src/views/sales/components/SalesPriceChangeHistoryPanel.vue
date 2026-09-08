<template>
  <div class="price-change-history">
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="records"
      :pagination="false"
      :locale="{ emptyText: '暂无订单变更记录' }"
      :scroll="{ x: 1680 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="priceChangeStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'reasonType'">
          {{ formatReasonTypes(record.reasonType) }}
        </template>
        <template v-else-if="column.key === 'customer'">
          {{ customerDisplay(record) }}
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
        <div v-if="headerDiffs(record).length" class="header-diff">
          <div class="header-diff-title">基本信息变更</div>
          <div v-for="item in headerDiffs(record)" :key="item.key" class="header-diff-row">
            <span class="header-diff-label">{{ item.label }}</span>
            <span>{{ item.oldValue }}</span>
            <span class="hint-arrow">→</span>
            <span>{{ item.newValue }}</span>
          </div>
        </div>
        <a-table
          size="small"
          bordered
          row-key="salesLineId"
          :columns="lineColumns"
          :data-source="record.lines || []"
          :pagination="false"
          :row-class-name="(line) => (line.cancelled ? 'line-cancelled' : '')"
          :scroll="{ x: 1960 }"
        >
          <template #bodyCell="{ column, record: line }">
            <template v-if="column.key === 'productName'">
              <span>{{ line.productName || '—' }}</span>
              <a-tag v-if="line.cancelled" color="default" class="cancelled-tag">已取消</a-tag>
            </template>
            <template v-else-if="column.key === 'newQty'">
              <span :class="{ 'cell-changed': numChanged(line.newQty, line.oldQty) }">{{
                line.newQty ?? '—'
              }}</span>
            </template>
            <template v-else-if="column.key === 'newTaxRate'">
              <span :class="{ 'cell-changed': numChanged(line.newTaxRate, line.oldTaxRate) }">{{
                line.newTaxRate ?? '—'
              }}</span>
            </template>
            <template v-else-if="column.key === 'newUnitPriceExTax'">
              <span
                :class="{
                  'cell-changed': numChanged(line.newUnitPriceExTax, line.oldUnitPriceExTax),
                }"
              >
                {{ formatPriceChangeAbsMoney(line.newUnitPriceExTax) }}
              </span>
            </template>
            <template v-else-if="column.key === 'newUnitPriceInTax'">
              <span
                :class="{
                  'cell-changed': numChanged(line.newUnitPriceInTax, line.oldUnitPriceInTax),
                }"
              >
                {{ formatPriceChangeAbsMoney(line.newUnitPriceInTax) }}
              </span>
            </template>
            <template v-else-if="isLineMoney(column.key)">
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
  formatCustomerChangeHint,
  formatPriceChangeAbsMoney,
  formatPriceChangeDiscount,
  formatPriceChangeMoney,
  formatReasonTypes,
  isCustomerChanged,
  listOrderChangeHeaderDiffs,
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
  { title: '客户名称', key: 'customer', width: 220, ellipsis: true },
  { title: '原因', key: 'reasonType', width: 160, ellipsis: true },
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
  { title: '产品名称', key: 'productName', dataIndex: 'productName', width: 160, ellipsis: true },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '原数量', dataIndex: 'oldQty', width: 72, align: 'right' },
  { title: '新数量', key: 'newQty', dataIndex: 'newQty', width: 72, align: 'right' },
  { title: '原交货日期', dataIndex: 'oldDeliveryDate', width: 110 },
  { title: '新交货日期', dataIndex: 'newDeliveryDate', width: 110 },
  { title: '原税率(%)', dataIndex: 'oldTaxRate', width: 88, align: 'right' },
  { title: '新税率(%)', key: 'newTaxRate', dataIndex: 'newTaxRate', width: 88, align: 'right' },
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

function headerDiffs(record) {
  return listOrderChangeHeaderDiffs(record.headerOld, record.headerNew)
}

function numChanged(a, b) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) > 1e-9
}

function customerDisplay(record) {
  if (isCustomerChanged(record)) {
    return formatCustomerChangeHint(record.oldCustomerName, record.newCustomerName)
  }
  return record.newCustomerName || record.oldCustomerName || '—'
}

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

.header-diff {
  margin-bottom: 10px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.header-diff-title {
  margin-bottom: 6px;
  font-weight: 600;
}

.header-diff-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  line-height: 1.8;
}

.header-diff-label {
  min-width: 96px;
  color: rgba(0, 0, 0, 0.45);
}

.hint-arrow {
  color: #fa8c16;
  font-weight: 600;
}

.cancelled-tag {
  margin-left: 6px;
}

.cell-changed {
  color: #cf1322;
  font-weight: 600;
}

:deep(tr.line-cancelled > td) {
  background: #f5f5f5 !important;
}
</style>
