<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    destroy-on-close
    :mask-closable="false"
    :ok-text="okText"
    :width="modalWidth"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical" class="payment-node-form">
      <template v-if="mode === 'startDate'">
        <a-row v-if="showNodeSelect" :gutter="16">
          <a-col :span="12">
            <a-form-item :label="summary?.linkType === '销售订单' ? '销售订单' : '合同'">
              <span>{{
                summary?.displayNo || summary?.contractNo || summary?.salesOrderNo || '—'
              }}</span>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="回款节点" required>
              <a-select
                v-model:value="form.nodeName"
                :options="startNodeOpts"
                placeholder="请选择节点"
                style="width: 100%"
                @change="onStartNodeChange"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="node-summary">
          <div v-if="!showNodeSelect" class="node-summary-item">
            <div class="node-summary-label">计划节点</div>
            <div class="node-summary-value">{{ activeNode?.name || '—' }}</div>
          </div>
          <div class="node-summary-item">
            <div class="node-summary-label">计划金额</div>
            <div class="node-summary-value">¥ {{ formatMoney(activeNode?.planAmount) }}</div>
          </div>
          <div class="node-summary-item">
            <div class="node-summary-label">账期天数</div>
            <div class="node-summary-value">
              {{ activeNode?.termDays != null ? `${activeNode.termDays} 天` : '未设' }}
            </div>
          </div>
          <div class="node-summary-item">
            <div class="node-summary-label">当前到期日</div>
            <div class="node-summary-value">{{ previewDueDate || '—' }}</div>
          </div>
        </div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="账期起算类型">
              <a-select
                v-model:value="form.termStartType"
                allow-clear
                placeholder="请选择"
                :options="termStartOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="`起算日${form.termStartType ? `（${form.termStartType}）` : ''}`">
              <a-date-picker
                v-model:value="form.startDate"
                style="width: 100%"
                placeholder="取不到时可后补"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="field-tip">补写起算日后按账期天数重算到期日。</div>
      </template>

      <template v-else-if="mode === 'invoice'">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="计划节点">
              <span>{{ node?.name || '—' }}</span>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计划金额">
              <span>¥ {{ formatMoney(node?.planAmount) }}</span>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="已开票">
              <span>¥ {{ formatMoney(node?.invoiceAmount) }}</span>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="开票金额" required>
              <a-input-number
                v-model:value="form.invoiceAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入开票金额"
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
        <a-row :gutter="12">
          <a-col :span="24">
            <a-form-item label="备注">
              <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
            </a-form-item>
          </a-col>
        </a-row>
      </template>

      <template v-else>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="计划节点">
              <span>{{ node?.name || '—' }}</span>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计划金额">
              <span>¥ {{ formatMoney(node?.planAmount) }}</span>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="isExpense ? '待付金额' : '待收金额'">
              <span>¥ {{ formatMoney(node?.unpaid) }}</span>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row v-if="!isExpense && !isSalesOrderLink" :gutter="12">
          <a-col :span="24">
            <a-form-item label="关联销售订单">
              <a-select
                v-model:value="form.salesOrderNos"
                mode="multiple"
                show-search
                allow-clear
                :options="linkedOrderOpts"
                placeholder="可选，支持多选"
                style="width: 100%"
                option-filter-prop="label"
              />
              <div v-if="!linkedOrderOpts.length" class="field-tip">该合同暂无关联销售订单</div>
              <div v-if="selectedLinkedOrders.length" class="selected-order-panel">
                <a-table
                  size="small"
                  bordered
                  :pagination="false"
                  :columns="selectedOrderColumns"
                  :data-source="selectedLinkedOrders"
                  row-key="orderNo"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'amount'">
                      ¥ {{ formatMoney(record.amount) }}
                    </template>
                  </template>
                </a-table>
                <div class="selected-order-total">
                  合计金额（含税）：¥ {{ formatMoney(selectedLinkedOrderTotal) }}
                </div>
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item :label="`${paymentNoun}金额`" required>
              <a-input-number
                v-model:value="form.amount"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                :placeholder="`请输入${paymentNoun}金额`"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="`${paymentNoun}方式`">
              <a-select
                v-model:value="form.paymentMethod"
                allow-clear
                placeholder="请选择"
                :options="paymentMethodOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="isExpense ? '付款日期' : '到账日期'">
              <a-date-picker v-model:value="form.receivedAt" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="24">
            <a-form-item label="备注">
              <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
            </a-form-item>
          </a-col>
        </a-row>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  CONTRACT_CASH_DIRECTION,
  PAYMENT_LINK_TYPE,
  contractPaymentNoun,
  paymentMethodOptions,
  paymentTermStartOptionsFor,
} from '@/constants/salesContract'
import {
  addSalesInvoice,
  addSalesPayment,
  calcDueDate,
  updatePaymentPlanNode,
} from '@/store/salesPaymentStore'
import { getOrdersLinkedToContract } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo, salesOrderState } from '@/store/salesOrderStore'

defineOptions({ name: 'PaymentNodeMaintainModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  summary: { type: Object, default: null },
  node: { type: Object, default: null },
  /** startDate=维护起算日；register=登记回款/付款；invoice=登记开票 */
  mode: { type: String, default: 'startDate' },
  cashDirection: { type: String, default: CONTRACT_CASH_DIRECTION.INCOME },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  nodeName: undefined,
  termStartType: undefined,
  startDate: null,
  invoiceAmount: null,
  invoiceNo: '',
  invoiceDate: null,
  paymentMethod: undefined,
  salesOrderNos: [],
  amount: null,
  receivedAt: dayjs(),
  remark: '',
})

const selectedOrderColumns = [
  { title: '销售单号', dataIndex: 'orderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', ellipsis: true },
  { title: '金额（含税）', key: 'amount', width: 120, align: 'right' },
]

const isExpense = computed(() => props.cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE)
const isSalesOrderLink = computed(
  () =>
    props.summary?.linkType === PAYMENT_LINK_TYPE.SALES_ORDER ||
    Boolean(props.summary?.salesOrderNo),
)
const paymentNoun = computed(() => contractPaymentNoun(props.cashDirection))
const termStartOpts = computed(() => paymentTermStartOptionsFor(props.cashDirection))

const showNodeSelect = computed(() => props.mode === 'startDate' && !props.node)

const startNodeOpts = computed(() => {
  const seen = new Set()
  return (props.summary?.planRows || [])
    .map((n) => String(n?.name || '').trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
    .map((name) => ({ label: name, value: name }))
})

const activeNode = computed(() => {
  if (props.node) return props.node
  const rows = props.summary?.planRows || []
  return rows.find((n) => n.name === form.nodeName) || rows[0] || null
})

const previewDueDate = computed(() => {
  const node = activeNode.value
  const start = form.startDate ? form.startDate.format('YYYY-MM-DD') : node?.startDate || ''
  return calcDueDate(start, node?.termDays) || node?.dueDate || ''
})

const modalTitle = computed(() => {
  const name = activeNode.value?.name || props.node?.name || ''
  if (props.mode === 'register') {
    return name ? `登记${paymentNoun.value} · ${name}` : `登记${paymentNoun.value}`
  }
  if (props.mode === 'invoice') {
    return name ? `登记开票 · ${name}` : '登记开票'
  }
  return name ? `维护起算日 · ${name}` : '维护起算日'
})

const okText = computed(() => (props.mode === 'startDate' ? '保存' : '登记'))
const modalWidth = computed(() => {
  if (props.mode === 'startDate') return '960px'
  if (props.mode === 'register') return '780px'
  return '560px'
})

const linkedOrderOpts = computed(() => {
  void salesOrderState.orders
  const no = props.summary?.contractNo
  if (!no) return []
  return getOrdersLinkedToContract(no).map((o) => {
    const amt = Number(o.totalAmountInTax ?? o.amountInTax) || 0
    return {
      label: `${o.orderNo} · ¥${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      value: o.orderNo,
    }
  })
})

const selectedLinkedOrders = computed(() => {
  void salesOrderState.orders
  const nos = Array.isArray(form.salesOrderNos) ? form.salesOrderNos : []
  return nos.map((no) => {
    const o = findSalesOrderByOrderNo(no)
    if (!o) return { orderNo: no, customerName: '—', amount: 0 }
    return {
      orderNo: o.orderNo,
      customerName: o.customerName || '—',
      amount: Number(o.totalAmountInTax ?? o.amountInTax) || 0,
    }
  })
})

const selectedLinkedOrderTotal = computed(() =>
  selectedLinkedOrders.value.reduce((s, r) => s + (Number(r.amount) || 0), 0),
)

function applyStartNode(node) {
  form.nodeName = node?.name || undefined
  form.termStartType = node?.termStartType || undefined
  form.startDate = node?.startDate ? dayjs(node.startDate) : null
}

function pickDefaultStartNode() {
  const rows = props.summary?.planRows || []
  return rows.find((n) => !n.startDate) || rows[0] || null
}

function onStartNodeChange() {
  applyStartNode(activeNode.value)
}

watch(
  () => [props.open, props.node, props.mode, props.summary],
  () => {
    if (!props.open) return
    if (props.mode === 'startDate') {
      applyStartNode(props.node || pickDefaultStartNode())
      return
    }
    if (!props.node) return
    form.termStartType = props.node.termStartType || undefined
    form.startDate = props.node.startDate ? dayjs(props.node.startDate) : null
    const invoiced = Number(props.node.invoiceAmount) || 0
    const remainingInvoice = Math.max(0, round2(Number(props.node.planAmount) || 0) - invoiced)
    form.invoiceAmount =
      props.mode === 'invoice'
        ? remainingInvoice > 0
          ? remainingInvoice
          : Number(props.node.planAmount) || null
        : invoiced > 0
          ? invoiced
          : null
    form.invoiceNo = props.node.invoiceNo || ''
    form.invoiceDate = props.node.invoiceDate ? dayjs(props.node.invoiceDate) : dayjs()
    form.paymentMethod = props.node.paymentMethod || undefined
    form.salesOrderNos = []
    form.amount =
      props.mode === 'register' && (Number(props.node.unpaid) || 0) > 0
        ? Number(props.node.unpaid)
        : null
    form.receivedAt = dayjs()
    form.remark = ''
  },
)

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleOk() {
  const workingNode = props.mode === 'startDate' ? activeNode.value : props.node
  if (!workingNode?.id) {
    message.warning('节点无效')
    return Promise.reject()
  }

  if (props.mode === 'startDate') {
    const patchRes = updatePaymentPlanNode(workingNode.id, {
      termStartType: form.termStartType || '',
      startDate: form.startDate ? form.startDate.format('YYYY-MM-DD') : '',
    })
    if (!patchRes.ok) {
      message.warning(patchRes.message)
      return Promise.reject()
    }
    message.success('起算日已保存')
    emit('saved')
    emit('update:open', false)
    return Promise.resolve()
  }

  if (props.mode === 'invoice') {
    if (!(Number(form.invoiceAmount) > 0) && !String(form.invoiceNo || '').trim()) {
      message.warning('请填写开票金额或发票号码')
      return Promise.reject()
    }
    const isOrder = isSalesOrderLink.value
    const invRes = addSalesInvoice({
      planId: props.node.id,
      node: props.node,
      linkType: isOrder ? PAYMENT_LINK_TYPE.SALES_ORDER : PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: isOrder ? '' : props.summary?.contractNo || '',
      salesOrderNo: isOrder ? props.summary?.salesOrderNo || '' : '',
      customerName: props.summary?.customerName || '',
      nodeName: props.node.name,
      amount: form.invoiceAmount,
      invoiceNo: form.invoiceNo || '',
      invoiceDate: form.invoiceDate ? form.invoiceDate.format('YYYY-MM-DD') : '',
      remark: form.remark,
    })
    if (!invRes.ok) {
      message.warning(invRes.message)
      return Promise.reject()
    }
    message.success('开票已登记')
    emit('saved')
    emit('update:open', false)
    return Promise.resolve()
  }

  if (!(Number(form.amount) > 0)) {
    message.warning(`请填写${paymentNoun.value}金额`)
    return Promise.reject()
  }
  const isOrder = isSalesOrderLink.value
  if (!isOrder && !props.summary?.contractNo) {
    message.warning('合同编号缺失')
    return Promise.reject()
  }
  if (isOrder && !props.summary?.salesOrderNo) {
    message.warning('销售订单号缺失')
    return Promise.reject()
  }
  const salesOrderNos = isOrder ? [props.summary.salesOrderNo] : form.salesOrderNos || []
  const payRes = addSalesPayment({
    linkType: isOrder ? PAYMENT_LINK_TYPE.SALES_ORDER : PAYMENT_LINK_TYPE.CONTRACT,
    contractNo: isOrder ? '' : props.summary.contractNo,
    salesOrderNos,
    salesOrderNo: salesOrderNos[0] || '',
    nodeName: props.node.name,
    amount: form.amount,
    paymentMethod: form.paymentMethod || '',
    receivedAt: form.receivedAt ? form.receivedAt.format('YYYY-MM-DD') : '',
    remark: form.remark,
  })
  if (!payRes.ok) {
    message.warning(payRes.message)
    return Promise.reject()
  }
  message.success(`${paymentNoun.value}已登记`)
  emit('saved')
  emit('update:open', false)
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.payment-node-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }
}

.field-tip {
  margin-top: -4px;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
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
}

.selected-order-panel {
  margin-top: 8px;
}

.selected-order-total {
  margin-top: 8px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
</style>
