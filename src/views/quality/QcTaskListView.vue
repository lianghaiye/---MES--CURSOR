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
          <a-col v-if="isProductionScope" :xs="24" :sm="12" :md="6">
            <a-form-item label="物料编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="isInboundScope" :xs="24" :sm="12" :md="6">
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
          :disabled="!selectedRowKeys.length"
          @click="openGenerateInbound"
        >
          生成入库单
        </a-button>
        <a-button
          v-if="isOutsourcingScope"
          size="small"
          :disabled="selectedRowKeys.length !== 1"
          @click="openGenerateOutsourcingInbound"
        >
          生成外协入库单
        </a-button>
        <a-button
          v-if="isFinishedScope"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="openGenerateFinishedInbound"
        >
          生成成品入库单
        </a-button>
        <a-button
          v-if="canPrintQc"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="openPrintSelected"
        >
          打印质检单
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
        class="qc-task-table"
        :class="{ 'qc-task-table--nowrap': isProductionScope }"
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
          <template v-else-if="column.key === 'inboundStatus'">
            <a-tag
              v-if="taskInboundStatus(record)"
              :color="inboundStatusTagColor(taskInboundStatus(record))"
            >
              {{ taskInboundStatus(record) }}
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
            <a-space :size="0">
              <a-button
                v-if="canInspectQcTask(record)"
                type="link"
                size="small"
                @click="openInspect(record)"
              >
                质检
              </a-button>
              <a-button
                v-if="isIncomingScope && canGenerateInboundFromQc(record)"
                type="link"
                size="small"
                @click="openGenerateInboundFromRow(record)"
              >
                入库
              </a-button>
              <a-button v-if="canPrintQc" type="link" size="small" @click="openPrint(record)">
                打印
              </a-button>
            </a-space>
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
      :purchase-orders="inboundOrders"
      :purchase-receipts="inboundReceipts"
      :qc-qty-hints="inboundQcQtyHints"
      :qc-enforce-qty-cap="inboundQcEnforceCap"
      :qc-hint-bundles="inboundQcHintBundles"
      @saved="onInboundSaved"
    />

    <OutsourcingGenerateInboundModal
      v-model:open="wxInboundModalOpen"
      :outsourcing-order="wxInboundOrder"
      :qc-qty-hints="inboundQcQtyHints"
      :qc-enforce-qty-cap="inboundQcEnforceCap"
      @saved="onOutsourcingInboundSaved"
    />

    <QcTaskPrintModal v-model:open="printModalOpen" :task="printTask" :tasks="printTasks" />
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
  getQcTaskById,
  qcTaskState,
  sumTaskInspectQty,
} from '@/store/qcTaskStore'
import QcTaskDetailDrawer from './components/QcTaskDetailDrawer.vue'
import QcTaskCreateModal from './components/QcTaskCreateModal.vue'
import QcTaskPrintModal from './components/QcTaskPrintModal.vue'
import GenerateInboundOrderModal from '@/views/procurement/components/GenerateInboundOrderModal.vue'
import OutsourcingGenerateInboundModal from '@/views/procurement/components/OutsourcingGenerateInboundModal.vue'
import { getPurchaseReceiptById, purchaseReceiptState } from '@/store/purchaseReceiptStore'
import {
  attachReceiptInboundOrder,
  getOutsourcingReceiptById,
  outsourcingReceiptState,
} from '@/store/outsourcingReceiptStore'
import { canGenerateInbound, getPurchaseOrderById } from '@/store/purchaseOrderStore'
import {
  canGenerateOutsourcingInbound,
  getOutsourcingOrderById,
} from '@/store/outsourcingOrderStore'
import { createInboundFromFinishedQc } from '@/store/inboundOrderStore'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { useTabs } from '@/composables/useTabs'
import { getQcTaskRouteBundle, isProcessQcBizScope } from '@/utils/qcTaskRoutes'
import {
  evaluateQcInboundGate,
  inboundStatusTagColor,
  resolveQcTaskInboundStatus,
  resolveSourceReceiptForQcTask,
} from '@/utils/qcInboundFromReceipt'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const bizScope = computed(() => route.meta.bizScope || '来料质检')
const INBOUND_SCOPES = new Set(['来料质检', '外协回货检'])
const isInboundScope = computed(() => INBOUND_SCOPES.has(bizScope.value))
const isIncomingScope = computed(() => bizScope.value === '来料质检')
const isOutsourcingScope = computed(() => bizScope.value === '外协回货检')
const isProductionScope = computed(() => isProcessQcBizScope(bizScope.value))
const isFinishedScope = computed(() => bizScope.value === '成品检')
const canPrintQc = computed(() => isInboundScope.value || isProductionScope.value)
/** 各业务质检列表均不支持手工新增（由上游单据/报工等生成） */
const showCreateButton = computed(() => false)

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
const inboundOrders = ref([])
const inboundReceipts = ref([])
/** receiptId → qcTaskId，保存后回写质检单入库关联 */
const inboundQcTaskByReceipt = ref({})
/** 质检合格入库数量提示：itemCode → qty（单张兼容） */
const inboundQcQtyHints = ref(null)
const inboundQcEnforceCap = ref(false)
/** 批量：按收货单拆分 hints */
const inboundQcHintBundles = ref([])
/** 外协回货检生成入库时回写质检关联 */
const inboundFromQcId = ref('')
const wxInboundModalOpen = ref(false)
const wxInboundOrder = ref(null)
const wxInboundReceipt = ref(null)
const printModalOpen = ref(false)
const printTask = ref(null)
const printTasks = ref([])

const statusOpts = QC_TASK_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))
const resultOpts = QC_TASK_RESULT_OPTIONS.map((v) => ({ label: v, value: v }))

const incomingColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '质检单号', key: 'qcNo', width: 160, fixed: 'left' },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '入库状态', key: 'inboundStatus', width: 100 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '来源单号', dataIndex: 'sourceDocNo', width: 140 },
  { title: '入库单号', dataIndex: 'inboundOrderNo', width: 140 },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

const productionColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '质检单号', key: 'qcNo', width: 150, fixed: 'left' },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '工单号', dataIndex: 'workOrderNo', width: 130 },
  { title: '工序', dataIndex: 'processName', width: 100 },
  { title: '物料编码', dataIndex: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '检验方式', dataIndex: 'inspectMethod', width: 90 },
  { title: '检验数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '排产批次', key: 'scheduleBatchNo', width: 90 },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

const displayColumns = computed(() => {
  if (isInboundScope.value) return incomingColumns
  return productionColumns
})

const tableScrollX = computed(() => (isInboundScope.value ? 1400 : 1900))

const filteredList = computed(() => {
  // 依赖收货入库状态变更，驱动「入库状态」列刷新
  void purchaseReceiptState.receipts
  void outsourcingReceiptState.receipts
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
  if (status === QC_TASK_STATUS.PENDING || status === '检验中' || status === '检测中')
    return 'warning'
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

/** 来料 / 外协 / 过程检 / 成品检：新标签页打开详情 */
function openDetailTab(record) {
  if (!record?.id) return
  const bundle = getQcTaskRouteBundle(record.bizScope || bizScope.value)
  if (bundle?.detailName) {
    const path = `${bundle.listPath}/${record.id}`
    openTab(path, record.qcNo || bundle.detailTitle)
    router.push({ name: bundle.detailName, params: { id: record.id } })
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
  const bundle = getQcTaskRouteBundle(record.bizScope || bizScope.value)
  const path = `${bundle.listPath}/${record.id}/inspect`
  openTab(path, `质检 ${record.qcNo || ''}`.trim())
  router.push({ name: bundle.inspectName, params: { id: record.id } })
}

function openPrint(record) {
  if (!record?.id) return
  printTask.value = getQcTaskById(record.id) || record
  printTasks.value = []
  printModalOpen.value = true
}

function openPrintSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请勾选要打印的质检单')
    return
  }
  const list = selectedRowKeys.value.map((id) => getQcTaskById(id)).filter(Boolean)
  if (!list.length) {
    message.warning('未找到可打印的质检单')
    return
  }
  printTask.value = null
  printTasks.value = list
  printModalOpen.value = true
}

function canGenerateFinishedInboundFromQc(task) {
  if (!task || task.bizScope !== '成品检') return false
  if (task.qcStatus !== QC_TASK_STATUS.COMPLETED) return false
  if (task.qcResult === QC_TASK_RESULT.FAIL) return false
  if (String(task.inboundOrderNo || '').trim()) return false
  return true
}

function openGenerateFinishedInbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请勾选成品检质检单后再生成入库单')
    return
  }
  const tasks = selectedRowKeys.value.map((id) => getQcTaskById(id)).filter(Boolean)
  if (!tasks.length) {
    message.warning('未找到质检单')
    return
  }
  const okTasks = []
  const failMessages = []
  tasks.forEach((task) => {
    if (!canGenerateFinishedInboundFromQc(task)) {
      failMessages.push(`${task.qcNo || task.id}：需已完成且非不通过、且尚未关联入库单`)
      return
    }
    okTasks.push(task)
  })
  if (!okTasks.length) {
    message.warning(failMessages[0] || '所选质检单均不可生成成品入库单')
    return
  }

  let success = 0
  const created = []
  okTasks.forEach((task) => {
    const result = createInboundFromFinishedQc(task)
    if (result.ok) {
      success += 1
      created.push(result.order)
    } else {
      failMessages.push(`${task.qcNo || task.id}：${result.message}`)
    }
  })

  if (success) {
    message.success(
      success === 1
        ? `已生成成品入库单「${created[0]?.docNo || ''}」`
        : `已生成 ${success} 张成品入库单`,
    )
    selectedRowKeys.value = []
    if (created.length === 1 && created[0]?.id) {
      const path = `/inventory/inbound/${created[0].id}`
      openTab(path, `入库单 ${created[0].docNo || ''}`.trim())
      router.push({ name: 'inventory-inbound-detail', params: { id: created[0].id } })
    }
  } else {
    message.warning(failMessages[0] || '生成成品入库单失败')
  }
}

/** 来料：已完成且（质检通过 / 部分通过且有合格入库数）可显示行内「入库」 */
function canGenerateInboundFromQc(task) {
  if (!task) return false
  if (task.qcStatus !== QC_TASK_STATUS.COMPLETED) return false
  return evaluateQcInboundGate(task).ok
}

function taskInboundStatus(task) {
  return resolveQcTaskInboundStatus(task)
}

function applyInboundGateToHints(gate) {
  inboundQcQtyHints.value = gate.qtyHints || null
  inboundQcEnforceCap.value = Boolean(gate.enforceQtyCap && gate.qtyHints)
}

function resetInboundModalState() {
  inboundOrders.value = []
  inboundReceipts.value = []
  inboundQcTaskByReceipt.value = {}
  inboundQcQtyHints.value = null
  inboundQcEnforceCap.value = false
  inboundQcHintBundles.value = []
}

function openGenerateInboundFromRow(record) {
  if (!canGenerateInboundFromQc(record)) {
    const gate = evaluateQcInboundGate(record)
    message.warning(gate.message || '当前质检单不可生成入库单')
    return
  }
  openGenerateInboundForTasks([record])
}

function openGenerateInbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请勾选质检单后再生成入库单')
    return
  }
  const tasks = selectedRowKeys.value
    .map((id) => qcTaskState.tasks.find((t) => t.id === id))
    .filter(Boolean)
  if (!tasks.length) {
    message.warning('未找到质检单')
    return
  }
  openGenerateInboundForTasks(tasks)
}

/**
 * 批量生成入库：仅节省操作；按收货单去重，一收货单一张入库单。
 */
function openGenerateInboundForTasks(tasks = []) {
  const list = (tasks || []).filter(Boolean)
  if (!list.length) {
    message.warning('未找到质检单')
    return
  }

  /** @type {Map<string, { receipt: object, po: object, task: object, gate: object }>} */
  const byReceipt = new Map()
  const failMessages = []

  for (const task of list) {
    if (task.qcStatus === QC_TASK_STATUS.CANCELLED) {
      failMessages.push(`${task.qcNo || task.id}：已终止`)
      continue
    }
    const gate = evaluateQcInboundGate(task)
    if (!gate.ok) {
      failMessages.push(`${task.qcNo || task.id}：${gate.message || '不可生成入库单'}`)
      continue
    }
    const receipt = resolveSourceReceiptForQcTask(task)
    if (!receipt) {
      failMessages.push(`${task.qcNo || task.id}：未找到关联采购收货单`)
      continue
    }
    if (receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
      failMessages.push(`${task.qcNo || task.id}：关联收货单已完成或作废`)
      continue
    }
    if (receipt.inboundStatus === '已入库') {
      failMessages.push(`${task.qcNo || task.id}：关联收货单已入库完成`)
      continue
    }
    const po = getPurchaseOrderById(receipt.purchaseOrderId)
    if (!po || !canGenerateInbound(po)) {
      failMessages.push(`${task.qcNo || task.id}：关联采购单不可生成入库单`)
      continue
    }
    const existing = byReceipt.get(receipt.id)
    if (existing) {
      // 同一收货单多张质检：合并部分通过 hints，保留任一可入库任务
      if (gate.qtyHints) {
        existing.gate.qtyHints = { ...(existing.gate.qtyHints || {}), ...gate.qtyHints }
        existing.gate.enforceQtyCap = existing.gate.enforceQtyCap || gate.enforceQtyCap
      }
      continue
    }
    byReceipt.set(receipt.id, { receipt, po, task, gate })
  }

  if (!byReceipt.size) {
    message.warning(failMessages[0] || '所选质检单均不可生成入库单')
    return
  }
  if (failMessages.length) {
    const preview = failMessages.slice(0, 2).join('；')
    message.warning(
      failMessages.length > 2
        ? `${preview}…等 ${failMessages.length} 条已跳过`
        : `${preview}（已跳过）`,
    )
  }

  const entries = [...byReceipt.values()]
  inboundReceipts.value = entries.map((e) => e.receipt)
  const poMap = new Map()
  entries.forEach((e) => {
    if (e.po?.id) poMap.set(e.po.id, e.po)
  })
  inboundOrders.value = [...poMap.values()]
  inboundQcTaskByReceipt.value = Object.fromEntries(entries.map((e) => [e.receipt.id, e.task.id]))
  inboundQcHintBundles.value = entries
    .filter((e) => e.gate?.qtyHints)
    .map((e) => ({
      receiptId: e.receipt.id,
      hints: e.gate.qtyHints,
      enforceQtyCap: Boolean(e.gate.enforceQtyCap),
    }))
  if (entries.length === 1) {
    applyInboundGateToHints(entries[0].gate)
  } else {
    inboundQcQtyHints.value = null
    inboundQcEnforceCap.value = inboundQcHintBundles.value.some((b) => b.enforceQtyCap)
  }
  inboundModalOpen.value = true
}

function onInboundSaved(order, allCreated = []) {
  const list = allCreated?.length ? allCreated : order ? [order] : []
  const taskMap = inboundQcTaskByReceipt.value || {}
  list.forEach((o) => {
    const receiptId = o.purchaseReceiptId
    const taskId = receiptId ? taskMap[receiptId] : null
    if (!taskId) return
    attachQcTaskInboundOrder(taskId, {
      inboundOrderNo: o.docNo,
      inboundOrderId: o.id,
    })
  })
  resetInboundModalState()
  selectedRowKeys.value = []
  handleSearch()
}

/** 外协回货检 → 生成外协入库单（弹窗与外协订单侧一致） */
function openGenerateOutsourcingInbound() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条质检单后再生成外协入库单')
    return
  }
  const task = qcTaskState.tasks.find((t) => t.id === selectedRowKeys.value[0])
  if (!task) {
    message.warning('未找到质检单')
    return
  }
  if (task.qcStatus === QC_TASK_STATUS.CANCELLED) {
    message.warning('已终止的质检单不可生成外协入库单')
    return
  }
  const gate = evaluateQcInboundGate(task)
  if (!gate.ok) {
    message.warning(gate.message || '当前质检单不可生成外协入库单')
    return
  }
  const receipt = resolveSourceReceiptForQcTask(task)
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
  inboundFromQcId.value = task.id
  wxInboundReceipt.value = receipt
  wxInboundOrder.value = order
  applyInboundGateToHints(gate)
  wxInboundModalOpen.value = true
}

function onOutsourcingInboundSaved() {
  if (wxInboundReceipt.value?.id) {
    attachReceiptInboundOrder(wxInboundReceipt.value.id, { inboundStatus: '入库中' })
  }
  if (inboundFromQcId.value) {
    attachQcTaskInboundOrder(inboundFromQcId.value, {})
  }
  inboundFromQcId.value = ''
  inboundQcQtyHints.value = null
  inboundQcEnforceCap.value = false
  wxInboundReceipt.value = null
  wxInboundOrder.value = null
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

.qc-task-table--nowrap {
  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    white-space: nowrap;
  }

  :deep(.ant-table-cell-ellipsis) {
    white-space: nowrap;
  }
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
