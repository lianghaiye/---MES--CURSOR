<template>
  <a-modal
    :open="open"
    title="采购收货单"
    width="1280px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
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
                isMultiOrder ? '多单时自动按采购单分别生成' : '留空自动生成 CGSH-年月日-流水'
              "
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="采购单号" required>
            <a-input :value="headerOrderNo" disabled size="small" :title="headerOrderNo" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="供应商">
            <a-input :value="headerSupplier" disabled size="small" :title="headerSupplier" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="采购员">
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
            收货进度
            <a-tooltip :title="INBOUND_PROGRESS_TOOLTIP">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.required">
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
            formatInboundProgress(record.receivedQty, record.appliedOccupyQty, record.purchaseQty)
          }}
        </template>
        <template v-else-if="column.key === 'productName'">
          <span class="product-name" :title="record.productName">{{
            record.productName || '—'
          }}</span>
        </template>
        <template v-else-if="column.key === 'purchaseQty'">
          {{ formatQty(record.purchaseQty) }}
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
          <a-input-number
            v-model:value="record.receiptQty"
            size="small"
            :min="0"
            :max="record.remainingQty"
            :precision="2"
            style="width: 100%"
            :disabled="record.locked"
          />
        </template>
        <template v-else-if="column.key === 'settleUnit'">
          {{ record.settleUnit || '—' }}
        </template>
        <template v-else-if="column.key === 'settleQty'">
          <a-input-number
            v-if="record.settleUnit"
            v-model:value="record.settleQty"
            size="small"
            :min="0"
            :precision="3"
            style="width: 100%"
            :disabled="record.locked"
            placeholder="实重"
          />
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'receivingMode'">
          <a-select
            v-model:value="record.receivingMode"
            size="small"
            style="width: 100%"
            :options="receivingModeOpts"
            :disabled="record.locked"
          />
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
              <a-button type="link" size="small" @click="openLineEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="removeLine(record)">
                移出本单
              </a-button>
            </template>
            <span v-else class="locked-tip">已满不可收货</span>
          </a-space>
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>

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
              <a-input :value="lineEditDraft.productName" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="编号">
              <a-input :value="lineEditDraft.productCode" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货进度">
              <a-input
                :value="
                  formatInboundProgress(
                    lineEditDraft.receivedQty,
                    lineEditDraft.appliedOccupyQty,
                    lineEditDraft.purchaseQty,
                  )
                "
                disabled
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="入库质检要求">
              <a-input :value="lineEditDraft.inboundQcRequirement || '—'" disabled />
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
            <a-form-item label="收货数量" required>
              <a-input-number
                v-model:value="lineEditDraft.receiptQty"
                :min="0"
                :max="lineEditDraft.remainingQty"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货模式">
              <a-select
                v-model:value="lineEditDraft.receivingMode"
                style="width: 100%"
                :options="receivingModeOpts"
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
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { submitReceipt } from '@/store/purchaseOrderStore'
import { getPendingPurchasePriceChangeBlock } from '@/store/purchasePriceChangeStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import {
  calcPoLineAppliedOccupyQty,
  calcPoLineReceivedQty,
  calcPoLineRemainInboundQty,
  formatInboundProgress,
  INBOUND_PROGRESS_TOOLTIP,
  isPoLineOccupyFull,
} from '@/utils/purchaseLineInbound'
import { resolveLineInboundQcRequirement } from '@/utils/inboundQcRequirement'
import { estimateSettleQty } from '@/utils/settleUnit'
import { formatNumber } from '@/utils/numberFormat'
import LongTextEditCell from '@/components/LongTextEditCell.vue'
import InboundLineScopeToggle from '@/components/InboundLineScopeToggle.vue'
import { filterInboundLinesByScope } from '@/utils/inboundLineScope'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 单张（详情页等） */
  purchaseOrder: { type: Object, default: null },
  /** 多张（列表多选）；优先于 purchaseOrder */
  purchaseOrders: { type: Array, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const RECEIPT_MODE_OPTIONS = ['正常收货', '直发现场']

const form = reactive({ receiptNo: '', remark: '' })
const receiptLines = ref([])
const lineScope = ref('pending')
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)

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
const headerPurchaser = computed(() => {
  const list = [...new Set(sourceOrders.value.map((o) => o.purchaser).filter(Boolean))]
  if (!list.length) return ''
  return list.length === 1 ? list[0] : list.join('、')
})

const displayLines = computed(() => filterInboundLinesByScope(receiptLines.value, lineScope.value))
const lineEditId = ref('')
const remarkEdit = reactive({ open: false, record: null, draft: '' })

const receivingModeOpts = RECEIPT_MODE_OPTIONS.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const columns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
    { title: '收货进度', key: 'inboundProgress', width: 180, fixed: 'left' },
  ]
  if (isMultiOrder.value) {
    cols.push({
      title: '采购单号',
      key: 'purchaseOrderNo',
      dataIndex: 'purchaseOrderNo',
      width: 140,
      ellipsis: true,
    })
  }
  cols.push(
    {
      title: '产品名称',
      key: 'productName',
      dataIndex: 'productName',
      width: 140,
      ellipsis: true,
      fixed: isMultiOrder.value ? undefined : 'left',
    },
    { title: '编号', key: 'productCode', dataIndex: 'productCode', width: 120, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
    { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
    { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
    { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
    { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
    { title: '采购单位', dataIndex: 'unit', width: 90 },
    { title: '收货仓库', key: 'receivingWarehouse', width: 120, required: true },
    { title: '收货数量', key: 'receiptQty', width: 110 },
    {
      title: '入库质检要求',
      key: 'inboundQcRequirement',
      dataIndex: 'inboundQcRequirement',
      width: 110,
    },
    { title: '结算单位', dataIndex: 'settleUnit', key: 'settleUnit', width: 80 },
    { title: '结算数量', key: 'settleQty', width: 110 },
    { title: '收货模式', key: 'receivingMode', width: 120 },
    { title: '备注', key: 'remark', width: 140 },
    { title: '操作', key: 'action', width: 130, fixed: 'right' },
  )
  return cols
})

const tableScrollX = computed(() => columns.value.reduce((sum, col) => sum + (col.width || 100), 0))

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function buildLine(po, line) {
  const purchaseQty = Number(line.purchaseQty) || 0
  const receivedQty = calcPoLineReceivedQty(po, line)
  const appliedOccupyQty = calcPoLineAppliedOccupyQty(po, line)
  const remainingQty = calcPoLineRemainInboundQty(po, line)
  const locked = isPoLineOccupyFull(po, line)
  return {
    rowKey: `${po.id}__${line.id}`,
    id: line.id,
    purchaseOrderId: po.id,
    purchaseOrderNo: po.orderNo || '',
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    itemName: line.itemName || line.productName || '',
    itemCode: line.itemCode || line.productCode || '',
    itemType: line.itemType || '',
    specModel: line.specModel || '',
    material: line.material || '',
    variantSummary: line.variantSummary || '',
    drawingNo: line.drawingNo || '',
    purchaseQty,
    unit: line.unit || line.purchaseUnit || '',
    settleUnit: String(line.settleUnit || '').trim(),
    settleQty: String(line.settleUnit || '').trim()
      ? Number(line.settleQty) > 0
        ? Number(line.settleQty)
        : (estimateSettleQty(
            { ...line, settleQty: undefined, purchaseQty: remainingQty },
            remainingQty,
          ) ?? undefined)
      : undefined,
    standardUnitWeight: line.standardUnitWeight,
    receivingMode: line.receivingMode === '直发现场' ? '直发现场' : '正常收货',
    receivingWarehouse:
      line.receivingWarehouse ||
      resolveDefaultWarehouseByMaterialCode(line.productCode || line.itemCode) ||
      undefined,
    receiptQty: locked ? 0 : remainingQty,
    remainingQty,
    receivedQty,
    appliedOccupyQty,
    locked,
    inboundQcRequirement: resolveLineInboundQcRequirement(line),
    remark: '',
  }
}

function buildLinesFromOrders(orders) {
  return orders.flatMap((po) =>
    (po.lineItems || [])
      .filter((l) => (Number(l.purchaseQty) || 0) > 0)
      .map((l) => buildLine(po, l)),
  )
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
    receiptLines.value = buildLinesFromOrders(sourceOrders.value)
  },
)

function rowClassName(record) {
  return record.locked ? 'receipt-row-locked' : ''
}

function warehouseStatus(record) {
  if (record.locked) return undefined
  if (!(Number(record.receiptQty) > 0)) return undefined
  return record.receivingWarehouse ? undefined : 'error'
}

function removeLine(record) {
  const key = record?.rowKey
  const idx = receiptLines.value.findIndex((l) => l.rowKey === key)
  if (idx >= 0) receiptLines.value.splice(idx, 1)
}

function openRemarkEdit(record) {
  if (record.locked) return
  remarkEdit.record = record
  remarkEdit.draft = record.remark || ''
  remarkEdit.open = true
}

function confirmRemarkEdit() {
  if (remarkEdit.record) {
    remarkEdit.record.remark = remarkEdit.draft || ''
  }
  remarkEdit.open = false
}

function openLineEdit(record) {
  if (record.locked) return
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
  if (!draft.receivingWarehouse) {
    message.warning('请选择收货仓库')
    return
  }
  if (!(Number(draft.receiptQty) > 0)) {
    message.warning('请填写收货数量')
    return
  }
  if (Number(draft.receiptQty) > Number(draft.remainingQty) + 1e-9) {
    message.warning(`收货数量不能超过剩余可收货数量 ${draft.remainingQty}`)
    return
  }
  if (draft.settleUnit && !(Number(draft.settleQty) > 0)) {
    message.warning(`请填写结算数量（${draft.settleUnit}）`)
    return
  }
  const target = receiptLines.value.find((r) => r.rowKey === lineEditId.value)
  if (target) {
    Object.assign(target, {
      receivingWarehouse: draft.receivingWarehouse,
      receiptQty: draft.receiptQty,
      settleQty: draft.settleQty,
      receivingMode: draft.receivingMode,
      remark: draft.remark || '',
    })
  }
  lineEditOpen.value = false
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  for (const order of sourceOrders.value) {
    const block = getPendingPurchasePriceChangeBlock(order.id, '生成收货单')
    if (block) {
      message.warning(block)
      return
    }
  }
  const editableLines = receiptLines.value.filter((l) => !l.locked)
  if (!editableLines.length) {
    message.warning('没有可收货的明细（已占满的明细不可再收货）')
    return
  }
  const submitLines = editableLines.filter((l) => Number(l.receiptQty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行收货数量')
    return
  }
  const invalid = submitLines.find((l) => !String(l.receivingWarehouse || '').trim())
  if (invalid) {
    message.warning(`「${invalid.productName || '明细'}」的收货仓库为必填项`)
    return
  }
  const settleInvalid = submitLines.find(
    (l) => String(l.settleUnit || '').trim() && !(Number(l.settleQty) > 0),
  )
  if (settleInvalid) {
    message.warning(
      `「${settleInvalid.productName || '明细'}」已启用结算单位，请填写结算数量（${settleInvalid.settleUnit}）`,
    )
    return
  }

  const byOrder = new Map()
  submitLines.forEach((line) => {
    const oid = line.purchaseOrderId
    if (!byOrder.has(oid)) byOrder.set(oid, [])
    byOrder.get(oid).push(line)
  })

  let okCount = 0
  const errors = []
  const nos = []
  let index = 0
  for (const [orderId, lines] of byOrder) {
    index += 1
    const order = sourceOrders.value.find((o) => o.id === orderId)
    const result = submitReceipt(orderId, lines, {
      receiptNo: isMultiOrder.value ? '' : form.receiptNo,
      remark:
        form.remark ||
        (order?.orderNo ? `采购单 ${order.orderNo} 生成` : '') ||
        (isMultiOrder.value ? `批量收货第 ${index} 单` : ''),
    })
    if (result.ok) {
      okCount += 1
      if (result.receipt?.receiptNo) nos.push(result.receipt.receiptNo)
    } else {
      errors.push(result.message || `采购单「${order?.orderNo || orderId}」生成失败`)
    }
  }

  if (okCount) {
    message.success(
      nos.length ? `已生成 ${okCount} 张收货单：${nos.join('、')}` : `已生成 ${okCount} 张收货单`,
    )
    emit('confirmed')
    emit('update:open', false)
  }
  if (errors.length) {
    const preview = errors.slice(0, 3).join('；')
    message.warning(errors.length > 3 ? `${preview}…等 ${errors.length} 条失败` : preview)
  }
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
    }
  }
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.col-title-required {
  .required-star {
    margin-right: 2px;
    color: #ff4d4f;
    font-family: SimSun, sans-serif;
  }
}

.product-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.locked-tip {
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}

:deep(.receipt-row-locked) {
  color: rgba(0, 0, 0, 0.35);
  background: #fafafa;

  td {
    background: #fafafa !important;
  }
}
</style>
