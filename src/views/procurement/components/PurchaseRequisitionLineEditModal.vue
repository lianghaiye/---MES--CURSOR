<template>
  <a-modal
    :open="open"
    title="编辑采购清单"
    width="800px"
    :mask-closable="false"
    destroy-on-close
    class="purchase-requisition-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" class="edit-form">
      <div class="item-preview">
        <a-row :gutter="[16, 8]">
          <a-col :span="8">
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span class="preview-value">{{
                draft.productCode || draft.inventoryCode || '—'
              }}</span>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span class="preview-value">{{
                draft.productName || draft.inventoryName || '—'
              }}</span>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="preview-row">
              <span class="preview-label">规格型号</span>
              <span class="preview-value">{{ draft.specModel || '—' }}</span>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="preview-row">
              <span class="preview-label">库存数量</span>
              <span class="preview-value">
                {{ formatQty(draft.stockQty) }}
                {{ draft.inventoryUnit || draft.stockUnit || draft.unit || '件' }}
              </span>
            </div>
          </a-col>
        </a-row>
      </div>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="计划采购数" required>
            <a-input-number
              v-model:value="draft.planPurchaseQty"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="采购单位" required>
            <a-select
              v-model:value="draft.unit"
              show-search
              allow-clear
              placeholder="请选择采购单位"
              style="width: 100%"
              :options="purchaseUnitOpts"
              :filter-option="filterUnitOption"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="供应商">
            <PlanSupplierSelect
              v-model:value="draft.supplierName"
              placeholder="请搜索或选择供应商"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="收货仓库">
            <a-select
              v-model:value="draft.receivingWarehouse"
              allow-clear
              show-search
              placeholder="请选择收货仓库"
              :options="warehouseOpts"
              :filter-option="filterWarehouseOption"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
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

<script>
export default { name: 'PurchaseRequisitionLineEditModal' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { formatQty, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { getPurchaseUnitOptions, unitState } from '@/store/unitStore'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  warehouseOpts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const draft = ref(null)

const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})

function filterUnitOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function filterWarehouseOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

watch(
  () => props.open,
  (visible) => {
    if (!visible) {
      draft.value = null
      return
    }
    draft.value = props.line ? { ...props.line } : null
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!draft.value) return
  if (draft.value.planPurchaseQty == null || Number(draft.value.planPurchaseQty) <= 0) {
    message.warning('请填写计划采购数')
    return
  }
  draft.value.purchaseUnit = draft.value.unit || draft.value.purchaseUnit || ''
  emit('save', { ...draft.value })
  emit('update:open', false)
}
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
