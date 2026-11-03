<template>
  <a-drawer
    :open="open"
    :title="title"
    :width="drawerWidth"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-empty v-if="!itemSummary" description="暂无占用数据" />
    <template v-else>
      <div class="summary-bar">
        <div class="summary-main">
          <div class="summary-name">{{ displayItemName }}</div>
          <div class="summary-meta">{{ displayItemMeta }}</div>
        </div>
        <div class="summary-metrics">
          <div class="metric">
            <span class="metric-label">实物库存</span>
            <span class="metric-value">{{ fmt(itemSummary.physicalQty) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">手动锁定</span>
            <span class="metric-value">{{ fmt(itemSummary.manualTotalQty) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">自动池剩余</span>
            <span class="metric-value">{{ fmt(itemSummary.freeQty) }}</span>
          </div>
        </div>
      </div>

      <a-tabs v-model:activeKey="activeTab" class="drawer-tabs">
        <a-tab-pane key="alloc" tab="占用明细">
          <div v-if="showActions && allItemLocks.length" class="lock-list-box">
            <div class="lock-list-title">本物料全部手动锁定（可直接释放）</div>
            <a-table
              :columns="lockColumns"
              :data-source="allItemLocks"
              :pagination="false"
              size="small"
              row-key="id"
              bordered
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'actions'">
                  <a-button type="link" size="small" danger @click="onReleaseLock(record)">
                    释放
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>

          <a-table
            :columns="flowColumns"
            :data-source="itemSummary.flows || []"
            :pagination="false"
            size="small"
            row-key="key"
            bordered
            :scroll="{ x: 1520 }"
            :row-class-name="flowRowClassName"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'index'">
                {{ record.priorityRank || '—' }}
              </template>
              <template v-else-if="column.key === 'docNo'">
                <div class="doc-cell">
                  <span>{{ record.docNo || '—' }}</span>
                  <a-tag v-if="record.key === currentKey" color="processing" class="current-tag"
                    >当前查看</a-tag
                  >
                </div>
              </template>
              <template v-else-if="column.key === 'urgency'">
                <a-tag :color="urgencyColor(record.urgency)">{{
                  record.urgencyLabel || record.urgency || '正常'
                }}</a-tag>
              </template>
              <template v-else-if="column.key === 'method'">
                <a-tag :color="methodColor(record.method)">{{ methodLabel(record.method) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'qty'">
                自动 {{ fmt(record.autoAllocatedQty) }} / 手动 {{ fmt(record.manualAllocatedQty) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.statusColor || 'default'">{{
                  record.statusLabel || '—'
                }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <template v-if="showActions">
                  <a-button
                    v-if="canTransferIn(record)"
                    type="link"
                    size="small"
                    @click="openTransferInModal(record)"
                  >
                    转入本单
                  </a-button>
                  <a-button
                    v-if="hasManualLock(record)"
                    type="link"
                    size="small"
                    danger
                    @click="onReleaseRowLocks(record)"
                  >
                    释放
                  </a-button>
                  <span v-if="!canTransferIn(record) && !hasManualLock(record)" class="muted"
                    >—</span
                  >
                </template>
                <span v-else class="muted">—</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="log" tab="操作日志">
          <a-table
            :columns="auditColumns"
            :data-source="audits"
            :pagination="auditPagination"
            size="small"
            row-key="id"
            bordered
            @change="onAuditTableChange"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ auditRowIndex(index) }}
              </template>
              <template v-else-if="column.key === 'method'">
                <span class="nowrap">{{ auditMethodLabel(record) }}</span>
              </template>
              <template v-else-if="column.key === 'qty'">
                {{ fmt(record.qty) }}
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </template>
  </a-drawer>

  <a-modal
    v-model:open="qtyModalOpen"
    title="转入本单"
    ok-text="确认"
    cancel-text="取消"
    @ok="confirmQtyModal"
  >
    <p class="modal-tip">{{ qtyModalTip }}</p>
    <a-form layout="vertical">
      <a-form-item label="数量" required>
        <a-input-number
          v-model:value="qtyModalValue"
          :min="0.001"
          :max="qtyModalMax"
          :step="1"
          :precision="3"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="原因">
        <a-input v-model:value="qtyModalReason" allow-clear placeholder="可选" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { formatQty } from '@/utils/numberFormat'
import {
  listActiveKitLocks,
  listKitAllocationAudits,
  releaseKitLock,
  releaseKitLocksForTarget,
  setKitManualLockTotal,
  getTransferInMaxQty,
} from '@/store/kitStockAllocationStore'
import { urgencyTagColor } from '@/constants/urgency'

const props = defineProps({
  open: { type: Boolean, default: false },
  itemCode: { type: String, default: '' },
  itemName: { type: String, default: '' },
  itemSpecModel: { type: String, default: '' },
  itemMaterial: { type: String, default: '' },
  itemDrawingNo: { type: String, default: '' },
  itemSummary: { type: Object, default: null },
  /** 从哪张齐套单点进来的（仅高亮「当前查看」，不影响排队） */
  currentKey: { type: String, default: '' },
  currentDocNo: { type: String, default: '' },
  currentAllocated: { type: Number, default: 0 },
  currentGap: { type: Number, default: 0 },
  currentDemand: { type: Number, default: 0 },
  showActions: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'changed'])

const activeTab = ref('alloc')
const auditPage = ref(1)
const auditPageSize = 10
const qtyModalOpen = ref(false)
const qtyModalRecord = ref(null)
const qtyModalValue = ref(null)
const qtyModalReason = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      activeTab.value = 'alloc'
      auditPage.value = 1
    }
  },
)

const auditPagination = computed(() => ({
  current: auditPage.value,
  pageSize: auditPageSize,
  size: 'small',
  showSizeChanger: false,
}))

function onAuditTableChange(pag) {
  auditPage.value = pag?.current || 1
}

function auditRowIndex(index) {
  return (auditPage.value - 1) * auditPageSize + index + 1
}

const displayItemName = computed(() => String(props.itemName || '').trim() || props.itemCode || '—')

const displayItemMeta = computed(() => {
  const parts = [props.itemCode, props.itemSpecModel, props.itemMaterial, props.itemDrawingNo]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.join(' · ') || '—'
})

const title = computed(() => `占用明细 · ${displayItemName.value}`)

const drawerWidth = computed(() => {
  if (typeof window === 'undefined') return 1280
  return Math.min(1280, Math.max(960, window.innerWidth - 32))
})

const audits = computed(() => listKitAllocationAudits({ itemCode: props.itemCode, limit: 50 }))

const allItemLocks = computed(() => {
  void props.itemSummary
  return listActiveKitLocks(props.itemCode)
})

const physicalQty = computed(
  () => num(props.itemSummary?.physicalQty) || num(qtyModalRecord.value?.physicalQty),
)

function transferMaxFor(record) {
  if (!record) return 0
  return getTransferInMaxQty({
    itemCode: props.itemCode,
    targetKey: record.key,
    demandQty: record.demandQty,
    physicalQty: physicalQty.value || record.physicalQty,
  })
}

const qtyModalMax = computed(() => Math.max(0, transferMaxFor(qtyModalRecord.value)))

const qtyModalTip = computed(() => {
  const rec = qtyModalRecord.value
  if (!rec) return ''
  const demand = num(rec.demandQty)
  const max = qtyModalMax.value
  return `为「${rec.docNo || rec.key}」设置手动锁定。默认按需求 ${fmt(
    demand,
  )}；可改，上限 ${fmt(max)}（= min(需求, 实物−其他单已锁)）。确认后按输入数量锁定（覆盖该行原手动锁）。`
})

function canTransferIn(record) {
  return transferMaxFor(record) > 0
}

function hasManualLock(record) {
  return num(record?.manualAllocatedQty) > 0
}

const flowColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '单号', dataIndex: 'docNo', key: 'docNo', width: 220, ellipsis: true, fixed: 'left' },
  { title: '状态', key: 'status', width: 104, fixed: 'left' },
  { title: '紧急度', key: 'urgency', width: 72 },
  { title: '产品', dataIndex: 'productName', key: 'productName', width: 200, ellipsis: true },
  { title: '计划日期', dataIndex: 'planDate', key: 'planDate', width: 108 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 148 },
  { title: '需求', dataIndex: 'demandQty', key: 'demandQty', width: 64, align: 'right' },
  { title: '占用(自动/手动)', key: 'qty', width: 148 },
  { title: '缺口', dataIndex: 'gapQty', key: 'gapQty', width: 64, align: 'right' },
  {
    title: '本单在途',
    dataIndex: 'inTransitQty',
    key: 'inTransitQty',
    width: 80,
    align: 'right',
  },
  { title: '方式', key: 'method', width: 72 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

const auditColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 168 },
  { title: '方式', key: 'method', width: 72 },
  { title: '数量', dataIndex: 'qty', key: 'qty', width: 72, align: 'right' },
  { title: '目标单', dataIndex: 'targetDocNo', key: 'targetDocNo', width: 160, ellipsis: true },
  { title: '说明', dataIndex: 'detail', key: 'detail', ellipsis: true },
  { title: '操作人', dataIndex: 'operator', key: 'operator', width: 96 },
]

const lockColumns = [
  { title: '单据', dataIndex: 'targetDocNo', key: 'targetDocNo', width: 160, ellipsis: true },
  { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, align: 'right' },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '操作人', dataIndex: 'operator', key: 'operator', width: 88 },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 168 },
  { title: '操作', key: 'actions', width: 80 },
]

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmt(v) {
  return formatQty(v)
}

function methodLabel(m) {
  if (m === 'manual') return '手动'
  if (m === 'mixed') return '混合'
  return '自动'
}

function methodColor(m) {
  if (m === 'manual') return 'purple'
  if (m === 'mixed') return 'blue'
  return 'default'
}

/** 操作日志：锁定 / 释放 / 让路 / 抢占（兼容旧数据 method=manual） */
function auditMethodLabel(record) {
  const m = record?.method
  if (m === 'lock') return '锁定'
  if (m === 'release') return '释放'
  if (m === 'yield') return '让路'
  if (m === 'seize') return '抢占'
  if (m === 'auto') return '自动'
  if (m === 'manual') {
    const detail = String(record?.detail || '')
    return detail.includes('释放') ? '释放' : '锁定'
  }
  return m || '—'
}

function urgencyColor(u) {
  return urgencyTagColor(u)
}

function flowRowClassName(record) {
  return record?.key && record.key === props.currentKey ? 'is-current-flow' : ''
}

function onReleaseLock(record) {
  Modal.confirm({
    title: '释放手动锁定',
    content: `确认释放「${record.targetDocNo || record.targetKey || '—'}」数量 ${fmt(
      record.qty,
    )} 的手动占用？释放后将按优先级重新自动分摊。`,
    onOk: () => {
      const res = releaseKitLock(record.id, { reason: '物料占用明细释放' })
      if (!res.ok) {
        message.error(res.message || '释放失败')
        return
      }
      message.success('已释放')
      emit('changed')
    },
  })
}

function onReleaseRowLocks(record) {
  Modal.confirm({
    title: '释放该单手动锁定',
    content: `确认释放「${record.docNo || record.key}」全部手动锁定（${fmt(
      record.manualAllocatedQty,
    )}）？释放后将按优先级重新自动分摊。`,
    onOk: () => {
      const res = releaseKitLocksForTarget(props.itemCode, record.key, {
        reason: '物料占用明细按行释放',
      })
      if (!res.ok) {
        message.error(res.message || '释放失败')
        return
      }
      message.success(`已释放 ${fmt(res.qty)}`)
      emit('changed')
    },
  })
}

function openTransferInModal(record) {
  const max = transferMaxFor(record)
  if (!(max > 0)) {
    message.warning('实物已被其他单锁定占满，或需求为 0，无法转入')
    return
  }
  qtyModalRecord.value = record
  const demand = num(record.demandQty)
  qtyModalValue.value = Math.min(demand > 0 ? demand : max, max)
  qtyModalReason.value = ''
  qtyModalOpen.value = true
}

function confirmQtyModal() {
  const qty = num(qtyModalValue.value)
  const rec = qtyModalRecord.value
  if (!rec) {
    message.warning('请选择单据行')
    return Promise.reject()
  }
  if (qty <= 0) {
    message.warning('请填写有效数量')
    return Promise.reject()
  }
  if (qty > qtyModalMax.value + 1e-9) {
    message.warning(`数量不能超过 ${fmt(qtyModalMax.value)}（已按实物可锁额度限制）`)
    return Promise.reject()
  }
  const res = setKitManualLockTotal({
    itemCode: props.itemCode,
    targetKey: rec.key,
    qty,
    targetDocNo: rec.docNo,
    targetLabel: rec.productName || rec.docNo,
    reason: qtyModalReason.value || '转入本单',
    physicalQty: physicalQty.value || rec.physicalQty,
  })
  if (!res.ok) {
    message.error(res.message || '转入失败')
    return Promise.reject()
  }
  message.success(
    res.capped
      ? `实物不足，已按可锁额度转入「${rec.docNo || rec.key}」 ${fmt(res.qty)}`
      : `已转入「${rec.docNo || rec.key}」 ${fmt(res.qty)}`,
  )
  qtyModalOpen.value = false
  emit('changed')
}
</script>

<style scoped lang="less">
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.summary-main {
  min-width: 0;
  flex: 1;
}
.summary-name {
  font-size: 16px;
  font-weight: 700;
  color: #141414;
  line-height: 1.35;
}
.summary-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
  word-break: break-all;
}
.summary-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  flex-shrink: 0;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 72px;
}
.metric-label {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.2;
}
.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.drawer-tabs {
  margin-top: 4px;
}
.lock-list-box {
  margin-bottom: 12px;
}
.lock-list-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: #595959;
}
.muted {
  color: #bfbfbf;
}
.nowrap {
  white-space: nowrap;
}
.doc-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.doc-cell > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.current-tag {
  flex-shrink: 0;
  margin-inline-end: 0 !important;
}
:deep(.is-current-flow) > td {
  background: #e6f4ff !important;
}
.modal-tip {
  margin-bottom: 12px;
  color: #595959;
  line-height: 1.5;
}
</style>
