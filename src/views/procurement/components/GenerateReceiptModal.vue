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
              placeholder="留空自动生成 CGSH-年月日-流水"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="采购单号" required>
            <a-input :value="purchaseOrder?.orderNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="供应商">
            <a-input :value="purchaseOrder?.supplier" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="采购员">
            <a-input :value="purchaseOrder?.purchaser" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="receiptLines"
      row-key="id"
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
              <a-button type="link" size="small" danger @click="removeLine(index)">
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
import { formatNumber } from '@/utils/numberFormat'
import LongTextEditCell from '@/components/LongTextEditCell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const RECEIPT_MODE_OPTIONS = ['正常收货', '直发现场']

const form = reactive({ receiptNo: '', remark: '' })
const receiptLines = ref([])
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditId = ref('')
const remarkEdit = reactive({ open: false, record: null, draft: '' })

const receivingModeOpts = RECEIPT_MODE_OPTIONS.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const columns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '收货进度', key: 'inboundProgress', width: 180, fixed: 'left' },
  {
    title: '产品名称',
    key: 'productName',
    dataIndex: 'productName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
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
  { title: '收货模式', key: 'receivingMode', width: 120 },
  { title: '备注', key: 'remark', width: 140 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

const tableScrollX = columns.reduce((sum, col) => sum + (col.width || 100), 0)

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
    id: line.id,
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

watch(
  () => props.open,
  (val) => {
    if (!val || !props.purchaseOrder) return
    form.receiptNo = ''
    form.remark = props.purchaseOrder.remark || ''
    receiptLines.value = (props.purchaseOrder.lineItems || [])
      .filter((l) => (Number(l.purchaseQty) || 0) > 0)
      .map((l) => buildLine(props.purchaseOrder, l))
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

function removeLine(index) {
  receiptLines.value.splice(index, 1)
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
  lineEditId.value = record.id
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
  const target = receiptLines.value.find((r) => r.id === lineEditId.value)
  if (target) {
    Object.assign(target, {
      receivingWarehouse: draft.receivingWarehouse,
      receiptQty: draft.receiptQty,
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

  const result = submitReceipt(props.purchaseOrder.id, submitLines, {
    receiptNo: form.receiptNo,
    remark: form.remark,
  })
  if (result.ok) {
    message.success(result.message)
    emit('confirmed')
    emit('update:open', false)
  } else {
    message.warning(result.message || '生成收货单失败')
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
