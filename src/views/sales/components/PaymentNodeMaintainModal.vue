<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    destroy-on-close
    :mask-closable="false"
    :ok-text="mode === 'register' ? '登记' : '保存'"
    :width="mode === 'register' ? '780px' : '520px'"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical" class="payment-node-form">
      <template v-if="mode === 'startDate'">
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
            <a-form-item label="账期天数">
              <span>{{ node?.termDays != null ? `${node.termDays} 天` : '未设' }}</span>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="账期起算类型">
              <a-select
                v-model:value="form.termStartType"
                allow-clear
                placeholder="请选择"
                :options="paymentTermStartOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="`起算日${form.termStartType ? `（${form.termStartType}）` : ''}`">
              <a-date-picker
                v-model:value="form.startDate"
                style="width: 100%"
                placeholder="取不到时可后补"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="说明">
              <div class="field-tip inline-tip">补写起算日后按账期天数重算到期日</div>
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
            <a-form-item label="待收金额">
              <span>¥ {{ formatMoney(node?.unpaid) }}</span>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
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
            <a-form-item label="回款金额" required>
              <a-input-number
                v-model:value="form.amount"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                placeholder="请输入回款金额"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="回款方式">
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
            <a-form-item label="到账日期">
              <a-date-picker v-model:value="form.receivedAt" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="开票金额（可选）">
              <a-input-number
                v-model:value="form.invoiceAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="同步到该节点开票金额"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="发票号码（可选）">
              <a-input v-model:value="form.invoiceNo" allow-clear placeholder="请输入发票号码" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
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
import { PAYMENT_LINK_TYPE, paymentMethodOptions } from '@/constants/salesContract'
import { paymentTermStartOptions } from '@/constants/customerMaster'
import { addSalesPayment, updatePaymentPlanNode } from '@/store/salesPaymentStore'
import { getOrdersLinkedToContract } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo, salesOrderState } from '@/store/salesOrderStore'

defineOptions({ name: 'PaymentNodeMaintainModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  summary: { type: Object, default: null },
  node: { type: Object, default: null },
  /** startDate=维护起算日；register=登记回款 */
  mode: { type: String, default: 'startDate' },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  termStartType: undefined,
  startDate: null,
  invoiceAmount: null,
  invoiceNo: '',
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

const modalTitle = computed(() => {
  const name = props.node?.name || ''
  if (props.mode === 'register') {
    return name ? `登记回款 · ${name}` : '登记回款'
  }
  return name ? `维护起算日 · ${name}` : '维护起算日'
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

watch(
  () => [props.open, props.node, props.mode],
  () => {
    if (!props.open || !props.node) return
    form.termStartType = props.node.termStartType || undefined
    form.startDate = props.node.startDate ? dayjs(props.node.startDate) : null
    form.invoiceAmount =
      props.node.invoiceAmount != null && Number(props.node.invoiceAmount) > 0
        ? Number(props.node.invoiceAmount)
        : null
    form.invoiceNo = props.node.invoiceNo || ''
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

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleOk() {
  if (!props.node?.id) {
    message.warning('节点无效')
    return Promise.reject()
  }

  if (props.mode === 'startDate') {
    const patchRes = updatePaymentPlanNode(props.node.id, {
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

  if (!(Number(form.amount) > 0)) {
    message.warning('请填写回款金额')
    return Promise.reject()
  }
  if (!props.summary?.contractNo) {
    message.warning('合同编号缺失')
    return Promise.reject()
  }
  const salesOrderNos = form.salesOrderNos || []
  const payRes = addSalesPayment({
    linkType: PAYMENT_LINK_TYPE.CONTRACT,
    contractNo: props.summary.contractNo,
    salesOrderNos,
    salesOrderNo: salesOrderNos[0] || '',
    nodeName: props.node.name,
    amount: form.amount,
    paymentMethod: form.paymentMethod || '',
    invoiceAmount: form.invoiceAmount,
    invoiceNo: form.invoiceNo || '',
    receivedAt: form.receivedAt ? form.receivedAt.format('YYYY-MM-DD') : '',
    remark: form.remark,
  })
  if (!payRes.ok) {
    message.warning(payRes.message)
    return Promise.reject()
  }
  message.success('回款已登记')
  emit('saved')
  emit('update:open', false)
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.payment-node-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.inline-tip {
  margin-top: 6px;
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
