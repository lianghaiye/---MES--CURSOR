<template>
  <a-modal
    v-model:open="visible"
    title="编辑发货明细"
    width="820px"
    :mask-closable="false"
    destroy-on-close
    class="inventory-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="edit-form">
      <a-form-item>
        <template #label>
          <span class="field-label">
            <FileTextOutlined />
            产品信息
          </span>
        </template>
        <a-input :value="lockedProductLabel" disabled />
        <div class="item-preview">
          <div class="preview-grid">
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span>{{ draft.productCode || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span>{{ draft.productName || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">规格型号</span>
              <span>{{ draft.specModel || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">材质</span>
              <span>{{ draft.material || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">变体属性</span>
              <span>{{ draft.variantAttr || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">订单数量</span>
              <span>{{ formatDeliveryQty(draft.orderQty) }} {{ draft.unit || '件' }}</span>
            </div>
          </div>
          <div class="preview-bottom">
            <div class="preview-rest">
              <div class="preview-row">
                <span class="preview-label">库存数</span>
                <span>{{ formatDeliveryQty(draft.stockQty) }} {{ draft.unit || '件' }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">发货进度</span>
                <span>{{ progressDisplay }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">发货单价（含税）</span>
                <span>{{ formatDeliveryPrice(draft.deliveryUnitPriceInTax) }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">发货总额（含税）</span>
                <span>{{ formatDeliveryPrice(draft.deliveryAmountInTax) }}</span>
              </div>
              <div class="price-lock-hint">按申请时订单有效价锁定，改价请走订单价格变更</div>
            </div>
            <div class="preview-stock-box">
              <div class="stock-value">{{ formatDeliveryQty(draft.warehouseStockQty) }}</div>
              <div class="stock-label">当前仓库数量({{ draft.unit || '件' }})</div>
            </div>
          </div>
        </div>
      </a-form-item>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item>
            <template #label>
              <span class="field-label">
                <HomeOutlined />
                出库仓库
              </span>
            </template>
            <a-select
              v-model:value="draft.shipWarehouse"
              allow-clear
              placeholder="请选择出库仓库"
              :options="warehouseOpts"
              @change="refreshPreviewStock"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="showShipQty" :span="8">
          <a-form-item required>
            <template #label>
              <span class="field-label">
                <UnorderedListOutlined />
                本次发货数量
              </span>
            </template>
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
          <a-form-item>
            <template #label>
              <span class="field-label">
                <UnorderedListOutlined />
                发货重量
              </span>
            </template>
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
        <a-col :span="24">
          <a-form-item>
            <template #label>
              <span class="field-label">
                <FileTextOutlined />
                备注
              </span>
            </template>
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
import { FileTextOutlined, HomeOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'
import {
  formatDeliveryQty,
  formatDeliveryPrice,
  formatShipProgress,
  recalcDeliveryLine,
  deliveryDecimalFormatter,
  deliveryDecimalParser,
  roundDeliveryDecimal,
  refreshDeliveryLineStock,
  resolveDeliveryVariantAttr,
} from '@/utils/deliveryLine'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  showShipQty: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const draft = reactive(createDraft())

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const lockedProductLabel = computed(() => {
  if (draft.productCode && draft.productName) return `[${draft.productCode}] ${draft.productName}`
  return draft.productName || draft.productCode || ''
})

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
  const draftLine = {
    productName: line.productName || '',
    productCode: line.productCode || '',
    productId: line.productId || '',
    spuId: line.spuId || '',
    variantValues: line.variantValues || {},
    variantSummary: line.variantSummary || '',
    specAttr: line.specAttr || '',
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
    deliveryUnitPriceInTax: roundDeliveryDecimal(
      line.deliveryUnitPriceInTax ?? line.unitPriceInTax ?? 0,
      4,
    ),
    deliveryAmountInTax: roundDeliveryDecimal(line.deliveryAmountInTax ?? 0, 4),
    packagingForm: line.packagingForm || '',
    lineRemark: line.lineRemark || '',
    shipWarehouse: line.shipWarehouse || '',
    stockQty: line.stockQty ?? null,
    warehouseStockQty: line.warehouseStockQty ?? null,
    variantAttr: '',
  }
  draftLine.variantAttr = resolveDeliveryVariantAttr(draftLine)
  refreshDeliveryLineStock(draftLine)
  return draftLine
}

function refreshPreviewStock() {
  refreshDeliveryLineStock(draft)
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
  if (draft.deliveryUnitPriceInTax == null || draft.deliveryUnitPriceInTax === '') {
    message.warning('请填写发货单价（含税）')
    return
  }

  recalcDeliveryLine(draft)
  refreshDeliveryLineStock(draft)
  emit('saved', {
    ...props.line,
    shipQty: roundDeliveryDecimal(draft.shipQty, 4),
    shipWeight: roundDeliveryDecimal(draft.shipWeight, 4),
    deliveryUnitPriceExTax: roundDeliveryDecimal(draft.deliveryUnitPriceExTax, 4),
    deliveryAmountExTax: roundDeliveryDecimal(draft.deliveryAmountExTax, 4),
    deliveryUnitPriceInTax: roundDeliveryDecimal(draft.deliveryUnitPriceInTax, 4),
    deliveryAmountInTax: roundDeliveryDecimal(draft.deliveryAmountInTax, 4),
    packagingForm: draft.packagingForm || '',
    lineRemark: draft.lineRemark || '',
    shipWarehouse: draft.shipWarehouse || '',
    stockQty: draft.stockQty,
    warehouseStockQty: draft.warehouseStockQty,
    variantAttr: draft.variantAttr || '',
  })
  visible.value = false
}
</script>

<style lang="less" scoped>
@import '../../inventory/components/inventoryLineEditModal.less';

.item-preview {
  flex-direction: column;
  align-items: stretch;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
  margin-bottom: 8px;

  .preview-row {
    margin-bottom: 0;
    min-width: 0;

    > span:last-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.preview-bottom {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.preview-rest {
  flex: 1;
  min-width: 0;
}

.preview-stock-box {
  width: 148px;
  min-height: 96px;
}

.price-lock-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}
</style>
