<template>
  <a-modal
    :open="open"
    title="外协入库单"
    width="1200px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :span="8">
          <a-form-item label="外协单号" required>
            <a-input :value="outsourcingOrder?.orderNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="供应商">
            <a-input :value="outsourcingOrder?.supplier" disabled size="small" />
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
              placeholder="请选择入库仓库"
              :options="warehouseOpts"
              @change="onHeaderWarehouseChange"
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
        <template v-if="column.key === 'inboundProgress'">
          <span class="col-title-with-tip">
            入库进度
            <a-tooltip :title="WX_INBOUND_PROGRESS_TOOLTIP">
              <InfoCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'warehouse' || column.key === 'qty'">
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
        <template v-else-if="column.key === 'remainQty'">
          {{ formatQty(record.remainingQty) }}
        </template>
        <template v-else-if="column.key === 'warehouse'">
          <a-select
            v-model:value="record.warehouse"
            allow-clear
            size="small"
            placeholder="请选择"
            style="width: 100%"
            :options="warehouseOpts"
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
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a class="danger-link" @click="removeLine(index)">删除</a>
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
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { submitOutsourcingInbound } from '@/store/outsourcingOrderStore'
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

const props = defineProps({
  open: { type: Boolean, default: false },
  outsourcingOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  receiptDate: null,
  warehouse: undefined,
  remark: '',
})
const inboundLines = ref([])
const saving = ref(false)
const warehouseOpts = warehouseOptions

const columns = [
  { title: '序号', key: 'index', width: 52, align: 'center' },
  { title: '入库进度', key: 'inboundProgress', width: 180 },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 80 },
  { title: '剩余可入', key: 'remainQty', width: 100, align: 'right' },
  { title: '入库仓库', key: 'warehouse', width: 120 },
  { title: '入库数量', key: 'qty', width: 110 },
  { title: '操作', key: 'action', width: 80 },
]

const tableScrollX = columns.reduce((sum, col) => sum + (col.width || 100), 0)

const totalQty = computed(() => inboundLines.value.reduce((s, l) => s + (Number(l.qty) || 0), 0))

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function buildLine(order, line) {
  const remainingQty = calcWxLineRemainInboundQty(order, line)
  if (remainingQty <= 1e-9 || isWxLineOccupyFull(order, line)) return null
  return {
    id: line.id,
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    specModel: line.specModel || '',
    unit: line.unit || '',
    planQty: Number(line.planQty) || 0,
    receivedQty: calcWxLineReceivedQty(order, line),
    appliedOccupyQty: calcWxLineAppliedOccupyQty(order, line),
    remainingQty,
    warehouse: line.shipWarehouse || form.warehouse || undefined,
    qty: remainingQty,
  }
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.outsourcingOrder) return
    form.receiptDate = dayjs()
    form.warehouse = props.outsourcingOrder.lineItems?.[0]?.shipWarehouse || undefined
    form.remark = ''
    inboundLines.value = (props.outsourcingOrder.lineItems || [])
      .map((l) => buildLine(props.outsourcingOrder, l))
      .filter(Boolean)
  },
)

function onHeaderWarehouseChange(val) {
  inboundLines.value.forEach((line) => {
    if (!line.warehouse) line.warehouse = val
  })
}

function removeLine(index) {
  inboundLines.value.splice(index, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.receiptDate) {
    message.warning('请选择收货日期')
    return
  }
  const submitLines = inboundLines.value.filter((l) => Number(l.qty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行入库数量')
    return
  }
  const invalid = submitLines.find((l) => !String(l.warehouse || '').trim())
  if (invalid) {
    message.warning(`请为「${invalid.productName}」选择入库仓库`)
    return
  }
  saving.value = true
  try {
    const result = submitOutsourcingInbound(
      props.outsourcingOrder.id,
      submitLines.map((l) => ({
        lineId: l.id,
        qty: l.qty,
        warehouse: l.warehouse,
      })),
    )
    if (result.ok) {
      message.success(result.message)
      emit('saved')
      emit('update:open', false)
    } else {
      message.warning(result.message)
    }
  } finally {
    saving.value = false
  }
}
</script>

<script>
export default { name: 'OutsourcingGenerateInboundModal' }
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

.line-summary {
  margin-top: 12px;
  font-size: 13px;
}

.danger-link {
  color: #ff4d4f;
  cursor: pointer;
}
</style>
