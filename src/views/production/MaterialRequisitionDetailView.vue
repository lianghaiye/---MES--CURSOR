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

    <div class="page-body">
      <a-empty v-if="!record" description="申请单不存在或已删除" />

      <template v-else>
        <div class="section-card">
          <div class="section-title">申请信息</div>
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="申请单号">{{ record.reqNo }}</a-descriptions-item>
            <a-descriptions-item label="申请状态">
              <a-tag :color="auditColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="领料方式">{{ record.modeLabel }}</a-descriptions-item>
            <a-descriptions-item label="申请人">{{ record.applicant || '—' }}</a-descriptions-item>
            <a-descriptions-item label="关联工单">
              {{ relatedWorkOrderText(record) }}
            </a-descriptions-item>
            <a-descriptions-item label="产品/摘要">
              {{ relatedProductText(record) }}
            </a-descriptions-item>
            <a-descriptions-item label="销售订单">
              {{
                record.salesOrderNo && record.salesOrderNo !== 'MULTI' ? record.salesOrderNo : '—'
              }}
            </a-descriptions-item>
            <a-descriptions-item label="领用车间">{{ record.workshop || '—' }}</a-descriptions-item>
            <a-descriptions-item label="领入仓库">
              {{ record.receiveWarehouse || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="申请时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="出库单号">
              <a v-if="record.outboundDocNo" @click="goOutbound">{{ record.outboundDocNo }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="出库状态">{{ record.outboundStatus }}</a-descriptions-item>
            <a-descriptions-item label="合计数量">
              {{ record.lineCount || 0 }} 行 / {{ record.totalQty || 0 }}
            </a-descriptions-item>
            <a-descriptions-item v-if="record.rejectReason" label="驳回原因" :span="3">
              {{ record.rejectReason }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">
              {{ record.remark || '—' }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div
          v-if="record.mode === MATERIAL_REQ_MODES.BATCH && record.workOrders?.length"
          class="section-card"
        >
          <div class="section-title">工单清单（{{ record.workOrders.length }}）</div>
          <a-table
            :columns="woColumns"
            :data-source="record.workOrders"
            :row-key="(r) => r.id || r.code"
            size="small"
            bordered
            :pagination="false"
          />
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
            当前申请待审核。审核通过后将自动生成领料出库单（状态为「待出库」，仓管直接确认出库）。
          </template>
          <template v-else-if="record.auditStatus === MATERIAL_REQ_AUDIT.REJECTED">
            申请已驳回，未生成出库单。
          </template>
          <template v-else>审核已通过。关联出库单可在「出库管理」中继续处理。</template>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
export default { name: 'MaterialRequisitionDetailView' }
</script>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getMobileMaterialReqById,
  refreshMobileMaterialReqs,
  relatedWorkOrderText,
  relatedProductText,
  approveMaterialRequisition,
  rejectMaterialRequisition,
  MATERIAL_REQ_MODES,
  MATERIAL_REQ_AUDIT,
} from '@/store/mobileMaterialReqStore'
import { lineVariantSummary } from '@/utils/spuLineResolve'

const route = useRoute()
const router = useRouter()

const record = computed(() => getMobileMaterialReqById(String(route.params.id || '')))

const woColumns = [
  { title: '工单号', dataIndex: 'code', key: 'code', width: 180 },
  { title: '产品', dataIndex: 'productName', key: 'productName' },
  { title: '计划数量', dataIndex: 'scheduleQty', key: 'scheduleQty', width: 100, align: 'right' },
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

function goOutbound() {
  if (!record.value?.outboundId) return
  router.push(`/inventory/outbound/${record.value.outboundId}`)
}

function onApprove() {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过申请单 ${record.value.reqNo}？通过后将生成领料出库单。`,
    onOk() {
      const res = approveMaterialRequisition(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(`已通过，出库单 ${res.record.outboundDocNo || ''}`)
      refreshMobileMaterialReqs()
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

.page-body {
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
