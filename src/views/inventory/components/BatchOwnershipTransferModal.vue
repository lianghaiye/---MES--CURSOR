<template>
  <a-modal
    :open="open"
    :title="mode === 'free' ? '按单库存转自由' : '按单库存转他单'"
    :confirm-loading="submitting"
    ok-text="确认转移"
    destroy-on-close
    width="720px"
    :ok-button-props="{ disabled: !canConfirm }"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-alert type="info" show-icon class="hint" :message="hintText" />

    <a-descriptions :column="2" size="small" bordered class="desc">
      <a-descriptions-item label="物料">
        {{ form.itemName || '—' }}（{{ form.itemCode || '—' }}）
      </a-descriptions-item>
      <a-descriptions-item label="仓库">{{ form.warehouse || '—' }}</a-descriptions-item>
      <a-descriptions-item label="源销售单">{{ form.fromOrderNo || '—' }}</a-descriptions-item>
      <a-descriptions-item label="所选批次">{{ batchNosText }}</a-descriptions-item>
      <a-descriptions-item label="可转数量" :span="2">
        {{ form.maxQty }} {{ form.unit || '' }}
      </a-descriptions-item>
    </a-descriptions>

    <a-form layout="vertical" class="form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="转移数量" required>
            <a-input-number
              v-model:value="form.qty"
              :min="0.001"
              :max="form.maxQty"
              :precision="3"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="mode === 'order'" :span="12">
          <a-form-item label="目标销售订单" required>
            <SalesOrderSearchSelect :value="form.toOrderNo" @update:value="onToOrderChange" />
          </a-form-item>
        </a-col>
        <a-col v-else :span="12">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" allow-clear placeholder="转移原因（建议填写）" />
          </a-form-item>
        </a-col>

        <template v-if="mode === 'order'">
          <a-col :span="12">
            <a-form-item label="目标销售明细行" required class="pair-field">
              <div class="field-control">
                <a-select
                  v-model:value="form.toLineId"
                  :allow-clear="toLineOptions.length > 1"
                  :placeholder="linePlaceholder"
                  style="width: 100%"
                  :options="toLineOptions"
                  :disabled="!form.toOrderId || !toLineOptions.length"
                />
              </div>
              <div v-if="lineMismatchText" class="tip tip-warn">{{ lineMismatchText }}</div>
              <div v-else-if="toLineOptions.length === 1" class="tip">
                已按物料编码 {{ form.itemCode }} 自动匹配目标明细
              </div>
              <div v-else class="tip tip-placeholder" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="后续偿还" class="pair-field">
              <div class="field-control">
                <a-switch
                  v-model:checked="form.requireRepay"
                  checked-children="是"
                  un-checked-children="否"
                />
              </div>
              <div class="tip">
                打开后，目标单以后生产入库先挂回转出单，挂满这次转走的数量后再挂目标单自己，还有多的进自由库存
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-input v-model:value="form.remark" allow-clear placeholder="转移原因（建议填写）" />
            </a-form-item>
          </a-col>
        </template>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { confirmBatchOwnershipTransfer } from '@/store/salesStockAllocationStore'
import { salesOrderState } from '@/store/salesOrderStore'
import SalesOrderSearchSelect from '@/views/procurement/components/SalesOrderSearchSelect.vue'

const props = defineProps({
  open: Boolean,
  /** free | order */
  mode: { type: String, default: 'free' },
  /** { batches, warehouse, itemCode, itemName, unit } */
  payload: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'done'])

const submitting = ref(false)
const form = reactive({
  itemCode: '',
  itemName: '',
  warehouse: '',
  unit: '',
  fromOrderNo: '',
  maxQty: 0,
  qty: 0,
  toOrderId: '',
  toOrderNo: '',
  toLineId: undefined,
  requireRepay: false,
  remark: '',
})

const hintText = computed(() =>
  props.mode === 'free'
    ? '这批货改为自由库存。原销售单发货时，先用自己还留着的按单库存，不够再用自由库存。'
    : '这批货改挂到目标销售单。目标单用这批货发货；原销售单用剩下的按单库存和自由库存发货。',
)

function lineItemCode(line) {
  return String(line?.productCode || line?.itemCode || line?.materialCode || '').trim()
}

const matchedTargetLines = computed(() => {
  const order = salesOrderState.orders.find((o) => o.id === form.toOrderId)
  const code = String(form.itemCode || '').trim()
  if (!order || !code) return []
  return (order.lineItems || []).filter((l) => lineItemCode(l) === code)
})

const toLineOptions = computed(() =>
  matchedTargetLines.value.map((l) => ({
    value: l.id,
    label: `${lineItemCode(l)} ${l.productName || ''} ×${l.salesQty ?? l.qty ?? ''}`.trim(),
  })),
)

const lineMismatchText = computed(() => {
  if (props.mode !== 'order' || !form.toOrderId) return ''
  if (toLineOptions.value.length) return ''
  return `目标销售单没有编码 ${form.itemCode || '—'} 的明细，不能转他单`
})

const linePlaceholder = computed(() => {
  if (!form.toOrderId) return '请先选择目标销售订单'
  if (!toLineOptions.value.length) return '无同编码明细'
  if (toLineOptions.value.length > 1) return '目标单有多条同编码明细，请指定一行'
  return '已自动匹配'
})

const canConfirm = computed(() => {
  if (!(Number(form.qty) > 0) || Number(form.qty) > Number(form.maxQty) + 1e-9) return false
  if (props.mode !== 'order') return true
  if (!form.toOrderId || !form.toLineId) return false
  return toLineOptions.value.some((o) => o.value === form.toLineId)
})

const batchNosText = computed(() => {
  const list = props.payload?.batches || []
  return (
    list
      .map((b) => b.batchNo)
      .filter(Boolean)
      .join('、') || '—'
  )
})

watch(
  () => [props.open, props.payload, props.mode],
  () => {
    if (!props.open || !props.payload) return
    const batches = props.payload.batches || []
    const maxQty = batches.reduce((s, b) => s + (Number(b.currentLength) || 0), 0)
    form.itemCode = props.payload.itemCode || batches[0]?.itemCode || ''
    form.itemName = props.payload.itemName || batches[0]?.itemName || ''
    form.warehouse = props.payload.warehouse || batches[0]?.warehouse || ''
    form.unit = props.payload.unit || batches[0]?.unit || ''
    form.fromOrderNo = batches[0]?.salesOrderNo || ''
    form.maxQty = Math.round(maxQty * 1000) / 1000
    form.qty = form.maxQty
    form.toOrderId = ''
    form.toOrderNo = ''
    form.toLineId = undefined
    form.requireRepay = false
    form.remark = ''
  },
)

function applyMatchedLine() {
  const opts = toLineOptions.value
  if (opts.length === 1) form.toLineId = opts[0].value
  else form.toLineId = undefined
}

function onToOrderChange(orderNo) {
  form.toOrderNo = orderNo || ''
  const order = salesOrderState.orders.find((o) => o.orderNo === form.toOrderNo)
  form.toOrderId = order?.id || ''
  applyMatchedLine()
}

function handleOk() {
  submitting.value = true
  try {
    if (props.mode === 'order' && !canConfirm.value) {
      message.warning(lineMismatchText.value || '请选择含同编码明细的目标销售单')
      return
    }
    const batches = props.payload?.batches || []
    const res = confirmBatchOwnershipTransfer({
      mode: props.mode === 'order' ? 'order' : 'free',
      batchIds: batches.map((b) => b.id),
      qty: form.qty,
      toOrderId: form.toOrderId,
      toOrderNo: form.toOrderNo,
      toLineId: form.toLineId,
      itemCode: form.itemCode,
      itemName: form.itemName,
      requireRepay: form.requireRepay,
      remark: form.remark,
    })
    if (!res.ok) {
      message.warning(res.message || '转移失败')
      return
    }
    message.success(
      props.mode === 'free'
        ? '已转为自由库存'
        : form.requireRepay
          ? `已转到销售单 ${form.toOrderNo}。对方以后入库会先挂回本单`
          : `已转到销售单 ${form.toOrderNo}`,
    )
    emit('done', res)
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
}
</script>

<script>
export default { name: 'BatchOwnershipTransferModal' }
</script>

<style scoped>
.hint {
  margin-bottom: 12px;
}
.desc {
  margin-bottom: 12px;
}
.form {
  margin-top: 4px;
}
.pair-field :deep(.ant-form-item-control-input) {
  min-height: 32px;
}

.field-control {
  display: flex;
  align-items: center;
  height: 32px;
}

.field-control :deep(.ant-select) {
  width: 100%;
}

.tip {
  margin-top: 4px;
  min-height: 22px;
  font-size: 12px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
}

.tip-placeholder {
  visibility: hidden;
}

.tip-warn {
  color: #d46b08;
}
</style>
