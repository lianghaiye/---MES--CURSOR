<template>
  <a-modal
    :open="open"
    title="外协收货单"
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
              placeholder="留空自动生成"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="外协单号" required>
            <a-input :value="outsourcingOrder?.orderNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="供应商">
            <a-input :value="outsourcingOrder?.supplier" disabled size="small" />
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
            <a-tooltip :title="WX_INBOUND_PROGRESS_TOOLTIP">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'receivingWarehouse' || column.key === 'receiptQty'">
          <span class="col-title-required">
            <span class="required-star">*</span>{{ column.title }}
          </span>
        </template>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'inboundProgress'">
          {{ formatWxInboundProgress(record.receivedQty, record.appliedOccupyQty, record.planQty) }}
        </template>
        <template v-else-if="column.key === 'planQty'">
          {{ formatQty(record.planQty) }}
        </template>
        <template v-else-if="column.key === 'receivingWarehouse'">
          <a-select
            v-model:value="record.receivingWarehouse"
            size="small"
            style="width: 100%"
            placeholder="请选择"
            :options="warehouseOpts"
            :disabled="record.locked"
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
        <template v-else-if="column.key === 'action'">
          <a-button
            v-if="!record.locked"
            type="link"
            size="small"
            danger
            @click="removeLine(record)"
          >
            移出本单
          </a-button>
          <span v-else class="locked-tip">已满不可收货</span>
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>

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
import { submitOutsourcingReceipt } from '@/store/outsourcingOrderStore'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import {
  calcWxLineAppliedOccupyQty,
  calcWxLineReceivedQty,
  calcWxLineRemainInboundQty,
  formatWxInboundProgress,
  isWxLineOccupyFull,
  WX_INBOUND_PROGRESS_TOOLTIP,
} from '@/utils/outsourcingInbound'
import { formatNumber } from '@/utils/numberFormat'
import InboundLineScopeToggle from '@/components/InboundLineScopeToggle.vue'
import { filterInboundLinesByScope } from '@/utils/inboundLineScope'

const props = defineProps({
  open: { type: Boolean, default: false },
  outsourcingOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({ receiptNo: '', remark: '' })
const receiptLines = ref([])
const lineScope = ref('pending')
const warehouseOpts = warehouseOptions

const displayLines = computed(() => filterInboundLinesByScope(receiptLines.value, lineScope.value))

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
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 80 },
  { title: '收货仓库', key: 'receivingWarehouse', width: 120 },
  { title: '收货数量', key: 'receiptQty', width: 110 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const tableScrollX = columns.reduce((sum, col) => sum + (col.width || 100), 0)

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function buildLine(order, line) {
  const planQty = Number(line.planQty) || 0
  const receivedQty = calcWxLineReceivedQty(order, line)
  const appliedOccupyQty = calcWxLineAppliedOccupyQty(order, line)
  const remainingQty = calcWxLineRemainInboundQty(order, line)
  const locked = isWxLineOccupyFull(order, line)
  return {
    id: line.id,
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    variantSummary: line.variantSummary || '',
    drawingNo: line.drawingNo || '',
    planQty,
    unit: line.unit || '',
    receivingWarehouse: line.shipWarehouse || undefined,
    receiptQty: locked ? 0 : remainingQty,
    remainingQty,
    receivedQty,
    appliedOccupyQty,
    locked,
  }
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.outsourcingOrder) return
    form.receiptNo = ''
    form.remark = props.outsourcingOrder.remark || ''
    lineScope.value = 'pending'
    receiptLines.value = (props.outsourcingOrder.lineItems || [])
      .filter((l) => (Number(l.planQty) || 0) > 0)
      .map((l) => buildLine(props.outsourcingOrder, l))
  },
)

function rowClassName(record) {
  return record.locked ? 'receipt-row-locked' : ''
}

function removeLine(record) {
  const id = record?.id
  const idx = receiptLines.value.findIndex((l) => l.id === id)
  if (idx >= 0) receiptLines.value.splice(idx, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  const editableLines = receiptLines.value.filter((l) => !l.locked)
  if (!editableLines.length) {
    message.warning('没有可收货的明细')
    return
  }
  const submitLines = editableLines.filter((l) => Number(l.receiptQty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行收货数量')
    return
  }
  const invalid = submitLines.find((l) => !String(l.receivingWarehouse || '').trim())
  if (invalid) {
    message.warning(`请为「${invalid.productName}」选择收货仓库`)
    return
  }
  const result = submitOutsourcingReceipt(
    props.outsourcingOrder.id,
    submitLines.map((l) => ({
      lineId: l.id,
      receiptQty: l.receiptQty,
      receivingWarehouse: l.receivingWarehouse,
    })),
    { receiptNo: form.receiptNo, remark: form.remark },
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
export default { name: 'OutsourcingGenerateReceiptModal' }
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

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
  font-family: SimSun, sans-serif;
}

.col-tip-icon {
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
