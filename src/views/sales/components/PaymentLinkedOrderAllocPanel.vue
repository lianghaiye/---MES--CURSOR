<template>
  <div class="order-alloc-panel">
    <div class="order-alloc-toolbar">
      <span class="order-alloc-title">关联销售订单</span>
      <a-button size="small" type="link" @click="openAdd">添加销售订单</a-button>
    </div>

    <a-table
      size="small"
      bordered
      :pagination="false"
      :columns="columns"
      :data-source="rows"
      row-key="orderNo"
      :scroll="{ x: 900 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'orderAmount'">
          ¥ {{ formatMoney(record.orderAmount) }}
        </template>
        <template v-else-if="column.key === 'shippedAmount'">
          ¥ {{ formatMoney(record.shippedAmount) }}
        </template>
        <template v-else-if="column.key === 'paidAmount'">
          ¥ {{ formatMoney(record.paidAmount) }}
        </template>
        <template v-else-if="column.key === 'allocAmount'">
          <a-input-number
            :value="record.allocAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="本次回款"
            @update:value="(v) => onAllocChange(record.orderNo, v)"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a @click="removeRow(record.orderNo)">移除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无销售订单，可点击「添加销售订单」" />
      </template>
    </a-table>

    <div v-if="rows.length" class="order-alloc-footer">
      <span>已分配：¥ {{ formatMoney(allocatedTotal) }}</span>
      <span v-if="paymentAmount != null" :class="{ 'is-warn': remainAlloc !== 0 }">
        未分配：¥ {{ formatMoney(remainAlloc) }}
      </span>
      <span>订单金额合计：¥ {{ formatMoney(orderAmountTotal) }}</span>
    </div>

    <SalesOrderSelectModal
      v-model:open="pickerOpen"
      multiple
      :preferred-customer-name="preferredCustomerName"
      :preferred-order-nos="preferredOrderNos"
      :selected-order-nos="rows.map((r) => r.orderNo)"
      @confirm="onPicked"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  buildAllocRowsForContract,
  buildPaymentOrderAllocRow,
  sumAllocAmounts,
} from '@/utils/paymentOrderAlloc'
import { salesPaymentState } from '@/store/salesPaymentStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import SalesOrderSelectModal from '@/views/production/components/SalesOrderSelectModal.vue'

defineOptions({ name: 'PaymentLinkedOrderAllocPanel' })

const props = defineProps({
  contractNo: { type: String, default: '' },
  /** [{ orderNo, customerName, orderAmount, shippedAmount, paidAmount, allocAmount }] */
  modelValue: { type: Array, default: () => [] },
  /** 本次回款总额，用于计算未分配 */
  paymentAmount: { type: [Number, null], default: null },
  preferredCustomerName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const pickerOpen = ref(false)

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const preferredOrderNos = computed(() => rows.value.map((r) => r.orderNo))

const columns = [
  { title: '销售单号', dataIndex: 'orderNo', width: 150, ellipsis: true },
  { title: '客户', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '订单金额', key: 'orderAmount', width: 120, align: 'right' },
  { title: '发货金额', key: 'shippedAmount', width: 120, align: 'right' },
  { title: '已回款', key: 'paidAmount', width: 120, align: 'right' },
  { title: '本次回款', key: 'allocAmount', width: 140 },
  { title: '操作', key: 'actions', width: 70, fixed: 'right' },
]

const allocatedTotal = computed(() => sumAllocAmounts(rows.value))

const orderAmountTotal = computed(
  () => Math.round(rows.value.reduce((s, r) => s + (Number(r.orderAmount) || 0), 0) * 100) / 100,
)

const remainAlloc = computed(() => {
  if (props.paymentAmount == null || props.paymentAmount === '') return 0
  return Math.round(((Number(props.paymentAmount) || 0) - allocatedTotal.value) * 100) / 100
})

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function setRows(next) {
  emit('update:modelValue', next)
}

function refreshMetrics(list) {
  void salesPaymentState.payments
  void deliveryOrderState.orders
  void salesOrderState.orders
  return (list || []).map((r) => {
    const fresh = buildPaymentOrderAllocRow(r.orderNo, r.allocAmount)
    return { ...fresh, allocAmount: r.allocAmount }
  })
}

watch(
  () => props.contractNo,
  (no) => {
    if (!no) {
      setRows([])
      return
    }
    setRows(buildAllocRowsForContract(no))
  },
  { immediate: true },
)

watch(
  () => [salesPaymentState.payments, deliveryOrderState.orders, salesOrderState.orders],
  () => {
    if (!rows.value.length) return
    setRows(refreshMetrics(rows.value))
  },
  { deep: true },
)

function onAllocChange(orderNo, value) {
  setRows(
    rows.value.map((r) =>
      r.orderNo === orderNo
        ? { ...r, allocAmount: value == null || value === '' ? null : Number(value) }
        : r,
    ),
  )
}

function removeRow(orderNo) {
  setRows(rows.value.filter((r) => r.orderNo !== orderNo))
}

function openAdd() {
  pickerOpen.value = true
}

function onPicked(orders) {
  const list = Array.isArray(orders) ? orders : orders ? [orders] : []
  const exist = new Set(rows.value.map((r) => r.orderNo))
  const next = rows.value.slice()
  list.forEach((o) => {
    const no = o?.orderNo
    if (!no || exist.has(no)) return
    exist.add(no)
    next.push(buildPaymentOrderAllocRow(no, null))
  })
  setRows(next)
}
</script>

<style lang="less" scoped>
.order-alloc-panel {
  margin-bottom: 4px;
}

.order-alloc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-alloc-title {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.order-alloc-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);

  .is-warn {
    color: #fa541c;
    font-weight: 600;
  }
}
</style>
