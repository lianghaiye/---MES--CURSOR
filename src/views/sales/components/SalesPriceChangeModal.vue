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
    <div class="price-change-body" :class="{ 'is-review': isReview }">
      <a-alert
        v-if="isReview"
        type="warning"
        show-icon
        class="pending-alert"
        message="待审核：通过后将回写基本信息与销售明细（数量、交期、税率、单价、折扣、取消行）。后续发货按变更后数量与单价计算。"
      />

      <div v-if="isReview" class="meta-display">
        <div class="header-display-item">
          <span class="field-name">变更原因：</span>
          <span class="field-value">{{ formatReasonTypes(form.reasonType) }}</span>
        </div>
        <div class="header-display-item is-wide">
          <span class="field-name">变更说明：</span>
          <span class="field-value">{{ form.reason || '—' }}</span>
        </div>
      </div>
      <a-form v-else layout="vertical" class="price-change-form">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="变更原因" required>
              <a-select
                v-model:value="form.reasonType"
                mode="multiple"
                :options="PRICE_CHANGE_REASON_OPTIONS"
                placeholder="请选择变更原因"
                :max-tag-count="2"
              />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="变更说明">
              <a-input
                v-model:value="form.reason"
                placeholder="如：客户取消某产品、交期调整、未发货部分按新单价执行（选填）"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <div class="section-block modal-basic-card" :class="{ 'is-collapsed': basicInfoCollapsed }">
        <div class="section-title-row">
          <span class="section-title">基本信息</span>
          <a-button type="link" size="small" class="collapse-btn" @click="toggleBasicInfo">
            {{ basicInfoCollapsed ? '展开' : '收起' }}
          </a-button>
        </div>
        <div v-show="!basicInfoCollapsed && isReview" class="header-display">
          <div
            v-for="field in headerDisplayFields"
            :key="field.key"
            class="header-display-item"
            :class="{ 'is-changed': field.changed, 'is-full': field.fullRow }"
          >
            <div class="header-display-line">
              <span class="field-name">{{ field.label }}：</span>
              <span class="field-value">{{ field.value }}</span>
            </div>
            <FieldChangeHint :diff="field.diff" />
          </div>
        </div>
        <a-form v-show="!basicInfoCollapsed && !isReview" layout="inline" class="header-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :span="6">
              <a-form-item label="销售单号">
                <a-input :value="form.orderNo" size="small" readonly />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="紧急度" :class="{ 'is-changed': !!headerDiffs.urgency }">
                <a-select v-model:value="form.header.urgency" size="small" :options="urgencyOpts" />
                <FieldChangeHint :diff="headerDiffs.urgency" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="合同类型" :class="{ 'is-changed': !!headerDiffs.contractType }">
                <a-select
                  v-model:value="form.header.contractType"
                  size="small"
                  :options="contractTypeOpts"
                />
                <FieldChangeHint :diff="headerDiffs.contractType" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="合同编号" :class="{ 'is-changed': !!headerDiffs.contractNo }">
                <a-input
                  v-model:value="form.header.contractNo"
                  size="small"
                  placeholder="请输入 合同编号"
                />
                <FieldChangeHint :diff="headerDiffs.contractNo" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item
                label="结算币种"
                :class="{ 'is-changed': !!headerDiffs.settlementCurrency }"
              >
                <a-select
                  v-model:value="form.header.settlementCurrency"
                  size="small"
                  :options="currencyOpts"
                />
                <FieldChangeHint :diff="headerDiffs.settlementCurrency" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="订单类型" :class="{ 'is-changed': !!headerDiffs.orderType }">
                <a-select
                  v-model:value="form.header.orderType"
                  size="small"
                  :options="orderTypeOpts"
                />
                <FieldChangeHint :diff="headerDiffs.orderType" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item
                label="客户名称"
                required
                :class="{ 'is-changed': !!headerDiffs.customerName }"
              >
                <CustomerSelect
                  v-model="form.header.customerName"
                  size="small"
                  placeholder="请搜索或选择客户名称"
                  @change="onCustomerChange"
                />
                <FieldChangeHint :diff="headerDiffs.customerName" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="联系人" :class="{ 'is-changed': !!headerDiffs.contactPerson }">
                <a-select
                  v-model:value="form.header.contactPerson"
                  size="small"
                  placeholder="请选择 联系人"
                  allow-clear
                  :options="contactOpts"
                  @change="onContactChange"
                />
                <FieldChangeHint :diff="headerDiffs.contactPerson" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="联系人电话" :class="{ 'is-changed': !!headerDiffs.contactPhone }">
                <a-input
                  v-model:value="form.header.contactPhone"
                  size="small"
                  placeholder="请输入 联系人电话"
                />
                <FieldChangeHint :diff="headerDiffs.contactPhone" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item
                label="交货地址"
                :class="{ 'is-changed': !!headerDiffs.deliveryAddress }"
              >
                <a-input
                  v-model:value="form.header.deliveryAddress"
                  size="small"
                  placeholder="请输入 交货地址"
                />
                <FieldChangeHint :diff="headerDiffs.deliveryAddress" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="交货方式" :class="{ 'is-changed': !!headerDiffs.deliveryMethod }">
                <a-select
                  v-model:value="form.header.deliveryMethod"
                  size="small"
                  :options="deliveryMethodOpts"
                />
                <FieldChangeHint :diff="headerDiffs.deliveryMethod" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item
                label="技术规范编码"
                :class="{ 'is-changed': !!headerDiffs.techSpecCode }"
              >
                <a-input
                  v-model:value="form.header.techSpecCode"
                  size="small"
                  placeholder="请输入 技术规范编码"
                />
                <FieldChangeHint :diff="headerDiffs.techSpecCode" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="提醒日期" :class="{ 'is-changed': !!headerDiffs.reminderDate }">
                <a-date-picker
                  v-model:value="form.header.reminderDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择 提醒日期"
                />
                <FieldChangeHint :diff="headerDiffs.reminderDate" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="业务员" :class="{ 'is-changed': !!headerDiffs.salesperson }">
                <a-select
                  v-model:value="form.header.salesperson"
                  size="small"
                  :options="salespersonOpts"
                  show-search
                />
                <FieldChangeHint :diff="headerDiffs.salesperson" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="结算类型" :class="{ 'is-changed': !!headerDiffs.settlementType }">
                <a-select
                  v-model:value="form.header.settlementType"
                  size="small"
                  allow-clear
                  placeholder="请选择 结算类型"
                  :options="settlementTypeOpts"
                />
                <FieldChangeHint :diff="headerDiffs.settlementType" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="付款比例" :class="{ 'is-changed': !!headerDiffs.paymentRatio }">
                <a-select
                  v-model:value="form.header.paymentRatio"
                  size="small"
                  allow-clear
                  placeholder="请选择 付款比例"
                  :options="paymentRatioOpts"
                />
                <FieldChangeHint :diff="headerDiffs.paymentRatio" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item
                label="首付/定金金额"
                :class="{ 'is-changed': !!headerDiffs.downPaymentAmount }"
              >
                <a-input-number
                  v-model:value="form.header.downPaymentAmount"
                  size="small"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  placeholder="请输入 首付/定金金额"
                />
                <FieldChangeHint :diff="headerDiffs.downPaymentAmount" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item
                label="备注"
                class="remark-item"
                :class="{ 'is-changed': !!headerDiffs.remark }"
              >
                <a-textarea
                  v-model:value="form.header.remark"
                  :rows="2"
                  :maxlength="1000"
                  show-count
                  placeholder="请输入 备注"
                />
                <FieldChangeHint :diff="headerDiffs.remark" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

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
        class="price-change-table"
        :columns="visibleColumns"
        :data-source="form.lines"
        :pagination="false"
        :row-class-name="lineRowClassName"
        :scroll="{ x: tableScrollX, y: 'calc(100vh - 480px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'productName'">
            <span>{{ record.productName || '—' }}</span>
            <a-tag v-if="record.cancelled" color="default" class="cancelled-tag">已取消</a-tag>
          </template>
          <template v-else-if="isMoneyKey(column.key)">
            {{ formatPriceChangeAbsMoney(record[column.key]) }}
          </template>
          <template v-else-if="column.key === 'oldLineDiscountRate'">
            {{ formatPriceChangeDiscount(record.oldLineDiscountRate) }}
          </template>
          <template v-else-if="column.key === 'newQty'">
            <a-input-number
              v-if="!isReview && !record.cancelled"
              v-model:value="record.newQty"
              :min="Number(record.appliedShipQty) || 0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              class="line-editor"
              :class="{ 'cell-changed': qtyChanged(record) }"
              style="width: 100%"
              @change="() => onPriceChange(record, 'unitPrice')"
            />
            <span v-else :class="{ 'cell-changed': qtyChanged(record) }">{{
              record.newQty ?? '—'
            }}</span>
          </template>
          <template v-else-if="column.key === 'newDeliveryDate'">
            <a-date-picker
              v-if="!isReview"
              :value="record.newDeliveryDate ? dayjs(record.newDeliveryDate) : null"
              size="small"
              style="width: 100%"
              :disabled="record.cancelled"
              @change="(val) => onDeliveryDateChange(record, val)"
            />
            <span v-else>{{ record.newDeliveryDate || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'newTaxRate'">
            <a-input-number
              v-if="!isReview"
              v-model:value="record.newTaxRate"
              :min="0"
              :max="100"
              :precision="2"
              :disabled="record.cancelled"
              class="line-editor"
              :class="{ 'cell-changed': taxChanged(record) }"
              style="width: 100%"
              @change="() => onPriceChange(record, 'unitPrice')"
            />
            <span v-else :class="{ 'cell-changed': taxChanged(record) }">{{
              record.newTaxRate ?? '—'
            }}</span>
          </template>
          <template v-else-if="column.key === 'newUnitPriceExTax'">
            <a-input-number
              v-if="!isReview && taxModeExcluding"
              v-model:value="record.newUnitPriceExTax"
              :min="0"
              :precision="2"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              :disabled="record.cancelled"
              class="line-editor"
              :class="{ 'cell-changed': priceExChanged(record) }"
              style="width: 100%"
              @change="() => onPriceChange(record, 'unitPrice')"
            />
            <span v-else :class="{ 'cell-changed': priceExChanged(record) }">{{
              formatPriceChangeAbsMoney(record.newUnitPriceExTax)
            }}</span>
          </template>
          <template v-else-if="column.key === 'newUnitPriceInTax'">
            <a-input-number
              v-if="!isReview && !taxModeExcluding"
              v-model:value="record.newUnitPriceInTax"
              :min="0"
              :precision="2"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              :disabled="record.cancelled"
              class="line-editor"
              :class="{ 'cell-changed': priceInChanged(record) }"
              style="width: 100%"
              @change="() => onPriceChange(record, 'unitPrice')"
            />
            <span v-else :class="{ 'cell-changed': priceInChanged(record) }">{{
              formatPriceChangeAbsMoney(record.newUnitPriceInTax)
            }}</span>
          </template>
          <template v-else-if="column.key === 'newLineDiscountRate'">
            <a-input-number
              v-if="canEditDiscount && !record.cancelled"
              v-model:value="record._newDiscountPercent"
              :min="0"
              :precision="2"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
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
          <template v-else-if="column.key === 'action'">
            <template v-if="isReview">
              <a-tag v-if="record.cancelled" color="default">已取消</a-tag>
              <span v-else>—</span>
            </template>
            <a-button
              v-else-if="record.cancelled"
              type="link"
              size="small"
              @click="toggleCancelLine(record)"
            >
              恢复
            </a-button>
            <a-tooltip
              v-else-if="!canCancelPriceChangeLine(record)"
              title="该明细已全部占用发货，无法取消未发部分"
            >
              <a-button type="link" size="small" disabled>取消行</a-button>
            </a-tooltip>
            <a-button v-else type="link" size="small" danger @click="toggleCancelLine(record)">
              取消行
            </a-button>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>

      <div class="summary-bar">
        <template v-if="showExTaxColumns">
          <span>原总额（不含税） {{ formatPriceChangeAbsMoney(summary.oldAmountExTax) }}</span>
        </template>
        <template v-if="showInTaxColumns">
          <span>原总额（含税） {{ formatPriceChangeAbsMoney(summary.oldAmountInTax) }}</span>
        </template>
        <template v-if="showExTaxColumns">
          <span>变更后总额（不含税） {{ formatPriceChangeAbsMoney(summary.newAmountExTax) }}</span>
        </template>
        <template v-if="showInTaxColumns">
          <span>变更后总额（含税） {{ formatPriceChangeAbsMoney(summary.newAmountInTax) }}</span>
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
        「取消行」保留明细履历，未发部分不再交付；已占用发货的数量不能再往下调。改单价仅互算含税/不含税金额，不联动行折扣；改折扣会按标准价反算含税/不含税单价。
      </p>
    </div>

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
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { isLineDiscountDisabled, normalizeDiscountRate, round2 } from '@/utils/salesOrderPricing'
import { inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import {
  ORDER_CHANGE_HEADER_KEYS,
  ORDER_CHANGE_HEADER_LABELS,
  PRICE_CHANGE_REASON_OPTIONS,
  PRICE_CHANGE_STATUS,
  buildPriceChangeDraftLines,
  canCancelPriceChangeLine,
  formatOrderChangeHeaderValue,
  formatPriceChangeAbsMoney,
  formatPriceChangeDiscount,
  formatPriceChangeMoney,
  formatReasonTypes,
  isCustomerChanged,
  listOrderChangeHeaderDiffs,
  normalizePriceChangeLine,
  normalizeReasonTypes,
  recalcPriceChangeLine,
  snapshotOrderChangeHeader,
  summarizePriceChangeLines,
} from '@/utils/salesPriceChange'
import {
  approveSalesPriceChange,
  rejectSalesPriceChange,
  submitSalesPriceChange,
} from '@/store/salesPriceChangeStore'
import { getCustomerOptions } from '@/store/customerStore'
import {
  urgencyOptions,
  contractTypeOptions,
  settlementCurrencyOptions,
  orderTypeOptions,
  deliveryMethodOptions,
  settlementTypeOptions,
  paymentRatioOptions,
  salespersonOptions,
} from '@/mock/salesOrderOptions'
import CustomerSelect from './CustomerSelect.vue'

const FieldChangeHint = defineComponent({
  name: 'FieldChangeHint',
  props: {
    diff: { type: Object, default: null },
  },
  setup(props) {
    return () => {
      if (!props.diff) return null
      return h('div', { class: 'field-change-hint' }, [
        h('span', `原${props.diff.label}：${props.diff.oldValue}`),
        h('span', { class: 'hint-arrow', 'aria-hidden': 'true' }, '→'),
        h('span', `新${props.diff.label}：${props.diff.newValue}`),
      ])
    }
  },
})

const props = defineProps({
  open: { type: Boolean, default: false },
  salesOrder: { type: Object, default: null },
  pendingChange: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'done'])

const isReview = computed(() => props.pendingChange?.status === PRICE_CHANGE_STATUS.PENDING)

const taxModeExcluding = ref(true)
const columnDisplayMode = ref('all')
const basicInfoCollapsed = ref(false)
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

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const contractTypeOpts = contractTypeOptions.map((v) => ({ label: v, value: v }))
const currencyOpts = settlementCurrencyOptions.map((v) => ({ label: v, value: v }))
const orderTypeOpts = orderTypeOptions.map((v) => ({ label: v, value: v }))
const deliveryMethodOpts = deliveryMethodOptions.map((v) => ({ label: v, value: v }))
const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const paymentRatioOpts = paymentRatioOptions.map((v) => ({ label: v, value: v }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const modalTitle = computed(() =>
  isReview.value
    ? `审核订单变更 ${props.pendingChange?.changeNo || ''}`.trim()
    : `订单变更 ${props.salesOrder?.orderNo || ''}`.trim(),
)

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价录入，系统自动反算含税价（不联动行折扣）'
    : '当前：按含税单价录入，系统自动反算不含税价（不联动行折扣）',
)

const canEditDiscount = computed(
  () => !isReview.value && !isLineDiscountDisabled(props.salesOrder?.discountStrategy),
)

const form = reactive({
  reasonType: [],
  reason: '',
  orderNo: '',
  oldCustomerName: '',
  newCustomerName: '',
  headerOld: snapshotOrderChangeHeader(),
  header: toHeaderDraft(),
  lines: [],
})

const contactOpts = computed(() => {
  const customer = getCustomerOptions().find((c) => c.value === form.header.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

const headerDiffs = computed(() => {
  const map = {}
  listOrderChangeHeaderDiffs(form.headerOld, snapshotOrderChangeHeader(form.header)).forEach(
    (item) => {
      map[item.key] = item
    },
  )
  return map
})

const headerDisplayFields = computed(() => {
  const snap = snapshotOrderChangeHeader(form.header)
  return [
    {
      key: 'orderNo',
      label: '销售单号',
      value: form.orderNo || '—',
      changed: false,
      diff: null,
      fullRow: false,
    },
    ...ORDER_CHANGE_HEADER_KEYS.map((key) => ({
      key,
      label: ORDER_CHANGE_HEADER_LABELS[key] || key,
      value: formatOrderChangeHeaderValue(key, snap[key]),
      changed: Boolean(headerDiffs.value[key]),
      diff: headerDiffs.value[key] || null,
      fullRow: key === 'remark',
    })),
  ]
})

function numChanged(a, b) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) > 1e-9
}

function qtyChanged(row) {
  return numChanged(row?.newQty, row?.oldQty)
}

function taxChanged(row) {
  return numChanged(row?.newTaxRate, row?.oldTaxRate)
}

function priceExChanged(row) {
  return numChanged(row?.newUnitPriceExTax, row?.oldUnitPriceExTax)
}

function priceInChanged(row) {
  return numChanged(row?.newUnitPriceInTax, row?.oldUnitPriceInTax)
}

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

function toHeaderDraft(source = {}) {
  const snap = snapshotOrderChangeHeader(source)
  return {
    ...snap,
    reminderDate: snap.reminderDate ? dayjs(snap.reminderDate) : null,
  }
}

function toggleBasicInfo() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value
}

const allColumns = [
  {
    title: '产品名称',
    key: 'productName',
    dataIndex: 'productName',
    width: 168,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '原数量', dataIndex: 'oldQty', width: 72, align: 'right' },
  { title: '新数量', key: 'newQty', width: 100, align: 'right' },
  { title: '已占用发货', dataIndex: 'appliedShipQty', width: 96, align: 'right' },
  { title: '原交货日期', dataIndex: 'oldDeliveryDate', width: 110 },
  { title: '新交货日期', key: 'newDeliveryDate', width: 140 },
  { title: '原税率(%)', dataIndex: 'oldTaxRate', width: 88, align: 'right' },
  { title: '新税率(%)', key: 'newTaxRate', width: 100, align: 'right' },
  { title: '原单价（不含税）', key: 'oldUnitPriceExTax', width: 122, align: 'right' },
  { title: '原单价（含税）', key: 'oldUnitPriceInTax', width: 110, align: 'right' },
  { title: '原总额（不含税）', key: 'oldAmountExTax', width: 122, align: 'right' },
  { title: '原总额（含税）', key: 'oldAmountInTax', width: 110, align: 'right' },
  { title: '原行折扣(%)', key: 'oldLineDiscountRate', width: 100, align: 'right' },
  { title: '原行优惠', key: 'oldLineDiscountAmount', width: 100, align: 'right' },
  { title: '新单价（不含税）', key: 'newUnitPriceExTax', width: 130, align: 'right' },
  { title: '新单价（含税）', key: 'newUnitPriceInTax', width: 120, align: 'right' },
  { title: '新总额（不含税）', key: 'newAmountExTax', width: 122, align: 'right' },
  { title: '新总额（含税）', key: 'newAmountInTax', width: 110, align: 'right' },
  { title: '新行折扣(%)', key: 'newLineDiscountRate', width: 120, align: 'right' },
  { title: '新行优惠', key: 'newLineDiscountAmount', width: 100, align: 'right' },
  { title: '差额（不含税）', key: 'deltaAmountExTax', width: 118, align: 'right' },
  { title: '差额（含税）', key: 'deltaAmountInTax', width: 110, align: 'right' },
  { title: '操作', key: 'action', width: 88, align: 'center', fixed: 'right' },
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

function lineRowClassName(record) {
  return record.cancelled ? 'line-cancelled' : ''
}

watch(
  () => [props.open, props.salesOrder?.id, props.pendingChange?.id],
  ([visible]) => {
    if (!visible) return
    columnDisplayMode.value = 'all'
    basicInfoCollapsed.value = false
    if (props.pendingChange) {
      form.reasonType = normalizeReasonTypes(props.pendingChange.reasonType)
      form.reason = props.pendingChange.reason || ''
      form.orderNo = props.pendingChange.salesOrderNo || props.salesOrder?.orderNo || ''
      form.headerOld = snapshotOrderChangeHeader(
        props.pendingChange.headerOld || {
          customerName: props.pendingChange.oldCustomerName || props.salesOrder?.customerName,
        },
      )
      form.header = toHeaderDraft(
        props.pendingChange.headerNew || {
          ...(props.salesOrder || {}),
          customerName: props.pendingChange.newCustomerName || form.headerOld.customerName,
        },
      )
      form.oldCustomerName = String(form.headerOld.customerName || '').trim()
      form.newCustomerName = String(form.header.customerName || form.oldCustomerName).trim()
      taxModeExcluding.value = props.pendingChange.taxModeExcluding !== false
      form.lines = attachDiscountPercent(props.pendingChange.lines)
      return
    }
    form.reasonType = []
    form.reason = ''
    form.orderNo = props.salesOrder?.orderNo || ''
    form.headerOld = snapshotOrderChangeHeader(props.salesOrder)
    form.header = toHeaderDraft(props.salesOrder)
    form.oldCustomerName = String(form.headerOld.customerName || '').trim()
    form.newCustomerName = form.oldCustomerName
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

function onDeliveryDateChange(record, val) {
  record.newDeliveryDate = val ? val.format('YYYY-MM-DD') : ''
}

function toggleCancelLine(record) {
  if (record.cancelled) {
    record.cancelled = false
    if (!record.oldCancelled) record.newQty = record.oldQty
    onPriceChange(record, 'unitPrice')
    return
  }
  if (!canCancelPriceChangeLine(record)) {
    message.warning('该明细已全部占用发货，无法取消未发部分')
    return
  }
  record.cancelled = true
  onPriceChange(record, 'unitPrice')
  message.info('已标记取消行：未发部分不再交付，明细仍保留在订单履历，审核通过后生效。')
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

function onCustomerChange(nextName) {
  form.header.customerName = nextName || ''
  form.header.contactPerson = undefined
  form.header.contactPhone = ''
  form.newCustomerName = form.header.customerName
  if (isCustomerChanged(form)) {
    message.info(`原客户：${form.oldCustomerName || '—'} → 新客户：${form.newCustomerName || '—'}`)
  }
}

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.header.contactPhone = contact.phone
}

function handleSubmit() {
  form.newCustomerName = form.header.customerName
  const res = submitSalesPriceChange({
    salesOrder: props.salesOrder,
    lines: form.lines,
    reasonType: form.reasonType,
    reason: form.reason,
    taxModeExcluding: taxModeExcluding.value,
    oldCustomerName: form.oldCustomerName,
    newCustomerName: form.header.customerName,
    headerOld: form.headerOld,
    headerNew: snapshotOrderChangeHeader(form.header),
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

.section-block {
  margin-bottom: 12px;
  padding: 8px 12px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.collapse-btn {
  padding: 0;
}

.meta-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-bottom: 12px;
}

.header-display {
  display: flex;
  flex-wrap: wrap;
}

.header-display-item {
  width: 25%;
  min-width: 180px;
  padding: 6px 10px;
  border-radius: 4px;
  box-sizing: border-box;

  &.is-wide {
    width: 75%;
    min-width: 240px;
  }

  &.is-full {
    width: 100%;
  }

  &.is-changed {
    background: #fff7e6;
  }
}

.header-display-line {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.field-name {
  flex: 0 0 auto;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  line-height: 22px;
  white-space: nowrap;
}

.field-value {
  min-width: 0;
  color: rgba(0, 0, 0, 0.88);
  font-size: 13px;
  line-height: 22px;
  word-break: break-all;
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;
    padding-top: 4px;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-form-item.is-changed .ant-select-selector),
  :deep(.ant-form-item.is-changed .ant-input),
  :deep(.ant-form-item.is-changed .ant-input-number),
  :deep(.ant-form-item.is-changed .ant-picker),
  :deep(.ant-form-item.is-changed textarea) {
    background: #fff7e6;
    border-color: #ffd591;
  }
}

:deep(.field-change-hint) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #d46b08;
}

:deep(.hint-arrow) {
  margin: 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fa8c16;
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

.cancelled-tag {
  margin-left: 6px;
}

.cell-changed {
  color: #cf1322 !important;
  font-weight: 600;
}

.price-change-table {
  :deep(.line-editor.cell-changed .ant-input-number-input) {
    color: #cf1322;
    font-weight: 600;
  }

  :deep(tr.line-cancelled > td) {
    background: #f5f5f5 !important;
  }
}
</style>
