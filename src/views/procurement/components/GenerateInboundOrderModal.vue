<template>
  <a-modal
    :open="open"
    title="新增入库单"
    width="1400px"
    :mask-closable="false"
    destroy-on-close
    class="generate-inbound-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :span="8">
          <a-form-item label="采购单号" required>
            <a-input :value="purchaseOrder?.orderNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="供应商" required>
            <a-input :value="purchaseOrder?.supplier" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="收货日期" required>
            <a-date-picker
              v-model:value="form.receiptDate"
              size="small"
              style="width: 100%"
              placeholder="请选择收货日期"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="入库仓库">
            <a-select
              v-model:value="form.warehouse"
              allow-clear
              size="small"
              placeholder="请选择 入库仓库"
              :options="warehouseOpts"
              @change="onHeaderWarehouseChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发票号码">
            <a-input
              v-model:value="form.invoiceNo"
              size="small"
              :maxlength="30"
              placeholder="请输入发票号码"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea
              v-model:value="form.remark"
              :rows="2"
              :maxlength="200"
              show-count
              placeholder="请输入备注"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="inboundLines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX }"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'stockUnitQty'">
          <span class="col-title-with-tip">
            库存单位量
            <a-tooltip :title="STOCK_UNIT_QTY_TIP">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'itemName'">
          <span class="item-name-text" :title="record.itemName">
            [{{ record.itemCode }}] {{ record.itemName }}
          </span>
        </template>
        <template v-else-if="column.key === 'stockQty'">
          {{ formatQty(record.stockQty) }}
          <span class="unit-suffix">{{ resolveInboundStockUnit(record) }}</span>
        </template>
        <template v-else-if="column.key === 'warehouseStockQty'">
          {{ formatQty(record.warehouseStockQty) }}
          <span class="unit-suffix">{{ resolveInboundStockUnit(record) }}</span>
        </template>
        <template v-else-if="column.key === 'warehouse'">
          <a-select
            v-model:value="record.warehouse"
            allow-clear
            size="small"
            placeholder="请选择"
            style="width: 100%"
            :options="warehouseOpts"
            @change="() => refreshLine(record)"
          />
        </template>
        <template v-else-if="column.key === 'locationNo'">
          <a-input
            v-model:value="record.locationNo"
            size="small"
            allow-clear
            placeholder="请输入货位号"
          />
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number
            v-if="isInboundDualUnitLine(record)"
            v-model:value="record.purchaseQty"
            size="small"
            :min="1"
            :precision="0"
            style="width: 100%"
          />
          <a-input-number
            v-else
            v-model:value="record.qty"
            size="small"
            :min="0"
            :max="record.remainingQty"
            :precision="3"
            style="width: 100%"
            @change="() => onLineQtyChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'unit'">
          {{ resolveInboundQtyUnit(record) || '—' }}
        </template>
        <template v-else-if="column.key === 'stockUnitQty'">
          <template v-if="isInboundDualUnitLine(record)">
            <a-input-number
              v-if="allowsInboundTotalEntry(record.barcodeType)"
              :value="getStockUnitQtyValue(record)"
              size="small"
              :min="0.001"
              :precision="4"
              style="width: 100%"
              @update:value="(v) => onLineStockUnitQtyInput(record, v)"
            />
            <a-input-number
              v-else
              :value="getUniformPieceValue(record)"
              size="small"
              :min="0.001"
              :precision="4"
              style="width: 100%"
              placeholder="单件数量"
              @update:value="(v) => onLineStockUnitQtyInput(record, v)"
            />
          </template>
          <span v-else class="cell-disabled">{{ formatQty(record.qty) }}</span>
        </template>
        <template v-else-if="column.key === 'stockUnit'">
          {{ resolveInboundStockUnit(record) || '—' }}
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number
            v-model:value="record.unitPrice"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="() => onLineUnitPriceChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'totalPrice'">
          {{ formatMoney(record.totalPrice) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="4">
            <a @click="openLineEdit(record)">编辑</a>
            <a class="danger-link" @click="removeLine(index)">删除</a>
          </a-space>
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '—' }}
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="没有可入库的明细" />
      </template>
    </a-table>

    <div class="line-summary">
      合计数量：<strong>{{ totalQty.toLocaleString() }}</strong>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </a-modal>

  <InboundLineEditModal
    v-model:open="lineEditOpen"
    :line="lineEditTarget"
    mode="edit"
    lock-product
    @confirm="onLineEditConfirm"
  />
</template>

<script setup>
import { formatQty } from '@/utils/numberFormat'
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import InboundLineEditModal from '@/views/inventory/components/InboundLineEditModal.vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { createInboundFromPurchaseOrder } from '@/store/inboundOrderStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { inboundFormLineColumns, STOCK_UNIT_QTY_TIP } from '@/utils/inboundLineColumns'
import {
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  getUniformPieceValue,
  isInboundDualUnitLine,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
  syncInboundLineTotalFromUnit,
} from '@/utils/inboundLineHelpers'
import { INBOUND_ENTRY_MODE, allowsInboundTotalEntry } from '@/utils/variableLengthMaterial'

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const inboundLines = ref([])
const prevHeaderWarehouse = ref(undefined)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditSourceId = ref(null)

const form = reactive({
  receiptDate: dayjs(),
  invoiceNo: '',
  remark: '',
  warehouse: undefined,
})

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const columns = [
  ...inboundFormLineColumns.filter((c) => c.key !== 'actions'),
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const tableScrollX = computed(() => columns.reduce((sum, col) => sum + (col.width || 100), 0))

const totalQty = computed(() =>
  inboundLines.value.reduce((sum, line) => sum + (Number(getInboundQtyValue(line)) || 0), 0),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.purchaseOrder) return
    form.receiptDate = dayjs()
    form.invoiceNo = ''
    form.remark = props.purchaseOrder.remark || ''
    inboundLines.value = buildLinesFromPurchaseOrder(props.purchaseOrder)
    const warehouses = [
      ...new Set(inboundLines.value.map((line) => line.warehouse).filter(Boolean)),
    ]
    form.warehouse = warehouses.length === 1 ? warehouses[0] : undefined
    prevHeaderWarehouse.value = form.warehouse
  },
)

function buildLinesFromPurchaseOrder(order) {
  return (order.lineItems || [])
    .filter((line) => {
      const remaining = (Number(line.purchaseQty) || 0) - (Number(line.receivedQty) || 0)
      return remaining > 0
    })
    .map((line) => {
      const remaining = (Number(line.purchaseQty) || 0) - (Number(line.receivedQty) || 0)
      const warehouse =
        line.receivingWarehouse || resolveDefaultWarehouseByMaterialCode(line.itemCode) || undefined
      const enriched = enrichInboundLine({
        id: line.id,
        poLineId: line.id,
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType || '物料',
        specModel: line.specModel || '',
        specAttr: line.specAttr || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        unit: line.unit || '个',
        unitPrice: line.unitPriceInTax ?? line.unitPriceExTax ?? null,
        locationNo: line.locationNo || '',
        warehouse,
        qty: remaining,
        remainingQty: remaining,
      })
      if (isInboundDualUnitLine(enriched)) {
        enriched.purchaseQty = remaining
        enriched.qty = null
        enriched.totalValue = null
        // 一物一码默认统一单件；一类/一批一码可直接填合计
        enriched.inboundEntryMode = allowsInboundTotalEntry(enriched.barcodeType)
          ? INBOUND_ENTRY_MODE.TOTAL
          : INBOUND_ENTRY_MODE.UNIFORM
      }
      return enriched
    })
}

function refreshLine(line) {
  Object.assign(line, enrichInboundLine(line))
}

function onLineQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineStockUnitQtyInput(line, value) {
  if (allowsInboundTotalEntry(line.barcodeType)) {
    line.inboundEntryMode = INBOUND_ENTRY_MODE.TOTAL
    line.totalValue = value
    line.qty = value
    line.uniformValue = undefined
    syncInboundLineTotalFromUnit(line)
    return
  }
  line.inboundEntryMode = INBOUND_ENTRY_MODE.UNIFORM
  line.uniformValue = value
  line.totalValue = undefined
  const n = Number(line.purchaseQty) || 0
  const per = Number(value) || 0
  line.qty = n > 0 && per > 0 ? Math.round(n * per * 10000) / 10000 : null
  syncInboundLineTotalFromUnit(line)
}

function onLineUnitPriceChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !inboundLines.value.length) return

  Modal.confirm({
    title: '入库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      inboundLines.value.forEach((line) => {
        line.warehouse = newVal
        refreshLine(line)
      })
    },
  })
}

function removeLine(index) {
  inboundLines.value.splice(index, 1)
}

function openLineEdit(record) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditOpen.value = true
}

function onLineEditConfirm(updated) {
  const enriched = enrichInboundLine(updated)
  const idx = inboundLines.value.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx === -1) return
  const original = inboundLines.value[idx]
  if (original.remainingQty != null && Number(enriched.qty) > Number(original.remainingQty)) {
    message.warning(`入库数量不能超过剩余可入库数量 ${original.remainingQty}`)
    enriched.qty = original.remainingQty
  }
  inboundLines.value[idx] = {
    ...original,
    ...enriched,
    remainingQty: original.remainingQty,
    poLineId: original.poLineId,
    purchaseQty: original.purchaseQty,
  }
  refreshLine(inboundLines.value[idx])
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!props.purchaseOrder) return
  if (!form.receiptDate) {
    message.warning('请选择收货日期')
    return
  }
  if (!inboundLines.value.length) {
    message.warning('没有可入库的明细')
    return
  }
  const invalidWarehouse = inboundLines.value.find((line) => !line.warehouse)
  if (invalidWarehouse) {
    message.warning(`请为「${invalidWarehouse.itemName}」选择入库仓库`)
    return
  }
  const invalidQty = inboundLines.value.find((line) => {
    if (isInboundDualUnitLine(line)) {
      return !(Number(line.purchaseQty) > 0) || !(Number(getStockUnitQtyValue(line)) > 0)
    }
    return !line.qty || Number(line.qty) <= 0
  })
  if (invalidQty) {
    message.warning(
      isInboundDualUnitLine(invalidQty)
        ? `请填写「${invalidQty.itemName}」的入库数量与库存单位量`
        : `请填写「${invalidQty.itemName}」的入库数量`,
    )
    return
  }

  saving.value = true
  const result = createInboundFromPurchaseOrder(props.purchaseOrder.id, {
    deliveryDate: form.receiptDate.format('YYYY-MM-DD'),
    invoiceNo: form.invoiceNo?.trim(),
    remark: form.remark?.trim(),
    warehouse: form.warehouse || '',
    lineItems: inboundLines.value.map((line) => ({
      poLineId: line.poLineId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType,
      specModel: line.specModel,
      specAttr: line.specAttr,
      material: line.material,
      drawingNo: line.drawingNo,
      unit: line.unit,
      stockUnit: line.stockUnit,
      purchaseUnit: line.purchaseUnit,
      unitPrice: line.unitPrice,
      locationNo: line.locationNo,
      warehouse: line.warehouse,
      qty: Number(getStockUnitQtyValue(line)),
      purchaseQty: isInboundDualUnitLine(line) ? Number(line.purchaseQty) : undefined,
      totalValue: isInboundDualUnitLine(line) ? Number(getStockUnitQtyValue(line)) : undefined,
      inboundEntryMode: line.inboundEntryMode,
      isVariableLength: Boolean(line.isVariableLength),
    })),
  })
  saving.value = false

  if (!result.ok) {
    message.warning(result.message)
    return
  }

  message.success('入库单已创建')
  emit('saved', result.order)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
      align-self: flex-start;
    }
  }
}

.item-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}

.unit-suffix {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.cell-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.line-summary {
  margin-top: 10px;
  text-align: right;
  font-size: 13px;
  color: #595959;

  strong {
    color: #1677ff;
    font-size: 15px;
    margin-left: 4px;
  }
}

.danger-link {
  color: #ff4d4f;

  &:hover {
    color: #ff7875;
  }
}
</style>
