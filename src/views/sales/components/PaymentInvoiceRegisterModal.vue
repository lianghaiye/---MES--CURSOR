<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    ok-text="登记"
    destroy-on-close
    :mask-closable="false"
    width="960px"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical" class="payment-invoice-form">
      <a-row v-if="showTarget" :gutter="16">
        <a-col :span="8">
          <a-form-item label="挂接对象" required>
            <a-radio-group
              v-model:value="form.linkType"
              :options="paymentLinkTypeOptions"
              @change="onLinkTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item v-if="form.linkType === PAYMENT_LINK_TYPE.CONTRACT" label="合同" required>
            <a-select
              v-model:value="form.contractNo"
              show-search
              :options="contractOpts"
              placeholder="选择合同"
              style="width: 100%"
              @change="onContractChange"
            />
          </a-form-item>
          <a-form-item v-else label="销售订单" required>
            <a-select
              v-model:value="form.salesOrderNo"
              show-search
              :options="orderOpts"
              placeholder="选择销售订单"
              style="width: 100%"
              @change="onOrderChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="回款节点" :required="!isOrderLink">
            <a-select
              v-model:value="form.nodeName"
              allow-clear
              :options="nodeOpts"
              :placeholder="isOrderLink ? '选填，可不指定节点' : '请选择节点'"
              style="width: 100%"
              @change="onNodeChange"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="node-summary">
        <div v-if="!showTarget" class="node-summary-item">
          <div class="node-summary-label">计划节点</div>
          <div class="node-summary-value">{{ displayNodeName }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">计划金额</div>
          <div class="node-summary-value">¥ {{ formatMoney(activeNode?.planAmount) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">已开票</div>
          <div class="node-summary-value">¥ {{ formatMoney(activeNode?.invoiceAmount) }}</div>
        </div>
        <div class="node-summary-item">
          <div class="node-summary-label">待开票</div>
          <div class="node-summary-value remain">¥ {{ formatMoney(remainInvoice) }}</div>
        </div>
      </div>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="开票金额" required>
            <a-input-number
              v-model:value="form.invoiceAmount"
              :min="0"
              :precision="2"
              style="width: 100%"
              placeholder="请输入开票金额"
              @change="onAmountOrRateChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发票号码">
            <a-input v-model:value="form.invoiceNo" allow-clear placeholder="请输入发票号码" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="开票日期">
            <a-date-picker v-model:value="form.invoiceDate" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="税率（%）">
            <a-input-number
              v-model:value="form.taxRate"
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
              v-model:value="form.taxAmount"
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
            <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  PAYMENT_LINK_TYPE,
  paymentLinkTypeOptions,
} from '@/constants/salesContract'
import { addSalesInvoice } from '@/store/salesPaymentStore'
import { getPresetPaymentNodes } from '@/store/contractPaymentNodePresetStore'
import { getOrderPresetPaymentNodes } from '@/store/salesOrderPaymentNodePresetStore'
import { getSalesContractByNo, salesContractState } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo, salesOrderState } from '@/store/salesOrderStore'

defineOptions({ name: 'PaymentInvoiceRegisterModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  summary: { type: Object, default: null },
  node: { type: Object, default: null },
  preferOrderTab: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const DEFAULT_TAX_RATE = 13

const form = reactive({
  linkType: PAYMENT_LINK_TYPE.CONTRACT,
  contractNo: undefined,
  salesOrderNo: undefined,
  nodeName: undefined,
  invoiceNo: '',
  invoiceDate: undefined,
  invoiceAmount: null,
  taxRate: DEFAULT_TAX_RATE,
  taxAmount: null,
  remark: '',
})

const taxEdited = ref(false)

const showTarget = computed(() => !props.node)

const isOrderLink = computed(() => form.linkType === PAYMENT_LINK_TYPE.SALES_ORDER)

const modalTitle = computed(() => {
  const name = displayNodeName.value
  return name && name !== '—' ? `登记开票 · ${name}` : '登记开票'
})

const displayNodeName = computed(() => props.node?.name || form.nodeName || '—')

const remainInvoice = computed(() => {
  const plan = Number(activeNode.value?.planAmount) || 0
  const invoiced = Number(activeNode.value?.invoiceAmount) || 0
  return Math.max(0, round2(plan - invoiced))
})

const activeNode = computed(() => {
  if (props.node) return props.node
  const rows = currentPlanRows.value
  return rows.find((n) => n.name === form.nodeName) || null
})

const currentPlanRows = computed(() => {
  if (props.summary?.planRows?.length) return props.summary.planRows
  return []
})

const contractOpts = computed(() =>
  salesContractState.contracts
    .filter((c) => c.status === CONTRACT_STATUS.ACTIVE || c.status === CONTRACT_STATUS.COMPLETED)
    .map((c) => ({
      label: `${c.contractNo} · ${c.customerName || ''}`,
      value: c.contractNo,
    })),
)

const orderOpts = computed(() =>
  salesOrderState.orders.map((o) => ({
    label: `${o.orderNo} · ${o.customerName || ''}`,
    value: o.orderNo,
  })),
)

function nodeSelectOptions(nodes = []) {
  const seen = new Set()
  return (nodes || [])
    .map((n) => String(n?.name || n || '').trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
    .map((name) => ({ label: name, value: name }))
}

const nodeOpts = computed(() => {
  if (props.summary?.planRows?.length) return nodeSelectOptions(props.summary.planRows)
  if (form.linkType === PAYMENT_LINK_TYPE.CONTRACT && form.contractNo) {
    const contract = getSalesContractByNo(form.contractNo)
    const fromContract = nodeSelectOptions(contract?.paymentNodes)
    if (fromContract.length) return fromContract
    return nodeSelectOptions(
      getPresetPaymentNodes(
        contract?.contractType || CONTRACT_TYPE.STANDARD,
        CONTRACT_CASH_DIRECTION.INCOME,
      ),
    )
  }
  const order = form.salesOrderNo ? findSalesOrderByOrderNo(form.salesOrderNo) : null
  const contract = order?.contractNo ? getSalesContractByNo(order.contractNo) : null
  if (contract) {
    const fromContract = nodeSelectOptions(contract?.paymentNodes)
    if (fromContract.length) return fromContract
    return nodeSelectOptions(
      getPresetPaymentNodes(
        contract?.contractType || CONTRACT_TYPE.STANDARD,
        CONTRACT_CASH_DIRECTION.INCOME,
      ),
    )
  }
  return nodeSelectOptions(getOrderPresetPaymentNodes())
})

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcTax(amount, rate) {
  const a = Number(amount) || 0
  const r = Number(rate)
  if (!(a > 0) || !Number.isFinite(r) || r < 0) return null
  return round2((a * r) / (100 + r))
}

function onAmountOrRateChange() {
  if (taxEdited.value) return
  form.taxAmount = calcTax(form.invoiceAmount, form.taxRate)
}

function remainingAmount(node) {
  if (!node) return null
  const remain = round2((Number(node.planAmount) || 0) - (Number(node.invoiceAmount) || 0))
  return remain > 0 ? remain : null
}

function resetForm() {
  taxEdited.value = false
  const summary = props.summary
  const node = props.node
  const isOrder =
    summary?.linkType === PAYMENT_LINK_TYPE.SALES_ORDER ||
    (!summary?.contractNo && Boolean(summary?.salesOrderNo)) ||
    props.preferOrderTab
  form.linkType = isOrder ? PAYMENT_LINK_TYPE.SALES_ORDER : PAYMENT_LINK_TYPE.CONTRACT
  form.contractNo = isOrder ? undefined : summary?.contractNo || undefined
  form.salesOrderNo = isOrder ? summary?.salesOrderNo || undefined : undefined
  form.nodeName = node?.name || undefined
  form.invoiceNo = ''
  form.invoiceDate = dayjs()
  form.invoiceAmount = remainingAmount(node)
  form.taxRate = DEFAULT_TAX_RATE
  form.taxAmount = calcTax(form.invoiceAmount, form.taxRate)
  form.remark = ''
  if (!node && summary?.planRows?.length) {
    const remainNode = summary.planRows.find((n) => remainingAmount(n) > 0) || summary.planRows[0]
    form.nodeName = remainNode?.name
    form.invoiceAmount = remainingAmount(remainNode)
    form.taxAmount = calcTax(form.invoiceAmount, form.taxRate)
  }
}

watch(
  () => [props.open, props.summary, props.node],
  () => {
    if (props.open) resetForm()
  },
)

function onLinkTypeChange() {
  form.contractNo = undefined
  form.salesOrderNo = undefined
  form.nodeName = undefined
  form.invoiceAmount = null
  form.taxAmount = taxEdited.value ? form.taxAmount : null
}

function onContractChange() {
  form.nodeName = undefined
  form.invoiceAmount = null
}

function onOrderChange() {
  form.nodeName = undefined
  form.invoiceAmount = null
}

function onNodeChange() {
  const node = activeNode.value
  form.invoiceAmount = remainingAmount(node)
  if (!taxEdited.value) form.taxAmount = calcTax(form.invoiceAmount, form.taxRate)
}

function handleOk() {
  const invoiceNo = String(form.invoiceNo || '').trim()
  if (!(Number(form.invoiceAmount) > 0) && !invoiceNo) {
    message.warning('请填写开票金额或发票号码')
    return Promise.reject()
  }

  const isOrder = form.linkType === PAYMENT_LINK_TYPE.SALES_ORDER
  const contractNo = isOrder ? '' : props.summary?.contractNo || form.contractNo || ''
  const salesOrderNo = isOrder ? props.summary?.salesOrderNo || form.salesOrderNo || '' : ''
  const nodeName = props.node?.name || form.nodeName
  if (!isOrder && !nodeName) {
    message.warning('请选择回款节点')
    return Promise.reject()
  }
  if (isOrder && !salesOrderNo) {
    message.warning('请选择销售订单')
    return Promise.reject()
  }
  if (!isOrder && !contractNo) {
    message.warning('请选择合同')
    return Promise.reject()
  }

  const node = props.node || activeNode.value
  const res = addSalesInvoice({
    planId: node?.id || '',
    node,
    linkType: isOrder ? PAYMENT_LINK_TYPE.SALES_ORDER : PAYMENT_LINK_TYPE.CONTRACT,
    contractNo,
    salesOrderNo,
    customerName: props.summary?.customerName || '',
    nodeName,
    amount: form.invoiceAmount,
    taxRate: form.taxRate,
    taxAmount: form.taxAmount,
    invoiceNo,
    invoiceDate: form.invoiceDate ? form.invoiceDate.format('YYYY-MM-DD') : '',
    remark: form.remark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success('开票已登记')
  emit('saved')
  emit('update:open', false)
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.payment-invoice-form {
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
  padding: 0 16px;
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
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
  word-break: break-all;

  &.remain {
    color: #1677ff;
  }
}
</style>
