<template>
  <a-modal
    :open="open"
    title="新增入库单"
    width="1200px"
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

    <InboundLineScopeToggle v-model="lineScope" />

    <a-table
      :columns="columns"
      :data-source="displayLines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX }"
      :row-class-name="(record) => (isLineCompleted(record) ? 'inbound-row-locked' : '')"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'inboundProgress'">
          <span class="col-title-with-tip">
            入库进度
            <a-tooltip :title="INBOUND_PROGRESS_TOOLTIP">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'qty' || column.key === 'warehouse'">
          <span class="col-title-required">
            <span class="required-star">*</span>{{ column.title }}
          </span>
        </template>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'inboundProgress'">
          {{
            formatInboundProgress(
              record.receivedQty,
              record.appliedInboundQty,
              record.poPurchaseQty,
            )
          }}
        </template>
        <template v-else-if="column.key === 'itemName'">
          <span class="item-name-text" :title="record.itemName">
            [{{ record.itemCode }}] {{ record.itemName }}
          </span>
        </template>
        <template v-else-if="column.key === 'warehouse'">
          <a-select
            v-model:value="record.warehouse"
            allow-clear
            size="small"
            placeholder="请选择"
            style="width: 100%"
            :options="warehouseOpts"
            :disabled="isLineCompleted(record)"
          />
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number
            v-model:value="record.qty"
            size="small"
            :min="0"
            :max="record.remainingQty"
            :precision="3"
            style="width: 100%"
            :disabled="isLineCompleted(record)"
            @change="() => onLineQtyChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'unit'">
          {{ record.unit || '—' }}
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
          <a v-if="!isLineCompleted(record)" class="danger-link" @click="removeLine(record)">
            删除
          </a>
          <span v-else class="locked-tip">已入库</span>
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
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { createInboundFromPurchaseOrder } from '@/store/inboundOrderStore'
import { updatePurchaseReceipt } from '@/store/purchaseReceiptStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { inboundFormLineColumns } from '@/utils/inboundLineColumns'
import { syncInboundLineTotalFromUnit } from '@/utils/inboundLineHelpers'
import {
  calcPoLineAppliedOccupyQty,
  calcPoLineReceivedQty,
  calcPoLineRemainInboundQty,
  formatInboundProgress,
  INBOUND_PROGRESS_TOOLTIP,
  isPoLineOccupyFull,
} from '@/utils/purchaseLineInbound'
import InboundLineScopeToggle from '@/components/InboundLineScopeToggle.vue'
import { filterInboundLinesByScope, isInboundLineCompleted } from '@/utils/inboundLineScope'

/** 采购场景生成入库：不展示库存换算/货位相关列 */
const HIDDEN_LINE_KEYS = new Set([
  'actions',
  'stockUnitQty',
  'stockUnit',
  'locationNo',
  'stockQty',
  'warehouseStockQty',
])

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
  /** 从采购收货进入时传入，保存后由列表侧回写关联 */
  purchaseReceipt: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const inboundLines = ref([])
const lineScope = ref('pending')
const prevHeaderWarehouse = ref(undefined)

const displayLines = computed(() => filterInboundLinesByScope(inboundLines.value, lineScope.value))
const isLineCompleted = isInboundLineCompleted

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

const columns = (() => {
  const base = inboundFormLineColumns.filter((c) => !HIDDEN_LINE_KEYS.has(c.key))
  const itemNameIdx = base.findIndex((c) => c.key === 'itemName')
  const progressCol = {
    title: '入库进度',
    key: 'inboundProgress',
    width: 180,
    ellipsis: true,
  }
  const withProgress =
    itemNameIdx >= 0
      ? [...base.slice(0, itemNameIdx), progressCol, ...base.slice(itemNameIdx)]
      : [progressCol, ...base]
  return [...withProgress, { title: '操作', key: 'action', width: 80, fixed: 'right' }]
})()

const tableScrollX = computed(() => columns.reduce((sum, col) => sum + (col.width || 100), 0))

const totalQty = computed(() =>
  displayLines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.purchaseOrder) return
    form.receiptDate = dayjs()
    form.invoiceNo = ''
    form.remark = props.purchaseOrder.remark || ''
    lineScope.value = 'pending'
    inboundLines.value = buildLinesFromPurchaseOrder(props.purchaseOrder)
    const warehouses = [
      ...new Set(inboundLines.value.map((line) => line.warehouse).filter(Boolean)),
    ]
    form.warehouse = warehouses.length === 1 ? warehouses[0] : undefined
    prevHeaderWarehouse.value = form.warehouse
  },
)

/** 按采购单位入库，不做库存单位换算、不填货位 */
function buildPurchaseInboundLine(line, order) {
  const remaining = calcPoLineRemainInboundQty(order, line)
  const received = calcPoLineReceivedQty(order, line)
  const applied = calcPoLineAppliedOccupyQty(order, line)
  const locked = isPoLineOccupyFull(order, line)
  const poPurchaseQty = Number(line.purchaseQty) || 0
  const purchaseUnit = line.unit || '个'
  const warehouse =
    line.receivingWarehouse || resolveDefaultWarehouseByMaterialCode(line.itemCode) || undefined
  const next = {
    id: line.id,
    poLineId: line.id,
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType || '物料',
    specModel: line.specModel || '',
    specAttr: line.specAttr || '',
    material: line.material || '',
    drawingNo: line.drawingNo || '',
    barcodeType: line.barcodeType || '',
    variantSummary: line.variantSummary || '',
    unit: purchaseUnit,
    purchaseUnit,
    stockUnit: purchaseUnit,
    unitPrice: line.unitPriceInTax ?? line.unitPriceExTax ?? null,
    locationNo: '',
    warehouse,
    qty: locked ? 0 : remaining,
    remainingQty: remaining,
    receivedQty: received,
    appliedInboundQty: applied,
    poPurchaseQty,
    locked,
    isVariableLength: false,
    purchaseQty: undefined,
    totalValue: undefined,
    inboundEntryMode: undefined,
  }
  syncInboundLineTotalFromUnit(next)
  return next
}

function buildLinesFromPurchaseOrder(order) {
  return (order.lineItems || [])
    .filter((line) => (Number(line.purchaseQty) || 0) > 0)
    .map((line) => buildPurchaseInboundLine(line, order))
}

function onLineQtyChange(line) {
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
        if (!isLineCompleted(line)) line.warehouse = newVal
      })
    },
  })
}

function removeLine(record) {
  const id = record?.id
  const idx = inboundLines.value.findIndex((l) => l.id === id)
  if (idx >= 0) inboundLines.value.splice(idx, 1)
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
  const editableLines = inboundLines.value.filter((line) => !isInboundLineCompleted(line))
  if (!editableLines.length) {
    message.warning('没有可入库的明细')
    return
  }
  const submitLines = editableLines.filter((line) => Number(line.qty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行入库数量')
    return
  }
  const invalidWarehouse = submitLines.find((line) => !line.warehouse)
  if (invalidWarehouse) {
    message.warning(`请为「${invalidWarehouse.itemName}」选择入库仓库`)
    return
  }

  saving.value = true
  const receiptRemark = props.purchaseReceipt?.receiptNo
    ? `收货单 ${props.purchaseReceipt.receiptNo} 生成`
    : ''
  const result = createInboundFromPurchaseOrder(props.purchaseOrder.id, {
    deliveryDate: form.receiptDate.format('YYYY-MM-DD'),
    invoiceNo: form.invoiceNo?.trim(),
    remark: form.remark?.trim() || receiptRemark,
    warehouse: form.warehouse || '',
    purchaseReceiptId: props.purchaseReceipt?.id || '',
    lineItems: submitLines.map((line) => ({
      poLineId: line.poLineId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType,
      specModel: line.specModel,
      specAttr: line.specAttr,
      material: line.material,
      drawingNo: line.drawingNo,
      unit: line.unit,
      stockUnit: line.unit,
      purchaseUnit: line.unit,
      unitPrice: line.unitPrice,
      locationNo: '',
      warehouse: line.warehouse,
      qty: Number(line.qty),
      isVariableLength: false,
    })),
  })
  saving.value = false

  if (!result.ok) {
    message.warning(result.message)
    return
  }

  if (props.purchaseReceipt?.id && (result.orders?.length || result.order)) {
    const receipt = props.purchaseReceipt
    const created = result.orders?.length ? result.orders : [result.order]
    const ids = [...new Set([...(receipt.inboundOrderIds || []), ...created.map((o) => o.id)])]
    const docNos = created.map((o) => o.docNo).filter(Boolean)
    const prevNos = String(receipt.inboundOrderNo || '')
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    updatePurchaseReceipt(receipt.id, {
      inboundOrderIds: ids,
      inboundOrderNo: [...new Set([...prevNos, ...docNos])].join('、') || receipt.inboundOrderNo,
      inboundStatus: '入库中',
    })
  }

  const created = result.orders?.length ? result.orders : result.order ? [result.order] : []
  const nos = created
    .map((o) => o.docNo)
    .filter(Boolean)
    .join('、')
  message.success(nos ? `已创建 ${created.length} 张入库单：${nos}` : '入库单已创建')
  emit('saved', created[0] || null, created)
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

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
  font-family: SimSun, sans-serif;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
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

.locked-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

:deep(.inbound-row-locked) {
  color: rgba(0, 0, 0, 0.45);
  background: #fafafa;
}
</style>
