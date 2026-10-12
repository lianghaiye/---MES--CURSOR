<template>
  <div class="finished-inbound-detail-page">
    <div class="detail-sticky-bar">
      <div class="page-header">
        <div class="header-left">
          <template v-if="record">
            <span class="order-no">{{ record.reqNo }}</span>
            <a-tag :color="modeColor(record.mode)">{{ record.modeLabel }}</a-tag>
            <a-tag :color="auditColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
            <a-badge :status="statusBadge(record.inboundStatus)" :text="record.inboundStatus" />
          </template>
          <span v-else class="order-no">成品入库申请详情</span>
        </div>
        <a-space :size="8">
          <template v-if="record?.auditStatus === FINISHED_INBOUND_AUDIT.PENDING">
            <a-button type="primary" size="small" @click="onApprove">审核通过</a-button>
            <a-button danger size="small" @click="onReject">审核驳回</a-button>
          </template>
          <a-button size="small" @click="goBack">返回列表</a-button>
        </a-space>
      </div>

      <div v-if="record" class="detail-tabs-wrap">
        <a-tabs
          v-model:active-key="activeTab"
          class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
        >
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="inbound" :tab="`入库信息 (${inboundRows.length})`" />
        </a-tabs>
      </div>
    </div>

    <template v-if="!record">
      <div class="tab-body">
        <a-empty description="申请单不存在或已删除" />
      </div>
    </template>

    <template v-else>
      <div class="tab-body">
        <template v-if="activeTab === 'basic'">
          <DetailSectionCard title="基本信息">
            <FinishedInboundBasicInfoSection :record="record" />
          </DetailSectionCard>

          <DetailSectionCard
            v-if="showWorkOrderSection"
            :title="`工单清单（${workOrderList.length}）`"
          >
            <a-table
              :columns="woColumns"
              :data-source="workOrderList"
              :row-key="(r) => r.id || r.code"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1100 }"
              :locale="{ emptyText: '暂无关联工单' }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'productCode'">{{
                  row.productCode || '—'
                }}</template>
                <template v-else-if="column.key === 'specModel'">{{
                  row.specModel || '—'
                }}</template>
                <template v-else-if="column.key === 'material'">{{ row.material || '—' }}</template>
                <template v-else-if="column.key === 'drawingNo'">{{
                  row.drawingNo || '—'
                }}</template>
                <template v-else-if="column.key === 'bom'">{{ row.bom || '—' }}</template>
                <template v-else-if="column.key === 'planQty'">{{ row.planQty ?? '—' }}</template>
              </template>
            </a-table>
          </DetailSectionCard>

          <DetailSectionCard :title="`入库明细（${record.lineCount || 0} 项）`">
            <a-table
              :columns="lineColumns"
              :data-source="record.lines || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1200 }"
              :locale="{ emptyText: '暂无入库明细' }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'qty'">
                  {{ line.qty ?? '—' }}{{ line.unit ? ` ${line.unit}` : '' }}
                </template>
                <template v-else-if="column.key === 'variantAttr'">
                  {{ line.variantSummary || '—' }}
                </template>
                <template v-else>
                  {{ line[column.dataIndex] || '—' }}
                </template>
              </template>
              <template #summary>
                <a-table-summary v-if="(record.lines || []).length">
                  <a-table-summary-row class="line-summary-row">
                    <a-table-summary-cell
                      v-for="(col, colIndex) in lineColumns"
                      :key="col.key"
                      :index="colIndex"
                      :align="col.align"
                    >
                      <template v-if="col.key === 'index'">合计</template>
                      <template v-else-if="col.key === 'qty'">{{ lineQtyTotal }}</template>
                    </a-table-summary-cell>
                  </a-table-summary-row>
                </a-table-summary>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>

        <template v-else-if="activeTab === 'inbound'">
          <DetailSectionCard title="入库信息">
            <a-table
              :columns="inboundColumns"
              :data-source="inboundRows"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: inboundScrollX }"
              :locale="{ emptyText: '暂无入库信息' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="inboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a
                    v-if="row.docId || row.docNo"
                    class="doc-link"
                    @click="goInbound({ id: row.docId, docNo: row.docNo })"
                  >
                    {{ row.docNo || '—' }}
                  </a>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'applyQty' || column.key === 'actualQty'">
                  {{ row[column.key] ?? '—' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'FinishedInboundDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import FinishedInboundBasicInfoSection from './components/FinishedInboundBasicInfoSection.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getMobileFinishedInboundById,
  refreshMobileFinishedInbounds,
  approveFinishedInboundApplication,
  rejectFinishedInboundApplication,
  FINISHED_INBOUND_MODES,
  FINISHED_INBOUND_AUDIT,
  mobileFinishedInboundState,
} from '@/store/mobileFinishedInboundStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { getWorkOrderPlanQty } from '@/utils/workOrderScheduleBatch'
import { flattenFinishedInboundDetailLines } from '@/utils/workOrderRelatedInfo'
import { inboundOrderState } from '@/store/inboundOrderStore'

const route = useRoute()
const router = useRouter()
const activeTab = ref('basic')

const record = computed(() => {
  void mobileFinishedInboundState.items
  return getMobileFinishedInboundById(String(route.params.id || ''))
})

const inboundRows = computed(() => {
  void inboundOrderState.orders
  void mobileFinishedInboundState.items
  return flattenFinishedInboundDetailLines(record.value)
})

const inboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '入库单号', key: 'docNo', width: 150 },
  { title: '产品名称', dataIndex: 'itemName', width: 150, ellipsis: true },
  { title: '编号', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '申请入库数量', key: 'applyQty', width: 110, align: 'right' },
  { title: '实际入库数量', key: 'actualQty', width: 110, align: 'right' },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110, ellipsis: true },
  { title: '入库时间', dataIndex: 'inboundAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
]

const inboundScrollX = computed(() =>
  inboundColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function findLinkedWorkOrder(row = {}) {
  const id = row.id
  const code = row.code
  return (
    workOrderState.orders.find((o) => (id && o.id === id) || (code && o.code === code)) ||
    assemblyWorkOrderState.orders.find((o) => (id && o.id === id) || (code && o.code === code)) ||
    null
  )
}

function enrichWorkOrderRow(row = {}) {
  const wo = findLinkedWorkOrder(row)
  const planQty =
    row.planQty != null && row.planQty !== ''
      ? row.planQty
      : wo
        ? getWorkOrderPlanQty(wo) || wo.scheduleQty
        : row.scheduleQty
  return {
    ...row,
    id: row.id || row.workOrderId || wo?.id || '',
    code: row.code || row.workOrderCode || wo?.code || '',
    productName: row.productName || wo?.productName || '—',
    productCode: row.productCode || wo?.productCode || wo?.materialCode || '',
    specModel: row.specModel || wo?.specModel || wo?.productSpec || '',
    material: row.material || wo?.material || '',
    drawingNo: row.drawingNo || wo?.drawingNo || '',
    bom: row.bom || wo?.bomLabel || wo?.bom || '',
    planQty,
  }
}

const workOrderList = computed(() => {
  const row = record.value
  if (!row) return []
  const map = new Map()
  const pushRow = (raw) => {
    const enriched = enrichWorkOrderRow(raw)
    const key = enriched.id || enriched.code
    if (!key) return
    if (!map.has(key)) map.set(key, enriched)
  }

  const list = Array.isArray(row.workOrders) ? row.workOrders : []
  list.forEach((w) =>
    pushRow({
      id: w.id || w.workOrderId,
      code: w.code || w.workOrderCode,
      productName: w.productName,
      productCode: w.productCode,
      specModel: w.specModel,
      material: w.material,
      drawingNo: w.drawingNo,
      bom: w.bom,
      planQty: w.planQty ?? w.scheduleQty,
      scheduleQty: w.scheduleQty,
    }),
  )

  if (row.workOrderCode || row.workOrderId) {
    pushRow({
      id: row.workOrderId,
      code: row.workOrderCode,
      productName: row.productName || row.workOrderName,
      productCode: row.lines?.[0]?.itemCode,
      specModel: row.lines?.[0]?.specModel,
      material: row.lines?.[0]?.material,
      drawingNo: row.lines?.[0]?.drawingNo,
      planQty: row.planQty ?? row.scheduleQty,
      scheduleQty: row.scheduleQty,
    })
  }

  ;(row.workOrderIds || []).forEach((id) => {
    if (!id) return
    pushRow({ id })
  })
  ;(row.lines || []).forEach((line) => {
    if (!line.sourceWorkOrderCode && !line.sourceWorkOrderId) return
    pushRow({
      id: line.sourceWorkOrderId,
      code: line.sourceWorkOrderCode,
      productName: line.itemName,
      productCode: line.itemCode,
      specModel: line.specModel,
      material: line.material,
      drawingNo: line.drawingNo,
      planQty: line.qty,
    })
  })

  return [...map.values()]
})

const showWorkOrderSection = computed(() => {
  const row = record.value
  if (!row) return false
  if (workOrderList.value.length) return true
  return row.mode === FINISHED_INBOUND_MODES.WORK_ORDER || row.mode === FINISHED_INBOUND_MODES.BATCH
})

const woColumns = [
  { title: '工单号', dataIndex: 'code', key: 'code', width: 150 },
  { title: '产品', dataIndex: 'productName', key: 'productName', width: 140, ellipsis: true },
  { title: '编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', width: 90, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 110, ellipsis: true },
  { title: '关联BOM', key: 'bom', width: 140, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
]

const lineColumns = [
  { title: '序号', key: 'index', width: 60 },
  { title: '产品编码', dataIndex: 'itemCode', key: 'itemCode', width: 140 },
  { title: '产品名称', dataIndex: 'itemName', key: 'itemName', width: 180 },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 140 },
  { title: '材质', dataIndex: 'material', key: 'material', width: 100 },
  { title: '变体属性', key: 'variantAttr', width: 140 },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 120 },
  { title: '入库数量', key: 'qty', width: 110 },
  { title: '入库仓库', dataIndex: 'warehouse', key: 'warehouse', width: 120 },
  { title: '来源工单', dataIndex: 'sourceWorkOrderCode', key: 'sourceWorkOrderCode', width: 160 },
]

const lineQtyTotal = computed(() =>
  (record.value?.lines || []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

onMounted(() => {
  refreshMobileFinishedInbounds()
})

function goBack() {
  router.push('/production/finished-inbound')
}

function goInbound(link) {
  if (!link?.id) {
    message.info('暂无关联入库单详情')
    return
  }
  router.push(`/inventory/inbound/${link.id}`)
}

function onApprove() {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过申请单 ${record.value.reqNo}？通过后将生成成品入库单。`,
    onOk() {
      const res = approveFinishedInboundApplication(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      const nos = res.record.inboundDocNo || ''
      message.success(nos ? `已通过，入库单 ${nos}` : '已通过')
      refreshMobileFinishedInbounds()
      activeTab.value = 'inbound'
    },
  })
}

function onReject() {
  Modal.confirm({
    title: '审核驳回',
    content: `确认驳回申请单 ${record.value.reqNo}？`,
    okType: 'danger',
    onOk() {
      const res = rejectFinishedInboundApplication(record.value.id, '')
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已驳回')
      refreshMobileFinishedInbounds()
    },
  })
}

function modeColor(mode) {
  if (mode === FINISHED_INBOUND_MODES.QUICK) return 'purple'
  if (mode === FINISHED_INBOUND_MODES.BATCH) return 'blue'
  return 'cyan'
}

function auditColor(status) {
  if (status === FINISHED_INBOUND_AUDIT.APPROVED) return 'success'
  if (status === FINISHED_INBOUND_AUDIT.REJECTED) return 'error'
  return 'warning'
}

function statusBadge(status) {
  const map = {
    待入库: 'processing',
    部分入库: 'warning',
    已入库: 'success',
    已完成: 'success',
    已拒绝: 'error',
    多单进行中: 'processing',
  }
  return map[status] || 'default'
}

function inboundStatusColor(status) {
  if (status === '已入库' || status === '已完成' || status === '已确认') return 'success'
  if (status === '已拒绝' || status === '拒绝入库') return 'error'
  if (status === '部分入库') return 'warning'
  if (status === '待入库') return 'processing'
  return 'default'
}
</script>

<style lang="less" scoped>
.finished-inbound-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.doc-link {
  color: #1677ff;
  cursor: pointer;
}

.line-summary-row {
  font-weight: 600;
}
</style>
