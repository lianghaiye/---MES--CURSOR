<template>
  <a-modal
    :open="open"
    title="编辑采购明细"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="purchase-order-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" class="edit-form">
      <div class="item-preview">
        <a-row :gutter="[16, 8]">
          <a-col :span="12">
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span class="preview-value">{{ draft.productCode || draft.itemCode || '—' }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span class="preview-value">{{ draft.productName || draft.itemName || '—' }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="preview-row">
              <span class="preview-label">规格型号</span>
              <span class="preview-value">{{ draft.specModel || '—' }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="preview-row">
              <span class="preview-label">库存数量</span>
              <span class="preview-value">
                {{ formatQty(draft.stockQty) }} {{ draft.unit || '件' }}
              </span>
            </div>
          </a-col>
        </a-row>
      </div>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="采购数量" required>
            <a-input-number
              v-model:value="draft.purchaseQty"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
              @change="recalcDraft"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="税率(%)">
            <a-input-number
              v-model:value="draft.taxRate"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
              @change="recalcDraft"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="不含税单价">
            <a-input-number
              v-model:value="draft.unitPriceExTax"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
              :disabled="!taxModeExcluding"
              @change="recalcDraft"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="含税单价">
            <a-input-number
              v-model:value="draft.unitPriceInTax"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
              :disabled="taxModeExcluding"
              @change="recalcDraft"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="总价（不含税）">
            <a-input-number
              :value="draft.totalPriceExTax"
              :precision="2"
              disabled
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="总价（含税）">
            <a-input-number
              :value="draft.totalPriceInTax"
              :precision="2"
              disabled
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="交货日期">
            <a-date-picker
              :value="deliveryDateValue"
              style="width: 100%"
              placeholder="请选择交货日期"
              @change="onDeliveryDateChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="收货仓库">
            <a-select
              v-model:value="draft.receivingWarehouse"
              allow-clear
              placeholder="请选择收货仓库"
              :options="warehouseOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-input v-model:value="draft.remark" allow-clear placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { formatQty, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { recalcPoLine } from '@/store/purchaseOrderStore'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  taxModeExcluding: { type: Boolean, default: true },
  warehouseOpts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const draft = ref(null)

const deliveryDateValue = computed(() =>
  draft.value?.deliveryDate ? dayjs(draft.value.deliveryDate) : null,
)

watch(
  () => props.open,
  (visible) => {
    if (!visible) {
      draft.value = null
      return
    }
    draft.value = props.line ? { ...props.line } : null
    if (draft.value) recalcDraft()
  },
)

function recalcDraft() {
  if (!draft.value) return
  const record = draft.value
  const rate = Number(record.taxRate) || 0
  if (props.taxModeExcluding) {
    const ex = Number(record.unitPriceExTax) || 0
    record.unitPriceInTax = Math.round(ex * (1 + rate / 100) * 100) / 100
  } else {
    const inc = Number(record.unitPriceInTax) || 0
    record.unitPriceExTax = Math.round((inc / (1 + rate / 100)) * 100) / 100
  }
  recalcPoLine(record)
}

function onDeliveryDateChange(date) {
  if (!draft.value) return
  draft.value.deliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!draft.value) return
  if (draft.value.purchaseQty == null || Number(draft.value.purchaseQty) <= 0) {
    message.warning('请填写采购数量')
    return
  }
  recalcDraft()
  emit('save', { ...draft.value })
  emit('update:open', false)
}
</script>

<script>
export default { name: 'PurchaseOrderLineEditModal' }
</script>

<style lang="less" scoped>
.edit-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.item-preview {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.preview-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  min-height: 22px;
}

.preview-label {
  flex: 0 0 64px;
  color: rgba(0, 0, 0, 0.45);
}

.preview-value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
</style>
