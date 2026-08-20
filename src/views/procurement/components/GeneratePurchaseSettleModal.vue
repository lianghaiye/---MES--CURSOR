<template>
  <a-modal
    :open="open"
    title="从采购单生成结算"
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
        <a-col :span="6">
          <a-form-item label="结算日期">
            <a-date-picker
              v-model:value="form.settleDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="可选已入库且仍有剩余结算量的明细。有结算单位的行按结算数量（如实重）计价；否则按入库件数。"
    />

    <a-table
      :columns="columns"
      :data-source="settleLines"
      row-key="key"
      size="small"
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 880, y: 360 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'settleQty'">
          <a-input-number
            v-model:value="record.settleQty"
            size="small"
            :min="0"
            :max="record.remainSettleQty"
            :precision="3"
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
      <a-button type="primary" :loading="saving" @click="handleConfirm">生成结算单</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import {
  createSettleFromPurchaseOrder,
  listSettleableInboundLines,
} from '@/store/purchaseSettleStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 从采购单详情打开时预选 */
  purchaseOrderId: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({
  purchaseOrderId: undefined,
  settleDate: dayjs().format('YYYY-MM-DD'),
  remark: '',
})
const settleLines = ref([])
const selectedKeys = ref([])
const saving = ref(false)

const poOpts = computed(() =>
  purchaseOrderState.orders.map((o) => ({
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
    title: '可结算',
    dataIndex: 'remainSettleQty',
    key: 'remainSettleQty',
    width: 90,
    align: 'right',
  },
  { title: '本次结算', key: 'settleQty', width: 110 },
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
    form.settleDate = dayjs().format('YYYY-MM-DD')
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
  return n.toFixed(2)
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
  const selected = settleLines.value.filter((r) => selectedKeys.value.includes(r.key))
  if (!selected.length) {
    message.warning('请勾选结算明细')
    return
  }
  saving.value = true
  const res = createSettleFromPurchaseOrder(form.purchaseOrderId, {
    settleDate: form.settleDate,
    remark: form.remark,
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
