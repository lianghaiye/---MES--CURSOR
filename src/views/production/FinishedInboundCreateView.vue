<template>
  <div class="fi-create-page">
    <div class="page-header">
      <div class="header-left">
        <span class="page-title">申请成品入库</span>
      </div>
      <a-space :size="12">
        <a-button size="small" @click="goBack">取消</a-button>
        <a-button type="primary" size="small" :loading="submitting" @click="onSubmit">
          提交入库申请
        </a-button>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <div class="page-body">
      <div class="section-card">
        <div class="section-title">入库方式</div>
        <a-radio-group v-model:value="mode" button-style="solid" @change="onModeChange">
          <a-radio-button :value="FINISHED_INBOUND_MODES.WORK_ORDER">工单入库</a-radio-button>
          <a-radio-button :value="FINISHED_INBOUND_MODES.QUICK">快速入库</a-radio-button>
        </a-radio-group>
        <div class="mode-hint">
          <template v-if="mode === FINISHED_INBOUND_MODES.WORK_ORDER">
            选择工单后自动带出产品明细，可修改入库数量；可添加工单合并入库
          </template>
          <template v-else>无工单场景，手工选择产品录入入库数量</template>
        </div>
      </div>

      <div v-if="mode === FINISHED_INBOUND_MODES.WORK_ORDER" class="section-card">
        <div class="section-title">选择工单</div>
        <a-table
          :columns="woRowColumns"
          :data-source="workOrderRows"
          row-key="key"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'workOrder'">
              <WorkOrderSearchSelect
                :value="record.workOrderCode"
                size="small"
                placeholder="请搜索或选择工单"
                @update:value="(code) => onWorkOrderCodeChange(index, code)"
              />
            </template>
            <template v-else-if="column.key === 'product'">
              <div v-if="record.productName" class="wo-product-cell">
                <div class="wo-product-name">{{ record.productName }}</div>
                <div class="wo-product-meta">
                  编码：{{ record.productCode || '—' }} 规格：{{ record.specModel || '—' }}
                </div>
              </div>
              <a-input v-else size="small" disabled placeholder="选择工单后自动带出" />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                :disabled="workOrderRows.length <= 1"
                @click="removeWorkOrderRow(index)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-wo-btn" @click="addWorkOrderRow">
          + 添加工单
        </a-button>
      </div>

      <div class="section-card">
        <div class="section-title">申请信息</div>
        <a-form layout="vertical" class="head-form">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-form-item label="车间">
                <a-select
                  v-model:value="form.workshop"
                  :options="workshopOpts"
                  show-search
                  allow-clear
                  placeholder="请选择"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="入库仓库">
                <a-select
                  v-model:value="form.warehouse"
                  :options="warehouseOpts"
                  show-search
                  allow-clear
                  placeholder="请选择入库仓库"
                  @change="syncLineWarehouses"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="备注">
                <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-card">
        <div class="section-head">
          <div class="section-title">入库明细（{{ lines.length }} 项 / 合计 {{ totalQty }}）</div>
          <a-button
            v-if="mode === FINISHED_INBOUND_MODES.QUICK"
            type="primary"
            size="small"
            @click="addQuickLine"
          >
            + 添加产品
          </a-button>
        </div>
        <a-table
          :columns="lineColumns"
          :data-source="lines"
          row-key="key"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1360 }"
          :locale="{ emptyText: '请选择工单或添加产品' }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'itemCode'">
              <a-select
                v-if="mode === FINISHED_INBOUND_MODES.QUICK"
                v-model:value="record.itemCode"
                show-search
                allow-clear
                size="small"
                style="width: 100%"
                placeholder="选择产品"
                :options="productOptions"
                :filter-option="filterProductOption"
                @change="(code) => onProductChange(index, code)"
              />
              <span v-else>{{ record.itemCode || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'itemName'">
              {{ record.itemName || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">
              {{ record.specModel || '—' }}
            </template>
            <template v-else-if="column.key === 'material'">
              {{ record.material || '—' }}
            </template>
            <template v-else-if="column.key === 'variantAttr'">
              {{ record.variantSummary || '—' }}
            </template>
            <template v-else-if="column.key === 'drawingNo'">
              {{ record.drawingNo || '—' }}
            </template>
            <template v-else-if="column.key === 'qty'">
              <div class="qty-with-unit">
                <a-input-number
                  v-model:value="record.qty"
                  size="small"
                  :min="0"
                  :precision="0"
                  class="qty-input"
                />
                <span class="qty-unit">{{ record.unit || '台' }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'warehouse'">
              <a-select
                v-model:value="record.warehouse"
                :options="warehouseOpts"
                show-search
                allow-clear
                size="small"
                style="width: 100%"
                placeholder="入库仓库"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'FinishedInboundCreateView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import WorkOrderSearchSelect from '@/views/procurement/components/WorkOrderSearchSelect.vue'
import { workOrderState } from '@/store/workOrderStore'
import { getSelectableProducts } from '@/store/productInfoStore'
import { warehouseState } from '@/store/warehouseStore'
import { workCenterOptions } from '@/mock/workOrderOptions'
import {
  FINISHED_INBOUND_MODES,
  submitFinishedInboundApplication,
} from '@/store/mobileFinishedInboundStore'
import { getUser } from '@/utils/auth'

const router = useRouter()
const submitting = ref(false)
const mode = ref(FINISHED_INBOUND_MODES.WORK_ORDER)

const form = reactive({
  workshop: '装配车间',
  warehouse: '成品主仓',
  remark: '',
})

const workOrderRows = ref([emptyWoRow()])
const lines = ref([])

const workshopOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() =>
  warehouseState.warehouses
    .filter((w) => w.enabled !== false)
    .map((w) => ({ label: w.name, value: w.name })),
)

const woRowColumns = [
  { title: '工单', key: 'workOrder', width: 260 },
  { title: '产品', key: 'product' },
  { title: '操作', key: 'action', width: 80 },
]

const lineColumns = [
  { title: '序号', key: 'index', width: 60, fixed: 'left' },
  { title: '产品编码', key: 'itemCode', width: 150 },
  { title: '产品名称', key: 'itemName', width: 160, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', key: 'material', width: 100, ellipsis: true },
  { title: '变体属性', key: 'variantAttr', width: 120, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 120, ellipsis: true },
  { title: '入库数量', key: 'qty', width: 140 },
  { title: '入库仓库', key: 'warehouse', width: 140 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const totalQty = computed(() => lines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0))

const productOptions = computed(() =>
  getSelectableProducts().map((p) => ({
    value: p.code,
    label: `${p.code} ${p.name || ''}`.trim(),
    raw: p,
  })),
)

function emptyWoRow() {
  return {
    key: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    workOrderId: '',
    workOrderCode: '',
    productName: '',
    productCode: '',
    specModel: '',
    material: '',
    drawingNo: '',
    variantSummary: '',
    scheduleQty: 0,
    planQty: 0,
    salesOrderNo: '',
  }
}

function emptyLine() {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
    drawingNo: '',
    variantSummary: '',
    qty: 1,
    unit: '台',
    warehouse: form.warehouse || '成品主仓',
    sourceWorkOrderCode: '',
    sourceWorkOrderId: '',
    salesOrderNo: '',
  }
}

function onModeChange() {
  workOrderRows.value = [emptyWoRow()]
  lines.value = mode.value === FINISHED_INBOUND_MODES.QUICK ? [emptyLine()] : []
}

function addWorkOrderRow() {
  workOrderRows.value.push(emptyWoRow())
}

function removeWorkOrderRow(index) {
  workOrderRows.value.splice(index, 1)
  rebuildLinesFromWorkOrders()
}

function findWorkOrderByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  return (workOrderState.orders || []).find((o) => o.code === c || o.id === c) || null
}

function onWorkOrderCodeChange(index, code) {
  const row = workOrderRows.value[index]
  if (!row) return
  const wo = findWorkOrderByCode(code)
  if (!wo) {
    Object.assign(row, emptyWoRow(), { key: row.key })
    rebuildLinesFromWorkOrders()
    return
  }
  row.workOrderId = wo.id
  row.workOrderCode = wo.code
  row.productName = wo.productName || ''
  row.productCode = wo.productCode || wo.materialCode || ''
  row.specModel = wo.specModel || ''
  row.material = wo.material || ''
  row.drawingNo = wo.drawingNo || ''
  row.variantSummary = wo.variantSummary || ''
  row.scheduleQty = Number(wo.scheduleQty ?? wo.planQty) || 0
  row.planQty = Number(wo.planQty) || 0
  row.salesOrderNo = wo.salesOrderNo || wo.sourceOrderNo || ''
  if (wo.workshop) form.workshop = wo.workshop
  rebuildLinesFromWorkOrders()
}

function rebuildLinesFromWorkOrders() {
  if (mode.value !== FINISHED_INBOUND_MODES.WORK_ORDER) return
  const map = new Map()
  workOrderRows.value.forEach((wo) => {
    if (!wo.workOrderCode || !wo.productName) return
    const code = wo.productCode || wo.workOrderCode
    const key = `${code}__${wo.workOrderCode}`
    map.set(key, {
      key,
      itemCode: wo.productCode || '',
      itemName: wo.productName,
      specModel: wo.specModel || '',
      material: wo.material || '',
      drawingNo: wo.drawingNo || '',
      variantSummary: wo.variantSummary || '',
      qty: Number(wo.scheduleQty || wo.planQty) || 1,
      unit: '台',
      warehouse: form.warehouse || '成品主仓',
      sourceWorkOrderCode: wo.workOrderCode,
      sourceWorkOrderId: wo.workOrderId,
      salesOrderNo: wo.salesOrderNo || '',
    })
  })
  lines.value = [...map.values()]
}

function addQuickLine() {
  lines.value.push(emptyLine())
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

function onProductChange(index, code) {
  const line = lines.value[index]
  if (!line) return
  const hit = productOptions.value.find((o) => o.value === code)
  const p = hit?.raw
  if (!p) {
    line.itemName = ''
    line.specModel = ''
    line.material = ''
    line.drawingNo = ''
    line.variantSummary = ''
    return
  }
  line.itemCode = p.code
  line.itemName = p.name || ''
  line.specModel = p.specModel || ''
  line.material = p.material || ''
  line.drawingNo = p.drawingNo || ''
  line.variantSummary = p.variantSummary || ''
  line.unit = p.inventoryUnit || p.stockUnit || '台'
}

function filterProductOption(input, option) {
  const kw = String(input || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  return String(option?.label || '')
    .toLowerCase()
    .includes(kw)
}

function syncLineWarehouses() {
  const wh = form.warehouse || '成品主仓'
  lines.value.forEach((l) => {
    l.warehouse = wh
  })
}

function goBack() {
  router.push('/production/finished-inbound')
}

function onSubmit() {
  if (!lines.value.length) {
    message.warning('请至少添加一条入库明细')
    return
  }
  const selectedWos = workOrderRows.value.filter((r) => r.workOrderCode)
  const useBatch = mode.value === FINISHED_INBOUND_MODES.WORK_ORDER && selectedWos.length > 1
  const payloadMode =
    mode.value === FINISHED_INBOUND_MODES.QUICK
      ? FINISHED_INBOUND_MODES.QUICK
      : useBatch
        ? FINISHED_INBOUND_MODES.BATCH
        : FINISHED_INBOUND_MODES.WORK_ORDER

  const firstWo = selectedWos[0]
  submitting.value = true
  try {
    const user = getUser()
    const res = submitFinishedInboundApplication({
      mode: payloadMode,
      workOrderId: firstWo?.workOrderId || '',
      workOrderCode: firstWo?.workOrderCode || '',
      workOrderName: firstWo?.productName || '',
      workOrderIds: selectedWos.map((w) => w.workOrderId).filter(Boolean),
      workOrders: selectedWos.map((w) => ({
        id: w.workOrderId,
        code: w.workOrderCode,
        productName: w.productName,
        productCode: w.productCode,
        planQty: w.planQty,
        scheduleQty: w.scheduleQty,
        salesOrderNo: w.salesOrderNo,
        specModel: w.specModel,
        material: w.material,
        drawingNo: w.drawingNo,
        variantSummary: w.variantSummary,
      })),
      salesOrderNo: firstWo?.salesOrderNo || '',
      productName: lines.value[0]?.itemName || firstWo?.productName || '',
      workshop: form.workshop,
      warehouse: form.warehouse || '成品主仓',
      remark: form.remark,
      applicant: user?.displayName || user?.username || '管理员',
      sourceChannel: 'web',
      lines: lines.value,
    })
    if (!res.ok) {
      message.warning(res.message || '提交失败')
      return
    }
    const nos = res.record?.inboundDocNo
    message.success(
      nos ? `提交成功，已生成入库单 ${nos}` : `提交成功，申请单 ${res.record?.reqNo || ''}`,
    )
    goBack()
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" scoped>
.fi-create-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-body {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.section-card {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  flex: 0 0 auto;
  align-self: stretch;
  box-sizing: border-box;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  overflow-x: auto;
}

.section-card :deep(.ant-table-wrapper),
.section-card :deep(.ant-spin-nested-loading),
.section-card :deep(.ant-table) {
  max-width: 100%;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .section-title {
    margin-bottom: 0;
  }
}

.mode-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.add-wo-btn {
  margin-top: 8px;
}

.wo-product-name {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.wo-product-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.head-form {
  :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}

.qty-with-unit {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-input {
  flex: 1;
  min-width: 0;
}

.qty-unit {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
