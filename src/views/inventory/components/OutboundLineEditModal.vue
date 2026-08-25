<template>
  <a-modal
    :open="open"
    :title="mode === 'copy' ? '复制出库明细' : '编辑出库明细'"
    width="820px"
    :mask-closable="false"
    destroy-on-close
    class="inventory-line-edit-modal"
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
          @change="onWarehouseChange"
        />
      </a-form-item>

      <a-form-item required>
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            出库数量（{{ stockUnitLabel }}）
          </span>
        </template>
        <a-input-number
          v-model:value="draft.shipQty"
          :min="0"
          :precision="4"
          placeholder="请填写出库数量"
          style="width: 100%"
          @change="onShipQtyFieldChange"
        />
        <div v-if="canBatchPick" class="vl-tip">
          可用批次库存：{{ formatQty(availableQty) }} {{ stockUnitLabel }}（{{ issueRuleLabel }}）
        </div>
      </a-form-item>

      <a-form-item v-if="canBatchPick" :required="manualPick">
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            拣选批次
          </span>
        </template>
        <template v-if="manualPick">
          <a-select
            :value="manualPickIds"
            mode="multiple"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="搜索并多选批次"
            style="width: 100%"
            :options="batchOpts"
            :max-tag-count="3"
            @change="onManualPickIdsChange"
          />
          <div class="vl-tip">
            {{ OUTBOUND_BATCH_PICK_TIP_MANUAL }}
            <a class="manual-pick-inline" @click="batchSearchOpen = true">搜索更多</a>
            <a class="manual-pick-inline" @click="restoreAutoBatchPick">恢复自动</a>
          </div>
          <div v-if="manualAllocPreview" class="vl-tip">{{ manualAllocPreview }}</div>
        </template>
        <template v-else>
          <a-input :value="autoAllocPreviewText" disabled />
          <div class="vl-tip">
            {{ OUTBOUND_BATCH_PICK_TIP_AUTO }}
            <a class="manual-pick-inline" @click="enableManualBatchPick">自主拣选</a>
          </div>
        </template>
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <DollarOutlined />
            单价
          </span>
        </template>
        <a-input-number
          v-model:value="draft.unitPrice"
          :min="0"
          :precision="2"
          placeholder="请输入"
          style="width: 100%"
          @change="onUnitPriceChange"
        />
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <AccountBookOutlined />
            总价
          </span>
        </template>
        <a-input-number :value="draft.totalPrice" :precision="2" disabled style="width: 100%" />
      </a-form-item>
    </a-form>

    <OutboundBatchSearchModal
      v-model:open="batchSearchOpen"
      :warehouse="draft?.shipWarehouse || ''"
      :item-code="draft?.itemCode || ''"
      :item-name="draft?.itemName || ''"
      :unit-label="stockUnitLabel"
      :selected-ids="manualPickIds"
      @confirm="onManualPickIdsChange"
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { formatNumber } from '@/utils/numberFormat'
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  AccountBookOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import {
  canOutboundBatchPick,
  enrichOutboundLine,
  isOutboundDualUnitLine,
  resolveOutboundStockUnit,
  syncLineTotalFromUnit,
} from '@/utils/outboundLineHelpers'
import { listBatches, stockBatchState } from '@/store/stockBatchStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  OUTBOUND_BATCH_PICK_TIP_AUTO,
  OUTBOUND_BATCH_PICK_TIP_MANUAL,
} from '@/utils/outboundLineColumns'
import {
  getOutboundIssueRule,
  OUTBOUND_ISSUE_RULE_OPTIONS,
  functionParamState,
} from '@/store/functionParamStore'
import {
  allocateFromSelectedBatches,
  allocateOutboundBatches,
  applyBatchAllocationsToLine,
  formatBatchAllocationPreview,
  getLineBatchAllocations,
  getManualPickBatchIds,
  getOutboundAvailableBatchQty,
  isLineManualBatchPick,
  syncManualPickBatchesToLine,
  validateManualBatchAllocations,
} from '@/utils/outboundBatchAllocate'
import OutboundBatchSearchModal from './OutboundBatchSearchModal.vue'

function formatQty(val) {
  return formatNumber(val, 4, { empty: '0' })
}

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  mode: { type: String, default: 'edit' },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = ref(null)
const selectedItemKey = ref(undefined)
const preview = ref(null)
const batchSearchOpen = ref(false)

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

const isDualUnitLine = computed(() => isOutboundDualUnitLine(draft.value || {}))
const canBatchPick = computed(() => canOutboundBatchPick(draft.value || {}))

const manualPick = computed(() => {
  void functionParamState.params.outboundIssueRule
  void functionParamState.params.dualUnitIssueStrategy
  void draft.value?.manualBatchPick
  void draft.value?.outboundIssueRule
  return isLineManualBatchPick(draft.value || {})
})

const issueRuleLabel = computed(() => {
  const rule = getOutboundIssueRule()
  return OUTBOUND_ISSUE_RULE_OPTIONS.find((o) => o.value === rule)?.label || '先进先出'
})

const stockUnitLabel = computed(() => resolveOutboundStockUnit(draft.value || {}))

const availableQty = computed(() => {
  void stockBatchState.batches
  const line = draft.value
  if (!line?.itemCode || !line.shipWarehouse) return 0
  return getOutboundAvailableBatchQty(line.shipWarehouse, line.itemCode)
})

const manualPickIds = computed(() => getManualPickBatchIds(draft.value || {}))

const manualAllocPreview = computed(() => {
  const line = draft.value
  if (!line) return ''
  const ids = getManualPickBatchIds(line)
  if (!ids.length) return ''
  const demand = Number(line.shipQty) || 0
  if (!(demand > 0)) return `已选 ${ids.length} 批，请填写出库数量（小批优先跨批扣减）`
  const res = allocateFromSelectedBatches({
    batchIds: ids,
    demandQty: demand,
    unit: stockUnitLabel.value,
    line,
  })
  if (!res.ok) return res.message
  return formatBatchAllocationPreview(res.allocations, stockUnitLabel.value)
})

const autoAllocPreviewText = computed(() => {
  void stockBatchState.batches
  void functionParamState.params.outboundIssueRule
  void functionParamState.params.dualUnitIssueStrategy
  const line = draft.value
  if (!line) return ''
  const rule = getOutboundIssueRule()
  const ruleName = issueRuleLabel.value
  if (!line.itemCode || !line.shipWarehouse) {
    return `${ruleName}·确认时自动扣批`
  }
  const batchAvail = getOutboundAvailableBatchQty(line.shipWarehouse, line.itemCode)
  if (!(batchAvail > 0)) {
    return '该仓暂无在库批次，请先入库建批或改选有批次的仓库'
  }
  if (!(Number(line.shipQty) > 0)) {
    return `${ruleName}·确认时自动扣批`
  }
  const res = allocateOutboundBatches({
    warehouse: line.shipWarehouse,
    itemCode: line.itemCode,
    demandQty: line.shipQty,
    rule,
    line,
  })
  if (!res.ok) return res.message
  return formatBatchAllocationPreview(res.allocations, stockUnitLabel.value)
})

const batchOpts = computed(() => {
  void stockBatchState.batches
  const line = draft.value
  if (!line?.itemCode || !line.shipWarehouse) return []
  const unit = stockUnitLabel.value
  return listBatches({
    warehouse: line.shipWarehouse,
    itemCode: line.itemCode,
    inStockOnly: true,
  })
    .slice()
    .sort((a, b) => {
      const da = Number(a.currentLength) || 0
      const db = Number(b.currentLength) || 0
      if (da !== db) return da - db
      return String(a.batchNo || '').localeCompare(String(b.batchNo || ''), 'zh-CN')
    })
    .map((b) => ({
      label: `${b.batchNo}（当前 ${formatQty(b.currentLength)}${unit}）`,
      value: b.id,
    }))
})

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) {
      draft.value = null
      preview.value = null
      selectedItemKey.value = undefined
      return
    }
    draft.value = reactive(enrichOutboundLine({ ...props.line }))
    if (canOutboundBatchPick(draft.value) && isLineManualBatchPick(draft.value)) {
      draft.value.manualBatchPick = true
      applyBatchAllocationsToLine(draft.value, getLineBatchAllocations(draft.value))
    }
    syncSelectedItemKey()
    refreshPreviewStock()
  },
)

function clearAutoBatchPickFields() {
  if (!draft.value) return
  draft.value.manualPickBatchIds = []
  draft.value.batchAllocations = []
  draft.value.pickedBatchId = null
  draft.value.pickedBatchNo = ''
  draft.value.pickedLength = null
  draft.value.barcodeBatchNo = ''
  draft.value.issuedBatchNo = undefined
  draft.value.outboundIssueRule = undefined
}

function enableManualBatchPick() {
  if (!draft.value) return
  if (!(Number(draft.value.demandMeters) > 0) && Number(draft.value.shipQty) > 0) {
    draft.value.demandMeters = Number(draft.value.shipQty)
  }
  clearAutoBatchPickFields()
  draft.value.manualBatchPick = true
  syncLineTotalFromUnit(draft.value)
}

function restoreAutoBatchPick() {
  if (!draft.value) return
  draft.value.manualBatchPick = false
  clearAutoBatchPickFields()
  syncLineTotalFromUnit(draft.value)
}

function onManualPickIdsChange(ids) {
  if (!draft.value) return
  syncManualPickBatchesToLine(draft.value, ids || [])
  const demand = Number(draft.value.shipQty) || 0
  if (demand > 0 && getManualPickBatchIds(draft.value).length) {
    const check = allocateFromSelectedBatches({
      batchIds: getManualPickBatchIds(draft.value),
      demandQty: demand,
      unit: stockUnitLabel.value,
      line: draft.value,
    })
    if (!check.ok) message.warning(check.message)
  }
  syncLineTotalFromUnit(draft.value)
}

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

function refreshPreviewStock() {
  if (!draft.value) return
  Object.assign(draft.value, enrichOutboundLine(draft.value))
  const unit = resolveOutboundStockUnit(draft.value)
  preview.value = {
    itemCode: draft.value.itemCode,
    itemName: draft.value.itemName,
    specModel: draft.value.specModel,
    unit,
    stockQty: draft.value.stockQty,
    warehouseStockQty: draft.value.warehouseStockQty,
  }
}

function clearBatchPick() {
  if (!draft.value) return
  clearAutoBatchPickFields()
  if (canOutboundBatchPick(draft.value) && manualPick.value) {
    syncLineTotalFromUnit(draft.value)
  }
}

function onWarehouseChange() {
  clearBatchPick()
  refreshPreviewStock()
}

function onShipQtyFieldChange() {
  if (!draft.value) return
  let qty = Number(draft.value.shipQty)
  if (!Number.isFinite(qty) || qty < 0) {
    draft.value.shipQty = 0
    qty = 0
  }
  if (manualPick.value) {
    const ids = getManualPickBatchIds(draft.value)
    if (ids.length && qty > 0) {
      const check = allocateFromSelectedBatches({
        batchIds: ids,
        demandQty: qty,
        unit: stockUnitLabel.value,
        line: draft.value,
      })
      if (!check.ok) {
        message.warning(check.message)
      } else {
        syncManualPickBatchesToLine(draft.value, ids)
      }
    } else if (ids.length) {
      syncManualPickBatchesToLine(draft.value, ids)
    }
    syncLineTotalFromUnit(draft.value)
    return
  }
  clearAutoBatchPickFields()
  const max =
    availableQty.value > 0 || isDualUnitLine.value ? availableQty.value || undefined : undefined
  if (max != null && Number.isFinite(qty) && qty > max) {
    draft.value.shipQty = max
    message.warning(`出库数量不能超过可用库存 ${max}`)
  }
  syncLineTotalFromUnit(draft.value)
}

function onItemChange(rowKey) {
  const item = pickableItems.value.find((it) => it.rowKey === rowKey)
  if (!item || !draft.value) return
  const mat = materialInfoState.materials.find((m) => m.code === item.code)
  const isVL = Boolean(mat?.isVariableLength || item.isVariableLength)
  const stockUnit = isVL ? mat?.stockUnit || mat?.inventoryUnit || '米' : item.inventoryUnit || '件'
  Object.assign(draft.value, {
    itemId: item.itemId,
    itemCode: item.code,
    itemName: item.name,
    itemType: item.itemType,
    specAttr: item.productAttribute || item.materialType || '',
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    unit: stockUnit,
    unitPrice: item.unitPrice ?? draft.value.unitPrice,
    isVariableLength: isVL,
    pickedBatchId: undefined,
    pickedBatchNo: undefined,
    pickedLength: undefined,
    barcodeBatchNo: '',
    batchAllocations: [],
    manualBatchPick: false,
    shipQty: isVL ? null : draft.value.shipQty || 1,
  })
  Object.assign(draft.value, enrichOutboundLine(draft.value))
  syncLineTotalFromUnit(draft.value)
  refreshPreviewStock()
}

function onUnitPriceChange() {
  if (!draft.value) return
  syncLineTotalFromUnit(draft.value)
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
  const qty = Number(draft.value.shipQty)
  if (
    draft.value.shipQty == null ||
    draft.value.shipQty === '' ||
    !Number.isFinite(qty) ||
    qty < 0
  ) {
    message.warning('请输入出库数量（可为 0）')
    return
  }
  if (canOutboundBatchPick(draft.value) && manualPick.value) {
    if (qty > 0) {
      const check = validateManualBatchAllocations(draft.value)
      if (!check.ok) {
        message.warning(check.message)
        return
      }
      draft.value.manualBatchPick = true
      applyBatchAllocationsToLine(draft.value, check.allocations, { syncShipQty: false })
    }
    syncLineTotalFromUnit(draft.value)
  } else if (qty > 0) {
    const available = getOutboundAvailableBatchQty(draft.value.shipWarehouse, draft.value.itemCode)
    if ((isOutboundDualUnitLine(draft.value) || available > 0) && qty > available) {
      message.warning(`出库数量不能超过可用库存 ${available}`)
      return
    }
  }
  emit('confirm', enrichOutboundLine({ ...draft.value }))
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
@import './inventoryLineEditModal.less';

.vl-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.manual-pick-inline {
  margin-left: 8px;
}
</style>
