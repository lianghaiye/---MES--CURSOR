<template>
  <a-modal
    :open="open"
    title="从采购单生成对账"
    :width="960"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="header-form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="采购订单" required>
            <a-select
              v-model:value="form.purchaseOrderId"
              show-search
              placeholder="请选择采购订单"
              :options="poOpts"
              :filter-option="filterOption"
              @change="onPoChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="会计期间" required>
            <a-date-picker
              v-model:value="form.yearMonth"
              picker="month"
              value-format="YYYY-MM"
              style="width: 100%"
              placeholder="选择年月"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="24">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" allow-clear placeholder="选填，写入对账单备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="点选已完成采购单后勾选明细生成对账单，并挂到所选会计期间（不按日期窗过滤单据）。有结算单位的行按结算数量计价；否则按入库件数。"
    />

    <a-table
      :columns="columns"
      :data-source="settleLines"
      row-key="key"
      size="small"
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 880, y: 360 }"
      :locale="{ emptyText: '请选择采购订单，或该单暂无可对账入库明细' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'settleQty'">
          <a-input-number
            v-model:value="record.settleQty"
            size="small"
            :min="0"
            :max="record.remainSettleQty"
            :precision="4"
            :formatter="formatSettleQtyInput"
            :parser="parseSettleQtyInput"
            style="width: 100%"
            @change="() => onQtyChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'amount'">
          {{ formatMoney(record.amount) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '—' }}
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleConfirm">生成对账单</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { getPendingPurchasePriceChangeBlock } from '@/store/purchasePriceChangeStore'
import {
  createSettleFromPurchaseOrder,
  listSettleableInboundLines,
} from '@/store/purchaseSettleStore'
import { PERIOD_SETTLE_DEMO } from '@/mock/periodSettleDemoSeed'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { parseYearMonth } from '@/utils/purchaseSettlePeriod'

function formatSettleQtyInput(value) {
  return inputNumberFormatter(value)
}

function parseSettleQtyInput(value) {
  return inputNumberParser(value)
}

function defaultRangeForMonth(yearMonth) {
  const parsed = parseYearMonth(yearMonth)
  if (!parsed.ok) return []
  return [parsed.monthStart, parsed.monthEnd]
}

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 从采购单详情打开时预选 */
  purchaseOrderId: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({
  purchaseOrderId: undefined,
  yearMonth: PERIOD_SETTLE_DEMO.yearMonth,
  remark: '',
})
const settleLines = ref([])
const selectedKeys = ref([])
const saving = ref(false)

const poOpts = computed(() =>
  purchaseOrderState.orders
    .filter((o) => o.status === '已完成')
    .map((o) => ({
      label: `${o.orderNo} · ${o.supplier || ''}`,
      value: o.id,
      searchText: `${o.orderNo} ${o.supplier || ''}`,
    })),
)

const columns = [
  { title: '入库单号', dataIndex: 'inboundDocNo', key: 'inboundDocNo', width: 130 },
  { title: '物料', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 110 },
  { title: '结算单位', dataIndex: 'settleUnit', key: 'settleUnit', width: 80 },
  {
    title: '可对账',
    dataIndex: 'remainSettleQty',
    key: 'remainSettleQty',
    width: 90,
    align: 'right',
  },
  { title: '本次对账', key: 'settleQty', width: 110 },
  { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', width: 90, align: 'right' },
  { title: '金额', key: 'amount', width: 100, align: 'right' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
}))

watch(
  () => props.open,
  (val) => {
    if (!val) return
    form.purchaseOrderId = props.purchaseOrderId || undefined
    form.yearMonth = PERIOD_SETTLE_DEMO.yearMonth
    form.remark = ''
    if (form.purchaseOrderId) {
      onPoChange(form.purchaseOrderId)
    } else {
      settleLines.value = []
      selectedKeys.value = []
    }
  },
)

function filterOption(input, option) {
  return String(option?.searchText || option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 4)
}

function onPoChange(id) {
  settleLines.value = listSettleableInboundLines(id)
  selectedKeys.value = settleLines.value.map((r) => r.key)
}

function onQtyChange(record) {
  const qty = Number(record.settleQty) || 0
  const price = Number(record.unitPrice) || 0
  record.amount = Math.round(qty * price * 100) / 100
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.purchaseOrderId) {
    message.warning('请选择采购订单')
    return
  }
  if (!form.yearMonth) {
    message.warning('请选择会计期间')
    return
  }
  const monthRange = defaultRangeForMonth(form.yearMonth)
  if (monthRange.length !== 2) {
    message.warning('会计期间无效')
    return
  }
  const block = getPendingPurchasePriceChangeBlock(form.purchaseOrderId, '生成对账')
  if (block) {
    message.warning(block)
    return
  }
  const selected = settleLines.value.filter((r) => selectedKeys.value.includes(r.key))
  if (!selected.length) {
    message.warning('请勾选对账明细')
    return
  }
  saving.value = true
  const res = createSettleFromPurchaseOrder(form.purchaseOrderId, {
    settleDate: dayjs().format('YYYY-MM-DD'),
    remark: form.remark,
    periodKey: form.yearMonth,
    periodStart: monthRange[0],
    periodEnd: monthRange[1],
    lineItems: selected,
  })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('confirmed', res.settle)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 8px;
}
</style>
