<template>
  <div class="qc-task-list-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检单号">
              <a-input v-model:value="filters.qcNo" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检状态">
              <a-select
                v-model:value="filters.qcStatus"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检结果">
              <a-select
                v-model:value="filters.qcResult"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="resultOpts"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="!isIncomingScope" :xs="24" :sm="12" :md="6">
            <a-form-item label="物料编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="isIncomingScope" :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-input
                v-model:value="filters.supplier"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="isInboundScope" :xs="24" :sm="12" :md="6">
            <a-form-item :label="sourceDocLabel">
              <a-input
                v-model:value="filters.sourceDocNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="isProductionScope" :xs="24" :sm="12" :md="6">
            <a-form-item label="工单号">
              <a-input
                v-model:value="filters.workOrderNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button v-if="showCreateButton" type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button
          v-if="isIncomingScope"
          size="small"
          :disabled="selectedRowKeys.length !== 1"
          @click="openGenerateInbound"
        >
          生成入库单
        </a-button>
        <a-button size="small" :disabled="!selectedRowKeys.length" @click="handleTerminate">
          <StopOutlined />
          终止
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button
            v-if="selectedRowKeys.length"
            type="link"
            size="small"
            @click="selectedRowKeys = []"
          >
            清空
          </a-button>
          共计 {{ filteredList.length }} 条数据。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'qcNo'">
            <a class="link-code" @click.prevent="openDetailTab(record)">{{ record.qcNo }}</a>
          </template>
          <template v-else-if="column.key === 'qcStatus'">
            <a-tag :color="statusColor(record.qcStatus)">{{ record.qcStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'qcResult'">
            <a-tag v-if="record.qcResult" :color="resultColor(record.qcResult)">
              {{ record.qcResult }}
            </a-tag>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'inspectQty'">
            {{ sumTaskInspectQty(record) || '—' }}
          </template>
          <template v-else-if="column.key === 'scheduleBatchNo'">
            {{ record.scheduleBatchNo != null ? `批次${record.scheduleBatchNo}` : '—' }}
          </template>
          <template v-else-if="column.key === 'inspectedAt'">
            {{ formatDateTimeMinute(record.inspectedAt) || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <template v-if="isIncomingScope">
              <a-button
                v-if="canInspectQcTask(record)"
                type="link"
                size="small"
                @click="openInspect(record)"
              >
                质检
              </a-button>
              <span v-else class="muted">—</span>
            </template>
            <a-button v-else type="link" size="small" @click="openDetailDrawer(record)">
              详情
            </a-button>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <QcTaskDetailDrawer v-model:open="detailOpen" :task="detailTask" />

    <QcTaskCreateModal
      v-model:open="createOpen"
      :biz-scope="bizScope"
      :source-receipt="createSourceReceipt"
      @saved="onTaskCreated"
    />

    <GenerateInboundOrderModal
      v-model:open="inboundModalOpen"
      :purchase-order="inboundOrder"
      :purchase-receipt="inboundReceipt"
      @saved="onInboundSaved"
    />
  </div>
</template>

<script>
export default { name: 'QcTaskListView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, StopOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  QC_TASK_RESULT,
  QC_TASK_STATUS,
  QC_TASK_RESULT_OPTIONS,
  QC_TASK_STATUS_OPTIONS,
  attachQcTaskInboundOrder,
  canInspectQcTask,
  cancelQcTasks,
  filterQcTasks,
  qcTaskState,
  sumTaskInspectQty,
} from '@/store/qcTaskStore'
import QcTaskDetailDrawer from './components/QcTaskDetailDrawer.vue'
import QcTaskCreateModal from './components/QcTaskCreateModal.vue'
import GenerateInboundOrderModal from '@/views/procurement/components/GenerateInboundOrderModal.vue'
import { getPurchaseReceiptById } from '@/store/purchaseReceiptStore'
import { getOutsourcingReceiptById } from '@/store/outsourcingReceiptStore'
import { canGenerateInbound, getPurchaseOrderById } from '@/store/purchaseOrderStore'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const bizScope = computed(() => route.meta.bizScope || '来料质检')
const INBOUND_SCOPES = new Set(['来料质检', '外协回货检'])
const isInboundScope = computed(() => INBOUND_SCOPES.has(bizScope.value))
const isIncomingScope = computed(() => bizScope.value === '来料质检')
const isProductionScope = computed(() => !isInboundScope.value)
/** 本期：来料质检不开放列表「新增」，由采购收货生成 */
const showCreateButton = computed(() => bizScope.value !== '来料质检')

const sourceDocLabel = computed(() =>
  bizScope.value === '外协回货检' ? '外协收货单号' : '采购收货单号',
)

const filters = reactive({
  qcNo: '',
  qcStatus: undefined,
  qcResult: undefined,
  itemCode: '',
  supplier: '',
  sourceDocNo: '',
  workOrderNo: '',
})
const appliedFilters = ref({ ...filters, bizScope: bizScope.value })
const pagination = reactive({ current: 1, pageSize: 10 })
const selectedRowKeys = ref([])
const detailOpen = ref(false)
const detailTask = ref(null)
const createOpen = ref(false)
const createSourceReceipt = ref(null)
const inboundModalOpen = ref(false)
const inboundOrder = ref(null)
const inboundReceipt = ref(null)
const inboundFromQcId = ref('')

const statusOpts = QC_TASK_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))
const resultOpts = QC_TASK_RESULT_OPTIONS.map((v) => ({ label: v, value: v }))

const incomingColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '质检单号', key: 'qcNo', width: 160, fixed: 'left' },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '来源单号', dataIndex: 'sourceDocNo', width: 140 },
  { title: '入库单号', dataIndex: 'inboundOrderNo', width: 140 },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const commonColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '质检单号', key: 'qcNo', width: 150, fixed: 'left' },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '物料编码', dataIndex: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '检验方式', dataIndex: 'inspectMethod', width: 90 },
  { title: '检验数量', key: 'inspectQty', width: 90, align: 'right' },
]

const inboundExtraColumns = [
  { title: '来源单号', dataIndex: 'sourceDocNo', width: 140 },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
]

const productionExtraColumns = [
  { title: '工单号', dataIndex: 'workOrderNo', width: 130 },
  { title: '工序', dataIndex: 'processName', width: 100 },
  { title: '排产批次', key: 'scheduleBatchNo', width: 90 },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
]

const tailColumns = [
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const displayColumns = computed(() => {
  if (isIncomingScope.value) return incomingColumns
  return [
    ...commonColumns,
    ...(isInboundScope.value ? inboundExtraColumns : productionExtraColumns),
    ...tailColumns,
  ]
})

const tableScrollX = computed(() => (isIncomingScope.value ? 1300 : 1400))

const filteredList = computed(() => {
  let list = filterQcTasks(qcTaskState.tasks, appliedFilters.value)
  const supplier = String(appliedFilters.value.supplier || '').trim()
  if (supplier) {
    list = list.filter((row) => String(row.supplier || '').includes(supplier))
  }
  return list
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  () => bizScope.value,
  (scope) => {
    appliedFilters.value = {
      qcNo: filters.qcNo,
      qcStatus: filters.qcStatus,
      qcResult: filters.qcResult,
      itemCode: filters.itemCode,
      supplier: filters.supplier,
      sourceDocNo: filters.sourceDocNo,
      workOrderNo: filters.workOrderNo,
      bizScope: scope,
    }
    selectedRowKeys.value = []
    pagination.current = 1
  },
)

watch(
  () => [route.query.action, route.query.receiptId, bizScope.value],
  ([action, receiptId]) => {
    if (bizScope.value === '来料质检') {
      if (action === 'create') router.replace({ query: {} })
      return
    }
    if (action !== 'create') return
    if (receiptId) {
      createSourceReceipt.value =
        bizScope.value === '外协回货检'
          ? getOutsourcingReceiptById(String(receiptId))
          : getPurchaseReceiptById(String(receiptId))
    } else {
      createSourceReceipt.value = null
    }
    createOpen.value = true
    router.replace({ query: {} })
  },
  { immediate: true },
)

function openCreate() {
  if (bizScope.value === '来料质检') {
    message.info('来料质检请从采购收货生成质检单')
    return
  }
  createSourceReceipt.value = null
  createOpen.value = true
}

function onTaskCreated() {
  handleSearch()
}

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.IN_PROGRESS) return 'processing'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function resultColor(result) {
  if (result === QC_TASK_RESULT.PASS) return 'success'
  if (result === QC_TASK_RESULT.PARTIAL) return 'processing'
  if (result === QC_TASK_RESULT.FAIL) return 'error'
  return 'default'
}

function handleSearch() {
  appliedFilters.value = {
    ...filters,
    bizScope: bizScope.value,
  }
  pagination.current = 1
}

function handleReset() {
  filters.qcNo = ''
  filters.qcStatus = undefined
  filters.qcResult = undefined
  filters.itemCode = ''
  filters.supplier = ''
  filters.sourceDocNo = ''
  filters.workOrderNo = ''
  handleSearch()
}

/** 来料质检：新标签页打开详情 */
function openDetailTab(record) {
  if (!record?.id) return
  if (isIncomingScope.value) {
    const path = `/quality/incoming-qc/${record.id}`
    openTab(path, record.qcNo || '来料质检详情')
    router.push({ name: 'quality-incoming-qc-detail', params: { id: record.id } })
    return
  }
  openDetailDrawer(record)
}

function openDetailDrawer(record) {
  detailTask.value = record
  detailOpen.value = true
}

function openInspect(record) {
  if (!canInspectQcTask(record)) {
    message.warning('当前状态不可质检')
    return
  }
  const path = `/quality/incoming-qc/${record.id}/inspect`
  openTab(path, `质检 ${record.qcNo || ''}`.trim())
  router.push({ name: 'quality-incoming-qc-inspect', params: { id: record.id } })
}

function openGenerateInbound() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条质检单后再生成入库单')
    return
  }
  const task = qcTaskState.tasks.find((t) => t.id === selectedRowKeys.value[0])
  if (!task) {
    message.warning('未找到质检单')
    return
  }
  if (task.qcStatus === QC_TASK_STATUS.CANCELLED) {
    message.warning('已终止的质检单不可生成入库单')
    return
  }
  if (task.qcStatus !== QC_TASK_STATUS.COMPLETED) {
    message.warning('请先完成质检后再生成入库单')
    return
  }
  if (task.qcResult === QC_TASK_RESULT.FAIL) {
    message.warning('质检不通过的单据不可生成入库单')
    return
  }
  const receipt = getPurchaseReceiptById(task.sourceDocId)
  if (!receipt) {
    message.warning('未找到关联采购收货单')
    return
  }
  if (receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
    message.warning('关联收货单已完成或作废，不可生成入库单')
    return
  }
  if (receipt.inboundStatus === '已入库') {
    message.warning('关联收货单已入库完成')
    return
  }
  const po = getPurchaseOrderById(receipt.purchaseOrderId)
  if (!po || !canGenerateInbound(po)) {
    message.warning('关联采购单不可生成入库单（需进行中且仍有可入库数量）')
    return
  }
  inboundFromQcId.value = task.id
  inboundReceipt.value = receipt
  inboundOrder.value = po
  inboundModalOpen.value = true
}

function onInboundSaved(order, allCreated = []) {
  const list = allCreated?.length ? allCreated : order ? [order] : []
  if (inboundFromQcId.value && list.length) {
    list.forEach((o) => {
      attachQcTaskInboundOrder(inboundFromQcId.value, {
        inboundOrderNo: o.docNo,
        inboundOrderId: o.id,
      })
    })
  }
  inboundFromQcId.value = ''
  inboundReceipt.value = null
  inboundOrder.value = null
  selectedRowKeys.value = []
  handleSearch()
}

function handleTerminate() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要终止的质检任务')
    return
  }
  Modal.confirm({
    title: '终止确认',
    content: `确定终止选中的 ${selectedRowKeys.value.length} 条质检任务吗？`,
    onOk: () => {
      const res = cancelQcTasks(selectedRowKeys.value)
      message.success(`已终止 ${res.count} 条`)
      selectedRowKeys.value = []
    },
  })
}
</script>

<style lang="less" scoped>
.qc-task-list-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .filter-actions-item :deep(.ant-form-item-label) {
    display: none;
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;
}

.table-card {
  padding: 8px 12px 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
