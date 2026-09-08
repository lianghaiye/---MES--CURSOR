<template>
  <div class="wo-info-tab">
    <div class="tab-title">外协订单</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="outsourcingColumns"
      :data-source="outsourcingOrders"
      :pagination="false"
      :scroll="{ x: outsourcingScrollX }"
      :locale="{ emptyText: '暂无外协订单' }"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'status'">
          <a-tag :color="outsourcingStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'inboundStatus'">
          <a-tag :color="inboundStatusColor(row.inboundStatus)">
            {{ row.inboundStatus || '—' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'orderNo'">
          <a class="link" @click.prevent="goOutsourcing(row)">{{ row.orderNo || '—' }}</a>
        </template>
        <template v-else-if="column.key === 'productName'">
          {{ row.productName || row.itemName || firstLine(row)?.productName || '—' }}
        </template>
        <template v-else-if="column.key === 'specModel'">
          {{ row.specModel || row.model || firstLine(row)?.specModel || '—' }}
        </template>
        <template v-else-if="column.key === 'material'">
          {{ row.material || firstLine(row)?.material || '—' }}
        </template>
        <template v-else-if="column.key === 'drawingNo'">
          {{ row.drawingNo || firstLine(row)?.drawingNo || '—' }}
        </template>
        <template v-else-if="column.key === 'variantAttr'">
          {{ row.variantAttr || row.variantSummary || firstLine(row)?.variantAttr || '—' }}
        </template>
        <template v-else-if="column.key === 'outsourceQty'">
          {{ formatQty(outsourceQty(row)) }}
        </template>
        <template v-else-if="column.key === 'planTime'">
          {{ row.planTime || row.planCompleteDate || row.planEndDate || row.planDate || '—' }}
        </template>
        <template v-else-if="column.key === 'supplierName'">
          {{ row.supplierName || row.supplier || '—' }}
        </template>
        <template v-else-if="column.key === 'source'">
          {{ formatProcurementSource(row) }}
        </template>
        <template v-else-if="column.key === 'sourceOrderNo'">
          {{ formatProcurementSourceOrderNo(row) }}
        </template>
        <template v-else>
          {{ row[column.dataIndex] ?? '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { formatQty } from '@/utils/numberFormat'
import { normalizeProcurementDocSource } from '@/constants/procurementDocSource'
import { listWorkOrderOutsourcingOrders } from '@/utils/workOrderRelatedInfo'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const outsourcingOrders = computed(() => {
  void outsourcingOrderState.orders
  return listWorkOrderOutsourcingOrders(props.workOrder)
})

const outsourcingColumns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96, fixed: 'left' },
  { title: '外协单号', key: 'orderNo', width: 140, fixed: 'left' },
  { title: '产品名称', key: 'productName', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', width: 88, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '变体属性', key: 'variantAttr', width: 140, ellipsis: true },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: true },
  { title: '外协数量', key: 'outsourceQty', width: 96, align: 'right' },
  { title: '计划时间', key: 'planTime', width: 110 },
  { title: '来源', key: 'source', width: 100, ellipsis: true },
  { title: '来源单号', key: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const outsourcingScrollX = computed(() =>
  outsourcingColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function firstLine(row) {
  return (row?.lineItems || [])[0] || null
}

function formatProcurementSource(row) {
  const raw = row?.source || row?.orderSource || ''
  return normalizeProcurementDocSource(raw) || '—'
}

function formatProcurementSourceOrderNo(row) {
  return row?.sourceOrderNo || row?.sourceWorkOrderNo || row?.salesOrderNo || '—'
}

function outsourceQty(row) {
  if (row?.outsourceQty != null && row.outsourceQty !== '') return Number(row.outsourceQty) || 0
  if (row?.totalQty != null && row.totalQty !== '') return Number(row.totalQty) || 0
  return (row?.lineItems || []).reduce((s, l) => s + (Number(l.planQty ?? l.outsourceQty) || 0), 0)
}

function outsourcingStatusColor(status) {
  const map = {
    待下达: 'default',
    进行中: 'processing',
    已完成: 'success',
    已关闭: 'default',
  }
  return map[status] || 'default'
}

function inboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function goOutsourcing(row) {
  if (!row?.id) return
  const path = `/procurement/outsourcing-orders/${row.id}`
  openTab({ path, title: '外协订单详情' })
  router.push(path)
}
</script>

<style lang="less" scoped>
.wo-info-tab {
  .tab-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
  .link {
    color: #1677ff;
    cursor: pointer;
  }
}
</style>
