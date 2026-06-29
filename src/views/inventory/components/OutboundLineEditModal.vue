<template>
  <a-modal
    :open="open"
    :title="mode === 'copy' ? '复制出库明细' : '编辑出库明细'"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="outbound-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" class="edit-form">
      <a-form-item required>
        <template #label>
          <span class="field-label">
            <FileTextOutlined />
            产品信息
          </span>
        </template>
        <a-select
          v-model:value="selectedItemKey"
          show-search
          placeholder="请选择产品/物料"
          :filter-option="filterItemOption"
          :options="itemSelectOpts"
          @change="onItemChange"
        />
        <div v-if="preview" class="item-preview">
          <div class="preview-main">
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span>{{ preview.itemCode || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span>{{ preview.itemName || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品规格</span>
              <span>{{ preview.specModel || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">库存数量</span>
              <span>{{ formatQty(preview.stockQty) }} {{ preview.unit || '件' }}</span>
            </div>
          </div>
          <div class="preview-stock-box">
            <div class="stock-value">{{ formatQty(preview.warehouseStockQty) }}</div>
            <div class="stock-label">当前仓库数量({{ preview.unit || '件' }})</div>
          </div>
        </div>
      </a-form-item>

      <a-form-item required>
        <template #label>
          <span class="field-label">
            <HomeOutlined />
            仓库
          </span>
        </template>
        <a-select
          v-model:value="draft.shipWarehouse"
          placeholder="请选择仓库"
          :options="warehouseOpts"
          @change="refreshPreviewStock"
        />
      </a-form-item>

      <a-form-item required>
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            出库数量
          </span>
        </template>
        <a-input-number
          v-model:value="draft.shipQty"
          :min="0"
          :precision="3"
          placeholder="请输入"
          style="width: 100%"
          @change="onShipQtyChange"
        />
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <AccountBookOutlined />
            成本金额
          </span>
        </template>
        <div class="editable-field">
          <a-input-number
            v-model:value="draft.costAmount"
            :min="0"
            :precision="2"
            :disabled="!costAmountEditable"
            style="width: 100%"
            @change="onCostAmountChange"
          />
          <a-button type="text" class="edit-btn" @click="costAmountEditable = !costAmountEditable">
            <EditOutlined />
          </a-button>
        </div>
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <DollarOutlined />
            成本单价
          </span>
        </template>
        <div class="editable-field">
          <a-input-number
            v-model:value="draft.costUnitPrice"
            :min="0"
            :precision="2"
            :disabled="!costUnitPriceEditable"
            style="width: 100%"
            @change="onCostUnitPriceChange"
          />
          <a-button
            type="text"
            class="edit-btn"
            @click="costUnitPriceEditable = !costUnitPriceEditable"
          >
            <EditOutlined />
          </a-button>
        </div>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  AccountBookOutlined,
  DollarOutlined,
  EditOutlined,
  FileTextOutlined,
  HomeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import {
  enrichOutboundLine,
  syncLineCostFromUnit,
  syncLineCostUnitFromAmount,
  syncLineTotalFromUnit,
} from '@/utils/outboundLineHelpers'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  mode: { type: String, default: 'edit' },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = ref(null)
const selectedItemKey = ref(undefined)
const preview = ref(null)
const costAmountEditable = ref(false)
const costUnitPriceEditable = ref(false)

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const pickableItems = computed(() => buildWarehousePickableItems())

const itemSelectOpts = computed(() =>
  pickableItems.value.map((it) => ({
    label: `${it.code} - ${it.name}`,
    value: it.rowKey,
    searchText: `${it.code} ${it.name} ${it.specModel || ''}`,
  })),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) {
      draft.value = null
      preview.value = null
      selectedItemKey.value = undefined
      costAmountEditable.value = false
      costUnitPriceEditable.value = false
      return
    }
    draft.value = reactive(enrichOutboundLine({ ...props.line }))
    costAmountEditable.value = false
    costUnitPriceEditable.value = false
    syncSelectedItemKey()
    refreshPreviewStock()
  },
)

function filterItemOption(input, option) {
  const text = (option?.searchText ?? option?.label ?? '').toLowerCase()
  return text.includes(String(input || '').toLowerCase())
}

function syncSelectedItemKey() {
  if (!draft.value?.itemCode) {
    selectedItemKey.value = undefined
    return
  }
  const hit = pickableItems.value.find(
    (it) =>
      it.code === draft.value.itemCode &&
      (draft.value.itemId ? it.itemId === draft.value.itemId : true),
  )
  selectedItemKey.value = hit?.rowKey
}

function formatQty(val) {
  if (val == null || val === '') return '0'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function refreshPreviewStock() {
  if (!draft.value) return
  Object.assign(draft.value, enrichOutboundLine(draft.value))
  preview.value = {
    itemCode: draft.value.itemCode,
    itemName: draft.value.itemName,
    specModel: draft.value.specModel,
    unit: draft.value.unit || '件',
    stockQty: draft.value.stockQty,
    warehouseStockQty: draft.value.warehouseStockQty,
  }
}

function onItemChange(rowKey) {
  const item = pickableItems.value.find((it) => it.rowKey === rowKey)
  if (!item || !draft.value) return
  Object.assign(draft.value, {
    itemId: item.itemId,
    itemCode: item.code,
    itemName: item.name,
    itemType: item.itemType,
    specAttr: item.productAttribute || item.materialType || '',
    specModel: item.specModel || '',
    unit: item.inventoryUnit || '件',
    unitPrice: item.unitPrice ?? draft.value.unitPrice,
  })
  if (!costUnitPriceEditable.value) {
    draft.value.costUnitPrice = item.unitPrice ?? draft.value.costUnitPrice
  }
  syncLineTotalFromUnit(draft.value)
  if (!costAmountEditable.value) syncLineCostFromUnit(draft.value)
  refreshPreviewStock()
}

function onShipQtyChange() {
  if (!draft.value) return
  syncLineTotalFromUnit(draft.value)
  if (!costAmountEditable.value) syncLineCostFromUnit(draft.value)
}

function onCostUnitPriceChange() {
  if (!draft.value || costAmountEditable.value) return
  syncLineCostFromUnit(draft.value)
}

function onCostAmountChange() {
  if (!draft.value || costUnitPriceEditable.value) return
  syncLineCostUnitFromAmount(draft.value)
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!draft.value) return
  if (!draft.value.itemCode) {
    message.warning('请选择产品信息')
    return
  }
  if (!draft.value.shipWarehouse) {
    message.warning('请选择仓库')
    return
  }
  if (draft.value.shipQty == null || Number(draft.value.shipQty) <= 0) {
    message.warning('请输入出库数量')
    return
  }
  emit('confirm', enrichOutboundLine({ ...draft.value }))
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.outbound-line-edit-modal {
  .field-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .item-preview {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  .preview-main {
    flex: 1;
    min-width: 0;
  }

  .preview-row {
    display: flex;
    gap: 12px;
    margin-bottom: 6px;
    font-size: 13px;

    .preview-label {
      width: 72px;
      flex-shrink: 0;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .preview-stock-box {
    width: 120px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .stock-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
    color: rgba(0, 0, 0, 0.88);
  }

  .stock-label {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    text-align: center;
  }

  .editable-field {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .edit-btn {
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
