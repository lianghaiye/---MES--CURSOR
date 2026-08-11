<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="1280px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :span="6">
          <a-form-item :label="docNoLabel" required>
            <a-input :value="returnRecord?.returnNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="供应商">
            <a-input :value="returnRecord?.supplier" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="出货日期" required>
            <a-date-picker
              v-model:value="form.shipDate"
              size="small"
              style="width: 100%"
              placeholder="请选择出货日期"
            />
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
      :data-source="outboundLines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX }"
      :row-class-name="rowClassName"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'issueProgress'">
          <span class="col-title-with-tip">
            发货进度
            <a-tooltip :title="progressTooltip">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'issueProgress'">
          {{
            formatReturnOutboundProgress(record.issuedQty, record.appliedIssueQty, record.planQty)
          }}
        </template>
        <template v-else-if="column.key === 'issueQty'">
          <a-input-number
            v-model:value="record.issueQty"
            size="small"
            :min="0"
            :max="record.remainingQty"
            :precision="4"
            style="width: 100%"
            :disabled="record.locked"
          />
        </template>
        <template v-else-if="column.key === 'shipWarehouse'">
          <a-select
            v-model:value="record.shipWarehouse"
            size="small"
            style="width: 100%"
            placeholder="请选择"
            :options="warehouseOpts"
            :disabled="record.locked"
            @change="() => refreshLineStock(record)"
          />
        </template>
        <template v-else-if="column.key === 'stockQty'">
          {{ formatQty(record.stockQty) }}
        </template>
        <template v-else-if="column.key === 'warehouseStockQty'">
          {{ formatQty(record.warehouseStockQty) }}
        </template>
        <template v-else-if="column.key === 'remark'">
          <a-input
            v-model:value="record.remark"
            size="small"
            allow-clear
            :disabled="record.locked"
            placeholder="—"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space v-if="!record.locked" :size="0">
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" size="small" danger @click="removeLine(index)">
              移出本单
            </a-button>
          </a-space>
          <span v-else class="locked-tip">已满不可出库</span>
        </template>
        <template v-else>
          {{ displayCell(record, column) }}
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>

    <OutsourcingIssueLineEditModal
      v-model:open="editOpen"
      title="编辑出库明细"
      :line="editingLine"
      @confirm="onEditConfirm"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { generateOutboundFromReturn as generatePurchaseReturnOutbound } from '@/store/purchaseReturnStore'
import { generateOutboundFromReturn as generateOutsourcingReturnOutbound } from '@/store/outsourcingReturnStore'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import { enrichOutboundLineStock } from '@/utils/outboundLineHelpers'
import {
  calcReturnLineOutboundQty,
  calcReturnLineRemainOutboundQty,
  formatReturnOutboundProgress,
  isReturnLineOutboundFull,
  RETURN_OUTBOUND_PROGRESS_TOOLTIP,
} from '@/utils/returnOutboundProgress'
import { formatNumber } from '@/utils/numberFormat'
import OutsourcingIssueLineEditModal from './OutsourcingIssueLineEditModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** purchase | outsourcing */
  returnType: { type: String, default: 'purchase' },
  returnRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const isOutsourcing = computed(() => props.returnType === 'outsourcing')
const modalTitle = computed(() => (isOutsourcing.value ? '异常处理出库' : '退货出库'))
const docNoLabel = computed(() => (isOutsourcing.value ? '异常处理单号' : '退货单号'))
const progressTooltip = computed(() =>
  isOutsourcing.value
    ? '格式：已出库数量 / 已申请数量 / 处理数量'
    : RETURN_OUTBOUND_PROGRESS_TOOLTIP,
)

const form = reactive({
  shipDate: null,
  remark: '',
})
const outboundLines = ref([])
const editOpen = ref(false)
const editingLine = ref(null)
const warehouseOpts = warehouseOptions

const columns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '发货进度', key: 'issueProgress', width: 170, fixed: 'left' },
  {
    title: '物品名称',
    key: 'productName',
    dataIndex: 'productName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 110, ellipsis: true },
  { title: '条码类型', dataIndex: 'barcodeType', width: 100, ellipsis: true },
  { title: '出库数量', key: 'issueQty', width: 110 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '出库仓库', key: 'shipWarehouse', width: 120 },
  { title: '当前库存数', key: 'stockQty', width: 100, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 110, align: 'right' },
  { title: '备注', key: 'remark', width: 140 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

const tableScrollX = columns.reduce((sum, col) => sum + (col.width || 100), 0)

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function refreshLineStock(line) {
  const stock = enrichOutboundLineStock({
    itemCode: line.productCode || '',
    shipWarehouse: line.shipWarehouse || '',
  })
  line.stockQty = stock.stockQty
  line.warehouseStockQty = stock.warehouseStockQty
}

function buildLine(returnRow, line) {
  const planQty = Number(line.returnQty) || 0
  const { issuedQty, appliedQty } = calcReturnLineOutboundQty(returnRow, line)
  const remainingQty = calcReturnLineRemainOutboundQty(returnRow, line)
  const locked = isReturnLineOutboundFull(returnRow, line)
  const row = {
    id: line.id,
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    variantSummary: line.variantSummary || '',
    drawingNo: line.drawingNo || '',
    blankSizeText: line.blankSizeText || line.orderSizeText || '',
    barcodeType: line.barcodeType || '',
    planQty,
    issuedQty,
    appliedIssueQty: appliedQty,
    remainingQty,
    unit: line.unit || '',
    shipWarehouse: line.shipWarehouse || undefined,
    issueQty: locked ? 0 : remainingQty,
    remark: line.remark || '',
    locked,
    stockQty: null,
    warehouseStockQty: null,
  }
  refreshLineStock(row)
  return row
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.returnRecord) return
    form.shipDate = dayjs()
    form.remark = props.returnRecord.remark || ''
    outboundLines.value = (props.returnRecord.lineItems || [])
      .filter((l) => (Number(l.returnQty) || 0) > 0)
      .map((l) => buildLine(props.returnRecord, l))
  },
)

function rowClassName(record) {
  return record.locked ? 'issue-row-locked' : ''
}

function removeLine(index) {
  outboundLines.value.splice(index, 1)
}

function openEdit(record) {
  editingLine.value = { ...record }
  editOpen.value = true
}

function onEditConfirm(payload) {
  const idx = outboundLines.value.findIndex((l) => l.id === payload.id)
  if (idx < 0) return
  const next = { ...outboundLines.value[idx], ...payload }
  refreshLineStock(next)
  outboundLines.value[idx] = next
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.shipDate) {
    message.warning('请选择出货日期')
    return
  }
  const editableLines = outboundLines.value.filter((l) => !l.locked)
  if (!editableLines.length) {
    message.warning('没有可出库的明细')
    return
  }
  const submitLines = editableLines.filter((l) => Number(l.issueQty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行出库数量')
    return
  }
  const invalidWh = submitLines.find((l) => !String(l.shipWarehouse || '').trim())
  if (invalidWh) {
    message.warning(`请为「${invalidWh.productName}」选择出库仓库`)
    return
  }

  const submitFn =
    props.returnType === 'outsourcing'
      ? generateOutsourcingReturnOutbound
      : generatePurchaseReturnOutbound

  const result = submitFn(
    props.returnRecord.id,
    submitLines.map((l) => ({
      lineId: l.id,
      issueQty: l.issueQty,
      shipWarehouse: l.shipWarehouse,
      remark: l.remark,
      barcodeType: l.barcodeType,
      blankSizeText: l.blankSizeText,
      unit: l.unit,
    })),
    {
      shipDate: form.shipDate.format('YYYY-MM-DD'),
      remark: form.remark,
    },
  )
  if (result.ok) {
    message.success(result.message)
    emit('confirmed')
    emit('update:open', false)
  } else {
    message.warning(result.message)
  }
}
</script>

<script>
export default { name: 'ReturnGenerateOutboundModal' }
</script>

<style lang="less" scoped>
.horizontal-form {
  width: 100%;
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }
}

.remark-item {
  width: 100%;
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

.locked-tip {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

:deep(.issue-row-locked) {
  color: rgba(0, 0, 0, 0.35);
  background: #fafafa;
}
</style>
