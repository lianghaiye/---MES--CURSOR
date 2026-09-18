<template>
  <div class="detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="stocktakeStatusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag v-if="postingTag" :color="postingTag.color">{{ postingTag.text }}</a-tag>
            <span class="sub">{{ stocktakeSourceLabel(record.sourceChannel) }}</span>
          </div>
          <a-space :size="12">
            <a-button
              v-if="canApproveStocktake(record)"
              type="primary"
              size="small"
              @click="handleApprove"
            >
              审核通过
            </a-button>
            <a-button
              v-if="canPostStocktake(record)"
              type="primary"
              size="small"
              @click="handlePost"
            >
              {{ record.postingStatus === 'failed' ? '重新过账' : '生成盘盈盘亏' }}
            </a-button>
            <a-button v-if="canRefuseStocktake(record)" size="small" danger @click="openRefuse">
              拒绝
            </a-button>
            <a-button v-if="canEditStocktake(record)" size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回</a-button>
          </a-space>
        </div>

        <a-alert
          v-if="record.postingStatus === 'failed' && record.postingError"
          type="error"
          show-icon
          class="posting-alert"
          :message="`过账失败：${record.postingError}`"
        />

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:activeKey="infoTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="related" :tab="`关联单据 (${relatedDocs.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="infoTab === 'basic'">
            <div class="basic-stack">
              <DetailSectionCard title="基本信息">
                <a-descriptions :column="3" size="small">
                  <a-descriptions-item label="盘点仓库">{{ record.warehouse }}</a-descriptions-item>
                  <a-descriptions-item label="盘点类型">{{
                    record.stocktakeType || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="盘点日期">{{
                    record.stocktakeDate
                  }}</a-descriptions-item>
                  <a-descriptions-item label="申请人">{{
                    record.applicant || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="审核人">{{
                    record.approver || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="审核时间">{{
                    record.approvedAt || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="过账时间">{{
                    record.postedAt || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item v-if="record.refuseReason" label="拒绝理由" :span="2">
                    {{ record.refuseReason }}
                  </a-descriptions-item>
                  <a-descriptions-item label="备注" :span="3">{{
                    record.remark || '—'
                  }}</a-descriptions-item>
                </a-descriptions>
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
            </div>
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
                  <template v-else>
                    {{ displayCell(row[column.dataIndex]) }}
                  </template>
                </template>
              </a-table>
              <a-empty v-else description="暂无关联出入库单据" />
            </DetailSectionCard>
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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import {
  STOCKTAKE_POSTING,
  STOCKTAKE_STATUS,
  stocktakeStatusColor,
  stocktakeSourceLabel,
  stocktakePostingLabel,
} from '@/mock/stocktakeOptions'
import {
  stocktakeOrderState,
  getStocktakeOrderById,
  canEditStocktake,
  canApproveStocktake,
  canPostStocktake,
  canRefuseStocktake,
  approveStocktake,
  postStocktake,
  refuseStocktake,
} from '@/store/stocktakeOrderStore'
import { isStocktakeAutoPostOnApprove } from '@/store/stocktakeSettingsStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'
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
const infoTab = ref('basic')

const record = computed(() => {
  void stocktakeOrderState.orders
  return getStocktakeOrderById(route.params.id)
})

const postingTag = computed(() => {
  const r = record.value
  if (!r || r.status !== STOCKTAKE_STATUS.APPROVED) return null
  const label = stocktakePostingLabel(r.postingStatus)
  if (!label) return null
  if (r.postingStatus === STOCKTAKE_POSTING.FAILED) return { text: label, color: 'error' }
  if (r.postingStatus === STOCKTAKE_POSTING.PENDING) return { text: label, color: 'warning' }
  return { text: label, color: 'default' }
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
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const relatedDocs = computed(() => {
  const r = record.value
  if (!r) return []
  const rows = []
  ;(r.linkedInboundIds || []).forEach((id, i) => {
    const docNo = r.linkedInboundDocNos?.[i] || id
    rows.push({
      key: `in-${id}`,
      id,
      docNo,
      docType: '盘点入库',
      remark: '盘盈入库（自由备货）',
      path: `/inventory/inbound/${id}`,
    })
  })
  ;(r.linkedOutboundIds || []).forEach((id, i) => {
    const docNo = r.linkedOutboundDocNos?.[i] || id
    rows.push({
      key: `out-${id}`,
      id,
      docNo,
      docType: '盘点出库',
      remark: '盘亏出库',
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
  const isRetry = record.value.postingStatus === STOCKTAKE_POSTING.FAILED
  Modal.confirm({
    title: isRetry ? `重新过账 ${record.value.docNo}？` : `生成盘盈盘亏 ${record.value.docNo}？`,
    content: isRetry
      ? record.value.postingError || '将再次尝试生成盘盈入库 / 盘亏出库并入账。'
      : '将按差异生成盘盈入库或盘亏出库并入账。',
    onOk: () => {
      const { count, blocked } = postStocktake([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已过账')
    },
  })
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
.detail-page {
  margin: -12px;
  padding: 12px 0 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-top: none;
  border-radius: 0;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  z-index: 30;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
.posting-alert {
  margin: 0 12px 12px;
}
.detail-tabs-wrap {
  padding: 0 12px;
  margin-bottom: 8px;
}
.tab-body {
  padding: 0 12px;
}
.basic-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
