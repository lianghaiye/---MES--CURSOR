<template>
  <a-modal
    v-model:open="invoiceModalOpen"
    :title="invoiceModalTitle"
    ok-text="登记"
    destroy-on-close
    :mask-closable="false"
    width="960px"
    @ok="submitInvoice"
  >
    <a-form layout="vertical" class="settle-invoice-form">
      <div class="node-summary">
        <div class="node-summary-item">
          <div class="node-summary-label">对账单号</div>
          <div class="node-summary-value">{{ actionSettle?.settleNo || '—' }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">供应商</div>
          <div class="node-summary-value">{{ actionSettle?.supplier || '—' }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">确认金额</div>
          <div class="node-summary-value">¥ {{ formatMoney(confirmedAmount) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">已收票</div>
          <div class="node-summary-value">¥ {{ formatMoney(invoicedTotal) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">待收票</div>
          <div class="node-summary-value remain">¥ {{ formatMoney(invoiceRemainToReceive) }}</div>
        </div>
      </div>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="票面金额（含税）" required>
            <a-input-number
              v-model:value="invoiceForm.invoiceAmount"
              :min="0.01"
              :max="invoiceRemainToReceive || undefined"
              :precision="2"
              style="width: 100%"
              placeholder="请输入票面金额"
              @change="onAmountOrRateChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发票号码" required>
            <a-input
              v-model:value="invoiceForm.invoiceNo"
              allow-clear
              placeholder="请输入发票号码"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="开票日期" required>
            <a-date-picker
              v-model:value="invoiceForm.invoiceDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              placeholder="选择开票日"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="税率（%）">
            <a-input-number
              v-model:value="invoiceForm.taxRate"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
              placeholder="选填"
              @change="onAmountOrRateChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="税额">
            <a-input-number
              v-model:value="invoiceForm.invoiceTaxAmount"
              :min="0"
              :precision="2"
              style="width: 100%"
              placeholder="选填"
              @change="taxEdited = true"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="备注">
            <a-input v-model:value="invoiceForm.invoiceRemark" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="modal-hint">
        可分次收票；付款按账单未付额，不按票面卡死。账期起算为「开票日」时，保存后将按开票日重算计划付款日。
      </div>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="paymentModalOpen"
    :title="paymentModalTitle"
    ok-text="登记"
    destroy-on-close
    :mask-closable="false"
    width="960px"
    @ok="submitPayment"
  >
    <a-form layout="vertical" class="settle-payment-form">
      <div class="node-summary">
        <div class="node-summary-item">
          <div class="node-summary-label">对账单号</div>
          <div class="node-summary-value">{{ actionSettle?.settleNo || '—' }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">供应商</div>
          <div class="node-summary-value">{{ actionSettle?.supplier || '—' }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">确认应付</div>
          <div class="node-summary-value">¥ {{ formatMoney(confirmedAmount) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">本单已付</div>
          <div class="node-summary-value">¥ {{ formatMoney(currentPaidAmount) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">可冲抵合计</div>
          <div class="node-summary-value remain">
            ¥ {{ formatMoney(agingPaymentPreview.totalUnpaid) }}
          </div>
        </div>
      </div>

      <a-form-item label="冲抵方式" required>
        <div class="alloc-mode-grid">
          <button
            v-for="opt in allocateModeOptions"
            :key="opt.value"
            type="button"
            class="alloc-mode-card"
            :class="{ 'is-active': paymentForm.allocateMode === opt.value }"
            @click="paymentForm.allocateMode = opt.value"
          >
            <div class="alloc-mode-card__title">{{ opt.title }}</div>
            <div class="alloc-mode-card__desc">{{ opt.desc }}</div>
          </button>
        </div>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="本次付款金额" required>
            <a-input-number
              v-model:value="paymentForm.payAmount"
              :min="0.01"
              :max="agingPaymentPreview.totalUnpaid || undefined"
              :precision="2"
              style="width: 100%"
              placeholder="请输入实付金额"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="备注">
            <a-input v-model:value="paymentForm.remark" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="aging-preview">
        <div class="aging-preview__head">
          <div class="aging-preview__title">分配预览</div>
          <div class="aging-preview__tip">
            {{ allocateModeHint }}；金额不足时后续行本次分配为 0，仍保留展示。
          </div>
        </div>
        <a-table
          v-if="agingPaymentPreview.allocations?.length"
          :columns="agingPreviewColumns"
          :data-source="agingPaymentPreview.allocations"
          :row-key="(row) => `${row.settleId}-${row.type}`"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ y: 260 }"
          :row-class-name="(row) => (row.applyAmount > 0 ? '' : 'aging-row-skip')"
        >
          <template #bodyCell="{ column, record: row }">
            <template v-if="column.key === 'targetLabel'">
              <a-tag :color="row.type === 'opening' ? 'orange' : 'blue'">{{
                row.targetLabel
              }}</a-tag>
            </template>
            <template v-else-if="column.key === 'remainBefore'">
              ¥ {{ formatMoney(row.remainBefore) }}
            </template>
            <template v-else-if="column.key === 'applyAmount'">
              <span
                :class="{ 'is-muted': !(row.applyAmount > 0), 'is-apply': row.applyAmount > 0 }"
              >
                ¥ {{ formatMoney(row.applyAmount) }}
              </span>
            </template>
            <template v-else-if="column.key === 'remainAfter'">
              ¥ {{ formatMoney(row.remainAfter) }}
            </template>
            <template v-else>{{ row[column.dataIndex] || '—' }}</template>
          </template>
        </a-table>
        <div
          v-else-if="paymentForm.payAmount && agingPaymentPreview.message"
          class="modal-hint is-warn"
        >
          {{ agingPaymentPreview.message }}
        </div>
        <a-empty v-else :image="false" description="暂无可冲抵对象" class="aging-empty" />
      </div>
    </a-form>
  </a-modal>
</template>

<script>
export default { name: 'PurchaseSettleInvoicePaymentModals' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  getPurchaseSettleById,
  purchaseSettleState,
  registerPurchaseSettleInvoice,
  registerPurchaseSettlePayment,
  previewAgingPaymentAllocation,
  settleInvoicedTotal,
  settleInvoiceRemainToReceive,
} from '@/store/purchaseSettleStore'
import { formatNumber } from '@/utils/numberFormat'

const emit = defineEmits(['success'])

const DEFAULT_TAX_RATE = 13

const actionSettleId = ref('')
const invoiceModalOpen = ref(false)
const paymentModalOpen = ref(false)
const taxEdited = ref(false)

const invoiceForm = reactive({
  invoiceNo: '',
  invoiceDate: '',
  invoiceAmount: null,
  taxRate: DEFAULT_TAX_RATE,
  invoiceTaxAmount: null,
  invoiceRemark: '',
})

const paymentForm = reactive({
  payAmount: null,
  remark: '',
  allocateMode: 'aging',
})

const allocateModeOptions = [
  {
    value: 'aging',
    title: '先旧后新',
    desc: '先冲本单期初，再按账龄冲各单本期',
  },
  {
    value: 'currentFirst',
    title: '先付清本单',
    desc: '先付清本单期初+本期，剩余再冲历史',
  },
  {
    value: 'current',
    title: '只付本单本期',
    desc: '仅冲本单本期确认未付，不冲往期',
  },
]

const agingPreviewColumns = [
  { title: '对账单号', dataIndex: 'settleNo', width: 140 },
  { title: '冲抵对象', key: 'targetLabel', width: 100 },
  { title: '账期', dataIndex: 'periodKey', width: 90 },
  { title: '冲前未付', key: 'remainBefore', width: 110, align: 'right' },
  { title: '本次分配', key: 'applyAmount', width: 110, align: 'right' },
  { title: '冲后未付', key: 'remainAfter', width: 110, align: 'right' },
]

const actionSettle = computed(() => {
  void purchaseSettleState.settles
  if (!actionSettleId.value) return null
  return getPurchaseSettleById(actionSettleId.value) || null
})

const invoiceModalTitle = computed(() => {
  const no = actionSettle.value?.settleNo
  return no ? `收票登记 · ${no}` : '收票登记'
})

const paymentModalTitle = computed(() => {
  const no = actionSettle.value?.settleNo
  return no ? `登记付款 · ${no}` : '登记付款'
})

const confirmedAmount = computed(() => {
  const row = actionSettle.value
  if (!row) return 0
  if (row.confirmedAmount != null && row.confirmedAmount !== '') {
    return Number(row.confirmedAmount) || 0
  }
  return 0
})

const currentPaidAmount = computed(() => {
  const row = actionSettle.value
  if (!row) return 0
  return (Number(row.paidAmount) || 0) + (Number(row.openingPaidAmount) || 0)
})

const invoicedTotal = computed(() => settleInvoicedTotal(actionSettle.value))
const invoiceRemainToReceive = computed(() => settleInvoiceRemainToReceive(actionSettle.value))

const allocateModeHint = computed(() => {
  const opt = allocateModeOptions.find((o) => o.value === paymentForm.allocateMode)
  return opt?.desc || ''
})

const agingPaymentPreview = computed(() => {
  void purchaseSettleState.settles
  const row = actionSettle.value
  if (!row) return { ok: false, totalUnpaid: 0, allocations: [], message: '' }
  const mode =
    paymentForm.allocateMode === 'current' || paymentForm.allocateMode === 'currentFirst'
      ? paymentForm.allocateMode
      : 'aging'
  return previewAgingPaymentAllocation({
    entrySettleId: row.id,
    payAmount: Number(paymentForm.payAmount) > 0 ? paymentForm.payAmount : 0,
    mode,
  })
})

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0.00'
  return formatNumber(n, 2)
}

/** 票面含税 → 税额 = 含税金额 × 税率 / (100 + 税率) */
function calcTax(amount, rate) {
  const a = Number(amount) || 0
  const r = Number(rate)
  if (!(a > 0) || !Number.isFinite(r) || r < 0) return null
  return round2((a * r) / (100 + r))
}

function onAmountOrRateChange() {
  if (taxEdited.value) return
  invoiceForm.invoiceTaxAmount = calcTax(invoiceForm.invoiceAmount, invoiceForm.taxRate)
}

function openInvoice(record) {
  const row = record?.id ? getPurchaseSettleById(record.id) || record : null
  if (!row?.id) {
    message.warning('未找到对账单')
    return
  }
  if (row.status !== '已确认') {
    message.warning('仅已确认对账单可收票登记')
    return
  }
  const remain = settleInvoiceRemainToReceive(row)
  if (!(remain > 1e-9)) {
    message.warning('已无未收票余额')
    return
  }
  actionSettleId.value = row.id
  taxEdited.value = false
  invoiceForm.invoiceNo = ''
  invoiceForm.invoiceDate = dayjs().format('YYYY-MM-DD')
  invoiceForm.invoiceAmount = remain > 0 ? remain : null
  invoiceForm.taxRate = DEFAULT_TAX_RATE
  invoiceForm.invoiceTaxAmount = calcTax(invoiceForm.invoiceAmount, invoiceForm.taxRate)
  invoiceForm.invoiceRemark = ''
  invoiceModalOpen.value = true
}

function openPayment(record) {
  const row = record?.id ? getPurchaseSettleById(record.id) || record : null
  if (!row?.id) {
    message.warning('未找到对账单')
    return
  }
  if (row.status !== '已确认') {
    message.warning('仅已确认对账单可付款登记')
    return
  }
  if (row.paymentStatus === '已付款') {
    message.warning('该对账单已付款完成')
    return
  }
  actionSettleId.value = row.id
  paymentForm.allocateMode = 'aging'
  paymentForm.remark = ''
  const preview = previewAgingPaymentAllocation({
    entrySettleId: row.id,
    payAmount: 0,
    mode: 'aging',
  })
  paymentForm.payAmount = preview.totalUnpaid > 0 ? preview.totalUnpaid : null
  paymentModalOpen.value = true
}

watch(
  () => paymentForm.allocateMode,
  (mode) => {
    if (!paymentModalOpen.value || !actionSettleId.value) return
    const preview = previewAgingPaymentAllocation({
      entrySettleId: actionSettleId.value,
      payAmount: 0,
      mode,
    })
    const max = preview.totalUnpaid || 0
    if (!(Number(paymentForm.payAmount) > 0) || Number(paymentForm.payAmount) > max + 1e-9) {
      paymentForm.payAmount = max > 0 ? max : null
    }
  },
)

function submitInvoice() {
  const row = actionSettle.value
  if (!row) return Promise.reject()
  const res = registerPurchaseSettleInvoice(row.id, {
    invoiceNo: invoiceForm.invoiceNo,
    invoiceDate: invoiceForm.invoiceDate,
    invoiceAmount: invoiceForm.invoiceAmount,
    taxRate: invoiceForm.taxRate,
    invoiceTaxAmount: invoiceForm.invoiceTaxAmount,
    invoiceRemark: invoiceForm.invoiceRemark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  invoiceModalOpen.value = false
  emit('success', { type: 'invoice', settleId: row.id })
}

function submitPayment() {
  const row = actionSettle.value
  if (!row) return Promise.reject()
  const res = registerPurchaseSettlePayment(row.id, {
    payAmount: paymentForm.payAmount,
    remark: paymentForm.remark,
    allocateMode: paymentForm.allocateMode || 'aging',
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  paymentModalOpen.value = false
  emit('success', { type: 'payment', settleId: row.id })
}

defineExpose({ openInvoice, openPayment })
</script>

<style lang="less" scoped>
.settle-invoice-form,
.settle-payment-form {
  :deep(.ant-form-item) {
    margin-bottom: 18px;
  }
}

.node-summary {
  display: flex;
  gap: 8px;
  margin: 4px 0 20px;
  padding: 16px 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.node-summary-item {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
  border-right: 1px solid #f0f0f0;

  &:last-child {
    border-right: none;
  }
}

.node-summary-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
  margin-bottom: 8px;
}

.node-summary-value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
  word-break: break-all;

  &.remain {
    color: #1677ff;
  }
}

.alloc-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.alloc-mode-card {
  display: block;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: #91caff;
  }

  &.is-active {
    border-color: #1677ff;
    background: #f0f7ff;
    box-shadow: 0 0 0 1px #1677ff inset;
  }
}

.alloc-mode-card__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
  margin-bottom: 4px;
}

.alloc-mode-card__desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.modal-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.modal-hint.is-warn {
  color: #d48806;
}

.aging-preview {
  margin-top: 4px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.aging-preview__head {
  margin-bottom: 10px;
}

.aging-preview__title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
}

.aging-preview__tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.aging-empty {
  margin: 16px 0 8px;
}

.is-muted {
  color: rgba(0, 0, 0, 0.35);
}

.is-apply {
  color: #1677ff;
  font-weight: 600;
}

:deep(.aging-row-skip) td {
  background: #f5f5f5;
  color: rgba(0, 0, 0, 0.35);
}
</style>
