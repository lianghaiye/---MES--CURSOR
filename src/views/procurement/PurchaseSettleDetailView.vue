<template>
  <div class="purchase-settle-detail-page">
    <a-empty v-if="!record" description="对账单不存在" />
    <template v-else>
      <div class="detail-sticky-bar">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.settleNo }}</span>
            <a-tag :color="statusTagColor">{{ record.status }}</a-tag>
            <a-tag>{{ settleTargetLabel }}</a-tag>
            <a-tag v-if="record.periodKey">账期 {{ record.periodKey }}</a-tag>
          </div>
          <a-space :size="8" wrap>
            <template v-if="record.status === '草稿'">
              <a-button type="primary" size="small" @click="onConfirm">确认对账</a-button>
              <a-button size="small" danger @click="onDelete">删除</a-button>
            </template>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>
      </div>

      <div class="tab-body">
        <div class="detail-panel detail-steps-panel">
          <a-steps :current="statusStepIndex" size="small" label-placement="vertical">
            <a-step v-for="step in statusSteps" :key="step.key" :title="step.title">
              <template #description>
                <span class="step-desc">{{ step.desc }}</span>
              </template>
            </a-step>
          </a-steps>
        </div>

        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-card__label">账面金额</div>
            <div class="stat-card__value is-book">¥ {{ formatMoney(bookAmount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">争议金额</div>
            <div class="stat-card__value is-dispute">¥ {{ formatMoney(disputeAmount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">确认金额</div>
            <div class="stat-card__value is-confirm">¥ {{ formatMoney(confirmedAmount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">计划付款日</div>
            <div class="stat-card__value is-date">{{ record.plannedPaymentDate || '—' }}</div>
          </div>
        </div>

        <div v-if="paymentCalcTip" class="payment-tip">{{ paymentCalcTip }}</div>

        <DetailSectionCard title="基本信息">
          <div class="settle-basic-section">
            <div class="meta-bar">
              <div v-for="item in metaItems" :key="item.key" class="meta-item">
                <span class="field-label">{{ item.label }}</span>
                <span class="field-value" :title="item.value">{{ item.value }}</span>
              </div>
            </div>
            <div class="info-grid">
              <div
                v-for="field in basicFields"
                :key="field.key"
                class="info-item"
                :class="{ 'info-item-full': field.fullRow }"
              >
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value" :title="field.value">{{ field.value }}</span>
              </div>
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard title="结算明细">
          <template v-if="groupedLines.length">
            <div v-for="group in groupedLines" :key="group.poKey" class="po-group">
              <div class="po-group-title">
                采购单 {{ group.purchaseOrderNo || '—' }}
                <span class="po-group-amount">小计 ¥ {{ formatMoney(group.amount) }}</span>
              </div>
              <a-table
                :columns="columns"
                :data-source="group.lines"
                row-key="id"
                size="small"
                :pagination="false"
                :scroll="{ x: 1280 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'lineStatus'">
                    <a-tag :color="row.lineStatusColor">{{ row.lineStatus }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'itemInfo'">
                    <span :title="row.itemInfoText">{{ row.itemInfoText }}</span>
                  </template>
                  <template v-else-if="column.key === 'settleQtyText'">
                    {{ row.settleQtyText }}
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{ formatMoney(row.unitPrice) }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    <span :class="{ 'is-neg': Number(row.amount) < 0 }">
                      {{ formatMoney(row.amount) }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a @click="openInbound(row)">查看来源</a>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
          <a-empty v-else description="暂无明细" />
          <div class="detail-footer-tip">
            {{
              disputeAmount > 0
                ? `存在争议金额 ¥ ${formatMoney(disputeAmount)}，确认前请核对差异。`
                : '本单暂无争议差异，核对通过后可直接确认对账。'
            }}
          </div>
        </DetailSectionCard>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'PurchaseSettleDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getPurchaseSettleById,
  confirmPurchaseSettle,
  deletePurchaseSettle,
  purchaseSettleState,
} from '@/store/purchaseSettleStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { hasSettleUnit } from '@/utils/settleUnit'
import { formatNumber } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const statusSteps = [
  { key: 'pending', title: '待对账', desc: '生成草稿' },
  { key: 'reconciling', title: '对账中', desc: '核对明细' },
  { key: 'confirmed', title: '已确认', desc: '双方确认' },
  { key: 'invoiced', title: '已开票', desc: '收票登记' },
  { key: 'posted', title: '已挂账', desc: '应付入账' },
  { key: 'paid', title: '已付款', desc: '付款完成' },
]

const record = computed(() => {
  void purchaseSettleState.settles
  return getPurchaseSettleById(String(route.params.id || ''))
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

const generateModeLabel = computed(() =>
  record.value?.generateMode === 'period' ? '按账期' : '从采购单',
)

const settleTargetLabel = computed(() => {
  const target = record.value?.settleTarget
  if (target === 'purchase_order') return '按采购单（已完成）'
  if (target === 'inbound') return '按入库'
  // 兼容旧数据
  return record.value?.generateMode === 'po' ? '按采购单（已完成）' : '按入库'
})

const statusTagColor = computed(() => (record.value?.status === '已确认' ? 'green' : 'orange'))

const statusStepIndex = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.paymentStatus === '已付款') return 5
  if (row.paymentStatus === '已挂账') return 4
  if (row.invoiceStatus === '已开票') return 3
  if (row.status === '已确认') return 2
  if (row.status === '草稿') return 1
  return 0
})

const bookAmount = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.bookAmount != null && row.bookAmount !== '') return Number(row.bookAmount) || 0
  return Number(row.totalAmount) || 0
})

const disputeAmount = computed(() => Number(record.value?.disputeAmount) || 0)

const confirmedAmount = computed(() => {
  const row = record.value
  if (!row) return 0
  if (row.confirmedAmount != null && row.confirmedAmount !== '') {
    return Number(row.confirmedAmount) || 0
  }
  return Math.max(0, bookAmount.value - disputeAmount.value)
})

const paymentTermDaysText = computed(() => {
  const days = Number(record.value?.paymentTermDays)
  if (Number.isFinite(days) && days > 0) return `${days}天`
  return '—'
})

const paymentCalcTip = computed(() => {
  const row = record.value
  if (!row) return ''
  const days = Number(row.paymentTermDays)
  const start = row.paymentTermStart || '对账日'
  if (!(Number.isFinite(days) && days > 0)) return ''
  if (!row.plannedPaymentDate) {
    if (start === '开票日') {
      return '账期起算为开票日：供应商开票时间需人工补录后，按「开票日 + 账期天数」计算计划付款日。'
    }
    return ''
  }
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][dayjs(row.plannedPaymentDate).day()]
  return `付款日测算：起算「${start}」+ 账期 ${days} 天 = ${row.plannedPaymentDate}（周${weekday}）`
})

/** 基本信息采购单号：仅手动「从采购单」生成时展示，账期等其它维度显示 — */
const displayPoNos = computed(() => {
  const row = record.value
  if (!row) return '—'
  if (row.generateMode !== 'po') return '—'
  if (row.purchaseOrderNos?.length) return row.purchaseOrderNos.join('、')
  return row.purchaseOrderNo || '—'
})

const metaItems = computed(() => {
  const row = record.value
  if (!row) return []
  return [
    { key: 'status', label: '状态', value: display(row.status) },
    { key: 'creator', label: '创建人', value: display(row.creator) },
    { key: 'createdAt', label: '创建时间', value: display(row.createdAt) },
    { key: 'confirmer', label: '确认人', value: display(row.confirmer) },
    { key: 'confirmedAt', label: '确认时间', value: display(row.confirmedAt) },
  ]
})

const basicFields = computed(() => {
  const row = record.value
  if (!row) return []
  const periodWindow =
    row.periodStart && row.periodEnd ? `${row.periodStart} ~ ${row.periodEnd}` : '—'
  return [
    { key: 'settleNo', label: '对账单号', value: display(row.settleNo) },
    { key: 'supplier', label: '供应商', value: display(row.supplier) },
    { key: 'settleTarget', label: '生成维度', value: settleTargetLabel.value },
    { key: 'generateMode', label: '生成方式', value: generateModeLabel.value },
    { key: 'purchaseOrderNo', label: '采购单号', value: displayPoNos.value },
    { key: 'settlementCycle', label: '结算周期', value: display(row.settlementCycle) },
    { key: 'paymentTermStart', label: '账期起算', value: display(row.paymentTermStart) },
    { key: 'periodKey', label: '账期', value: display(row.periodKey) },
    { key: 'periodWindow', label: '结算期间', value: periodWindow },
    { key: 'paymentTermDays', label: '账期天数', value: paymentTermDaysText.value },
    { key: 'plannedPaymentDate', label: '计划付款日期', value: display(row.plannedPaymentDate) },
    { key: 'remark', label: '备注', value: display(row.remark), fullRow: true },
  ]
})

function resolveSourceLine(row) {
  const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
  const inboundLine = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
  const po =
    purchaseOrderState.orders.find(
      (o) => o.id === (row.purchaseOrderId || inbound?.purchaseOrderId),
    ) || null
  const poLine =
    (po?.lineItems || []).find((l) => l.id === (row.poLineId || inboundLine?.poLineId)) || null
  return { inbound, inboundLine, po, poLine }
}

function formatSettleQtyText(row, inboundLine) {
  const source = inboundLine || row
  if (hasSettleUnit(source) || hasSettleUnit(row)) {
    const qty = Number(row.settleQty ?? source.settleQty)
    const unit = row.settleUnit || source.settleUnit || ''
    if (!(Number.isFinite(qty) && qty !== 0)) return '—'
    return `${formatNumber(qty, 4)}${unit ? ` ${unit}` : ''}`
  }
  // 有采购单位：取点收数量（入库 qty / purchaseQty）
  const qty = Number(source.purchaseQty ?? source.qty ?? row.settleQty)
  const unit = source.purchaseUnit || source.unit || row.settleUnit || ''
  if (!(Number.isFinite(qty) && qty !== 0)) return '—'
  return `${formatNumber(qty, 4)}${unit ? ` ${unit}` : ''}`
}

function enrichLine(row) {
  const headerStatus = record.value?.status || '草稿'
  const { inboundLine, poLine } = resolveSourceLine(row)
  const itemCode =
    row.itemCode || inboundLine?.itemCode || poLine?.itemCode || poLine?.productCode || ''
  const itemName =
    row.itemName || inboundLine?.itemName || poLine?.itemName || poLine?.productName || ''
  return {
    ...row,
    lineStatus: headerStatus === '已确认' ? '已确认' : '待确认',
    lineStatusColor: headerStatus === '已确认' ? 'green' : 'orange',
    itemCode,
    itemName,
    itemInfoText: `${itemCode} ${itemName}`.trim() || '—',
    specModel: inboundLine?.specModel || poLine?.specModel || '—',
    material: inboundLine?.material || poLine?.material || '—',
    orderSizeText: inboundLine?.orderSizeText || poLine?.orderSizeText || '—',
    settleQtyText: formatSettleQtyText(row, inboundLine),
  }
}

/** 按采购单分组，恢复明细上方「采购单 xxxx」标题 */
const groupedLines = computed(() => {
  void inboundOrderState.orders
  void purchaseOrderState.orders
  const lines = record.value?.lineItems || []
  const map = new Map()
  lines.forEach((line) => {
    const enriched = enrichLine(line)
    const poNo = enriched.purchaseOrderNo || record.value?.purchaseOrderNo || '未关联采购单'
    const poId = enriched.purchaseOrderId || record.value?.purchaseOrderId || poNo
    const key = poId || poNo
    if (!map.has(key)) {
      map.set(key, {
        poKey: key,
        purchaseOrderId: poId,
        purchaseOrderNo: poNo,
        lines: [],
        amount: 0,
      })
    }
    const g = map.get(key)
    g.lines.push(enriched)
    g.amount += Number(enriched.amount) || 0
  })
  return [...map.values()]
})

const columns = [
  { title: '序号', key: 'index', width: 60 },
  { title: '状态', key: 'lineStatus', width: 90 },
  { title: '来源单号', dataIndex: 'inboundDocNo', key: 'inboundDocNo', width: 140 },
  { title: '物料信息', key: 'itemInfo', width: 200, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 100, ellipsis: true },
  {
    title: '订货尺寸',
    dataIndex: 'orderSizeText',
    key: 'orderSizeText',
    width: 120,
    ellipsis: true,
  },
  { title: '结算数量', key: 'settleQtyText', width: 120 },
  { title: '结算单价', key: 'unitPrice', width: 100, align: 'right' },
  { title: '金额', key: 'amount', width: 110, align: 'right' },
  { title: '操作', key: 'actions', width: 100 },
]

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 2)
}

function goBack() {
  router.push('/settlement/purchase-settles')
}

function openInbound(row) {
  if (!row?.inboundOrderId) {
    message.info('无关联入库单')
    return
  }
  const path = `/inventory/inbound-orders/${row.inboundOrderId}`
  openTab(path, row.inboundDocNo || '入库详情')
  router.push(path)
}

function onConfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `确认对账单 ${row.settleNo}？`,
    content: '确认后将占用入库行的结算数量，不可撤销。',
    okText: '确认',
    onOk() {
      const res = confirmPurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onDelete() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `删除对账单 ${row.settleNo}？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      goBack()
    },
  })
}
</script>

<style lang="less" scoped>
@label-width: 96px;

.purchase-settle-detail-page {
  --psd-ink: #1c2b3a;
  --psd-muted: #5b6b7c;
  --psd-line: rgba(28, 43, 58, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 100%;
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

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.detail-panel {
  background: #fff;
  border: 1px solid var(--psd-line);
  border-radius: 12px;
  padding: 16px 18px 8px;
  margin-bottom: 10px;
}

.step-desc {
  font-size: 12px;
  color: var(--psd-muted);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--psd-line);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 6px 16px rgba(28, 43, 58, 0.04);
}

.stat-card__label {
  font-size: 13px;
  color: var(--psd-muted);
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.stat-card__value.is-book {
  color: #c2410c;
}
.stat-card__value.is-dispute {
  color: #cf1322;
}
.stat-card__value.is-confirm {
  color: #389e0d;
}
.stat-card__value.is-date {
  color: var(--psd-ink);
  font-size: 22px;
}

.payment-tip {
  margin: -2px 0 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(22, 119, 255, 0.06);
  color: var(--psd-muted);
  font-size: 13px;
  line-height: 1.5;
}

.settle-basic-section {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-full {
  grid-column: 1 / -1;

  .field-value {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.po-group {
  margin-bottom: 16px;

  &:last-of-type {
    margin-bottom: 0;
  }
}

.po-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(28, 43, 58, 0.04);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--psd-ink);
}

.po-group-amount {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--psd-muted);
}

.detail-footer-tip {
  margin-top: 10px;
  font-size: 13px;
  color: var(--psd-muted);
}

.is-neg {
  color: #cf1322;
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
