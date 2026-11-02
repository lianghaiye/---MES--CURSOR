<template>
  <a-modal
    :open="open"
    title="选择发货单"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form layout="inline" class="picker-filter-form">
        <a-form-item label="发货单号">
          <a-input
            v-model:value="filters.deliveryCode"
            allow-clear
            size="small"
            placeholder="请输入"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="销售订单号">
          <a-input
            v-model:value="filters.salesOrderNo"
            allow-clear
            size="small"
            placeholder="请输入"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="客户名称">
          <a-input
            v-model:value="filters.customerName"
            allow-clear
            size="small"
            placeholder="请输入"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item>
          <a-space :size="8">
            <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
            <a-button size="small" @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="filteredList"
      :pagination="{ pageSize: 8, size: 'small', showTotal: (t) => `共 ${t} 条` }"
      :row-selection="rowSelection"
      :scroll="{ x: 800, y: 360 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="deliveryStatusColor(record.status)">{{ record.status || '—' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'qty'">
          {{ formatOutboundQtyInt(record.qty) }}
        </template>
        <template v-else-if="column.key === 'amount'">
          ¥ {{ formatMoney(record.amount) }}
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRows.length" @click="handleConfirm">
        确定（已选 {{ selectedRows.length }}）
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { findSalesOrderByOrderNo, salesOrderState } from '@/store/salesOrderStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import {
  calcApplyShipQty,
  calcDeliveryAmountInTax,
  deliveryStatusColor,
  formatOutboundQtyInt,
  mapApplicationToDeliveryOrder,
  resolveDeliveryOrderStatus,
} from '@/utils/deliveryOrder'

defineOptions({ name: 'DeliveryOrderSelectModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  preferredSalesOrderNo: { type: String, default: '' },
  preferredCustomerName: { type: String, default: '' },
  excludeIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive({
  deliveryCode: '',
  salesOrderNo: '',
  customerName: '',
})
const applied = reactive({
  deliveryCode: '',
  salesOrderNo: '',
  customerName: '',
})
const selectedRowKeys = ref([])
const selectedRows = ref([])

const columns = [
  { title: '发货单号', dataIndex: 'deliveryCode', width: 140, ellipsis: true },
  { title: '销售订单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '客户', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '状态', key: 'status', width: 96 },
  { title: '发货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '发货数量', key: 'qty', width: 90, align: 'right' },
  { title: '发货金额', key: 'amount', width: 110, align: 'right' },
]

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toPickerRow(raw, order) {
  const mapped = raw.deliveryCode ? raw : mapApplicationToDeliveryOrder(raw, order)
  const qty =
    Number(mapped.applyShipQty) || calcApplyShipQty(mapped) || Number(mapped.totalShipQty) || 0
  const amount = Number(mapped.totalAmountInTax) || calcDeliveryAmountInTax(mapped) || 0
  const status = mapped.deliveryStatus || resolveDeliveryOrderStatus(mapped) || mapped.status || '—'
  return {
    id: mapped.id || mapped.deliveryCode,
    deliveryCode: mapped.deliveryCode || '—',
    salesOrderNo: mapped.salesOrderNo || order?.orderNo || '',
    customerName: mapped.customerName || order?.customerName || '—',
    status,
    deliveryDate: String(
      mapped.deliveryDate || mapped.documentDate || mapped.createdAt || '',
    ).slice(0, 10),
    qty,
    amount: round2(amount),
  }
}

const allOptions = computed(() => {
  void salesOrderState.orders
  void deliveryOrderState.orders
  const map = new Map()
  ;(deliveryOrderState.orders || []).forEach((d) => {
    const order = findSalesOrderByOrderNo(d.salesOrderNo)
    const row = toPickerRow(d, order)
    if (row.id) map.set(row.id, row)
  })
  ;(salesOrderState.orders || []).forEach((order) => {
    ;(order.deliveryApplications || []).forEach((app) => {
      const row = toPickerRow(app, order)
      if (row.id && !map.has(row.id)) map.set(row.id, row)
    })
  })
  return [...map.values()]
})

const filteredList = computed(() => {
  const exclude = new Set((props.excludeIds || []).map(String))
  const preferredNo = String(props.preferredSalesOrderNo || '').trim()
  const preferredCustomer = String(props.preferredCustomerName || '').trim()
  let list = allOptions.value.filter((r) => !exclude.has(String(r.id)))
  const code = String(applied.deliveryCode || '')
    .trim()
    .toLowerCase()
  const so = String(applied.salesOrderNo || '')
    .trim()
    .toLowerCase()
  const cust = String(applied.customerName || '')
    .trim()
    .toLowerCase()
  if (code)
    list = list.filter((r) =>
      String(r.deliveryCode || '')
        .toLowerCase()
        .includes(code),
    )
  if (so)
    list = list.filter((r) =>
      String(r.salesOrderNo || '')
        .toLowerCase()
        .includes(so),
    )
  if (cust)
    list = list.filter((r) =>
      String(r.customerName || '')
        .toLowerCase()
        .includes(cust),
    )
  return list.slice().sort((a, b) => {
    const aPref = preferredNo && a.salesOrderNo === preferredNo ? 0 : 1
    const bPref = preferredNo && b.salesOrderNo === preferredNo ? 0 : 1
    if (aPref !== bPref) return aPref - bPref
    if (preferredCustomer) {
      const aHit = String(a.customerName || '').includes(preferredCustomer) ? 0 : 1
      const bHit = String(b.customerName || '').includes(preferredCustomer) ? 0 : 1
      if (aHit !== bHit) return aHit - bHit
    }
    return String(b.deliveryDate || '').localeCompare(String(a.deliveryDate || ''))
  })
})

const rowSelection = computed(() => ({
  type: 'checkbox',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows || []
  },
}))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    filters.deliveryCode = ''
    filters.salesOrderNo = props.preferredSalesOrderNo || ''
    filters.customerName = props.preferredCustomerName || ''
    applied.deliveryCode = ''
    applied.salesOrderNo = ''
    applied.customerName = ''
    selectedRowKeys.value = []
    selectedRows.value = []
  },
)

function handleSearch() {
  applied.deliveryCode = filters.deliveryCode
  applied.salesOrderNo = filters.salesOrderNo
  applied.customerName = filters.customerName
}

function handleReset() {
  filters.deliveryCode = ''
  filters.salesOrderNo = ''
  filters.customerName = ''
  applied.deliveryCode = ''
  applied.salesOrderNo = ''
  applied.customerName = ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请选择发货单')
    return
  }
  emit('confirm', selectedRows.value.slice())
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.filter-card {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
}

.picker-filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  width: 100%;
}
</style>
