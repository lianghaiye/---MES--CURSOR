<template>
  <div class="material-req-detail-page">
    <div class="page-header">
      <div class="header-left">
        <template v-if="record">
          <span class="page-title">{{ record.reqNo }}</span>
          <a-tag :color="modeColor(record.mode)">{{ record.modeLabel }}</a-tag>
          <a-tag :color="auditColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
          <a-badge :status="statusBadge(record.outboundStatus)" :text="record.outboundStatus" />
        </template>
        <span v-else class="page-title">领料申请详情</span>
      </div>
      <a-space :size="8">
        <template v-if="record?.auditStatus === MATERIAL_REQ_AUDIT.PENDING">
          <a-button type="primary" size="small" @click="onApprove">审核通过</a-button>
          <a-button danger size="small" @click="onReject">审核驳回</a-button>
        </template>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <template v-if="!record">
      <div class="page-body">
        <a-empty description="申请单不存在或已删除" />
      </div>
    </template>

    <template v-else>
      <div class="detail-tabs-wrap">
        <a-tabs
          v-model:active-key="activeTab"
          class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
        >
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="outbound" :tab="`出库信息 (${outboundRows.length})`" />
        </a-tabs>
      </div>

      <div class="tab-body">
        <template v-if="activeTab === 'basic'">
          <div class="section-card">
            <div class="section-title">基本信息</div>
            <MaterialRequisitionBasicInfoSection :record="record" />
          </div>

          <div v-if="workOrderList.length" class="section-card">
            <div class="section-title">工单清单（{{ workOrderList.length }}）</div>
            <a-table
              :columns="woColumns"
              :data-source="workOrderList"
              :row-key="(r) => r.id || r.code"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1100 }"
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
          </div>

          <div class="section-card">
            <div class="section-title">
              领料明细（{{ record.lineCount || 0 }} 项 / 合计 {{ record.totalQty || 0 }}）
            </div>
            <a-table
              :columns="lineColumns"
              :data-source="record.lines || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1400 }"
              :locale="{ emptyText: '暂无领料明细' }"
            >
              <template #bodyCell="{ column, record: line }">
                <template v-if="column.key === 'material'">
                  {{ line.material || '—' }}
                </template>
                <template v-else-if="column.key === 'variantAttr'">
                  {{ lineVariantSummary(line) || line.variantSummary || '—' }}
                </template>
                <template v-else-if="column.key === 'drawingNo'">
                  {{ line.drawingNo || '—' }}
                </template>
                <template v-else-if="column.key === 'blankSizeText'">
                  <template v-if="line.blankSizeText">
                    {{ line.blankSizeText }}
                    <div v-if="line.blankArea > 0" class="blank-size-hint">
                      ≈ {{ line.blankArea }}㎡/件
                    </div>
                    <div v-else-if="line.blankLength > 0" class="blank-size-hint">
                      ≈ {{ line.blankLength }}米/件
                    </div>
                  </template>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'source'">
                  <template v-if="line.sourceWorkOrders?.length">
                    <a-tag
                      v-for="source in line.sourceWorkOrders"
                      :key="source.workOrderId || source.workOrderCode"
                      color="blue"
                    >
                      {{ source.workOrderCode }} ×{{ source.qty }}
                    </a-tag>
                  </template>
                  <span v-else>{{ line.lineSource === 'EBOM' ? '工单 EBOM' : '手工添加' }}</span>
                </template>
              </template>
            </a-table>
          </div>

          <div class="tip-card">
            <template v-if="record.auditStatus === MATERIAL_REQ_AUDIT.PENDING">
              当前申请待审核。审核通过后将按领料仓库自动生成领料出库单（一仓一张；状态为「待出库」，仓管直接确认出库）。
            </template>
            <template v-else-if="record.auditStatus === MATERIAL_REQ_AUDIT.REJECTED">
              申请已驳回，未生成出库单。
            </template>
            <template
              v-else-if="record.outboundStatus === '拒绝领料' || record.outboundStatus === '已拒绝'"
            >
              关联出库单已拒绝出库，出库状态已回写为本申请单。
            </template>
            <template v-else
              >审核已通过。关联出库单可在「出库信息」或「出库管理」中继续处理。</template
            >
          </div>
        </template>

        <template v-else-if="activeTab === 'outbound'">
          <div class="section-card">
            <div class="section-title">出库信息</div>
            <a-table
              :columns="outboundColumns"
              :data-source="outboundRows"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: outboundTableScrollX }"
              :locale="{ emptyText: '暂无出库信息' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'outboundOrderNo'">
                  <a
                    v-if="row.outboundId || row.outboundOrderNo"
                    class="doc-link"
                    @click="goOutbound({ id: row.outboundId, docNo: row.outboundOrderNo })"
                  >
                    {{ row.outboundOrderNo || '—' }}
                  </a>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'applyQty'">
                  {{ formatQty(row.applyQty) }}
                </template>
                <template v-else-if="column.key === 'actualQty'">
                  {{ formatQty(row.actualQty) }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'MaterialRequisitionDetailView' }
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getMobileMaterialReqById,
  refreshMobileMaterialReqs,
  approveMaterialRequisition,
  rejectMaterialRequisition,
  MATERIAL_REQ_MODES,
  MATERIAL_REQ_AUDIT,
} from '@/store/mobileMaterialReqStore'
import { outboundState } from '@/store/outboundStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { getWorkOrderPlanQty } from '@/utils/workOrderScheduleBatch'
import { lineVariantSummary } from '@/utils/spuLineResolve'
import { flattenMaterialReqOutboundLines } from '@/utils/materialReqOutboundLines'
import {
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import { formatQty } from '@/utils/numberFormat'
import MaterialRequisitionBasicInfoSection from './components/MaterialRequisitionBasicInfoSection.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref('basic')

const record = computed(() => getMobileMaterialReqById(String(route.params.id || '')))

const outboundRows = computed(() => {
  void outboundState.orders
  return flattenMaterialReqOutboundLines(record.value)
})

const outboundColumns = createOutboundIssueLineColumns()
const outboundTableScrollX = getOutboundIssueLineScrollX(outboundColumns)

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
  const list = Array.isArray(row.workOrders) ? row.workOrders : []
  if (list.length) return list.map(enrichWorkOrderRow)
  if (row.workOrderCode || row.workOrderId) {
    return [
      enrichWorkOrderRow({
        id: row.workOrderId,
        code: row.workOrderCode,
        productName: row.productName,
        productCode: row.productCode,
        specModel: row.specModel,
        material: row.material,
        drawingNo: row.drawingNo,
        bom: row.bom,
        planQty: row.planQty ?? row.scheduleQty,
        scheduleQty: row.scheduleQty,
      }),
    ]
  }
  return []
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
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 150 },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110 },
  { title: '材质', key: 'material', width: 90 },
  { title: '变体属性', key: 'variantAttr', width: 140, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 110 },
  { title: '下料尺寸', key: 'blankSizeText', width: 160, ellipsis: true },
  { title: '领料数量', dataIndex: 'shipQty', key: 'shipQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
  { title: '领料仓库', dataIndex: 'shipWarehouse', key: 'shipWarehouse', width: 110 },
  {
    title: '库存',
    dataIndex: 'warehouseStockQty',
    key: 'warehouseStockQty',
    width: 80,
    align: 'right',
  },
  { title: '来源', key: 'source', width: 200 },
]

onMounted(() => {
  refreshMobileMaterialReqs()
})

function goBack() {
  router.push('/production/material-requisition')
}

function goOutbound(link) {
  if (!link?.id) {
    message.info('暂无关联出库单详情')
    return
  }
  router.push(`/inventory/outbound/${link.id}`)
}

function onApprove() {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过申请单 ${record.value.reqNo}？通过后将按仓库生成领料出库单。`,
    onOk() {
      const res = approveMaterialRequisition(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      const nos = res.record.outboundDocNo || ''
      message.success(nos ? `已通过，出库单 ${nos}` : '已通过')
      refreshMobileMaterialReqs()
      activeTab.value = 'outbound'
    },
  })
}

function onReject() {
  Modal.confirm({
    title: '审核驳回',
    content: `确认驳回申请单 ${record.value.reqNo}？`,
    okType: 'danger',
    onOk() {
      const res = rejectMaterialRequisition(record.value.id, '')
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已驳回')
      refreshMobileMaterialReqs()
    },
  })
}

function modeColor(mode) {
  if (mode === MATERIAL_REQ_MODES.QUICK) return 'purple'
  if (mode === MATERIAL_REQ_MODES.BATCH) return 'blue'
  return 'cyan'
}

function auditColor(status) {
  if (status === MATERIAL_REQ_AUDIT.APPROVED) return 'success'
  if (status === MATERIAL_REQ_AUDIT.REJECTED) return 'error'
  return 'warning'
}

function statusBadge(status) {
  const map = {
    待处理: 'warning',
    待出库: 'processing',
    已出库: 'success',
    已拒绝: 'error',
    拒绝领料: 'error',
    多单进行中: 'processing',
  }
  return map[status] || 'default'
}
</script>

<style lang="less" scoped>
.material-req-detail-page {
  margin: -12px;
  height: calc(100vh - 56px - 40px - 24px);
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  z-index: 30;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-body,
.tab-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.doc-link {
  color: #1677ff;
  cursor: pointer;
}

.tip-card {
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 8px;
  padding: 12px 16px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.blank-size-hint {
  margin-top: 2px;
  font-size: 11px;
  color: #d46b08;
  line-height: 1.25;
}
</style>
