<template>
  <div class="sales-payment-page list-page">
    <PaymentStatsPanel />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="回款状态">
              <a-select
                v-model:value="filters.paymentStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="contractPaymentStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="客户名称">
              <a-input
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="合同编号">
              <a-input
                v-model:value="filters.contractNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="合同名称">
              <a-input
                v-model:value="filters.contractName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="4">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          登记回款
        </a-button>
        <a-button size="small" @click="handleSearch">
          <ReloadOutlined />
          刷新
        </a-button>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          共计 <strong>{{ filteredList.length }}</strong> 份合同回款计划（由合同回款节点自动生成）。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1500 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag :color="contractPaymentStatusColor(record.paymentStatus)">
              {{ record.paymentStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'overdueStatus'">
            <a-tooltip v-if="record.overdueNodeNames?.length" :title="record.overdueNodeText">
              <a-tag color="error">逾期</a-tag>
            </a-tooltip>
            <a-tag v-else color="default">未逾期</a-tag>
          </template>
          <template v-else-if="column.key === 'contractNo'">
            <a class="link-code" @click="goContract(record)">{{ record.contractNo }}</a>
          </template>
          <template v-else-if="column.key === 'customerName'">
            {{ record.customerName || '—' }}
          </template>
          <template v-else-if="column.key === 'contractName'">
            {{ record.contractName || '—' }}
          </template>
          <template v-else-if="column.key === 'nodeProgress'">
            {{ record.nodeProgress }}
          </template>
          <template v-else-if="column.key === 'planTotal'">
            {{ formatMoney(record.planTotal) }}
          </template>
          <template v-else-if="column.key === 'paidTotal'">
            {{ formatMoney(record.paidTotal) }}
          </template>
          <template v-else-if="column.key === 'unpaidTotal'">
            {{ formatMoney(record.unpaidTotal) }}
          </template>
          <template v-else-if="column.key === 'paymentTermStart'">
            {{ record.paymentTermStart || '—' }}
          </template>
          <template v-else-if="column.key === 'paymentTermDays'">
            {{
              record.paymentTermDays != null && record.paymentTermDays !== ''
                ? `${record.paymentTermDays} 天`
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="record.paymentStatus !== CONTRACT_PAYMENT_STATUS.CLEARED" :size="8">
              <a @click="openMaintainStart(record)">维护起算日</a>
              <a @click="openCreateForContract(record)">登记回款</a>
            </a-space>
            <span v-else class="muted-action">—</span>
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          size="small"
          show-size-changer
          :total="filteredList.length"
          :show-total="(total) => `共 ${total} 条`"
        />
      </div>
    </div>

    <PaymentDetailDrawer v-model:open="detailOpen" :record="detailRecord" @saved="tick += 1" />

    <a-modal
      v-model:open="modalOpen"
      title="登记回款"
      width="780px"
      destroy-on-close
      :mask-closable="false"
      @ok="handleSave"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical" class="payment-register-form">
        <a-row :gutter="12">
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
            <a-form-item label="回款节点">
              <a-select
                v-model:value="form.nodeName"
                allow-clear
                :options="nodeOpts"
                placeholder="请选择节点"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row v-if="form.linkType === PAYMENT_LINK_TYPE.CONTRACT && form.contractNo" :gutter="12">
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
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  addSalesPayment,
  listContractPaymentSummaries,
  salesPaymentState,
} from '@/store/salesPaymentStore'
import {
  salesContractState,
  getSalesContractByNo,
  getOrdersLinkedToContract,
} from '@/store/salesContractStore'
import { salesOrderState, findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_PAYMENT_STATUS,
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  PAYMENT_LINK_TYPE,
  contractPaymentStatusColor,
  contractPaymentStatusOptions,
  paymentLinkTypeOptions,
  paymentMethodOptions,
} from '@/constants/salesContract'
import { getPresetPaymentNodes } from '@/store/contractPaymentNodePresetStore'
import PaymentStatsPanel from './components/PaymentStatsPanel.vue'
import PaymentDetailDrawer from './components/PaymentDetailDrawer.vue'

defineOptions({ name: 'SalesPaymentView' })

const route = useRoute()

const filters = reactive({
  paymentStatus: undefined,
  customerName: '',
  contractNo: '',
  contractName: '',
  /** month = 仅本月到期未收 */
  due: undefined,
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const tick = ref(0)

function applyFiltersFromRouteQuery() {
  const due = String(route.query.due || '').trim()
  filters.due = due || undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

watch(
  () => route.query.due,
  () => applyFiltersFromRouteQuery(),
  { immediate: true },
)
const modalOpen = ref(false)
const detailOpen = ref(false)
const detailRecord = ref(null)

const form = reactive({
  linkType: PAYMENT_LINK_TYPE.CONTRACT,
  contractNo: undefined,
  salesOrderNo: undefined,
  salesOrderNos: [],
  nodeName: undefined,
  amount: null,
  paymentMethod: undefined,
  invoiceAmount: null,
  invoiceNo: '',
  receivedAt: dayjs(),
  remark: '',
})

const selectedOrderColumns = [
  { title: '销售单号', dataIndex: 'orderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', ellipsis: true },
  { title: '金额（含税）', key: 'amount', width: 120, align: 'right' },
]

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '回款状态', key: 'paymentStatus', width: 100, fixed: 'left' },
  { title: '逾期状态', key: 'overdueStatus', width: 100 },
  { title: '合同编号', key: 'contractNo', width: 150, fixed: 'left' },
  { title: '客户名称', key: 'customerName', width: 160, ellipsis: true },
  { title: '合同名称', key: 'contractName', width: 160, ellipsis: true },
  { title: '节点进度', key: 'nodeProgress', width: 100 },
  { title: '计划总额', key: 'planTotal', width: 120, align: 'right' },
  { title: '已收金额', key: 'paidTotal', width: 120, align: 'right' },
  { title: '待收金额', key: 'unpaidTotal', width: 120, align: 'right' },
  { title: '账期起算', key: 'paymentTermStart', width: 100 },
  { title: '账期天数', key: 'paymentTermDays', width: 90 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const allSummaries = computed(() => {
  void salesPaymentState.payments
  void salesContractState.contracts
  void tick.value
  return listContractPaymentSummaries()
})

const filteredList = computed(() => {
  const f = appliedFilters.value
  const customer = String(f.customerName || '')
    .trim()
    .toLowerCase()
  const contractNo = String(f.contractNo || '')
    .trim()
    .toLowerCase()
  const contractName = String(f.contractName || '')
    .trim()
    .toLowerCase()
  return allSummaries.value.filter((row) => {
    if (f.paymentStatus && row.paymentStatus !== f.paymentStatus) return false
    if (
      customer &&
      !String(row.customerName || '')
        .toLowerCase()
        .includes(customer)
    )
      return false
    if (
      contractNo &&
      !String(row.contractNo || '')
        .toLowerCase()
        .includes(contractNo)
    )
      return false
    if (
      contractName &&
      !String(row.contractName || '')
        .toLowerCase()
        .includes(contractName)
    )
      return false
    if (f.due === 'month') {
      const now = dayjs()
      const hasMonthDue = (row.planRows || []).some((n) => {
        if (!(Number(n.unpaid) > 0) || !n.dueDate) return false
        const d = dayjs(n.dueDate)
        return d.isValid() && d.year() === now.year() && d.month() === now.month()
      })
      if (!hasMonthDue) return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
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

/** 挂接合同时：仅可选该合同关联的销售订单 */
const linkedOrderOpts = computed(() => {
  void salesOrderState.orders
  if (!form.contractNo) return []
  return getOrdersLinkedToContract(form.contractNo).map((o) => {
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
  return nos
    .map((no) => {
      const o = findSalesOrderByOrderNo(no)
      if (!o) return { orderNo: no, customerName: '—', amount: 0 }
      return {
        orderNo: o.orderNo,
        customerName: o.customerName || '—',
        amount: Number(o.totalAmountInTax ?? o.amountInTax) || 0,
      }
    })
    .filter(Boolean)
})

const selectedLinkedOrderTotal = computed(() =>
  selectedLinkedOrders.value.reduce((s, r) => s + (Number(r.amount) || 0), 0),
)

function nodeSelectOptions(nodes = []) {
  const seen = new Set()
  return (nodes || [])
    .map((n) => String(n?.name || '').trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
    .map((name) => ({ label: name, value: name }))
}

function presetIncomeNodeOptions(contractType) {
  return nodeSelectOptions(
    getPresetPaymentNodes(contractType || CONTRACT_TYPE.STANDARD, CONTRACT_CASH_DIRECTION.INCOME),
  )
}

const nodeOpts = computed(() => {
  if (form.linkType === PAYMENT_LINK_TYPE.CONTRACT && form.contractNo) {
    const contract = getSalesContractByNo(form.contractNo)
    const fromContract = nodeSelectOptions(contract?.paymentNodes)
    if (fromContract.length) return fromContract
    return presetIncomeNodeOptions(contract?.contractType)
  }
  const order = form.salesOrderNo ? findSalesOrderByOrderNo(form.salesOrderNo) : null
  const contract = order?.contractNo ? getSalesContractByNo(order.contractNo) : null
  const fromContract = nodeSelectOptions(contract?.paymentNodes)
  if (fromContract.length) return fromContract
  return presetIncomeNodeOptions(contract?.contractType || order?.contractType)
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
  tick.value += 1
}

function handleReset() {
  filters.paymentStatus = undefined
  filters.customerName = ''
  filters.contractNo = ''
  filters.contractName = ''
  filters.due = undefined
  handleSearch()
}

function goContract(record) {
  if (!record?.contractNo) return
  detailRecord.value = record
  detailOpen.value = true
}

/** 列表侧维护起算日：打开合同回款明细，按节点操作 */
function openMaintainStart(record) {
  goContract(record)
}

function openCreate() {
  form.linkType = PAYMENT_LINK_TYPE.CONTRACT
  form.contractNo = undefined
  form.salesOrderNo = undefined
  form.salesOrderNos = []
  form.nodeName = undefined
  form.amount = null
  form.paymentMethod = undefined
  form.invoiceAmount = null
  form.invoiceNo = ''
  form.receivedAt = dayjs()
  form.remark = ''
  modalOpen.value = true
}

function openCreateForContract(record, node) {
  openCreate()
  form.contractNo = record.contractNo
  if (node?.name) {
    form.nodeName = node.name
    if ((Number(node.unpaid) || 0) > 0) form.amount = node.unpaid
    return
  }
  const unpaid = (record.planRows || []).find((n) => (Number(n.unpaid) || 0) > 0)
  form.nodeName = unpaid?.name || record.planRows?.[0]?.name
  if (unpaid?.unpaid) form.amount = unpaid.unpaid
}

function onLinkTypeChange() {
  form.contractNo = undefined
  form.salesOrderNo = undefined
  form.salesOrderNos = []
  form.nodeName = undefined
  form.amount = null
}

function onContractChange() {
  form.nodeName = undefined
  form.amount = null
  form.salesOrderNo = undefined
  form.salesOrderNos = []
}

function onOrderChange() {
  form.nodeName = undefined
  form.amount = null
  const order = findSalesOrderByOrderNo(form.salesOrderNo)
  if (order?.contractNo) form.contractNo = order.contractNo
}

function handleSave() {
  const salesOrderNos =
    form.linkType === PAYMENT_LINK_TYPE.CONTRACT
      ? form.salesOrderNos || []
      : form.salesOrderNo
        ? [form.salesOrderNo]
        : []
  const res = addSalesPayment({
    linkType: form.linkType,
    contractNo: form.contractNo,
    salesOrderNos,
    salesOrderNo: salesOrderNos[0] || '',
    nodeName: form.nodeName || '',
    amount: form.amount,
    paymentMethod: form.paymentMethod || '',
    invoiceAmount: form.invoiceAmount,
    invoiceNo: form.invoiceNo || '',
    receivedAt: form.receivedAt ? form.receivedAt.format('YYYY-MM-DD') : '',
    remark: form.remark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success('回款已登记')
  modalOpen.value = false
  tick.value += 1
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.sales-payment-page {
  .filter-card {
    margin-bottom: 8px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
  }

  .horizontal-form {
    width: 100%;

    :deep(.ant-row) {
      align-items: center;
    }

    :deep(.ant-form-item) {
      width: 100%;
      margin-bottom: 0;
    }

    :deep(.ant-form-item-row) {
      flex-wrap: nowrap;
      align-items: center;
    }

    :deep(.ant-form-item-label > label) {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
    }

    .filter-actions-item {
      :deep(.ant-form-item-label) {
        display: none;
      }
    }
  }

  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .summary-bar {
    margin-bottom: 8px;
  }

  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 8px 12px 12px;
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .field-tip {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
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
}

.payment-register-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.muted-action {
  color: rgba(0, 0, 0, 0.25);
}
</style>
