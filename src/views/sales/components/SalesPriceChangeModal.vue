<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="96%"
    :style="{ top: '16px' }"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-alert
      v-if="isReview"
      type="warning"
      show-icon
      class="pending-alert"
      message="待审核：通过后将回写销售订单有效单价与行折扣，后续发货按新价计算。"
    />

    <a-form layout="vertical" class="price-change-form">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="变更原因" required>
            <a-select
              v-model:value="form.reasonType"
              :options="PRICE_CHANGE_REASON_OPTIONS"
              placeholder="请选择变更原因"
              :disabled="isReview"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="变更说明" required>
            <a-input
              v-model:value="form.reason"
              :disabled="isReview"
              placeholder="如：客户增配机械密封，未发货部分按新单价执行"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="table-toolbar">
      <div class="toolbar-left">
        <a-button class="tax-toggle-btn" @click="toggleTaxMode">
          切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
        </a-button>
        <span class="tax-hint">{{ taxModeHint }}</span>
      </div>
      <a-radio-group v-model:value="columnDisplayMode" button-style="solid" size="small">
        <a-radio-button value="all">展示全部</a-radio-button>
        <a-radio-button value="inTax">仅展示含税</a-radio-button>
        <a-radio-button value="exTax">仅展示不含税</a-radio-button>
      </a-radio-group>
    </div>

    <a-table
      size="small"
      bordered
      row-key="salesLineId"
      :columns="visibleColumns"
      :data-source="form.lines"
      :pagination="false"
      :scroll="{ x: tableScrollX, y: 'calc(100vh - 420px)' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="isMoneyKey(column.key)">
          {{ formatPriceChangeAbsMoney(record[column.key]) }}
        </template>
        <template v-else-if="column.key === 'oldLineDiscountRate'">
          {{ formatPriceChangeDiscount(record.oldLineDiscountRate) }}
        </template>
        <template v-else-if="column.key === 'newUnitPriceExTax'">
          <a-input-number
            v-if="!isReview && taxModeExcluding"
            v-model:value="record.newUnitPriceExTax"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="() => onPriceChange(record, 'unitPrice')"
          />
          <span v-else>{{ formatPriceChangeAbsMoney(record.newUnitPriceExTax) }}</span>
        </template>
        <template v-else-if="column.key === 'newUnitPriceInTax'">
          <a-input-number
            v-if="!isReview && !taxModeExcluding"
            v-model:value="record.newUnitPriceInTax"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="() => onPriceChange(record, 'unitPrice')"
          />
          <span v-else>{{ formatPriceChangeAbsMoney(record.newUnitPriceInTax) }}</span>
        </template>
        <template v-else-if="column.key === 'newLineDiscountRate'">
          <a-input-number
            v-if="canEditDiscount"
            v-model:value="record._newDiscountPercent"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="() => onDiscountPercentChange(record)"
          />
          <span v-else>{{ formatPriceChangeDiscount(record.newLineDiscountRate) }}</span>
        </template>
        <template v-else-if="column.key === 'deltaAmountExTax'">
          <span :class="deltaClass(record.deltaAmountExTax)">
            {{ formatPriceChangeMoney(record.deltaAmountExTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'deltaAmountInTax'">
          <span :class="deltaClass(record.deltaAmountInTax)">
            {{ formatPriceChangeMoney(record.deltaAmountInTax) }}
          </span>
        </template>
        <template v-else-if="column.key === 'taxRate'">
          {{ record.taxRate ?? '—' }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>

    <div class="summary-bar">
      <template v-if="showExTaxColumns">
        <span>原行金额（不含税） {{ formatPriceChangeAbsMoney(summary.oldAmountExTax) }}</span>
      </template>
      <template v-if="showInTaxColumns">
        <span>原行金额（含税） {{ formatPriceChangeAbsMoney(summary.oldAmountInTax) }}</span>
      </template>
      <template v-if="showExTaxColumns">
        <span>变更后（不含税） {{ formatPriceChangeAbsMoney(summary.newAmountExTax) }}</span>
      </template>
      <template v-if="showInTaxColumns">
        <span>变更后（含税） {{ formatPriceChangeAbsMoney(summary.newAmountInTax) }}</span>
      </template>
      <span v-if="showExTaxColumns" :class="deltaClass(summary.deltaAmountExTax)">
        差额（不含税） {{ formatPriceChangeMoney(summary.deltaAmountExTax) }}
      </span>
      <span v-if="showInTaxColumns" :class="deltaClass(summary.deltaAmountInTax)">
        差额（含税） {{ formatPriceChangeMoney(summary.deltaAmountInTax) }}
      </span>
      <span>已改 {{ summary.changedCount }} 行</span>
    </div>
    <p class="hint">
      已发货数量仍按当时发货单价；未发货部分通过后按新单价执行。改单价会同步反算行折扣，改折扣会同步反算含税/不含税单价。
    </p>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <template v-if="isReview">
        <a-button danger @click="handleReject">驳回</a-button>
        <a-button type="primary" @click="handleApprove">通过</a-button>
      </template>
      <a-button v-else type="primary" @click="handleSubmit">提交审核</a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'SalesPriceChangeModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { isLineDiscountDisabled, normalizeDiscountRate, round2 } from '@/utils/salesOrderPricing'
import {
  PRICE_CHANGE_REASON_OPTIONS,
  PRICE_CHANGE_STATUS,
  buildPriceChangeDraftLines,
  formatPriceChangeAbsMoney,
  formatPriceChangeDiscount,
  formatPriceChangeMoney,
  normalizePriceChangeLine,
  recalcPriceChangeLine,
  summarizePriceChangeLines,
} from '@/utils/salesPriceChange'
import {
  approveSalesPriceChange,
  rejectSalesPriceChange,
  submitSalesPriceChange,
} from '@/store/salesPriceChangeStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  salesOrder: { type: Object, default: null },
  pendingChange: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'done'])

const isReview = computed(() => props.pendingChange?.status === PRICE_CHANGE_STATUS.PENDING)

const taxModeExcluding = ref(true)
const columnDisplayMode = ref('all')
const exTaxColumnKeys = new Set([
  'oldUnitPriceExTax',
  'oldAmountExTax',
  'newUnitPriceExTax',
  'newAmountExTax',
  'deltaAmountExTax',
])
const inTaxColumnKeys = new Set([
  'oldUnitPriceInTax',
  'oldAmountInTax',
  'newUnitPriceInTax',
  'newAmountInTax',
  'deltaAmountInTax',
])

const modalTitle = computed(() =>
  isReview.value
    ? `审核价格变更 ${props.pendingChange?.changeNo || ''}`.trim()
    : `价格变更 ${props.salesOrder?.orderNo || ''}`.trim(),
)

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价录入，系统自动反算含税价与行折扣'
    : '当前：按含税单价录入，系统自动反算不含税价与行折扣',
)

const canEditDiscount = computed(
  () => !isReview.value && !isLineDiscountDisabled(props.salesOrder?.discountStrategy),
)

const form = reactive({
  reasonType: undefined,
  reason: '',
  lines: [],
})

const moneyKeys = new Set([
  'oldUnitPriceExTax',
  'oldUnitPriceInTax',
  'oldAmountExTax',
  'oldAmountInTax',
  'oldLineDiscountAmount',
  'newAmountExTax',
  'newAmountInTax',
  'newLineDiscountAmount',
])

function isMoneyKey(key) {
  return moneyKeys.has(key)
}

const allColumns = [
  { title: '产品名称', dataIndex: 'productName', width: 150, ellipsis: true, fixed: 'left' },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 64, align: 'right' },
  { title: '税率(%)', key: 'taxRate', width: 72, align: 'right' },
  { title: '原单价（不含税）', key: 'oldUnitPriceExTax', width: 122, align: 'right' },
  { title: '原单价（含税）', key: 'oldUnitPriceInTax', width: 110, align: 'right' },
  { title: '原金额（不含税）', key: 'oldAmountExTax', width: 122, align: 'right' },
  { title: '原金额（含税）', key: 'oldAmountInTax', width: 110, align: 'right' },
  { title: '原行折扣(%)', key: 'oldLineDiscountRate', width: 100, align: 'right' },
  { title: '原行优惠', key: 'oldLineDiscountAmount', width: 100, align: 'right' },
  { title: '新单价（不含税）', key: 'newUnitPriceExTax', width: 130, align: 'right' },
  { title: '新单价（含税）', key: 'newUnitPriceInTax', width: 120, align: 'right' },
  { title: '新金额（不含税）', key: 'newAmountExTax', width: 122, align: 'right' },
  { title: '新金额（含税）', key: 'newAmountInTax', width: 110, align: 'right' },
  { title: '新行折扣(%)', key: 'newLineDiscountRate', width: 120, align: 'right' },
  { title: '新行优惠', key: 'newLineDiscountAmount', width: 100, align: 'right' },
  { title: '差额（不含税）', key: 'deltaAmountExTax', width: 118, align: 'right' },
  { title: '差额（含税）', key: 'deltaAmountInTax', width: 110, align: 'right' },
]

const showExTaxColumns = computed(() => columnDisplayMode.value !== 'inTax')
const showInTaxColumns = computed(() => columnDisplayMode.value !== 'exTax')

const visibleColumns = computed(() =>
  allColumns.filter((col) => {
    if (!showExTaxColumns.value && exTaxColumnKeys.has(col.key)) return false
    if (!showInTaxColumns.value && inTaxColumnKeys.has(col.key)) return false
    return true
  }),
)

const tableScrollX = computed(() =>
  visibleColumns.value.reduce((sum, col) => sum + (Number(col.width) || 100), 0),
)

const summary = computed(() => summarizePriceChangeLines(form.lines))

function attachDiscountPercent(lines) {
  return (lines || []).map((row) => {
    const next = normalizePriceChangeLine(row, taxModeExcluding.value)
    next._newDiscountPercent = round2(normalizeDiscountRate(next.newLineDiscountRate, 1) * 100)
    return next
  })
}

watch(
  () => [props.open, props.salesOrder?.id, props.pendingChange?.id],
  ([visible]) => {
    if (!visible) return
    columnDisplayMode.value = 'all'
    if (props.pendingChange) {
      form.reasonType = props.pendingChange.reasonType
      form.reason = props.pendingChange.reason || ''
      taxModeExcluding.value = props.pendingChange.taxModeExcluding !== false
      form.lines = attachDiscountPercent(props.pendingChange.lines)
      return
    }
    form.reasonType = undefined
    form.reason = ''
    taxModeExcluding.value = true
    form.lines = attachDiscountPercent(buildPriceChangeDraftLines(props.salesOrder))
  },
)

function onPriceChange(record, editMode = 'unitPrice') {
  recalcPriceChangeLine(record, {
    taxModeExcluding: taxModeExcluding.value,
    editMode,
  })
  record._newDiscountPercent = round2(normalizeDiscountRate(record.newLineDiscountRate, 1) * 100)
}

function onDiscountPercentChange(record) {
  record.newLineDiscountRate = normalizeDiscountRate(
    (Number(record._newDiscountPercent) || 100) / 100,
    1,
  )
  onPriceChange(record, 'discount')
}

watch(columnDisplayMode, (mode) => {
  if (mode === 'inTax') taxModeExcluding.value = false
  if (mode === 'exTax') taxModeExcluding.value = true
})

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
}

function deltaClass(val) {
  const n = Number(val) || 0
  if (n > 0) return 'delta-up'
  if (n < 0) return 'delta-down'
  return ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleSubmit() {
  const res = submitSalesPriceChange({
    salesOrder: props.salesOrder,
    lines: form.lines,
    reasonType: form.reasonType,
    reason: form.reason,
    taxModeExcluding: taxModeExcluding.value,
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('done')
  emit('update:open', false)
}

function handleApprove() {
  const res = approveSalesPriceChange(props.pendingChange.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('done')
  emit('update:open', false)
}

function handleReject() {
  const res = rejectSalesPriceChange(props.pendingChange.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('done')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.pending-alert {
  margin-bottom: 12px;
}

.price-change-form {
  margin-bottom: 4px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.tax-toggle-btn {
  color: #1677ff;
  border-color: #91caff;
  background: #e6f4ff;
}

.tax-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.delta-up {
  color: #cf1322;
}

.delta-down {
  color: #389e0d;
}
</style>
