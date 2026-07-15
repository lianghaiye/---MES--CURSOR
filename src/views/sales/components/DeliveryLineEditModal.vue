<template>
  <a-modal
    v-model:open="visible"
    title="编辑发货明细"
    width="1040px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form
      layout="horizontal"
      class="delivery-line-edit-form"
      :label-col="{ flex: '0 0 150px' }"
      :wrapper-col="{ flex: '1 1 0' }"
    >
      <a-row :gutter="[20, 8]">
        <a-col :span="24">
          <a-form-item label="发货进度">
            <a-input :value="progressDisplay" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="产品名称">
            <a-input :value="draft.productName" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="产品编码">
            <a-input :value="draft.productCode" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="规格型号">
            <a-input :value="draft.specModel || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="材质">
            <a-input :value="draft.material || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="图号">
            <a-input :value="draft.drawingNo || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="订单数量">
            <a-input :value="formatDeliveryQty(draft.orderQty)" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="单价（不含税）">
            <a-input :value="formatDeliveryPrice(draft.unitPriceExTax)" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="单价（含税）">
            <a-input :value="formatDeliveryPrice(draft.unitPriceInTax)" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="单位">
            <a-input :value="draft.unit || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="包装形式">
            <a-input :value="draft.packagingForm || '—'" disabled />
          </a-form-item>
        </a-col>

        <a-col v-if="showShipQty" :span="8">
          <a-form-item label="本次发货数量" required>
            <a-input-number
              v-model:value="draft.shipQty"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="recalcPreview"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发货重量">
            <a-input-number
              v-model:value="draft.shipWeight"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发货单价(不含税)" required>
            <a-input-number
              v-model:value="draft.deliveryUnitPriceExTax"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="recalcPreview"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发货总额">
            <a-input :value="formatDeliveryPrice(draft.deliveryAmountExTax)" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="draft.lineRemark" :rows="2" placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  formatDeliveryQty,
  formatDeliveryPrice,
  formatShipProgress,
  recalcDeliveryLine,
  deliveryDecimalFormatter,
  deliveryDecimalParser,
  roundDeliveryDecimal,
} from '@/utils/deliveryLine'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  /** 散件行无「本次发货数量」 */
  showShipQty: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const draft = reactive(createDraft())

const progressDisplay = computed(() =>
  formatShipProgress(
    draft.confirmedOutboundQty ?? draft.shippedQty,
    draft.appliedShipQty ?? draft.shippedQty,
    draft.orderQty,
  ),
)

const maxShipQty = computed(() => {
  const orderQty = Number(draft.orderQty) || 0
  const applied = Number(draft.appliedShipQty ?? draft.shippedQty ?? 0)
  return Math.max(0, orderQty - applied)
})

watch(
  () => props.open,
  (open) => {
    if (!open || !props.line) return
    Object.assign(draft, createDraft(props.line))
  },
)

function createDraft(line = {}) {
  return {
    productName: line.productName || '',
    productCode: line.productCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    drawingNo: line.drawingNo || '',
    orderQty: roundDeliveryDecimal(line.orderQty ?? 0, 4),
    unitPriceExTax: roundDeliveryDecimal(line.unitPriceExTax ?? 0, 4),
    unitPriceInTax: roundDeliveryDecimal(line.unitPriceInTax ?? 0, 4),
    unit: line.unit || '',
    shippedQty: roundDeliveryDecimal(line.shippedQty ?? 0, 4),
    confirmedOutboundQty: roundDeliveryDecimal(
      line.confirmedOutboundQty ?? line.shippedQty ?? 0,
      4,
    ),
    appliedShipQty: roundDeliveryDecimal(line.appliedShipQty ?? line.shippedQty ?? 0, 4),
    shipQty: roundDeliveryDecimal(line.shipQty ?? 0, 4),
    shipWeight: roundDeliveryDecimal(line.shipWeight ?? 0, 4),
    deliveryUnitPriceExTax: roundDeliveryDecimal(line.deliveryUnitPriceExTax ?? 0, 4),
    deliveryAmountExTax: roundDeliveryDecimal(line.deliveryAmountExTax ?? 0, 4),
    packagingForm: line.packagingForm || '',
    lineRemark: line.lineRemark || '',
  }
}

function recalcPreview() {
  recalcDeliveryLine(draft)
}

function handleCancel() {
  visible.value = false
}

function handleSave() {
  if (props.showShipQty) {
    const shipQty = Number(draft.shipQty)
    if (!shipQty && shipQty !== 0) {
      message.warning('请填写本次发货数量')
      return
    }
    if (shipQty <= 0) {
      message.warning('本次发货数量须大于 0')
      return
    }
    if (shipQty > maxShipQty.value + 1e-9) {
      message.warning(`本次发货数量不能超过可发数量 ${formatDeliveryQty(maxShipQty.value)}`)
      return
    }
  }
  if (draft.deliveryUnitPriceExTax == null || draft.deliveryUnitPriceExTax === '') {
    message.warning('请填写发货单价(不含税)')
    return
  }

  recalcDeliveryLine(draft)
  emit('saved', {
    ...props.line,
    shipQty: roundDeliveryDecimal(draft.shipQty, 4),
    shipWeight: roundDeliveryDecimal(draft.shipWeight, 4),
    deliveryUnitPriceExTax: roundDeliveryDecimal(draft.deliveryUnitPriceExTax, 4),
    deliveryAmountExTax: roundDeliveryDecimal(draft.deliveryAmountExTax, 4),
    packagingForm: draft.packagingForm || '',
    lineRemark: draft.lineRemark || '',
  })
  visible.value = false
}
</script>

<style scoped>
.delivery-line-edit-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.delivery-line-edit-form :deep(.ant-form-item-label) {
  text-align: right;
}

.delivery-line-edit-form :deep(.ant-form-item-label > label) {
  white-space: normal;
  height: auto;
  line-height: 1.3;
}
</style>
