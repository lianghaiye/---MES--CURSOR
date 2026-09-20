<template>
  <div class="transfer-detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.docNo }}</span>
              <a-tag :color="transferStatusColor(record.status)">{{ record.status }}</a-tag>
              <span class="sub">{{ transferSourceLabel(record.sourceChannel) }}</span>
            </div>
            <a-space :size="8">
              <a-button
                v-if="canConfirmTransfer(record)"
                type="primary"
                size="small"
                @click="handleConfirm"
              >
                确认调拨
              </a-button>
              <a-button v-if="canVoidTransfer(record)" size="small" danger @click="openVoid">
                作废
              </a-button>
              <a-button v-if="canEditTransfer(record)" size="small" @click="openEdit"
                >编辑</a-button
              >
              <a-button size="small" @click="goBack">返回列表</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="infoTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="basic" tab="基本信息" />
              <a-tab-pane key="related" :tab="`关联单据 (${relatedDocs.length})`" />
              <a-tab-pane key="logs" :tab="`操作日志 (${operationLogs.length})`" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="infoTab === 'basic'">
            <DetailSectionCard title="基本信息">
              <TransferOrderBasicInfoSection :record="record" />
            </DetailSectionCard>

            <DetailSectionCard :title="`调拨清单（${displayLines.length}）`">
              <a-table
                :columns="displayColumns"
                :data-source="displayLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1280 }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'ownership'">
                    <a-tag :color="isDedicatedLine(line) ? 'orange' : 'blue'">
                      {{ isDedicatedLine(line) ? '按单' : '自由' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'stockQty'">
                    {{ formatStockQty(line) }}
                  </template>
                  <template v-else-if="column.key === 'qty'">
                    {{ formatLineQty(line.qty, line.unit) }}
                  </template>
                  <template v-else-if="column.key === 'salesOrderNo'">
                    {{ isDedicatedLine(line) ? line.salesOrderNo || '—' : '—' }}
                  </template>
                  <template v-else>
                    {{ displayCell(line[column.dataIndex]) }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'related'">
            <DetailSectionCard title="关联单据">
              <a-table
                v-if="relatedDocs.length"
                :columns="relatedColumns"
                :data-source="relatedDocs"
                row-key="key"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1100 }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'docNo'">
                    <a class="link-code" @click="goRelated(row)">{{ row.docNo }}</a>
                  </template>
                  <template v-else-if="column.key === 'docType'">
                    <a-tag :color="row.docType === '调拨入库' ? 'green' : 'orange'">
                      {{ row.docType }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'qtySummary'">
                    {{ row.qtySummary }}
                  </template>
                  <template v-else>
                    {{ displayCell(row[column.dataIndex]) }}
                  </template>
                </template>
              </a-table>
              <a-empty v-else description="暂无关联出入库单据" />
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'logs'">
            <div class="section-card">
              <a-table
                :columns="logColumns"
                :data-source="operationLogs"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无操作日志' }"
              />
            </div>
          </template>
        </div>
      </template>
      <a-empty v-else description="未找到调拨单" />
    </a-spin>

    <InventoryDocRefuseModal
      v-model:open="voidModalOpen"
      action-type="void"
      doc-label="调拨"
      :doc-nos="[record?.docNo].filter(Boolean)"
      @confirm="onVoidConfirm"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { transferStatusColor, transferSourceLabel } from '@/mock/transferOptions'
import {
  transferOrderState,
  getTransferOrderById,
  canEditTransfer,
  canConfirmTransfer,
  canVoidTransfer,
  confirmTransfer,
  voidTransfer,
} from '@/store/transferOrderStore'
import { getInboundOrderById, inboundOrderState } from '@/store/inboundOrderStore'
import { getOutboundOrderById, outboundState } from '@/store/outboundStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'
import TransferOrderBasicInfoSection from './components/TransferOrderBasicInfoSection.vue'
import {
  isDedicatedInventoryLine,
  sortInventoryLinesByItemCode,
  buildItemCodeRowSpans,
  withProductMergeColumns,
} from '@/utils/inventoryLineMerge'

defineOptions({ name: 'TransferOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const voidModalOpen = ref(false)
const infoTab = ref('basic')

const record = computed(() => {
  void transferOrderState.orders
  return getTransferOrderById(route.params.id)
})

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '归属', key: 'ownership', width: 72, align: 'center' },
  { title: '产品名称', key: 'itemName', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', key: 'itemCode', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantSummary',
    dataIndex: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '当前库存数量', key: 'stockQty', width: 120, align: 'right' },
  { title: '调拨数量', key: 'qty', width: 120, align: 'right' },
  { title: '销售单号', key: 'salesOrderNo', width: 140, ellipsis: true },
]

const displayLines = computed(() => sortInventoryLinesByItemCode(record.value?.lineItems || []))
const lineRowSpans = computed(() => buildItemCodeRowSpans(displayLines.value))
const displayColumns = computed(() => withProductMergeColumns(lineColumns, lineRowSpans.value))

const relatedColumns = [
  { title: '单据类型', key: 'docType', width: 110 },
  { title: '单据编号', key: 'docNo', width: 180 },
  { title: '仓库', dataIndex: 'warehouse', width: 120, ellipsis: true },
  { title: '数量', key: 'qtySummary', width: 160 },
  { title: '单据日期', dataIndex: 'docDate', width: 170 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
]

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const operationLogs = computed(() => record.value?.operationLogs || [])

function resolveLineUnit(lines = []) {
  const units = [
    ...new Set(lines.map((l) => String(l.unit || l.stockUnit || '').trim()).filter(Boolean)),
  ]
  return units.length === 1 ? units[0] : ''
}

function formatRelatedQtySummary(order, qtyField = 'qty') {
  const lines = order?.lineItems || []
  const itemCount = lines.length
  const total = lines.reduce((s, l) => s + (Number(l[qtyField] ?? l.qty ?? l.shipQty) || 0), 0)
  const unit = resolveLineUnit(lines)
  const qtyText = unit ? formatQtyWithUnit(total, unit) : formatQty(total)
  return `${qtyText} / ${itemCount}`
}

const relatedDocs = computed(() => {
  void inboundOrderState.orders
  void outboundState.orders
  const r = record.value
  if (!r) return []
  const rows = []
  ;(r.linkedOutboundIds || []).forEach((id, i) => {
    const order = getOutboundOrderById(id)
    const docNo = order?.docNo || r.linkedOutboundDocNos?.[i] || id
    rows.push({
      key: `out-${id}`,
      id,
      docNo,
      docType: '调拨出库',
      warehouse: order?.warehouse || r.fromWarehouse || '—',
      qtySummary: order ? formatRelatedQtySummary(order, 'shipQty') : '—',
      docDate: order?.auditDate || order?.outboundTime || order?.completedAt || '—',
      creator: order?.creator || '—',
      createdAt: order?.createdAt || '—',
      path: `/inventory/outbound/${id}`,
    })
  })
  ;(r.linkedInboundIds || []).forEach((id, i) => {
    const order = getInboundOrderById(id)
    const docNo = order?.docNo || r.linkedInboundDocNos?.[i] || id
    rows.push({
      key: `in-${id}`,
      id,
      docNo,
      docType: '调拨入库',
      warehouse: order?.warehouse || r.toWarehouse || '—',
      qtySummary: order ? formatRelatedQtySummary(order, 'qty') : '—',
      docDate: order?.confirmedAt || order?.inboundDate || '—',
      creator: order?.creator || '—',
      createdAt: order?.createdAt || '—',
      path: `/inventory/inbound/${id}`,
    })
  })
  return rows
})

function isDedicatedLine(line) {
  return isDedicatedInventoryLine(line)
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function formatLineQty(qty, unit) {
  if (qty == null || qty === '') return '—'
  const n = Number(qty)
  const q = Number.isFinite(n) ? n : qty
  const u = String(unit || '').trim()
  return u ? `${q} ${u}` : String(q)
}

function formatStockQty(line) {
  const qty = line?.bookQty
  if (qty == null || qty === '') return formatLineQty(line?.qty, line?.unit)
  return formatLineQty(qty, line?.unit)
}

function goBack() {
  router.push('/inventory/transfer')
}

function openEdit() {
  if (!record.value) return
  openCreateTab(router, openTab, {
    path: `/inventory/transfer/${record.value.id}/edit`,
    title: `编辑调拨单 ${record.value.docNo || ''}`.trim(),
  })
}

function goRelated(row) {
  openTab(row.path, row.docNo || '关联单据')
  router.push(row.path)
}

function handleConfirm() {
  Modal.confirm({
    title: `确认调拨 ${record.value.docNo}？`,
    content: '将软锁定调出仓库存并生成调拨出库；按配置决定是否需入库方签收。',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      const { count, blocked } = confirmTransfer([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认调拨')
    },
  })
}

function openVoid() {
  voidModalOpen.value = true
}

function onVoidConfirm(reason) {
  const { count, blocked } = voidTransfer([record.value.id], { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success('已作废')
    voidModalOpen.value = false
  }
}
</script>

<style lang="less" scoped>
.transfer-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: #f5f6f8;
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

.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
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

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
