<template>
  <a-modal
    :open="open"
    title="生成成品入库单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="generate-inbound-modal"
    wrap-class-name="generate-inbound-modal-wrap"
    @cancel="handleCancel"
  >
    <div class="modal-basic-card">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="质检单号" required>
              <a-input :value="qcNoText" disabled size="small" :title="qcNoText" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="工单号" required>
              <a-input :value="workOrderText" disabled size="small" :title="workOrderText" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="入库日期" required>
              <a-date-picker
                v-model:value="form.inboundDate"
                size="small"
                style="width: 100%"
                placeholder="请选择入库日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
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
      <div class="section-title source-section-head">
        <span>
          工单 ({{ sourceRows.length }})
          <span class="section-hint">{{ sourceSectionHint }}</span>
        </span>
        <a-button type="link" size="small" @click="sourceExpanded = !sourceExpanded">
          {{ sourceExpanded ? '收起' : '展开' }}
        </a-button>
      </div>
      <a-table
        v-show="sourceExpanded"
        :columns="sourceColumns"
        :data-source="sourceRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status" :color="workOrderStatusColor(record.status)">
              {{ record.status }}
            </a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'productInfo'">
            <span :title="record.productInfo">{{ record.productInfo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'scheduleQty'">
            {{
              record.scheduleQty === '' || record.scheduleQty == null
                ? '—'
                : formatQty(record.scheduleQty)
            }}
          </template>
          <template v-else>{{ record[column.dataIndex] || '—' }}</template>
        </template>
      </a-table>
    </div>

    <div v-if="qcResultRows.length" class="section-block">
      <div class="section-title qc-result-head">
        <span>
          质检结果 ({{ qcResultRows.length }})
          <span class="section-hint">一个产品一行；可对照合格入库数填写下方入库明细</span>
        </span>
        <a-button type="link" size="small" @click="qcResultExpanded = !qcResultExpanded">
          {{ qcResultExpanded ? '收起' : '展开' }}
        </a-button>
      </div>
      <a-table
        v-show="qcResultExpanded"
        :columns="qcResultColumns"
        :data-source="qcResultRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'qcStatus'">
            <a-tag :color="qcStatusColor(record.qcStatus)">{{ record.qcStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'qcResult'">
            <a-tag v-if="record.qcResult" :color="qcResultColor(record.qcResult)">
              {{ record.qcResult }}
            </a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'productInfo'">
            <span :title="formatQcProductInfo(record)">{{ formatQcProductInfo(record) }}</span>
          </template>
          <template v-else-if="column.key === 'inspectQty' || column.key === 'acceptInboundQty'">
            {{
              record[column.key] === '' || record[column.key] == null
                ? '—'
                : formatQty(record[column.key])
            }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? record[column.key] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block">
      <div class="section-title">
        入库明细 ({{ lines.length }})
        <span class="section-hint">仅含质检明细，一张质检单一张入库单</span>
      </div>
      <a-alert
        type="info"
        show-icon
        class="qc-qty-hint-alert"
        message="已按质检「合格入库数量」带入本次入库数量，可改小，不可超过可入库数量。"
      />
      <a-table
        :columns="lineColumns"
        :data-source="lines"
        row-key="rowKey"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1100 }"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'qty' || column.key === 'warehouse'">
            <span class="col-title-required">
              <span class="required-star">*</span>{{ column.title }}
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'itemName'">
            <span class="item-name-text" :title="formatInboundProductName(record)">
              {{ formatInboundProductName(record) }}
            </span>
          </template>
          <template v-else-if="column.key === 'maxQty'">{{ formatQty(record.maxQty) }}</template>
          <template v-else-if="column.key === 'qty'">
            <div class="qty-with-unit">
              <a-input-number
                v-model:value="record.qty"
                size="small"
                :min="0"
                :max="record.maxQty"
                :precision="3"
                style="flex: 1; min-width: 0"
              />
              <span class="unit-suffix">{{ record.unit || '' }}</span>
            </div>
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
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(record)">
              移除本单
            </a-button>
          </template>
          <template v-else>{{ record[column.dataIndex] || '—' }}</template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="没有可入库的明细" />
        </template>
      </a-table>
      <div class="line-summary">
        合计数量：<strong>{{ totalQty.toLocaleString() }}</strong>
      </div>
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
import dayjs from 'dayjs'
import { Modal, message } from 'ant-design-vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { createInboundFromFinishedQc } from '@/store/inboundOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { workOrderStatusColor } from '@/utils/workOrderStatus'
import { formatQty } from '@/utils/numberFormat'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

const props = defineProps({
  open: { type: Boolean, default: false },
  tasks: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const lines = ref([])
const sourceExpanded = ref(false)
const qcResultExpanded = ref(true)
const prevHeaderWarehouse = ref(undefined)
const form = reactive({
  warehouse: undefined,
  inboundDate: null,
  remark: '',
})

const warehouseOpts = computed(() => getWarehouseSelectOptions())

const sourceColumns = [
  { title: '状态', key: 'status', width: 90 },
  { title: '工单编号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 160, ellipsis: true },
  { title: '工单类型', dataIndex: 'orderType', key: 'orderType', width: 100, ellipsis: true },
  { title: '产品信息', key: 'productInfo', width: 280, ellipsis: true },
  { title: '工序', dataIndex: 'processName', key: 'processName', width: 120, ellipsis: true },
  { title: '加工中心', dataIndex: 'workCenter', key: 'workCenter', width: 120, ellipsis: true },
  { title: '排产数量', key: 'scheduleQty', width: 100, align: 'right' },
  {
    title: '排产批次',
    dataIndex: 'scheduleBatch',
    key: 'scheduleBatch',
    width: 110,
    ellipsis: true,
  },
]

const qcResultColumns = [
  { title: '质检单号', dataIndex: 'qcNo', key: 'qcNo', width: 150, ellipsis: true },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '产品信息', key: 'productInfo', width: 280, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', key: 'inspectMethod', width: 90 },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '处理方案', dataIndex: 'treatmentPlan', key: 'treatmentPlan', width: 100 },
  { title: '合格入库数', key: 'acceptInboundQty', width: 100, align: 'right' },
  {
    title: '退/换货',
    dataIndex: 'returnExchange',
    key: 'returnExchange',
    width: 120,
    ellipsis: true,
  },
]

const lineColumns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 56, align: 'center' },
    { title: '产品名称', key: 'itemName', width: 220, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 120, ellipsis: true },
    { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
    { title: '可入库', key: 'maxQty', width: 90, align: 'right' },
    { title: '本次入库', key: 'qty', width: 140 },
    { title: '入库仓库', key: 'warehouse', width: 140 },
    { title: '操作', key: 'action', width: 90 },
  ]
  if (props.tasks.length > 1) {
    cols.splice(1, 0, {
      title: '质检单号',
      dataIndex: 'qcNo',
      key: 'qcNo',
      width: 150,
      ellipsis: true,
    })
  }
  return cols
})

function joinNos(list) {
  const nos = [...new Set(list.filter(Boolean))]
  if (!nos.length) return ''
  if (nos.length === 1) return nos[0]
  return nos.length <= 3 ? nos.join('、') : `${nos.slice(0, 2).join('、')} 等 ${nos.length} 单`
}

const qcNoText = computed(() => joinNos(props.tasks.map((t) => t.qcNo)))
const workOrderText = computed(() =>
  joinNos(props.tasks.map((t) => t.workOrderNo || t.sourceDocNo)),
)
const totalQty = computed(() => lines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0))

function lineMaxQty(line) {
  return Number(line.acceptInboundQty) || Number(line.inspectQty) || Number(line.receiptQty) || 0
}

function listWorkOrders() {
  return [
    ...(workOrderState.orders || []),
    ...(assemblyWorkOrderState.orders || []),
    ...(disassemblyWorkOrderState.orders || []),
    ...(qcWorkOrderState.orders || []),
  ]
}

function findTaskWorkOrder(task) {
  if (!task) return null
  return (
    listWorkOrders().find((order) => {
      if (task.workOrderId && order.id === task.workOrderId) return true
      const nos = [task.workOrderNo, task.sourceDocNo]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
      const code = String(order.code || order.orderNo || '').trim()
      return Boolean(code && nos.includes(code))
    }) || null
  )
}

function formatWorkOrderProduct(task, workOrder) {
  const line = (task?.lineItems || [])[0] || {}
  const parts = [
    workOrder?.productName || line.itemName || task?.itemName,
    workOrder?.materialCode || workOrder?.productCode || line.itemCode || task?.itemCode,
    workOrder?.specModel || line.specModel || task?.specModel,
    workOrder?.material || line.material || task?.material,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.join('/')
}

function resolveProcessName(task, workOrder) {
  if (task?.processName) return task.processName
  const processes = workOrder?.processes || []
  const current = processes.find((row) => row.status === '执行中' || row.status === '进行中')
  const hit = current || processes[0]
  return hit?.processName || hit?.name || ''
}

function resolveScheduleBatch(task, workOrder) {
  if (task?.scheduleBatchNo) return String(task.scheduleBatchNo)
  const batches = workOrder?.scheduleBatches || []
  const active =
    batches.find((batch) => batch.id && batch.id === workOrder?.activeScheduleBatchId) ||
    batches[batches.length - 1]
  if (!active || active.batchNo == null || active.batchNo === '') return ''
  return String(active.batchNo)
}

const sourceRows = computed(() => {
  const seen = new Set()
  return props.tasks.flatMap((task) => {
    const workOrder = findTaskWorkOrder(task)
    const workOrderNo =
      workOrder?.code || workOrder?.orderNo || task.workOrderNo || task.sourceDocNo || ''
    const processName = resolveProcessName(task, workOrder)
    const scheduleBatch = resolveScheduleBatch(task, workOrder)
    const id = [workOrder?.id || workOrderNo || task.id, processName, scheduleBatch].join('|')
    if (seen.has(id)) return []
    seen.add(id)
    const scheduleQty = task.scheduleQty ?? workOrder?.scheduleQty ?? workOrder?.planQty
    return [
      {
        id,
        status: workOrder?.status || '',
        workOrderNo,
        orderType: workOrder?.orderCategory || workOrder?.orderType || '',
        productInfo: formatWorkOrderProduct(task, workOrder),
        processName,
        workCenter: task.workCenter || workOrder?.workCenter || '',
        scheduleQty: scheduleQty === undefined || scheduleQty === null ? '' : scheduleQty,
        scheduleBatch,
      },
    ]
  })
})

const sourceSectionHint = computed(() => {
  const codes = [...new Set(sourceRows.value.map((row) => row.workOrderNo).filter(Boolean))]
  if (codes.length > 1) return '批量入库：一张质检单一张入库单'
  return `来源工单 ${codes[0] || '—'}，入库明细仅含对应质检产品`
})

const qcResultRows = computed(() =>
  props.tasks.flatMap((task) =>
    (task.lineItems || []).map((line) => ({
      id: `${task.id}-${line.id}`,
      qcNo: task.qcNo || '',
      qcStatus: task.qcStatus || '',
      qcResult: line.lineQcResult || task.qcResult || '',
      itemCode: line.itemCode || task.itemCode || '',
      itemName: line.itemName || task.itemName || '',
      specModel: line.specModel || task.specModel || '',
      material: line.material || task.material || '',
      inspectMethod: line.inspectMethod || '',
      inspectQty: line.inspectQty,
      treatmentPlan: line.treatmentPlan || '',
      acceptInboundQty: line.acceptInboundQty,
      returnExchange: line.returnExchange || '',
    })),
  ),
)

function formatQcProductInfo(record = {}) {
  const parts = [
    record.itemCode,
    record.itemName && record.itemName !== '—' ? record.itemName : '',
    record.specModel,
    record.material,
  ].map((v) => String(v || '').trim())
  const text = parts.filter(Boolean).join('/')
  return text || '—'
}

function formatInboundProductName(record = {}) {
  const name = String(record.itemName || '').trim()
  const code = String(record.itemCode || '').trim()
  if (code && name) return `[${code}] ${name}`
  return name || code || '—'
}

function qcStatusColor(status) {
  const map = {
    待质检: 'warning',
    检验中: 'processing',
    已完成: 'success',
    已终止: 'default',
  }
  return map[status] || 'default'
}

function qcResultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分合格') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function resetForm() {
  const firstWarehouse =
    props.tasks
      .flatMap((task) => task.lineItems || [])
      .map((line) => line.receivingWarehouse)
      .find(Boolean) || '成品仓'
  form.warehouse = warehouseOpts.value.some((opt) => opt.value === firstWarehouse)
    ? firstWarehouse
    : warehouseOpts.value[0]?.value
  prevHeaderWarehouse.value = form.warehouse
  form.inboundDate = dayjs()
  form.remark =
    props.tasks.length === 1 ? `来自成品检 ${props.tasks[0].qcNo || ''}`.trim() : '来自成品检'
  sourceExpanded.value = false
  qcResultExpanded.value = true
  lines.value = props.tasks.flatMap((task) =>
    (task.lineItems || [])
      .map((line) => {
        const maxQty = lineMaxQty(line)
        if (!(maxQty > 0)) return null
        return {
          rowKey: `${task.id}-${line.id}`,
          taskId: task.id,
          lineId: line.id,
          qcNo: task.qcNo || '—',
          itemCode: line.itemCode || task.itemCode || '',
          itemName: line.itemName || task.itemName || '',
          specModel: line.specModel || task.specModel || '',
          material: line.material || task.material || '',
          unit: line.unit || task.unit || '件',
          maxQty,
          qty: maxQty,
          warehouse: form.warehouse,
        }
      })
      .filter(Boolean),
  )
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  prevHeaderWarehouse.value = newVal
  if (newVal === oldVal || !newVal || !lines.value.length) return
  Modal.confirm({
    title: '入库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      lines.value.forEach((line) => {
        line.warehouse = newVal
      })
    },
  })
}

function removeLine(record) {
  const idx = lines.value.findIndex((line) => line.rowKey === record?.rowKey)
  if (idx >= 0) lines.value.splice(idx, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.inboundDate) {
    message.warning('请选择入库日期')
    return
  }
  const active = lines.value.filter((line) => Number(line.qty) > 0)
  if (!active.length) {
    message.warning('请至少填写一行本次入库数量')
    return
  }
  const missingWarehouse = active.find((line) => !line.warehouse)
  if (missingWarehouse) {
    message.warning(`请选择「${missingWarehouse.itemName || missingWarehouse.itemCode}」的入库仓库`)
    return
  }
  const over = active.find((line) => Number(line.qty) > Number(line.maxQty))
  if (over) {
    message.warning(`「${over.itemName || over.itemCode}」入库数量不能超过可入库数量`)
    return
  }

  saving.value = true
  const created = []
  const failMessages = []
  try {
    props.tasks.forEach((task) => {
      const taskLines = active.filter((line) => line.taskId === task.id)
      if (!taskLines.length) return
      const lineOverrides = Object.fromEntries(
        taskLines.map((line) => [line.lineId, { qty: line.qty, warehouse: line.warehouse }]),
      )
      const result = createInboundFromFinishedQc(task, {
        warehouse: form.warehouse || taskLines[0].warehouse,
        inboundDate: form.inboundDate.format('YYYY-MM-DD'),
        remark: form.remark,
        lineOverrides,
      })
      if (result.ok) created.push(result.order)
      else failMessages.push(`${task.qcNo || task.id}：${result.message}`)
    })
  } finally {
    saving.value = false
  }

  if (!created.length) {
    message.warning(failMessages[0] || '生成成品入库单失败')
    return
  }
  if (failMessages.length) {
    message.warning(`已生成 ${created.length} 张，部分失败：${failMessages[0]}`)
  } else {
    message.success(
      created.length === 1
        ? `已生成成品入库单「${created[0].docNo || ''}」`
        : `已生成 ${created.length} 张成品入库单`,
    )
  }
  emit('saved', created)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'FinishedQcInboundModal' }
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 16px;
}

.qc-qty-hint-alert {
  margin-bottom: 12px;
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

.qc-result-head,
.source-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

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

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
  font-family: SimSun, sans-serif;
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
</style>
