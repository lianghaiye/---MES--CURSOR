<template>
  <div class="order-delivery-panel">
    <div class="order-delivery-head">
      <div class="order-delivery-title">关联发货申请</div>
      <a-button size="small" type="link" :disabled="!salesOrderNo" @click="pickerOpen = true">
        添加发货单
      </a-button>
    </div>
    <a-table
      size="small"
      bordered
      :pagination="false"
      :columns="columns"
      :data-source="rows"
      row-key="id"
      :scroll="{ x: 980 }"
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
        <template v-else-if="column.key === 'paidAmount'">
          ¥ {{ formatMoney(record.paidAmount) }}
        </template>
        <template v-else-if="column.key === 'allocAmount'">
          <a-input-number
            :value="record.allocAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="选填"
            @update:value="(v) => onAllocChange(record.id, v)"
          />
        </template>
        <template v-else-if="column.key === 'deliveryDate'">
          {{ record.deliveryDate || '—' }}
        </template>
        <template v-else-if="column.key === 'deliveryCode'">
          {{ record.deliveryCode || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a v-if="record.manual" @click="removeRow(record.id)">移除</a>
          <span v-else class="muted">自动</span>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="该销售订单暂无发货申请，可点击「添加发货单」补充" />
      </template>
    </a-table>
    <div v-if="rows.length" class="order-delivery-footer">
      <span>发货数量合计：{{ formatOutboundQtyInt(qtyTotal) }}</span>
      <span>发货金额合计：¥ {{ formatMoney(amountTotal) }}</span>
      <span>已回款合计：¥ {{ formatMoney(paidTotal) }}</span>
      <span>本次回款合计：¥ {{ formatMoney(allocTotal) }}</span>
    </div>

    <DeliveryOrderSelectModal
      v-model:open="pickerOpen"
      :preferred-sales-order-no="salesOrderNo"
      :preferred-customer-name="customerName"
      :exclude-ids="excludeIds"
      @confirm="onPickDeliveries"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { salesPaymentState } from '@/store/salesPaymentStore'
import { deliveryStatusColor, formatOutboundQtyInt } from '@/utils/deliveryOrder'
import {
  buildDeliveryAllocRowsForSalesOrder,
  normalizePaymentDeliveryRow,
  refreshDeliveryAllocMetrics,
  sumDeliveryAllocAmounts,
} from '@/utils/paymentDeliveryAlloc'
import DeliveryOrderSelectModal from './DeliveryOrderSelectModal.vue'

defineOptions({ name: 'PaymentOrderDeliveryPanel' })

const props = defineProps({
  salesOrderNo: { type: String, default: '' },
  customerName: { type: String, default: '' },
  /** [{ id, deliveryCode, ..., paidAmount, allocAmount, manual }] */
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const pickerOpen = ref(false)

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const columns = [
  { title: '发货单号', key: 'deliveryCode', width: 140, ellipsis: true },
  { title: '状态', key: 'status', width: 88 },
  { title: '发货日期', key: 'deliveryDate', width: 110 },
  { title: '发货数量', key: 'qty', width: 90, align: 'right' },
  { title: '发货金额', key: 'amount', width: 110, align: 'right' },
  { title: '已回款', key: 'paidAmount', width: 110, align: 'right' },
  { title: '本次回款', key: 'allocAmount', width: 130 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function setRows(next) {
  emit('update:modelValue', next)
}

const excludeIds = computed(() => rows.value.map((r) => r.id))

const qtyTotal = computed(() => rows.value.reduce((s, r) => s + (Number(r.qty) || 0), 0))
const amountTotal = computed(() =>
  round2(rows.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
)
const paidTotal = computed(() =>
  round2(rows.value.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)),
)
const allocTotal = computed(() => sumDeliveryAllocAmounts(rows.value))

watch(
  () => props.salesOrderNo,
  (no) => {
    if (!no) {
      setRows([])
      return
    }
    setRows(buildDeliveryAllocRowsForSalesOrder(no))
  },
  { immediate: true },
)

watch(
  () => [salesPaymentState.payments, deliveryOrderState.orders, salesOrderState.orders],
  () => {
    if (!rows.value.length) return
    setRows(refreshDeliveryAllocMetrics(rows.value))
  },
  { deep: true },
)

function onAllocChange(id, value) {
  setRows(
    rows.value.map((r) =>
      String(r.id) === String(id)
        ? { ...r, allocAmount: value == null || value === '' ? null : Number(value) }
        : r,
    ),
  )
}

function removeRow(id) {
  setRows(rows.value.filter((r) => String(r.id) !== String(id)))
}

function onPickDeliveries(picked) {
  const existing = new Set(rows.value.map((r) => String(r.id)))
  const next = rows.value.slice()
  ;(picked || []).forEach((p) => {
    const row = normalizePaymentDeliveryRow(p, null, { manual: true, allocAmount: null })
    if (!existing.has(String(row.id))) {
      next.push(row)
      existing.add(String(row.id))
    }
  })
  setRows(next)
}
</script>

<style lang="less" scoped>
.order-delivery-panel {
  margin-bottom: 4px;
}

.order-delivery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-delivery-title {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.order-delivery-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.muted {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}
</style>
