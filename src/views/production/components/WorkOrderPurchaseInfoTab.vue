<template>
  <div class="wo-info-tab">
    <div class="section-card">
      <div class="tab-title">采购申请</div>
      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="purchaseReqColumns"
        :data-source="purchaseRequisitions"
        :pagination="false"
        :scroll="{ x: purchaseReqScrollX }"
        :locale="{ emptyText: '暂无采购申请' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'docStatus'">
            <a-tag :color="purchaseReqStatusColor(row.docStatus)">
              {{ row.docStatus || row.status || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <a class="link" @click.prevent="goPurchaseReq(row.id)">{{ row.reqNo || '—' }}</a>
          </template>
          <template v-else-if="column.key === 'planItemCount'">
            {{ (row.lineItems || []).length }}
          </template>
          <template v-else-if="column.key === 'plannedQty'">
            {{ formatQty(row.plannedQty) }}
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

    <div class="section-card">
      <div class="tab-title">采购订单</div>
      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="purchaseOrderColumns"
        :data-source="purchaseOrders"
        :pagination="false"
        :scroll="{ x: purchaseOrderScrollX }"
        :locale="{ emptyText: '暂无采购订单' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'status'">
            <a-tag :color="purchaseOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'inboundStatus'">
            <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
              {{ row.inboundStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'orderNo'">
            <a class="link" @click.prevent="goPurchaseOrder(row)">{{ row.orderNo || '—' }}</a>
          </template>
          <template v-else-if="column.key === 'supplier'">
            {{ row.supplier || row.supplierName || '—' }}
          </template>
          <template v-else-if="column.key === 'purchaseItemCount'">
            {{ (row.lineItems || []).length }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQty(purchaseOrderQty(row)) }}
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { formatQty } from '@/utils/numberFormat'
import { normalizeProcurementDocSource } from '@/constants/procurementDocSource'
import {
  listWorkOrderPurchaseOrders,
  listWorkOrderPurchaseRequisitions,
} from '@/utils/workOrderRelatedInfo'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const purchaseRequisitions = computed(() => {
  void purchaseRequisitionState.requisitions
  return listWorkOrderPurchaseRequisitions(props.workOrder)
})

const purchaseOrders = computed(() => {
  void purchaseOrderState.orders
  void purchaseRequisitionState.requisitions
  return listWorkOrderPurchaseOrders(props.workOrder)
})

const purchaseReqColumns = [
  { title: '状态', key: 'docStatus', width: 90, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', width: 160, fixed: 'left' },
  { title: '计划项数', key: 'planItemCount', width: 88, align: 'right' },
  { title: '计划数量', key: 'plannedQty', width: 100, align: 'right' },
  { title: '期望到货时间', dataIndex: 'estimatedArrivalDate', width: 120 },
  { title: '预入仓库', dataIndex: 'receivingWarehouse', width: 100, ellipsis: true },
  { title: '来源', key: 'source', width: 100, ellipsis: true },
  { title: '来源单号', key: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const purchaseOrderColumns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', width: 140 },
  { title: '供应商', key: 'supplier', width: 140, ellipsis: true },
  { title: '采购项数', key: 'purchaseItemCount', width: 88, align: 'right' },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 88 },
  { title: '来源', key: 'source', width: 100, ellipsis: true },
  { title: '来源单号', key: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建日期', dataIndex: 'documentDate', width: 110 },
]

const purchaseReqScrollX = computed(() =>
  purchaseReqColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)
const purchaseOrderScrollX = computed(() =>
  purchaseOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function purchaseOrderQty(row) {
  if (row?.totalQty != null && row.totalQty !== '') return Number(row.totalQty) || 0
  return (row.lineItems || []).reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
}

function formatProcurementSource(row) {
  const raw = row?.source || row?.orderSource || ''
  return normalizeProcurementDocSource(raw) || '—'
}

function formatProcurementSourceOrderNo(row) {
  return row?.sourceOrderNo || row?.sourceWorkOrderNo || row?.salesOrderNo || row?.reqNo || '—'
}

function purchaseReqStatusColor(status) {
  const map = {
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseOrderStatusColor(status) {
  const map = {
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseInboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function goPurchaseReq(id) {
  if (!id) return
  const path = `/procurement/purchase-req/${id}`
  openTab({ path, title: '采购申请详情' })
  router.push(path)
}

function goPurchaseOrder(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-orders/${row.id}`
  openTab({ path, title: '采购订单详情' })
  router.push(path)
}
</script>

<style lang="less" scoped>
.wo-info-tab {
  .section-card + .section-card {
    margin-top: 16px;
  }
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
