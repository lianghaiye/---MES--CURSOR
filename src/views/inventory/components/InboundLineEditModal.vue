<template>
  <a-modal
    :open="open"
    :title="mode === 'copy' ? '复制入库明细' : '编辑入库明细'"
    width="720px"
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
            入库仓库
          </span>
        </template>
        <a-select
          v-model:value="draft.warehouse"
          allow-clear
          placeholder="请选择仓库"
          :options="warehouseOpts"
          @change="refreshPreviewStock"
        />
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <HomeOutlined />
            货位号
          </span>
        </template>
        <a-input v-model:value="draft.locationNo" allow-clear placeholder="请输入货位号" />
      </a-form-item>

      <a-form-item required>
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            入库数量
          </span>
        </template>
        <a-input-number
          v-model:value="draft.qty"
          :min="0"
          :precision="3"
          placeholder="请输入"
          style="width: 100%"
          @change="onQtyChange"
        />
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
  FileTextOutlined,
  HomeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import {
  enrichInboundLine,
  syncInboundLineTotalFromUnit,
} from '@/utils/inboundLineHelpers'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  mode: { type: String, default: 'edit' },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = ref(null)
const selectedItemKey = ref(undefined)
const preview = ref(null)

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
      return
    }
    draft.value = reactive(enrichInboundLine({ ...props.line }))
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
  Object.assign(draft.value, enrichInboundLine(draft.value))
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
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    unit: item.inventoryUnit || '件',
    unitPrice: item.unitPrice ?? draft.value.unitPrice,
  })
  syncInboundLineTotalFromUnit(draft.value)
  refreshPreviewStock()
}

function onQtyChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function onUnitPriceChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
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
  if (!draft.value.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (draft.value.qty == null || Number(draft.value.qty) <= 0) {
    message.warning('请输入入库数量')
    return
  }
  emit('confirm', enrichInboundLine({ ...draft.value }))
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
@import './inventoryLineEditModal.less';
</style>
