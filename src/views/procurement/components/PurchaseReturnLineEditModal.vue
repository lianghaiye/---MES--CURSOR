<template>
  <a-modal
    :open="open"
    title="编辑退货明细"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form layout="vertical" class="line-edit-form">
      <a-form-item label="产品">
        <a-input :value="displayName" disabled size="small" />
      </a-form-item>
      <a-form-item label="退货类型" required>
        <a-select
          v-model:value="form.returnType"
          size="small"
          :options="returnTypeOpts"
          placeholder="请选择退货类型"
        />
      </a-form-item>
      <a-form-item label="退货数量" required>
        <a-input-number
          v-model:value="form.returnQty"
          :min="0"
          :max="qtyMax"
          :precision="4"
          size="small"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item v-if="form.settleUnit" :label="`结算数量（${form.settleUnit}）`" required>
        <a-input-number
          v-model:value="form.settleQty"
          :min="0"
          :precision="4"
          :formatter="inputNumberFormatter"
          :parser="inputNumberParser"
          size="small"
          style="width: 100%"
          placeholder="实重/结算数量"
        />
      </a-form-item>
      <a-form-item label="单位" required>
        <a-select
          v-model:value="form.unit"
          size="small"
          :options="unitOpts"
          placeholder="请选择单位"
        />
      </a-form-item>
      <a-form-item label="出货仓库" :required="inboundType">
        <a-select
          v-model:value="form.shipWarehouse"
          size="small"
          allow-clear
          :disabled="!inboundType"
          :options="warehouseOpts"
          :placeholder="inboundType ? '请选择出货仓库' : '未入库退货无需出库'"
        />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="3" size="small" placeholder="请输入备注" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import { getDictOptions } from '@/store/systemDictStore'
import { inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import {
  isInboundReturnType,
  PURCHASE_RETURN_TYPE_OPTIONS,
  remainMaxForLine,
  RETURN_TYPE_UNINBOUND,
} from '@/utils/purchaseReturnStock'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  remain: {
    type: Object,
    default: () => ({ uninboundRemain: 0, inboundRemain: 0 }),
  },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  returnQty: 0,
  settleUnit: '',
  settleQty: undefined,
  unit: '',
  shipWarehouse: '',
  returnType: RETURN_TYPE_UNINBOUND,
  remark: '',
})

const warehouseOpts = warehouseOptions
const returnTypeOpts = computed(() => {
  const opts = getDictOptions('purchase_return_type')
  return opts.length ? opts : PURCHASE_RETURN_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))
})

const remain = computed(() => ({
  uninboundRemain: Number(props.remain?.uninboundRemain) || 0,
  inboundRemain: Number(props.remain?.inboundRemain) || 0,
}))

const inboundType = computed(() => isInboundReturnType(form.returnType))
const qtyMax = computed(() => remainMaxForLine(form, remain.value))

const displayName = computed(() => {
  const l = props.line
  if (!l) return ''
  return `${l.productName || '—'}（${l.productCode || '—'}）`
})

const unitOpts = computed(() => {
  const units = props.line?.unitOptions?.length
    ? props.line.unitOptions
    : [props.line?.unit].filter(Boolean)
  return units.map((u) => ({ label: u, value: u }))
})

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) return
    form.returnQty = Number(props.line.returnQty) || 0
    form.settleUnit = props.line.settleUnit || ''
    form.settleQty = props.line.settleQty
    form.unit = props.line.unit || ''
    form.shipWarehouse = props.line.shipWarehouse || ''
    form.returnType = props.line.returnType || RETURN_TYPE_UNINBOUND
    form.remark = props.line.remark || ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  const qty = Number(form.returnQty) || 0
  if (!(qty > 0)) {
    message.warning('请填写退货数量')
    return
  }
  if (!form.returnType) {
    message.warning('请选择退货类型')
    return
  }
  if (form.settleUnit && !(Number(form.settleQty) > 0)) {
    message.warning(`请填写结算数量（${form.settleUnit}）`)
    return
  }
  if (!form.unit) {
    message.warning('请选择单位')
    return
  }
  if (isInboundReturnType(form.returnType) && !form.shipWarehouse) {
    message.warning('已入库退货请选择出货仓库')
    return
  }
  emit('saved', {
    ...form,
    returnQty: qty,
    settleQty: form.settleUnit ? Number(form.settleQty) || 0 : undefined,
    remark: String(form.remark || '').trim(),
  })
  emit('update:open', false)
}
</script>

<script>
export default { name: 'PurchaseReturnLineEditModal' }
</script>
