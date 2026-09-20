<template>
  <div class="stocktake-detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.docNo }}</span>
              <a-tag :color="stocktakeStatusColor(record.status)">{{ record.status }}</a-tag>
              <a-tag v-if="postingTag" :color="postingTag.color">{{ postingTag.text }}</a-tag>
              <span class="sub">{{ stocktakeSourceLabel(record.sourceChannel) }}</span>
            </div>
            <a-space :size="8">
              <a-button
                v-if="canSubmitStocktake(record)"
                type="primary"
                size="small"
                @click="handleSubmit"
              >
                提交
              </a-button>
              <a-button
                v-if="canApproveStocktake(record)"
                type="primary"
                size="small"
                @click="handleApprove"
              >
                审核通过
              </a-button>
              <a-button v-if="canRefuseStocktake(record)" size="small" danger @click="openRefuse">
                拒绝
              </a-button>
              <a-button v-if="canWithdrawStocktake(record)" size="small" @click="handleWithdraw">
                撤回
              </a-button>
              <a-button
                v-if="canPostStocktake(record)"
                type="primary"
                size="small"
                @click="handlePost"
              >
                {{
                  record.postingStatus === 'failed'
                    ? '重新过账'
                    : record.postingStatus === 'partial'
                      ? '继续过账'
                      : '生成盘盈盘亏'
                }}
              </a-button>
              <a-button v-if="canEditStocktake(record)" size="small" @click="openEdit"
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
          <a-alert
            v-if="record.postingStatus === 'failed' && record.postingError"
            type="error"
            show-icon
            class="posting-alert"
            :message="`过账失败：${record.postingError}`"
          />

          <template v-if="infoTab === 'basic'">
            <DetailSectionCard title="基本信息">
              <StocktakeOrderBasicInfoSection :record="record" />
            </DetailSectionCard>

            <DetailSectionCard :title="`盘点清单（${displayLines.length}）`">
              <a-table
                :columns="displayColumns"
                :data-source="displayLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1400 }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'ownership'">
                    <a-tag :color="isDedicated(line) ? 'orange' : 'blue'">
                      {{ isDedicated(line) ? '按单' : '自由' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'bookQty'">
                    {{ formatBookQty(line) }}
                  </template>
                  <template v-else-if="column.key === 'diffQty'">
                    <span :class="{ pos: line.diffQty > 0, neg: line.diffQty < 0 }">{{
                      line.diffQty
                    }}</span>
                  </template>
                  <template v-else-if="column.key === 'salesOrderNo'">
                    {{ isDedicated(line) ? line.salesOrderNo || '—' : '—' }}
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
                    <a-tag :color="row.docType === '盘点入库' ? 'green' : 'orange'">
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
      <a-empty v-else description="未找到盘点单" />
    </a-spin>

    <InventoryDocRefuseModal
      v-model:open="refuseModalOpen"
      doc-label="盘点"
      :doc-nos="[record?.docNo].filter(Boolean)"
      @confirm="onRefuseConfirm"
    />

    <StocktakePostModeModal
      v-model:open="postModeModalOpen"
      :title="postModeModalTitle"
      :hint="postModeModalHint"
      @confirm="onPostModeConfirm"
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
import {
  STOCKTAKE_POSTING,
  stocktakeStatusColor,
  stocktakeSourceLabel,
  stocktakePostingLabel,
  stocktakePostingColor,
} from '@/mock/stocktakeOptions'
import {
  stocktakeOrderState,
  getStocktakeOrderById,
  canEditStocktake,
  canSubmitStocktake,
  canApproveStocktake,
  canPostStocktake,
  canRefuseStocktake,
  canWithdrawStocktake,
  submitStocktake,
  approveStocktake,
  postStocktake,
  refuseStocktake,
  withdrawStocktake,
} from '@/store/stocktakeOrderStore'
import { getInboundOrderById, inboundOrderState } from '@/store/inboundOrderStore'
import { getOutboundOrderById, outboundState } from '@/store/outboundStore'
import { isStocktakeAutoPostOnApprove } from '@/store/stocktakeSettingsStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'
import StocktakePostModeModal from './components/StocktakePostModeModal.vue'
import StocktakeOrderBasicInfoSection from './components/StocktakeOrderBasicInfoSection.vue'
import {
  isDedicatedInventoryLine,
  sortInventoryLinesByItemCode,
  buildItemCodeRowSpans,
  withProductMergeColumns,
} from '@/utils/inventoryLineMerge'

defineOptions({ name: 'StocktakeOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const refuseModalOpen = ref(false)
const postModeModalOpen = ref(false)
const postModeModalTitle = ref('生成盘盈盘亏')
const postModeModalHint = ref('请选择本次要生成的单据范围。')
const infoTab = ref('basic')

const record = computed(() => {
  void stocktakeOrderState.orders
  return getStocktakeOrderById(route.params.id)
})

const postingTag = computed(() => {
  const r = record.value
  if (!r) return null
  const label = stocktakePostingLabel(r.postingStatus)
  if (!label) return null
  return { text: label, color: stocktakePostingColor(r.postingStatus) }
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
  { title: '当前账面数量', key: 'bookQty', width: 120, align: 'right' },
  { title: '实盘', dataIndex: 'actualQty', width: 100, align: 'right' },
  { title: '差异', key: 'diffQty', width: 88, align: 'right' },
  { title: '销售单号', key: 'salesOrderNo', width: 140, ellipsis: true },
]

const displayLines = computed(() => sortInventoryLinesByItemCode(record.value?.lineItems || []))
const lineRowSpans = computed(() => buildItemCodeRowSpans(displayLines.value))
const displayColumns = computed(() => withProductMergeColumns(lineColumns, lineRowSpans.value))

const relatedColumns = [
  { title: '单据类型', key: 'docType', width: 110 },
  { title: '单据编号', key: 'docNo', width: 180 },
  { title: '盘点仓库', dataIndex: 'warehouse', width: 120, ellipsis: true },
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
  ;(r.linkedInboundIds || []).forEach((id, i) => {
    const order = getInboundOrderById(id)
    const docNo = order?.docNo || r.linkedInboundDocNos?.[i] || id
    rows.push({
      key: `in-${id}`,
      id,
      docNo,
      docType: '盘点入库',
      warehouse: order?.warehouse || r.warehouse || '—',
      qtySummary: order ? formatRelatedQtySummary(order, 'qty') : '—',
      docDate: order?.confirmedAt || order?.inboundDate || '—',
      creator: order?.creator || '—',
      createdAt: order?.createdAt || '—',
      path: `/inventory/inbound/${id}`,
    })
  })
  ;(r.linkedOutboundIds || []).forEach((id, i) => {
    const order = getOutboundOrderById(id)
    const docNo = order?.docNo || r.linkedOutboundDocNos?.[i] || id
    rows.push({
      key: `out-${id}`,
      id,
      docNo,
      docType: '盘点出库',
      warehouse: order?.warehouse || r.warehouse || '—',
      qtySummary: order ? formatRelatedQtySummary(order, 'shipQty') : '—',
      docDate: order?.auditDate || order?.outboundTime || order?.completedAt || '—',
      creator: order?.creator || '—',
      createdAt: order?.createdAt || '—',
      path: `/inventory/outbound/${id}`,
    })
  })
  return rows
})

function isDedicated(line) {
  return isDedicatedInventoryLine(line)
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function formatBookQty(line) {
  const qty = line?.bookQty
  if (qty == null || qty === '') return '—'
  const n = Number(qty)
  const q = Number.isFinite(n) ? n : qty
  const unit = String(line?.unit || '').trim()
  return unit ? `${q} ${unit}` : String(q)
}

function goBack() {
  router.push('/inventory/stocktake')
}

function openEdit() {
  if (!record.value) return
  openCreateTab(router, openTab, {
    path: `/inventory/stocktake/${record.value.id}/edit`,
    title: `编辑盘点单 ${record.value.docNo || ''}`.trim(),
  })
}

function goRelated(row) {
  openTab(row.path, row.docNo || '关联单据')
  router.push(row.path)
}

function handleSubmit() {
  Modal.confirm({
    title: `提交盘点单 ${record.value.docNo}？`,
    content: '提交后进入待审核，可审核、拒绝或撤回。',
    onOk: () => {
      const { count, blocked } = submitStocktake([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已提交')
    },
  })
}

function handleWithdraw() {
  Modal.confirm({
    title: `撤回盘点单 ${record.value.docNo}？`,
    content: '撤回后回到待提交，可继续编辑。',
    onOk: () => {
      const { count, blocked } = withdrawStocktake([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已撤回')
    },
  })
}

function handleApprove() {
  Modal.confirm({
    title: `审核通过 ${record.value.docNo}？`,
    content: isStocktakeAutoPostOnApprove()
      ? '将审核通过，并按配置自动生成盘盈入库 / 盘亏出库。'
      : '将审核通过；需手动点击「生成盘盈盘亏」过账。',
    onOk: () => {
      const { count, blocked, posted } = approveStocktake([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) {
        message.success(posted?.length ? '审核通过并已过账' : '审核通过')
      }
    },
  })
}

function handlePost() {
  if (!record.value) return
  const isRetry = record.value.postingStatus === STOCKTAKE_POSTING.FAILED
  const isPartial = record.value.postingStatus === STOCKTAKE_POSTING.PARTIAL
  postModeModalTitle.value = isRetry
    ? `重新过账 ${record.value.docNo}`
    : isPartial
      ? `继续过账 ${record.value.docNo}`
      : `生成盘盈盘亏 ${record.value.docNo}`
  postModeModalHint.value = isRetry
    ? record.value.postingError || '请选择本次要重新生成的单据范围。'
    : isPartial
      ? '当前为部分过账，请选择要继续生成的单据范围。'
      : '请选择本次要生成的单据范围。'
  postModeModalOpen.value = true
}

function onPostModeConfirm(mode) {
  if (!record.value?.id) return
  const { count, blocked, partialCount } = postStocktake([record.value.id], { mode })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (!count) return
  message.success(partialCount ? '已生成（尚有差异可继续过账）' : '已过账')
}

function openRefuse() {
  refuseModalOpen.value = true
}

function onRefuseConfirm(reason) {
  const { count, blocked } = refuseStocktake([record.value.id], { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success('已拒绝')
    refuseModalOpen.value = false
  }
}
</script>

<style lang="less" scoped>
.stocktake-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
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

.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.posting-alert {
  margin-bottom: 8px;
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

.pos {
  color: #52c41a;
}

.neg {
  color: #ff4d4f;
}
</style>
