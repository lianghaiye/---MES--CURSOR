<template>
  <a-modal
    :open="open"
    title="跨单库存调拨"
    :confirm-loading="submitting"
    ok-text="确认调拨"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-alert
      type="warning"
      show-icon
      class="hint"
      message="将调出订单的软占用转给当前订单，确认后当前订单可优先发货。默认要求后续入库优先偿还调出订单。"
    />
    <a-descriptions :column="1" size="small" bordered class="desc">
      <a-descriptions-item label="物料">
        {{ form.itemName }}（{{ form.itemCode }}）
      </a-descriptions-item>
      <a-descriptions-item label="调出订单">{{ form.fromOrderNo }}</a-descriptions-item>
      <a-descriptions-item label="调入订单">{{ form.toOrderNo }}</a-descriptions-item>
      <a-descriptions-item label="调出方当前占用">{{ form.fromAllocQty }}</a-descriptions-item>
    </a-descriptions>
    <a-form layout="vertical" class="form">
      <a-form-item label="调拨数量" required>
        <a-input-number
          v-model:value="form.qty"
          :min="0.01"
          :max="form.fromAllocQty"
          :precision="2"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="后续偿还">
        <a-switch
          v-model:checked="form.requireRepay"
          checked-children="是"
          un-checked-children="否"
        />
        <div class="tip">开启后，调入方相关产出入库将优先补给调出订单</div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'
import { message } from 'ant-design-vue'
import { confirmStockTransfer, getLineAllocatedQty } from '@/store/salesStockAllocationStore'
import { buildOrderInventoryStatus } from '@/store/salesStockAllocationStore'
import { salesOrderState } from '@/store/salesOrderStore'

const props = defineProps({
  open: Boolean,
  /** { fromAlloc, toOrder, toLine } */
  payload: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'done'])

const submitting = ref(false)
const form = reactive({
  itemCode: '',
  itemName: '',
  fromOrderId: '',
  fromOrderNo: '',
  fromLineId: '',
  fromAllocQty: 0,
  toOrderId: '',
  toOrderNo: '',
  toLineId: '',
  qty: 1,
  requireRepay: true,
  urgency: '普通',
  deliveryDate: '',
})

watch(
  () => [props.open, props.payload],
  () => {
    if (!props.open || !props.payload) return
    const { fromAlloc, toOrder, toLine } = props.payload
    form.itemCode = fromAlloc?.itemCode || toLine?.productCode || ''
    form.itemName = fromAlloc?.itemName || toLine?.productName || ''
    form.fromOrderId = fromAlloc?.salesOrderId || ''
    form.fromOrderNo = fromAlloc?.salesOrderNo || ''
    form.fromLineId = fromAlloc?.salesLineId || ''
    form.fromAllocQty = getLineAllocatedQty(form.fromOrderId, form.fromLineId)
    form.toOrderId = toOrder?.id || ''
    form.toOrderNo = toOrder?.orderNo || ''
    form.toLineId = toLine?.id || ''
    form.qty = Math.min(
      form.fromAllocQty,
      Number(toLine?.salesQty ?? toLine?.qty) || form.fromAllocQty,
    )
    form.requireRepay = true
    form.urgency = toOrder?.urgency || '普通'
    form.deliveryDate = toLine?.deliveryDate || ''
  },
)

function handleOk() {
  submitting.value = true
  try {
    const res = confirmStockTransfer({
      fromOrderId: form.fromOrderId,
      fromOrderNo: form.fromOrderNo,
      fromLineId: form.fromLineId,
      toOrderId: form.toOrderId,
      toOrderNo: form.toOrderNo,
      toLineId: form.toLineId,
      itemCode: form.itemCode,
      itemName: form.itemName,
      qty: form.qty,
      requireRepay: form.requireRepay,
      urgency: form.urgency,
      deliveryDate: form.deliveryDate,
    })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    const toId = props.payload?.toOrder?.id
    if (toId) {
      const hit = salesOrderState.orders.find((o) => o.id === toId)
      if (hit) hit.inventoryStatus = buildOrderInventoryStatus(hit)
    }
    message.success('调拨已确认')
    emit('done', res.transfer)
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" scoped>
.hint {
  margin-bottom: 12px;
}
.desc {
  margin-bottom: 12px;
}
.tip {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
