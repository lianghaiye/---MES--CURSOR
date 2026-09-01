<template>
  <a-modal
    :open="open"
    title="生成采购入库单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="generate-inbound-modal"
    wrap-class-name="generate-inbound-modal-wrap"
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="采购单号" required>
              <a-input :value="headerOrderNo" disabled size="small" :title="headerOrderNo" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供应商" required>
              <a-input :value="headerSupplier" disabled size="small" :title="headerSupplier" />
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
    </div>

    <div class="section-block">
      <div class="section-title">
        采购订单 ({{ orderRows.length }})
        <span class="section-hint">本次入库来源采购单，批量入库时展示多条</span>
      </div>
      <a-table
        :columns="orderColumns"
        :data-source="orderRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 820 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundStatusColor(record.inboundStatus)">
              {{ record.inboundStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ record.itemCount }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQty(record.purchaseQty) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block">
      <div class="section-title">入库明细 ({{ displayLines.length }})</div>
      <InboundLineScopeToggle v-model="lineScope" />

      <a-table
        :columns="columns"
        :data-source="displayLines"
        row-key="rowKey"
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
            <div class="qty-with-unit">
              <a-input-number
                v-model:value="record.qty"
                size="small"
                :min="0"
                :max="record.remainingQty"
                :precision="3"
                style="flex: 1; min-width: 0"
                :disabled="isLineCompleted(record)"
                @change="() => onLineQtyChange(record)"
              />
              <span class="unit-suffix">{{ record.unit || '' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'settleQty'">
            <div v-if="record.settleUnit" class="qty-with-unit">
              <a-input-number
                v-model:value="record.settleQty"
                size="small"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="flex: 1; min-width: 0"
                :disabled="isLineCompleted(record)"
                placeholder="实重"
                @change="() => onLineSettleQtyChange(record)"
              />
              <span class="unit-suffix">{{ record.settleUnit }}</span>
            </div>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'unitPrice'">
            {{ formatMoney(record.unitPrice) }}
          </template>
          <template v-else-if="column.key === 'totalPrice'">
            {{ formatMoney(record.totalPrice) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="!isLineCompleted(record)" :size="0">
              <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="removeLine(record)">
                移除本单
              </a-button>
            </a-space>
            <span v-else class="locked-tip">已入库</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="没有可入库的明细" />
        </template>
      </a-table>

      <div class="line-summary">
        合计数量：<strong>{{ totalQty.toLocaleString() }}</strong>
      </div>
    </div>

    <a-modal
      v-model:open="lineEditOpen"
      title="编辑明细"
      width="720px"
      :mask-closable="false"
      destroy-on-close
      class="inbound-line-edit-modal"
      @cancel="lineEditOpen = false"
    >
      <a-form v-if="lineEditDraft" layout="vertical" class="edit-form">
        <div class="item-preview">
          <a-row :gutter="[16, 8]">
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">物品编码</span>
                <span class="preview-value">{{ lineEditDraft.itemCode || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">物品名称</span>
                <span class="preview-value">{{ lineEditDraft.itemName || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">规格型号</span>
                <span class="preview-value">{{ lineEditDraft.specModel || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">材质</span>
                <span class="preview-value">{{ lineEditDraft.material || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">变体属性</span>
                <span class="preview-value">{{ lineEditDraft.variantSummary || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">图号</span>
                <span class="preview-value">{{ lineEditDraft.drawingNo || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">条码类型</span>
                <span class="preview-value">{{ lineEditDraft.barcodeType || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">单价</span>
                <span class="preview-value">{{ formatMoney(lineEditDraft.unitPrice) }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">入库进度</span>
                <span class="preview-value">
                  {{
                    formatInboundProgress(
                      lineEditDraft.receivedQty,
                      lineEditDraft.appliedInboundQty,
                      lineEditDraft.poPurchaseQty,
                    )
                  }}
                </span>
              </div>
            </a-col>
          </a-row>
        </div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="入库仓库" required>
              <a-select
                v-model:value="lineEditDraft.warehouse"
                style="width: 100%"
                placeholder="请选择入库仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入库数量" required>
              <a-input-number
                v-model:value="lineEditDraft.qty"
                :min="0"
                :max="lineEditDraft.remainingQty"
                :precision="3"
                style="width: 100%"
                :addon-after="lineEditDraft.unit || ''"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="lineEditDraft.settleUnit" :span="12">
            <a-form-item :label="`结算数量（${lineEditDraft.settleUnit}）`" required>
              <a-input-number
                v-model:value="lineEditDraft.settleQty"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
                placeholder="实重"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <template #footer>
        <a-button @click="lineEditOpen = false">取消</a-button>
        <a-button type="primary" @click="applyLineEdit">确定</a-button>
      </template>
    </a-modal>

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
import { getPendingPurchasePriceChangeBlock } from '@/store/purchasePriceChangeStore'
import { updatePurchaseReceipt } from '@/store/purchaseReceiptStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { inboundFormLineColumns } from '@/utils/inboundLineColumns'
import { syncInboundLineTotalFromUnit } from '@/utils/inboundLineHelpers'
import { estimateSettleQty } from '@/utils/settleUnit'
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
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

/** 采购场景生成入库：不展示状态/库存换算/货位相关列 */
const HIDDEN_LINE_KEYS = new Set([
  'actions',
  'lineStatus',
  'stockUnitQty',
  'stockUnit',
  'locationNo',
  'stockQty',
  'warehouseStockQty',
])

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
  /** 多张（列表多选）；优先于 purchaseOrder */
  purchaseOrders: { type: Array, default: null },
  /** 从采购收货进入时传入，保存后由列表侧回写关联 */
  purchaseReceipt: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const inboundLines = ref([])
const lineScope = ref('pending')
const prevHeaderWarehouse = ref(undefined)
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditId = ref('')

const sourceOrders = computed(() => {
  if (Array.isArray(props.purchaseOrders) && props.purchaseOrders.length) {
    return props.purchaseOrders.filter(Boolean)
  }
  return props.purchaseOrder ? [props.purchaseOrder] : []
})
const isMultiOrder = computed(() => sourceOrders.value.length > 1)
const headerOrderNo = computed(() => {
  const nos = sourceOrders.value.map((o) => o.orderNo).filter(Boolean)
  if (!nos.length) return ''
  if (nos.length === 1) return nos[0]
  return nos.length <= 3 ? nos.join('、') : `${nos.slice(0, 2).join('、')} 等 ${nos.length} 单`
})
const headerSupplier = computed(() => {
  const list = [...new Set(sourceOrders.value.map((o) => o.supplier).filter(Boolean))]
  if (!list.length) return ''
  return list.length === 1 ? list[0] : list.join('、')
})

const orderColumns = [
  { title: '采购单号', dataIndex: 'orderNo', key: 'orderNo', width: 160, ellipsis: true },
  { title: '入库状态', key: 'inboundStatus', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '采购项数', key: 'itemCount', width: 90, align: 'right' },
  { title: '采购数量', key: 'purchaseQty', width: 110, align: 'right' },
  { title: '采购员', dataIndex: 'purchaser', key: 'purchaser', width: 100 },
]

const orderRows = computed(() =>
  sourceOrders.value.map((o) => ({
    id: o.id,
    orderNo: o.orderNo || '',
    inboundStatus: o.inboundStatus || '待入库',
    supplier: o.supplier || '',
    itemCount: (o.lineItems || []).length,
    purchaseQty:
      o.totalQty ?? (o.lineItems || []).reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0),
    purchaser: o.purchaser || '',
  })),
)

function inboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

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

const columns = computed(() => {
  const base = inboundFormLineColumns.filter((c) => !HIDDEN_LINE_KEYS.has(c.key))
  const itemNameIdx = base.findIndex((c) => c.key === 'itemName')
  const progressCol = {
    title: '入库进度',
    key: 'inboundProgress',
    width: 180,
    ellipsis: true,
  }
  let withProgress =
    itemNameIdx >= 0
      ? [...base.slice(0, itemNameIdx), progressCol, ...base.slice(itemNameIdx)]
      : [progressCol, ...base]
  if (isMultiOrder.value) {
    const codeIdx = withProgress.findIndex((c) => c.key === 'itemCode')
    const orderCol = {
      title: '采购单号',
      key: 'purchaseOrderNo',
      dataIndex: 'purchaseOrderNo',
      width: 140,
      ellipsis: true,
    }
    withProgress =
      codeIdx >= 0
        ? [...withProgress.slice(0, codeIdx), orderCol, ...withProgress.slice(codeIdx)]
        : [orderCol, ...withProgress]
  }
  return [...withProgress, { title: '操作', key: 'action', width: 140, fixed: 'right' }]
})

const tableScrollX = computed(() => columns.value.reduce((sum, col) => sum + (col.width || 100), 0))

const totalQty = computed(() =>
  displayLines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible || !sourceOrders.value.length) return
    form.receiptDate = dayjs()
    form.invoiceNo = ''
    form.remark =
      sourceOrders.value.length === 1
        ? sourceOrders.value[0].remark || ''
        : `批量入库：${sourceOrders.value
            .map((o) => o.orderNo)
            .filter(Boolean)
            .join('、')}`
    lineScope.value = 'pending'
    inboundLines.value = sourceOrders.value.flatMap((order) => buildLinesFromPurchaseOrder(order))
    const warehouses = [
      ...new Set(inboundLines.value.map((line) => line.warehouse).filter(Boolean)),
    ]
    form.warehouse = warehouses.length === 1 ? warehouses[0] : undefined
    prevHeaderWarehouse.value = form.warehouse
  },
)

/** 按采购单位入库；有结算单位时带入 settleQty（实重），库存 qty 仍为件数 */
function buildPurchaseInboundLine(line, order) {
  const remaining = calcPoLineRemainInboundQty(order, line)
  const received = calcPoLineReceivedQty(order, line)
  const applied = calcPoLineAppliedOccupyQty(order, line)
  const locked = isPoLineOccupyFull(order, line)
  const poPurchaseQty = Number(line.purchaseQty) || 0
  const purchaseUnit = line.unit || '个'
  const warehouse =
    line.receivingWarehouse ||
    resolveDefaultWarehouseByMaterialCode(line.itemCode || line.productCode) ||
    undefined
  const settleUnit = String(line.settleUnit || '').trim()
  const next = {
    rowKey: `${order.id}__${line.id}`,
    id: line.id,
    poLineId: line.id,
    purchaseOrderId: order.id,
    purchaseOrderNo: order.orderNo || '',
    itemCode: line.itemCode || line.productCode || '',
    itemName: line.itemName || line.productName || '',
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
    settleUnit: settleUnit || '',
    settleQty: settleUnit
      ? Number(line.settleQty) > 0
        ? Number(line.settleQty)
        : (estimateSettleQty(
            { ...line, settleQty: undefined, purchaseQty: remaining },
            remaining,
          ) ?? undefined)
      : undefined,
    standardUnitWeight: line.standardUnitWeight,
    settledSettleQty: 0,
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

function onLineSettleQtyChange(line) {
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
  const key = record?.rowKey
  const idx = inboundLines.value.findIndex((l) => l.rowKey === key)
  if (idx >= 0) inboundLines.value.splice(idx, 1)
}

function openLineEdit(record) {
  if (isLineCompleted(record)) return
  lineEditId.value = record.rowKey
  lineEditDraft.value = { ...record }
  lineEditOpen.value = true
}

function applyLineEdit() {
  const draft = lineEditDraft.value
  if (!draft) {
    lineEditOpen.value = false
    return
  }
  if (!draft.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (!(Number(draft.qty) > 0)) {
    message.warning('请填写入库数量')
    return
  }
  if (Number(draft.qty) > Number(draft.remainingQty) + 1e-9) {
    message.warning(`入库数量不能超过剩余可入库数量 ${draft.remainingQty}`)
    return
  }
  if (draft.settleUnit && !(Number(draft.settleQty) > 0)) {
    message.warning(`请填写结算数量（${draft.settleUnit}）`)
    return
  }
  const target = inboundLines.value.find((r) => r.rowKey === lineEditId.value)
  if (target) {
    Object.assign(target, {
      warehouse: draft.warehouse,
      qty: draft.qty,
      settleQty: draft.settleQty,
    })
    syncInboundLineTotalFromUnit(target)
  }
  lineEditOpen.value = false
}

function formatMoney(val) {
  return formatNumber(val, 4)
}

function handleCancel() {
  emit('update:open', false)
}

function mapSubmitLine(line) {
  return {
    poLineId: line.poLineId,
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType,
    specModel: line.specModel,
    specAttr: line.specAttr,
    material: line.material,
    drawingNo: line.drawingNo,
    barcodeType: line.barcodeType || '',
    variantSummary: line.variantSummary || '',
    unit: line.unit,
    stockUnit: line.unit,
    purchaseUnit: line.unit,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    locationNo: '',
    warehouse: line.warehouse,
    qty: Number(line.qty),
    isVariableLength: false,
    settleUnit: line.settleUnit || '',
    settleQty: line.settleQty,
    standardUnitWeight: line.standardUnitWeight,
    settledSettleQty: 0,
  }
}

function handleSave() {
  if (!sourceOrders.value.length) return
  for (const order of sourceOrders.value) {
    const block = getPendingPurchasePriceChangeBlock(order.id, '生成入库单')
    if (block) {
      message.warning(block)
      return
    }
  }
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
  const settleInvalid = submitLines.find(
    (line) => String(line.settleUnit || '').trim() && !(Number(line.settleQty) > 0),
  )
  if (settleInvalid) {
    message.warning(`请为「${settleInvalid.itemName}」填写结算数量（${settleInvalid.settleUnit}）`)
    return
  }

  saving.value = true
  const receiptRemark = props.purchaseReceipt?.receiptNo
    ? `收货单 ${props.purchaseReceipt.receiptNo} 生成`
    : ''
  const byOrder = new Map()
  submitLines.forEach((line) => {
    const oid = line.purchaseOrderId
    if (!byOrder.has(oid)) byOrder.set(oid, [])
    byOrder.get(oid).push(line)
  })

  const allCreated = []
  const errors = []
  let okCount = 0
  for (const [orderId, lines] of byOrder) {
    const order = sourceOrders.value.find((o) => o.id === orderId)
    const result = createInboundFromPurchaseOrder(orderId, {
      deliveryDate: form.receiptDate.format('YYYY-MM-DD'),
      invoiceNo: form.invoiceNo?.trim(),
      remark:
        form.remark?.trim() ||
        receiptRemark ||
        (order?.orderNo ? `采购单 ${order.orderNo} 生成` : ''),
      warehouse: form.warehouse || '',
      purchaseReceiptId: props.purchaseReceipt?.id || '',
      lineItems: lines.map(mapSubmitLine),
    })
    if (result.ok) {
      okCount += 1
      const created = result.orders?.length ? result.orders : result.order ? [result.order] : []
      allCreated.push(...created)
    } else {
      errors.push(result.message || `采购单「${order?.orderNo || orderId}」生成失败`)
    }
  }
  saving.value = false

  if (props.purchaseReceipt?.id && allCreated.length) {
    const receipt = props.purchaseReceipt
    const ids = [...new Set([...(receipt.inboundOrderIds || []), ...allCreated.map((o) => o.id)])]
    const docNos = allCreated.map((o) => o.docNo).filter(Boolean)
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

  if (okCount) {
    const nos = allCreated
      .map((o) => o.docNo)
      .filter(Boolean)
      .join('、')
    message.success(
      nos ? `已创建 ${allCreated.length} 张入库单：${nos}` : `已创建 ${okCount} 张入库单`,
    )
    emit('saved', allCreated[0] || null, allCreated)
    emit('update:open', false)
  }
  if (errors.length) {
    const preview = errors.slice(0, 3).join('；')
    message.warning(errors.length > 3 ? `${preview}…等 ${errors.length} 条失败` : preview)
  }
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-hint {
  font-weight: 400;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

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

.locked-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.qty-with-unit {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.unit-suffix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

:deep(.inbound-row-locked) {
  color: rgba(0, 0, 0, 0.45);
  background: #fafafa;
}

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
