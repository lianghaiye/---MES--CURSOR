<template>
  <div class="sales-payment-page">
    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        登记回款
      </a-button>
      <a-input
        v-model:value="keyword"
        allow-clear
        size="small"
        placeholder="回款单号/客户/合同/订单"
        style="width: 240px"
      />
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'amount'">
            {{ formatMoney(record.amount) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a class="danger-link" @click="handleDelete(record)">删除</a>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="modalOpen"
      title="登记回款"
      destroy-on-close
      @ok="handleSave"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="挂接对象" required>
          <a-radio-group v-model:value="form.linkType" :options="paymentLinkTypeOptions" />
        </a-form-item>
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
        <a-form-item label="回款节点">
          <a-select
            v-model:value="form.nodeName"
            allow-clear
            :options="nodeOpts"
            placeholder="可选"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="回款金额" required>
          <a-input-number
            v-model:value="form.amount"
            :min="0.01"
            :precision="2"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="到账日期">
          <a-date-picker v-model:value="form.receivedAt" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { addSalesPayment, deleteSalesPayment, salesPaymentState } from '@/store/salesPaymentStore'
import { salesContractState } from '@/store/salesContractStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { getSalesContractByNo } from '@/store/salesContractStore'
import { PAYMENT_LINK_TYPE, paymentLinkTypeOptions } from '@/constants/salesContract'

const keyword = ref('')
const modalOpen = ref(false)

const form = reactive({
  linkType: PAYMENT_LINK_TYPE.CONTRACT,
  contractNo: undefined,
  salesOrderNo: undefined,
  nodeName: undefined,
  amount: null,
  receivedAt: dayjs(),
  remark: '',
})

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '回款单号', dataIndex: 'paymentNo', width: 140 },
  { title: '挂接', dataIndex: 'linkType', width: 90 },
  { title: '客户', dataIndex: 'customerName', width: 160, ellipsis: true },
  { title: '合同编号', dataIndex: 'contractNo', width: 140 },
  { title: '销售订单', dataIndex: 'salesOrderNo', width: 140 },
  { title: '节点', dataIndex: 'nodeName', width: 100 },
  { title: '金额', key: 'amount', width: 110, align: 'right' },
  { title: '到账日期', dataIndex: 'receivedAt', width: 120 },
  { title: '操作', key: 'actions', width: 80 },
]

const filteredList = computed(() => {
  void salesPaymentState.payments
  const kw = String(keyword.value || '')
    .trim()
    .toLowerCase()
  if (!kw) return salesPaymentState.payments
  return salesPaymentState.payments.filter((item) => {
    const text =
      `${item.paymentNo} ${item.customerName} ${item.contractNo} ${item.salesOrderNo}`.toLowerCase()
    return text.includes(kw)
  })
})

const contractOpts = computed(() =>
  salesContractState.contracts.map((c) => ({
    label: `${c.contractNo} · ${c.customerName}`,
    value: c.contractNo,
  })),
)

const orderOpts = computed(() =>
  salesOrderState.orders.map((o) => ({
    label: `${o.orderNo} · ${o.customerName || ''}`,
    value: o.orderNo,
  })),
)

const nodeOpts = computed(() => {
  let nodes = []
  if (form.linkType === PAYMENT_LINK_TYPE.CONTRACT && form.contractNo) {
    nodes = getSalesContractByNo(form.contractNo)?.paymentNodes || []
  } else if (form.salesOrderNo) {
    const order = findSalesOrderByOrderNo(form.salesOrderNo)
    const c = order?.contractNo ? getSalesContractByNo(order.contractNo) : null
    nodes = c?.paymentNodes || []
  }
  return nodes.map((n) => ({ label: n.name, value: n.name }))
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function openCreate() {
  form.linkType = PAYMENT_LINK_TYPE.CONTRACT
  form.contractNo = undefined
  form.salesOrderNo = undefined
  form.nodeName = undefined
  form.amount = null
  form.receivedAt = dayjs()
  form.remark = ''
  modalOpen.value = true
}

function onContractChange() {
  form.nodeName = undefined
}

function onOrderChange() {
  form.nodeName = undefined
  const order = findSalesOrderByOrderNo(form.salesOrderNo)
  if (order?.contractNo) form.contractNo = order.contractNo
}

function handleSave() {
  const res = addSalesPayment({
    linkType: form.linkType,
    contractNo: form.contractNo,
    salesOrderNo: form.salesOrderNo,
    nodeName: form.nodeName || '',
    amount: form.amount,
    receivedAt: form.receivedAt ? form.receivedAt.format('YYYY-MM-DD') : '',
    remark: form.remark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success('回款已登记')
  modalOpen.value = false
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `删除回款「${record.paymentNo}」？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteSalesPayment(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style scoped>
.sales-payment-page {
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
}
</style>
