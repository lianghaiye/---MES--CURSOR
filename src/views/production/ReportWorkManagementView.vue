<template>
  <div class="report-work-page">
    <ReportWorkStatsPanel :stats="stats" />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                size="small"
                placeholder="请输入产品名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工单号">
              <a-input
                v-model:value="filters.workOrderNo"
                allow-clear
                size="small"
                placeholder="请输入工单号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="登记类型">
              <a-select
                v-model:value="filters.registrationType"
                allow-clear
                size="small"
                placeholder="全部"
                :options="registrationTypeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="登记方式">
              <a-select
                v-model:value="filters.registerMode"
                allow-clear
                size="small"
                placeholder="全部"
                :options="registerModeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="生产时间">
              <a-range-picker
                v-model:value="filters.productionDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="登记时间">
              <a-range-picker
                v-model:value="filters.registeredDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :md="12">
            <a-form-item class="filter-actions-item">
              <a-space wrap>
                <a-radio-group
                  v-model:value="filters.quickRange"
                  size="small"
                  @change="onQuickRange"
                >
                  <a-radio-button value="today">今日</a-radio-button>
                  <a-radio-button value="week">本周</a-radio-button>
                  <a-radio-button value="month">本月</a-radio-button>
                  <a-radio-button :value="null">全部</a-radio-button>
                </a-radio-group>
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
        <a-button size="small" @click="stubExport">导出 Excel</a-button>
        <a-button size="small" :disabled="!pendingSelectedKeys.length" @click="handleBatchConfirm">
          批量确认
        </a-button>
        <a-button type="primary" size="small" @click="openWorkOrderCreate">
          <PlusOutlined />
          工单登记
        </a-button>
        <a-button size="small" @click="openQuickCreate">
          <PlusOutlined />
          快速登记
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'confirmStatus'">
            <a-tag :color="record.confirmStatus === '已确认' ? 'success' : 'warning'">
              {{ record.confirmStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'workOrderNo'">
            <a class="link-code work-order-no" :title="record.workOrderNo" @click="openDetail(record)">
              {{ record.workOrderNo }}
            </a>
          </template>
          <template v-else-if="column.key === 'productName'">
            {{ record.productName || '—' }}
          </template>
          <template v-else-if="column.key === 'productCode'">
            {{ record.productCode || '—' }}
          </template>
          <template v-else-if="column.key === 'specModel'">
            {{ record.specModel || '—' }}
          </template>
          <template v-else-if="column.key === 'material'">
            {{ record.material || '—' }}
          </template>
          <template v-else-if="column.key === 'scheduleQty'">
            {{ formatScheduleQty(record.scheduleQty) }}
          </template>
          <template v-else-if="column.key === 'goodQty'">
            <span class="qty-text">{{ record.goodQty ?? record.finishedQty }} 件</span>
          </template>
          <template v-else-if="column.key === 'defectQty'">
            <span class="qty-text defect">{{ record.defectQty || 0 }} 件</span>
          </template>
          <template v-else-if="column.key === 'defectReasons'">
            <span v-if="record.defectReasonLabel && record.defectReasonLabel !== '—'">
              {{ record.defectReasonLabel }}
            </span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'processes'">
            <a-space v-if="activeProcesses(record).length" :size="4" wrap>
              <a-tag v-for="p in activeProcesses(record)" :key="p.id || p.name" class="process-tag">
                {{ p.name }} {{ p.qty }}
              </a-tag>
            </a-space>
            <span v-else class="muted">未填写</span>
          </template>
          <template v-else-if="column.key === 'operators'">
            <span v-if="record.operators?.length">{{ record.operators.join('、') }}</span>
            <span v-else class="muted">未指定</span>
          </template>
          <template v-else-if="column.dataIndex === 'reporter'">
            {{ record.reporter || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'productionDate'">
            {{ record.productionDate || record.reportDate || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'registeredDate'">
            {{ record.registeredDate || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            {{ record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <template v-if="record.confirmStatus === '待确认'">
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="handleDelete(record)">
                  删除
                </a-button>
                <a-button type="link" size="small" @click="handleConfirm(record)">确认</a-button>
              </template>
              <a-button v-else type="link" size="small" @click="openDetail(record)">
                详情
              </a-button>
            </a-space>
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
          :show-total="(t) => `共 ${t} 条`"
          :page-size-options="['10', '20', '50']"
        />
      </div>
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <ReportWorkFormModal
      v-model:open="formOpen"
      :mode="formMode"
      :edit-id="editId"
      @saved="onFormSaved"
    />
  </div>
</template>

<script>
export default { name: 'ReportWorkManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ReportWorkStatsPanel from './components/ReportWorkStatsPanel.vue'
import ReportWorkFormModal from './components/ReportWorkFormModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { filterQuickReports, calcQuickReportStats } from '@/mock/quickReports'
import {
  quickReportState,
  reloadQuickReports,
  confirmQuickReport,
  batchConfirmQuickReports,
  deleteQuickReport,
} from '@/store/quickReportStore'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const registrationTypeOptions = [
  { label: '工单登记', value: '工单登记' },
  { label: '快速登记', value: '快速登记' },
]

const registerModeOptions = [
  { label: '按工序登记', value: '按工序登记' },
  { label: '整体登记', value: '整体登记' },
]

const filters = reactive({
  productName: '',
  workOrderNo: '',
  registrationType: undefined,
  registerMode: undefined,
  productionDateRange: null,
  registeredDateRange: null,
  quickRange: null,
})
const appliedFilters = ref({
  productName: '',
  workOrderNo: '',
  registrationType: '',
  registerMode: '',
  productionDateRange: null,
  registeredDateRange: null,
  quickRange: null,
})
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const formMode = ref('quick')
const editId = ref('')
const selectedRowKeys = ref([])

const baseColumns = [
  { title: '状态', key: 'confirmStatus', width: 88, fixed: 'left' },
  { title: '工单号', key: 'workOrderNo', width: 168 },
  { title: '登记类型', dataIndex: 'registrationType', width: 100 },
  { title: '登记方式', dataIndex: 'registerMode', width: 110 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', width: 88, ellipsis: true },
  { title: '生产日期', dataIndex: 'productionDate', width: 110 },
  { title: '排产数', key: 'scheduleQty', dataIndex: 'scheduleQty', width: 88, align: 'right' },
  { title: '良品数', key: 'goodQty', width: 88, align: 'right' },
  { title: '不良品数', key: 'defectQty', width: 88, align: 'right' },
  { title: '不良原因', key: 'defectReasons', width: 180, ellipsis: true },
  { title: '工序', key: 'processes', width: 220 },
  { title: '操作人员', key: 'operators', width: 140, ellipsis: true },
  { title: '登记人', dataIndex: 'reporter', width: 100, ellipsis: true },
  { title: '登记日期', dataIndex: 'registeredDate', width: 110 },
  { title: '登记时间', dataIndex: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('report-work-list', baseColumns, { minScrollX: 2250 })

const filteredList = computed(() =>
  filterQuickReports(quickReportState.reports, appliedFilters.value),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const stats = computed(() => calcQuickReportStats(quickReportState.reports))

const pendingSelectedKeys = computed(() =>
  selectedRowKeys.value.filter((id) => {
    const row = quickReportState.reports.find((r) => r.id === id)
    return row?.confirmStatus === '待确认'
  }),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: record.confirmStatus === '已确认',
  }),
}))

function activeProcesses(record) {
  return (record.processes || []).filter((p) => !p.deleted)
}

function formatScheduleQty(val) {
  if (val == null || val === '') return '—'
  return val
}

function handleSearch() {
  reloadQuickReports()
  if (filters.productionDateRange?.length === 2) {
    filters.quickRange = null
  }
  appliedFilters.value = {
    productName: filters.productName,
    workOrderNo: filters.workOrderNo,
    registrationType: filters.registrationType || '',
    registerMode: filters.registerMode || '',
    productionDateRange: filters.productionDateRange,
    registeredDateRange: filters.registeredDateRange,
    quickRange: filters.quickRange,
  }
  pagination.current = 1
}

function handleReset() {
  filters.productName = ''
  filters.workOrderNo = ''
  filters.registrationType = undefined
  filters.registerMode = undefined
  filters.productionDateRange = null
  filters.registeredDateRange = null
  filters.quickRange = null
  handleSearch()
}

function onQuickRange() {
  if (filters.quickRange) {
    filters.productionDateRange = null
  }
  handleSearch()
}

function openDetail(record) {
  const path = `/production/report-work/${record.id}`
  openTab(path, record.workOrderNo || '登记详情')
  router.push(path)
}

function openWorkOrderCreate() {
  editId.value = ''
  formMode.value = 'workorder'
  formOpen.value = true
}

function openQuickCreate() {
  editId.value = ''
  formMode.value = 'quick'
  formOpen.value = true
}

function openEdit(record) {
  if (record.confirmStatus === '已确认') {
    message.warning('已确认记录不可编辑')
    return
  }
  editId.value = record.id
  formMode.value = record.registrationType === '工单登记' ? 'workorder' : 'quick'
  formOpen.value = true
}

function handleConfirm(record) {
  const res = confirmQuickReport(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
  handleSearch()
}

function handleBatchConfirm() {
  if (!pendingSelectedKeys.value.length) {
    message.warning('请选择待确认记录')
    return
  }
  Modal.confirm({
    title: `确认批量确认 ${pendingSelectedKeys.value.length} 条登记记录？`,
    onOk: () => {
      const res = batchConfirmQuickReports(pendingSelectedKeys.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      selectedRowKeys.value = []
      handleSearch()
    },
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除该登记记录？',
    okType: 'danger',
    onOk: () => {
      const res = deleteQuickReport(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
      handleSearch()
    },
  })
}

function onFormSaved() {
  editId.value = ''
  handleSearch()
}

function stubExport() {
  message.info('导出 Excel 功能开发中')
}

onMounted(() => {
  reloadQuickReports()
})
</script>

<style lang="less" scoped>
.report-work-page {
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .qty-text {
    color: #1677ff;
    font-weight: 500;

    &.defect {
      color: #ff4d4f;
    }
  }

  .process-tag {
    margin: 0;
    background: #f5f5f5;
    border-color: #f0f0f0;
    color: #595959;
  }

  .muted {
    color: #bfbfbf;
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .work-order-no {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }

  :deep(.ant-table) {
    .ant-table-cell {
      &:has(.work-order-no) {
        white-space: nowrap;
      }
    }
  }
}
</style>
