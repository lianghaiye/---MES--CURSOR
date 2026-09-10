<template>
  <div class="qc-task-detail-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="handleBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">{{ task.qcNo || '质检单详情' }}</span>
            <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
            <a-tag v-if="task.qcResult" :color="resultColor(task.qcResult)">{{
              task.qcResult
            }}</a-tag>
          </div>
          <a-space :size="8">
            <a-button
              v-if="canShowGenerateInbound"
              type="primary"
              size="small"
              @click="openGenerateInbound"
            >
              生成入库单
            </a-button>
            <a-button v-if="canInspect" type="primary" size="small" @click="openInspect">
              质检
            </a-button>
            <a-button v-if="canPrint" size="small" @click="openPrint">打印</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <div class="basic-info-panel">
            <div class="meta-bar">
              <a-space :size="8" wrap>
                <span class="meta-item">
                  <span class="meta-label">创建人</span>
                  {{ displayText(task.creator) }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">创建时间</span>
                  {{ formatDateTimeMinute(task.createdAt) || '—' }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">质检人</span>
                  {{ displayText(task.inspector) }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">质检时间</span>
                  {{ formatDateTimeMinute(task.inspectedAt) || '—' }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">录入端</span>
                  {{ channelLabel(task.entryChannel) }}
                </span>
              </a-space>
            </div>

            <a-form layout="inline" class="horizontal-form">
              <a-row :gutter="[8, 4]" style="width: 100%">
                <a-col v-for="field in basicFields" :key="field.key" :span="field.span || 6">
                  <a-form-item :label="field.label" :class="{ 'multiline-item': field.multiline }">
                    <span
                      class="field-text"
                      :class="{ 'field-text-multiline': field.multiline }"
                      :title="fieldText(field)"
                    >
                      <template v-if="field.key === 'qcStatus'">
                        <a-tag :color="statusColor(task.qcStatus)">{{
                          task.qcStatus || '—'
                        }}</a-tag>
                      </template>
                      <template v-else-if="field.key === 'qcResult'">
                        <a-tag v-if="task.qcResult" :color="resultColor(task.qcResult)">{{
                          task.qcResult
                        }}</a-tag>
                        <template v-else>—</template>
                      </template>
                      <template v-else>{{ fieldText(field) }}</template>
                    </span>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>
        </div>

        <div class="section-card">
          <div class="section-title">质检明细</div>
          <a-table
            class="detail-lines-table"
            :columns="lineColumns"
            :data-source="task.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1400 }"
            :sticky="tableSticky"
            v-model:expandedRowKeys="expandedKeys"
          >
            <template #expandIcon="{ expanded, onExpand: onExp, record }">
              <button
                type="button"
                class="line-expand-btn"
                :aria-label="expanded ? '收起检验项' : '展开检验项'"
                @click="(e) => onExp(record, e)"
              >
                <DownOutlined v-if="expanded" />
                <RightOutlined v-else />
              </button>
            </template>
            <template #expandedRowRender="{ record }">
              <div class="expand-panel">
                <a-alert
                  v-if="canInspect && !hasEnteredValues(record)"
                  type="info"
                  show-icon
                  class="enter-tip"
                  message="尚未录入实测值。点击右上角「质检」进入录入页，可填写普通项 / 复合子项 / 多点测点。"
                />
                <QcLineFieldValuesReadonly
                  :line="record"
                  :task="task"
                  empty-text="该行模板暂无自定义检验项"
                />
              </div>
            </template>
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'productInfo'">
                <span :title="formatProductInfo(record)">{{ formatProductInfo(record) }}</span>
              </template>
              <template v-else-if="column.key === 'receiptQty'">
                {{ formatQty(record.receiptQty) }}
              </template>
              <template v-else-if="column.key === 'inspectQty'">
                {{ formatQty(record.inspectQty) }}
              </template>
              <template v-else-if="column.key === 'acceptInboundQty'">
                {{ formatDispositionQty(record.acceptInboundQty) }}
              </template>
              <template v-else-if="column.key === 'returnExchange'">
                {{ formatReturnExchange(record) }}
              </template>
              <template v-else-if="column.key === 'lineQcResult'">
                <a-tag v-if="record.lineQcResult" :color="resultColor(record.lineQcResult)">
                  {{ record.lineQcResult }}
                </a-tag>
                <span v-else>—</span>
              </template>
              <template v-else>
                {{ record[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该质检单" />
    </a-spin>

    <GenerateInboundOrderModal
      v-model:open="inboundModalOpen"
      :purchase-orders="inboundOrders"
      :purchase-receipts="inboundReceipts"
      :qc-qty-hints="inboundQcQtyHints"
      :qc-enforce-qty-cap="inboundQcEnforceCap"
      @saved="onInboundSaved"
    />

    <OutsourcingGenerateInboundModal
      v-model:open="wxInboundModalOpen"
      :outsourcing-order="wxInboundOrder"
      :qc-qty-hints="inboundQcQtyHints"
      :qc-enforce-qty-cap="inboundQcEnforceCap"
      @saved="onOutsourcingInboundSaved"
    />

    <QcTaskPrintModal v-model:open="printModalOpen" :task="task" />
  </div>
</template>

<script>
export default { name: 'QcTaskDetailView' }
</script>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined, DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import {
  QC_TASK_RESULT,
  QC_TASK_STATUS,
  attachQcTaskInboundOrder,
  canInspectQcTask,
  getQcTaskById,
  qcTaskState,
} from '@/store/qcTaskStore'
import { ensureQcTemplateDemoSeed } from '@/store/qcTemplateStore'
import { ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { formatQty } from '@/utils/numberFormat'
import { getQcTaskRouteBundle } from '@/utils/qcTaskRoutes'
import { evaluateQcInboundGate, resolveSourceReceiptForQcTask } from '@/utils/qcInboundFromReceipt'
import { canGenerateInbound, getPurchaseOrderById } from '@/store/purchaseOrderStore'
import {
  canGenerateOutsourcingInbound,
  getOutsourcingOrderById,
} from '@/store/outsourcingOrderStore'
import { attachReceiptInboundOrder } from '@/store/outsourcingReceiptStore'
import GenerateInboundOrderModal from '@/views/procurement/components/GenerateInboundOrderModal.vue'
import OutsourcingGenerateInboundModal from '@/views/procurement/components/OutsourcingGenerateInboundModal.vue'
import QcLineFieldValuesReadonly from './components/QcLineFieldValuesReadonly.vue'
import QcTaskPrintModal from './components/QcTaskPrintModal.vue'

onMounted(() => {
  ensureQcLibraryDemoSeed()
  ensureQcTemplateDemoSeed()
})

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const task = ref(null)
const expandedKeys = ref([])

const inboundModalOpen = ref(false)
const inboundOrders = ref([])
const inboundReceipts = ref([])
const inboundQcQtyHints = ref(null)
const inboundQcEnforceCap = ref(false)
const inboundQcTaskId = ref('')
const wxInboundModalOpen = ref(false)
const wxInboundOrder = ref(null)
const wxInboundReceipt = ref(null)
const printModalOpen = ref(false)

const routeBundle = computed(() =>
  getQcTaskRouteBundle(route.meta.bizScope || task.value?.bizScope || '来料质检'),
)

const INBOUND_SCOPES = new Set(['来料质检', '外协回货检'])
const isInboundScope = computed(() =>
  INBOUND_SCOPES.has(route.meta.bizScope || task.value?.bizScope || ''),
)
const isOutsourcingScope = computed(
  () => (route.meta.bizScope || task.value?.bizScope) === '外协回货检',
)

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center' },
  { title: '产品信息', key: 'productInfo', width: 260, ellipsis: true },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', width: 80 },
  { title: '收货数量', key: 'receiptQty', width: 90, align: 'right' },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 100 },
  { title: '质检结果', key: 'lineQcResult', width: 100 },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 100, ellipsis: true },
  { title: '合格入库数', key: 'acceptInboundQty', width: 100, align: 'right' },
  { title: '退/换货', key: 'returnExchange', width: 120, ellipsis: true },
]

function getPageScrollContainer() {
  return document.querySelector('.page-content') || window
}

const tableSticky = {
  offsetHeader: 56,
  getContainer: getPageScrollContainer,
}

const canInspect = computed(() => canInspectQcTask(task.value))
/** 来料 / 外协 / 过程检 / 成品检详情均支持按模板打印 */
const canPrint = computed(() => Boolean(task.value?.id))

function hasInboundOrder(row) {
  if (!row) return false
  if (String(row.inboundOrderNo || '').trim()) return true
  if (row.inboundOrderId) return true
  return Array.isArray(row.inboundOrderIds) && row.inboundOrderIds.length > 0
}

const canShowGenerateInbound = computed(() => {
  if (!isInboundScope.value || !task.value) return false
  if (hasInboundOrder(task.value)) return false
  if (task.value.qcStatus !== QC_TASK_STATUS.COMPLETED) return false
  return evaluateQcInboundGate(task.value).ok
})

const basicFields = computed(() => {
  const t = task.value || {}
  return [
    { key: 'qcNo', label: '质检单号', value: t.qcNo },
    { key: 'bizScope', label: '质检类型', value: t.bizScope },
    { key: 'qcStatus', label: '质检状态' },
    { key: 'qcResult', label: '质检结果' },
    { key: 'supplier', label: '供应商', value: t.supplier },
    { key: 'sourceDocNo', label: '来源单号', value: t.sourceDocNo },
    { key: 'inboundOrderNo', label: '入库单号', value: t.inboundOrderNo },
    {
      key: 'inspectMethod',
      label: '质检方式',
      value: t.multiTemplate ? '按行模板' : t.inspectMethod,
    },
    { key: 'templateName', label: '质检模板', value: t.templateName || t.templateCode },
    { key: 'remark', label: '备注', value: t.remark, span: 24, multiline: true },
  ]
})

function displayText(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function fieldText(field) {
  if (field.getValue) return field.getValue()
  return displayText(field.value)
}

function formatProductInfo(record = {}) {
  const parts = [record.itemCode, record.itemName, record.specModel, record.material]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join('/') : '—'
}

function formatDispositionQty(val) {
  if (val === undefined || val === null || val === '') return '—'
  return formatQty(val)
}

function formatReturnExchange(record = {}) {
  const parts = []
  const r = Number(record.returnQty)
  const e = Number(record.exchangeQty)
  if (Number.isFinite(r) && r > 0) parts.push(`退货 ${formatQty(r)}`)
  if (Number.isFinite(e) && e > 0) parts.push(`换货 ${formatQty(e)}`)
  return parts.length ? parts.join(' / ') : '—'
}

function hasEnteredValues(line) {
  const values = line?.fieldValues || []
  if (!values.length) return false
  return values.some((v) => {
    const code = v.fieldCode || v.code
    if (!code || code === 'QC_INSPECT_METHOD' || code === 'QC_INSPECT_QTY') return false
    const val = v.value ?? v.fieldValue
    if (val === undefined || val === null) return false
    if (typeof val === 'object') return true
    return String(val).trim() !== ''
  })
}

function loadTask() {
  const id = route.params.id
  loading.value = true
  void qcTaskState.tasks
  task.value = getQcTaskById(id)
  loading.value = false
  if (task.value?.qcNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = task.value.qcNo
  }
}

watch(() => [route.params.id, qcTaskState.tasks], loadTask, { immediate: true, deep: true })

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.PENDING || status === '检验中' || status === '检测中')
    return 'warning'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function resultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL) return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function channelLabel(channel) {
  if (channel === 'miniprogram') return '小程序'
  if (channel === 'web') return 'WEB'
  return channel || '—'
}

function handleBack() {
  router.push({ name: routeBundle.value.listName })
}

function openInspect() {
  if (!task.value?.id) return
  const bundle = routeBundle.value
  const path = `${bundle.listPath}/${task.value.id}/inspect`
  openTab(path, `质检 ${task.value.qcNo || ''}`.trim())
  router.push({ name: bundle.inspectName, params: { id: task.value.id } })
}

function openPrint() {
  if (!task.value) return
  printModalOpen.value = true
}

function applyInboundGateToHints(gate) {
  inboundQcQtyHints.value = gate.qtyHints || null
  inboundQcEnforceCap.value = Boolean(gate.enforceQtyCap && gate.qtyHints)
}

function openGenerateInbound() {
  const row = task.value
  if (!row) return
  const gate = evaluateQcInboundGate(row)
  if (!gate.ok) {
    message.warning(gate.message || '当前质检单不可生成入库单')
    return
  }
  if (isOutsourcingScope.value) {
    openGenerateOutsourcingInbound(row, gate)
    return
  }
  openGeneratePurchaseInbound(row, gate)
}

function openGeneratePurchaseInbound(row, gate) {
  const receipt = resolveSourceReceiptForQcTask(row)
  if (!receipt) {
    message.warning('未找到关联采购收货单')
    return
  }
  if (receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
    message.warning('关联收货单已完成或作废')
    return
  }
  if (receipt.inboundStatus === '已入库') {
    message.warning('关联收货单已入库完成')
    return
  }
  const po = getPurchaseOrderById(receipt.purchaseOrderId)
  if (!po || !canGenerateInbound(po)) {
    message.warning('关联采购单不可生成入库单')
    return
  }
  inboundOrders.value = [po]
  inboundReceipts.value = [receipt]
  inboundQcTaskId.value = row.id
  applyInboundGateToHints(gate)
  inboundModalOpen.value = true
}

function openGenerateOutsourcingInbound(row, gate) {
  const receipt = resolveSourceReceiptForQcTask(row)
  if (!receipt) {
    message.warning('未找到关联外协收货单')
    return
  }
  if (receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
    message.warning('关联收货单已完成或作废，不可生成外协入库单')
    return
  }
  if (receipt.inboundStatus === '已入库') {
    message.warning('关联收货单已入库完成')
    return
  }
  const order = getOutsourcingOrderById(receipt.outsourcingOrderId || receipt.purchaseOrderId)
  if (!order || !canGenerateOutsourcingInbound(order)) {
    message.warning('关联外协订单不可生成入库单（需进行中且仍有可回货数量）')
    return
  }
  inboundQcTaskId.value = row.id
  wxInboundReceipt.value = receipt
  wxInboundOrder.value = order
  applyInboundGateToHints(gate)
  wxInboundModalOpen.value = true
}

function onInboundSaved(order, allCreated = []) {
  const list = allCreated?.length ? allCreated : order ? [order] : []
  const taskId = inboundQcTaskId.value
  list.forEach((o) => {
    if (!taskId) return
    attachQcTaskInboundOrder(taskId, {
      inboundOrderNo: o.docNo,
      inboundOrderId: o.id,
    })
  })
  inboundQcTaskId.value = ''
  inboundOrders.value = []
  inboundReceipts.value = []
  inboundQcQtyHints.value = null
  inboundQcEnforceCap.value = false
  loadTask()
}

function onOutsourcingInboundSaved() {
  if (wxInboundReceipt.value?.id) {
    attachReceiptInboundOrder(wxInboundReceipt.value.id, { inboundStatus: '入库中' })
  }
  if (inboundQcTaskId.value) {
    attachQcTaskInboundOrder(inboundQcTaskId.value, {})
  }
  inboundQcTaskId.value = ''
  inboundQcQtyHints.value = null
  inboundQcEnforceCap.value = false
  wxInboundReceipt.value = null
  wxInboundOrder.value = null
  loadTask()
}
</script>

<style lang="less" scoped>
.qc-task-detail-page {
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.back-btn {
  color: #4e5969;
  padding-inline: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: #1f2329;
}

.section-card {
  margin-bottom: 12px;
  padding: 12px 16px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.section-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #1f2329;
}

.basic-info-panel {
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.meta-bar {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e8e8e8;

  .meta-item {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .meta-label {
    color: rgba(0, 0, 0, 0.45);
    margin-right: 6px;
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 72px;
    padding-bottom: 0;

    > label {
      height: 24px;
      color: rgba(0, 0, 0, 0.65);
      font-size: 13px;
    }
  }

  :deep(.ant-form-item-control) {
    min-width: 0;
  }

  .multiline-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }
  }

  .field-text {
    display: inline-block;
    max-width: 100%;
    font-size: 13px;
    line-height: 24px;
    color: rgba(0, 0, 0, 0.88);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-text-multiline {
    white-space: pre-wrap;
    word-break: break-word;
    overflow: visible;
    text-overflow: unset;
    line-height: 22px;
  }
}

.detail-lines-table {
  :deep(.ant-table-sticky-holder) {
    z-index: 20;
  }

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
  }
}

.expand-panel {
  padding: 10px 12px;
  background: #f7f8fa;
}

.enter-tip {
  margin-bottom: 10px;
}

.line-expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #86909c;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.line-expand-btn:hover {
  color: #1677ff;
  background: #e6f4ff;
}
</style>
