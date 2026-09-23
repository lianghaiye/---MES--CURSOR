<template>
  <a-modal
    :open="open"
    title="外协收货单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    wrap-class-name="generate-receipt-modal-wrap"
    :style="{ top: '24px' }"
    @cancel="handleCancel"
  >
    <div class="section-block modal-basic-card">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="收货单号">
              <a-input
                v-model:value="form.receiptNo"
                size="small"
                allow-clear
                :disabled="isMultiOrder"
                :placeholder="
                  isMultiOrder ? '多单时自动按外协单分别生成' : '留空自动生成 WXSH-年月日-流水'
                "
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="外协单号" required>
              <a-input :value="headerOrderNo" disabled size="small" :title="headerOrderNo" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="供应商">
              <a-input :value="headerSupplier" disabled size="small" :title="headerSupplier" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="外协员">
              <a-input :value="headerPurchaser" disabled size="small" :title="headerPurchaser" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">
        外协订单 ({{ orderRows.length }})
        <span class="section-hint">本次收货来源外协单，批量收货时展示多条</span>
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
          <template v-else-if="column.key === 'planQty'">
            {{ formatQty(record.planQty) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block modal-basic-card">
      <div class="section-title">收货明细 ({{ displayLines.length }})</div>
      <InboundLineScopeToggle v-model="lineScope" />

      <a-table
        :columns="columns"
        :data-source="displayLines"
        row-key="rowKey"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :row-class-name="rowClassName"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'inboundProgress'">
            <span class="col-title-with-tip">
              入库进度
              <a-tooltip :title="WX_INBOUND_PROGRESS_TOOLTIP">
                <InfoCircleOutlined class="col-tip-icon" />
              </a-tooltip>
            </span>
          </template>
          <template v-else-if="column.key === 'receiptQty' || column.key === 'receivingWarehouse'">
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
              formatWxInboundProgress(record.receivedQty, record.appliedOccupyQty, record.planQty)
            }}
          </template>
          <template v-else-if="column.key === 'itemName'">
            <span class="product-name" :title="formatProductName(record)">{{
              formatProductName(record)
            }}</span>
          </template>
          <template v-else-if="column.key === 'planQty'">
            <span class="qty-with-unit-text">
              {{ formatQty(record.planQty) }}
              <span v-if="record.unit" class="unit-suffix">{{ record.unit }}</span>
            </span>
          </template>
          <template v-else-if="column.key === 'receivingWarehouse'">
            <a-select
              v-model:value="record.receivingWarehouse"
              size="small"
              style="width: 100%"
              placeholder="请选择"
              :options="warehouseOpts"
              :disabled="record.locked"
              :status="warehouseStatus(record)"
            />
          </template>
          <template v-else-if="column.key === 'receiptQty'">
            <div class="qty-with-unit">
              <a-input-number
                v-model:value="record.receiptQty"
                size="small"
                :min="0"
                :max="record.remainingQty"
                :precision="3"
                style="flex: 1; min-width: 0"
                :disabled="record.locked"
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
                :disabled="record.locked"
                placeholder="实重"
              />
              <span class="unit-suffix">{{ record.settleUnit }}</span>
            </div>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'inboundQcRequirement'">
            <a-select
              v-model:value="record.inboundQcRequirement"
              size="small"
              style="width: 100%"
              placeholder="请选择"
              allow-clear
              :options="inboundQcOpts"
              :disabled="record.locked"
            />
          </template>
          <template v-else-if="column.key === 'unitPrice'">
            {{ formatMoney(record.unitPrice) }}
          </template>
          <template v-else-if="column.key === 'totalPrice'">
            {{ formatMoney(calcLineTotal(record)) }}
          </template>
          <template v-else-if="column.key === 'remark'">
            <LongTextEditCell
              v-if="!record.locked"
              :value="record.remark"
              @edit="openRemarkEdit(record)"
            />
            <span v-else>{{ record.remark || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <template v-if="!record.locked">
                <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="removeLine(record)">
                  移出本单
                </a-button>
              </template>
              <span v-else class="locked-tip">已满不可收货</span>
            </a-space>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || record[column.key] || '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="remarkEdit.open"
      title="编辑备注"
      width="640px"
      :mask-closable="false"
      destroy-on-close
      @ok="confirmRemarkEdit"
      @cancel="remarkEdit.open = false"
    >
      <a-textarea v-model:value="remarkEdit.draft" :rows="6" placeholder="请输入备注" allow-clear />
    </a-modal>

    <a-modal
      v-model:open="lineEditOpen"
      title="编辑明细"
      width="720px"
      destroy-on-close
      @ok="applyLineEdit"
    >
      <a-form v-if="lineEditDraft" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="产品名称">
              <a-input :value="lineEditDraft.itemName || lineEditDraft.productName" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="物品编码">
              <a-input :value="lineEditDraft.itemCode || lineEditDraft.productCode" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="入库进度">
              <a-input
                :value="
                  formatWxInboundProgress(
                    lineEditDraft.receivedQty,
                    lineEditDraft.appliedOccupyQty,
                    lineEditDraft.planQty,
                  )
                "
                disabled
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计划数量">
              <a-input
                :value="`${formatQty(lineEditDraft.planQty)}${lineEditDraft.unit ? ` ${lineEditDraft.unit}` : ''}`"
                disabled
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="入库质检要求">
              <a-select
                v-model:value="lineEditDraft.inboundQcRequirement"
                style="width: 100%"
                placeholder="请选择"
                allow-clear
                :options="inboundQcOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货仓库" required>
              <a-select
                v-model:value="lineEditDraft.receivingWarehouse"
                style="width: 100%"
                placeholder="请选择收货仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="点收数量" required>
              <a-input-number
                v-model:value="lineEditDraft.receiptQty"
                :min="0"
                :max="lineEditDraft.remainingQty"
                :precision="3"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="lineEditDraft.settleUnit" :span="8">
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
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="lineEditDraft.remark" :rows="3" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" ghost :loading="submitting" @click="handleConfirmAndCreateQc">
        确认并生成质检任务
      </a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { submitOutsourcingReceipt } from '@/store/outsourcingOrderStore'
import { getPendingOutsourcingPriceChangeBlock } from '@/store/outsourcingPriceChangeStore'
import { createOutsourcingQcFromReceipt } from '@/store/qcTaskStore'
import { attachReceiptQcSheet } from '@/store/outsourcingReceiptStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { inboundQcOptions } from '@/mock/materialInfoOptions'
import {
  calcWxLineAppliedOccupyQty,
  calcWxLineReceivedQty,
  calcWxLineRemainInboundQty,
  formatWxInboundProgress,
  isWxLineOccupyFull,
  WX_INBOUND_PROGRESS_TOOLTIP,
} from '@/utils/outsourcingInbound'
import { resolveEditableInboundQcRequirement } from '@/utils/inboundQcRequirement'
import { estimateSettleQty } from '@/utils/settleUnit'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import LongTextEditCell from '@/components/LongTextEditCell.vue'
import InboundLineScopeToggle from '@/components/InboundLineScopeToggle.vue'
import { filterInboundLinesByScope } from '@/utils/inboundLineScope'

const props = defineProps({
  open: { type: Boolean, default: false },
  outsourcingOrder: { type: Object, default: null },
  outsourcingOrders: { type: Array, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({ receiptNo: '', remark: '' })
const receiptLines = ref([])
const lineScope = ref('pending')
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditId = ref('')
const submitting = ref(false)
const remarkEdit = reactive({ open: false, record: null, draft: '' })
const inboundQcOpts = inboundQcOptions.map((v) => ({ label: v, value: v }))

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const sourceOrders = computed(() => {
  if (Array.isArray(props.outsourcingOrders) && props.outsourcingOrders.length) {
    return props.outsourcingOrders.filter(Boolean)
  }
  return props.outsourcingOrder ? [props.outsourcingOrder] : []
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
const headerPurchaser = computed(() => {
  const list = [
    ...new Set(
      sourceOrders.value.map((o) => o.purchaser || o.creator || o.follower || '').filter(Boolean),
    ),
  ]
  if (!list.length) return ''
  return list.length === 1 ? list[0] : list.join('、')
})

const orderColumns = [
  { title: '外协单号', dataIndex: 'orderNo', key: 'orderNo', width: 160, ellipsis: true },
  { title: '回货状态', key: 'inboundStatus', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '外协项数', key: 'itemCount', width: 90, align: 'right' },
  { title: '计划数量', key: 'planQty', width: 110, align: 'right' },
  { title: '外协员', dataIndex: 'purchaser', key: 'purchaser', width: 100 },
]

const orderRows = computed(() =>
  sourceOrders.value.map((o) => {
    const lines = (o.lineItems || []).filter((l) => !l.cancelled)
    return {
      id: o.id,
      orderNo: o.orderNo || '',
      inboundStatus: o.returnStatus || '待入库',
      supplier: o.supplier || '',
      itemCount: lines.length,
      planQty: lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0),
      purchaser: o.purchaser || o.creator || '',
    }
  }),
)

function inboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success', 入库中: 'processing' }
  return map[status] || 'default'
}

const displayLines = computed(() => filterInboundLinesByScope(receiptLines.value, lineScope.value))

const columns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 56, align: 'center' },
    { title: '入库进度', key: 'inboundProgress', width: 180, ellipsis: true },
  ]
  if (isMultiOrder.value) {
    cols.push({
      title: '外协单号',
      key: 'outsourcingOrderNo',
      dataIndex: 'outsourcingOrderNo',
      width: 140,
      ellipsis: true,
    })
  }
  cols.push(
    { title: '物品编码', key: 'itemCode', dataIndex: 'itemCode', width: 120, ellipsis: true },
    { title: '产品名称', key: 'itemName', dataIndex: 'itemName', width: 220, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
    { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
    {
      title: '变体属性',
      dataIndex: 'variantSummary',
      key: 'variantAttr',
      width: 140,
      ellipsis: true,
    },
    { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 90, ellipsis: true },
    { title: '条码类型', dataIndex: 'barcodeType', key: 'barcodeType', width: 96 },
    { title: '计划数量', key: 'planQty', width: 110, align: 'right' },
    { title: '点收数量', key: 'receiptQty', width: 120 },
    { title: '结算数量', key: 'settleQty', width: 120 },
    { title: '收货仓库', key: 'receivingWarehouse', width: 120 },
    { title: '入库质检要求', key: 'inboundQcRequirement', width: 120 },
    { title: '单价', key: 'unitPrice', width: 96, align: 'right' },
    { title: '总价', key: 'totalPrice', width: 96, align: 'right' },
    { title: '备注', key: 'remark', width: 140, ellipsis: true },
    { title: '操作', key: 'action', width: 140, fixed: 'right' },
  )
  return cols
})

const tableScrollX = computed(() => columns.value.reduce((sum, col) => sum + (col.width || 100), 0))

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function formatMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 4)
}

function formatProductName(record = {}) {
  return String(record.itemName || record.productName || '').trim() || '—'
}

function calcLineTotal(record = {}) {
  const qty = Number(record.receiptQty) || 0
  const price = Number(record.unitPrice) || 0
  return Math.round(qty * price * 10000) / 10000
}

function warehouseStatus(record) {
  if (record.locked) return undefined
  return String(record.receivingWarehouse || '').trim() ? undefined : 'error'
}

function buildLine(order, line) {
  const planQty = Number(line.planQty) || 0
  const receivedQty = calcWxLineReceivedQty(order, line)
  const appliedOccupyQty = calcWxLineAppliedOccupyQty(order, line)
  const remainingQty = calcWxLineRemainInboundQty(order, line)
  const locked = isWxLineOccupyFull(order, line)
  const code = line.productCode || line.itemCode || ''
  const settleUnit = String(line.settleUnit || '').trim()
  return {
    rowKey: `${order.id}__${line.id}`,
    id: line.id,
    outsourcingOrderId: order.id,
    outsourcingOrderNo: order.orderNo || '',
    productName: line.productName || line.itemName || '',
    productCode: code,
    itemName: line.itemName || line.productName || '',
    itemCode: line.itemCode || line.productCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    variantSummary: line.variantSummary || '',
    drawingNo: line.drawingNo || '',
    barcodeType: line.barcodeType || '',
    planQty,
    unit: line.unit || '',
    unitPrice: Number(line.unitPriceExTax ?? line.unitPrice) || 0,
    settleUnit,
    settleQty: settleUnit
      ? Number(line.settleQty) > 0
        ? Number(line.settleQty)
        : (estimateSettleQty(
            { ...line, settleQty: undefined, purchaseQty: remainingQty },
            remainingQty,
          ) ?? undefined)
      : undefined,
    standardUnitWeight: line.standardUnitWeight,
    receivingWarehouse:
      line.shipWarehouse ||
      line.receivingWarehouse ||
      resolveDefaultWarehouseByMaterialCode(code) ||
      undefined,
    receiptQty: locked ? 0 : remainingQty,
    inboundQcRequirement: resolveEditableInboundQcRequirement(line),
    remainingQty,
    receivedQty,
    appliedOccupyQty,
    locked,
    remark: '',
  }
}

watch(
  () => props.open,
  (val) => {
    if (!val || !sourceOrders.value.length) return
    form.receiptNo = ''
    form.remark =
      sourceOrders.value.length === 1
        ? sourceOrders.value[0].remark || ''
        : `批量收货：${sourceOrders.value
            .map((o) => o.orderNo)
            .filter(Boolean)
            .join('、')}`
    lineScope.value = 'pending'
    receiptLines.value = sourceOrders.value.flatMap((order) =>
      (order.lineItems || [])
        .filter((l) => !l.cancelled && (Number(l.planQty) || 0) > 0)
        .map((l) => buildLine(order, l)),
    )
  },
)

function rowClassName(record) {
  return record.locked ? 'receipt-row-locked' : ''
}

function removeLine(record) {
  const key = record?.rowKey
  const idx = receiptLines.value.findIndex((l) => l.rowKey === key)
  if (idx >= 0) receiptLines.value.splice(idx, 1)
}

function openRemarkEdit(record) {
  remarkEdit.record = record
  remarkEdit.draft = record.remark || ''
  remarkEdit.open = true
}

function confirmRemarkEdit() {
  if (remarkEdit.record) {
    remarkEdit.record.remark = remarkEdit.draft
  }
  remarkEdit.open = false
}

function openLineEdit(record) {
  if (record?.locked) return
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
  if (!String(draft.receivingWarehouse || '').trim()) {
    message.warning('请选择收货仓库')
    return
  }
  if (!(Number(draft.receiptQty) > 0)) {
    message.warning('请填写点收数量')
    return
  }
  if (Number(draft.receiptQty) > Number(draft.remainingQty) + 1e-9) {
    message.warning(`点收数量不能超过剩余可收数量 ${draft.remainingQty}`)
    return
  }
  if (draft.settleUnit && !(Number(draft.settleQty) > 0)) {
    message.warning(`请填写结算数量（${draft.settleUnit}）`)
    return
  }
  const idx = receiptLines.value.findIndex((l) => l.rowKey === lineEditId.value)
  if (idx >= 0) {
    Object.assign(receiptLines.value[idx], {
      receivingWarehouse: draft.receivingWarehouse,
      receiptQty: draft.receiptQty,
      settleQty: draft.settleQty,
      inboundQcRequirement: draft.inboundQcRequirement,
      remark: draft.remark || '',
    })
  }
  lineEditOpen.value = false
}

function handleCancel() {
  emit('update:open', false)
}

function collectSubmitLines() {
  for (const order of sourceOrders.value) {
    const block = getPendingOutsourcingPriceChangeBlock(order.id, '生成收货单')
    if (block) {
      message.warning(block)
      return null
    }
  }
  const editableLines = receiptLines.value.filter((l) => !l.locked)
  if (!editableLines.length) {
    message.warning('没有可收货的明细')
    return null
  }
  const submitLines = editableLines.filter((l) => Number(l.receiptQty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行点收数量')
    return null
  }
  const invalid = submitLines.find((l) => !String(l.receivingWarehouse || '').trim())
  if (invalid) {
    message.warning(`请为「${invalid.productName || invalid.itemName}」选择收货仓库`)
    return null
  }
  const settleInvalid = submitLines.find(
    (l) => String(l.settleUnit || '').trim() && !(Number(l.settleQty) > 0),
  )
  if (settleInvalid) {
    message.warning(
      `请为「${settleInvalid.productName || settleInvalid.itemName}」填写结算数量（${settleInvalid.settleUnit}）`,
    )
    return null
  }
  return submitLines
}

function submitReceipts(submitLines, { createQc = false } = {}) {
  const byOrder = new Map()
  submitLines.forEach((line) => {
    const oid = line.outsourcingOrderId
    if (!byOrder.has(oid)) byOrder.set(oid, [])
    byOrder.get(oid).push(line)
  })

  let okCount = 0
  let qcOkCount = 0
  const errors = []
  const nos = []
  const qcNos = []
  for (const [orderId, lines] of byOrder) {
    const order = sourceOrders.value.find((o) => o.id === orderId)
    const result = submitOutsourcingReceipt(
      orderId,
      lines.map((l) => ({
        lineId: l.id,
        receiptQty: l.receiptQty,
        settleQty: l.settleQty,
        settleUnit: l.settleUnit || '',
        receivingWarehouse: l.receivingWarehouse,
        inboundQcRequirement: l.inboundQcRequirement,
        remark: l.remark || '',
      })),
      {
        receiptNo: isMultiOrder.value ? '' : form.receiptNo,
        remark: form.remark || (order?.orderNo ? `外协单 ${order.orderNo} 生成` : ''),
      },
    )
    if (result.ok) {
      okCount += 1
      if (result.receipt?.receiptNo) nos.push(result.receipt.receiptNo)
      if (createQc && result.receipt) {
        const qcRes = createOutsourcingQcFromReceipt({
          receipt: result.receipt,
          remark: form.remark || '',
        })
        if (qcRes.ok) {
          attachReceiptQcSheet(result.receipt.id, {
            qcNo: qcRes.task.qcNo,
            qcStatus: '质检中',
          })
          qcOkCount += 1
          if (qcRes.task?.qcNo) qcNos.push(qcRes.task.qcNo)
        } else {
          errors.push(
            qcRes.message || `收货单「${result.receipt.receiptNo}」已生成，但质检单生成失败`,
          )
        }
      }
    } else {
      errors.push(result.message || `外协单「${order?.orderNo || orderId}」生成失败`)
    }
  }

  if (okCount) {
    if (createQc && qcOkCount) {
      message.success(
        qcNos.length
          ? `已生成 ${okCount} 张收货单，并生成质检单：${qcNos.join('、')}`
          : `已生成 ${okCount} 张收货单并生成质检单`,
      )
    } else {
      message.success(
        nos.length ? `已生成 ${okCount} 张收货单：${nos.join('、')}` : `已生成 ${okCount} 张收货单`,
      )
    }
    emit('confirmed')
    emit('update:open', false)
  }
  if (errors.length) {
    const preview = errors.slice(0, 3).join('；')
    message.warning(errors.length > 3 ? `${preview}…等 ${errors.length} 条失败` : preview)
  }
}

function handleConfirm() {
  const submitLines = collectSubmitLines()
  if (!submitLines) return
  submitting.value = true
  try {
    submitReceipts(submitLines, { createQc: false })
  } finally {
    submitting.value = false
  }
}

function handleConfirmAndCreateQc() {
  const submitLines = collectSubmitLines()
  if (!submitLines) return
  submitting.value = true
  try {
    submitReceipts(submitLines, { createQc: true })
  } finally {
    submitting.value = false
  }
}
</script>

<script>
export default { name: 'OutsourcingGenerateReceiptModal' }
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 0;

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
    }
  }
}

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
}

.product-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qty-with-unit {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.qty-with-unit-text {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.unit-suffix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.locked-tip {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

:deep(.receipt-row-locked) {
  color: rgba(0, 0, 0, 0.35);
  background: #fafafa;
}
</style>
