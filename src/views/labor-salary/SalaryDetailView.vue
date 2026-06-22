<template>
  <div class="salary-detail-page">
    <SalaryStatsNav active="detail" />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="开始日期">
              <a-date-picker
                v-model:value="startDateValue"
                size="small"
                style="width: 100%"
                placeholder="请选择 开始日期"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="结束日期">
              <a-date-picker
                v-model:value="endDateValue"
                size="small"
                style="width: 100%"
                placeholder="请选择 结束日期"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="员工姓名">
              <a-select
                v-model:value="filters.employeeName"
                allow-clear
                show-search
                size="small"
                placeholder="请选择 员工姓名"
                :options="employeeOptions"
                :filter-option="filterEmployee"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工序名称">
              <a-select
                v-model:value="filters.processName"
                allow-clear
                show-search
                size="small"
                placeholder="请选择工序"
                :options="processOptions"
                :filter-option="filterProcess"
                style="width: 100%"
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
                <a-button size="small" @click="handleReset">
                  <ClearOutlined />
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-dropdown>
        <a-button size="small">
          批量操作
          <DownOutlined />
        </a-button>
        <template #overlay>
          <a-menu @click="onBatchAction">
            <a-menu-item key="export">导出 Excel</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-space :size="4">
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-table
      :columns="displayColumns"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :scroll="{ x: tableScrollX }"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'workOrderCode'">
          <span class="nowrap-cell" :title="record.workOrderCode">{{ record.workOrderCode }}</span>
        </template>
        <template v-else-if="column.key === 'defectReason'">
          <span class="ellipsis-cell" :title="record.defectReason">{{ record.defectReason }}</span>
        </template>
        <template v-else-if="MONEY_KEYS.has(column.dataIndex)">
          {{ formatMoney(record[column.dataIndex]) }}
        </template>
        <template v-else-if="OPTIONAL_NUM_KEYS.has(column.dataIndex)">
          {{ formatOptionalNum(record[column.dataIndex]) }}
        </template>
        <template v-else-if="NUMERIC_KEYS.has(column.dataIndex)">
          {{ formatNum(record[column.dataIndex]) }}
        </template>
        <template v-else-if="column.dataIndex">
          {{ formatCell(record, column.dataIndex) }}
        </template>
      </template>
      <template #summary>
        <a-table-summary>
          <a-table-summary-row>
            <a-table-summary-cell
              v-for="cell in summaryCells"
              :key="cell.index"
              :index="cell.index"
              :align="cell.align"
              :class="{ 'summary-label-cell': cell.index === 0 }"
            >
              {{ cell.content }}
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </a-table>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <div class="table-pagination">
      <a-pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="tableData.length"
        size="small"
        show-size-changer
        :show-total="(t) => `共 ${t} 条`"
        :page-size-options="['10', '20', '50']"
      />
    </div>
  </div>
</template>

<script>
export default { name: 'SalaryDetailView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  ClearOutlined,
  DownOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import SalaryStatsNav from './components/SalaryStatsNav.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { employeeNameOptions } from '@/utils/employeeProfileResolver'
import { querySalaryStats } from '@/utils/salaryStatsAggregate'
import { reloadProcessReports } from '@/store/processReportStore'
import { reloadQuickReports } from '@/store/quickReportStore'
import { processConfigState } from '@/store/processConfigStore'

const route = useRoute()

const filters = reactive({
  startDate: '',
  endDate: '',
  employeeName: undefined,
  processName: undefined,
})

const appliedFilters = ref({
  startDate: '',
  endDate: '',
  employeeName: '',
  processName: '',
})

const pagination = reactive({ current: 1, pageSize: 10 })

const employeeOptions = employeeNameOptions()

const processOptions = computed(() => {
  void processConfigState.processes
  return processConfigState.processes.map((p) => ({
    label: p.name,
    value: p.name,
  }))
})

const startDateValue = computed({
  get() {
    return filters.startDate ? dayjs(filters.startDate) : null
  },
  set(val) {
    filters.startDate = val ? val.format('YYYY-MM-DD') : ''
  },
})

const endDateValue = computed({
  get() {
    return filters.endDate ? dayjs(filters.endDate) : null
  },
  set(val) {
    filters.endDate = val ? val.format('YYYY-MM-DD') : ''
  },
})

const baseColumns = [
  { title: '员工姓名', key: 'employeeName', dataIndex: 'employeeName', width: 100, fixed: 'left' },
  { title: '来源', key: 'sourceLabel', dataIndex: 'sourceLabel', width: 100 },
  { title: '工单编号', key: 'workOrderCode', dataIndex: 'workOrderCode', width: 170 },
  { title: '任务编号', key: 'taskNo', dataIndex: 'taskNo', width: 130 },
  { title: '工序名称', key: 'processName', dataIndex: 'processName', width: 110 },
  { title: '报工类型', key: 'reportType', dataIndex: 'reportType', width: 100 },
  { title: '报工时间', key: 'reportTime', dataIndex: 'reportTime', width: 160 },
  { title: '良品数', key: 'goodQty', dataIndex: 'goodQty', width: 88, align: 'right' },
  { title: '不良品数', key: 'defectQty', dataIndex: 'defectQty', width: 88, align: 'right' },
  { title: '不良原因', key: 'defectReason', dataIndex: 'defectReason', width: 140, ellipsis: true },
  { title: '报工工时', key: 'workHours', dataIndex: 'workHours', width: 88, align: 'right' },
  { title: '调整良品数', key: 'adjustedGoodQty', dataIndex: 'adjustedGoodQty', width: 100, align: 'right' },
  { title: '调整不良品数', key: 'adjustedDefectQty', dataIndex: 'adjustedDefectQty', width: 110, align: 'right' },
  { title: '调整工时', key: 'adjustedWorkHours', dataIndex: 'adjustedWorkHours', width: 88, align: 'right' },
  { title: '补贴报工数', key: 'subsidyReportQty', dataIndex: 'subsidyReportQty', width: 100, align: 'right' },
  { title: '补贴工时', key: 'subsidyHours', dataIndex: 'subsidyHours', width: 88, align: 'right' },
  { title: '最终计件数', key: 'finalPieceQty', dataIndex: 'finalPieceQty', width: 100, align: 'right' },
  { title: '最终核算工时', key: 'accountHours', dataIndex: 'accountHours', width: 110, align: 'right' },
  { title: '计薪方式', key: 'salaryMethod', dataIndex: 'salaryMethod', width: 100 },
  { title: '良品工资', key: 'goodWage', dataIndex: 'goodWage', width: 100, align: 'right' },
  { title: '不良品工资', key: 'defectWage', dataIndex: 'defectWage', width: 100, align: 'right' },
  { title: '补贴金额', key: 'subsidyAmount', dataIndex: 'subsidyAmount', width: 100, align: 'right' },
  { title: '质量扣款', key: 'qualityDeduction', dataIndex: 'qualityDeduction', width: 100, align: 'right' },
  { title: '计薪(元)', key: 'salaryAmount', dataIndex: 'salaryAmount', width: 100, align: 'right', fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('salary-detail-list', baseColumns, { minScrollX: 2600 })

const NUMERIC_KEYS = new Set([
  'goodQty',
  'defectQty',
  'workHours',
  'subsidyReportQty',
  'subsidyHours',
  'finalPieceQty',
  'accountHours',
])

const OPTIONAL_NUM_KEYS = new Set(['adjustedGoodQty', 'adjustedDefectQty', 'adjustedWorkHours'])

const MONEY_KEYS = new Set(['goodWage', 'defectWage', 'subsidyAmount', 'qualityDeduction', 'salaryAmount'])

const SUMMARY_NUMERIC_KEYS = new Set([
  ...NUMERIC_KEYS,
  ...OPTIONAL_NUM_KEYS,
  ...MONEY_KEYS,
])

const statsResult = ref({
  lines: [],
  detailTotals: {},
})

const tableData = computed(() => statsResult.value.lines)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return tableData.value.slice(start, start + pagination.pageSize)
})

const totals = computed(() => statsResult.value.detailTotals)

const summaryCells = computed(() =>
  displayColumns.value.map((col, index) => {
    const key = col.dataIndex || col.key
    if (index === 0) {
      return { index, content: '合计', align: undefined }
    }
    if (SUMMARY_NUMERIC_KEYS.has(key) && totals.value[key] != null) {
      const isMoney = MONEY_KEYS.has(key)
      const isOptional = OPTIONAL_NUM_KEYS.has(key)
      const totalVal = totals.value[key]
      const hasOptionalValue = isOptional && totalVal > 0
      return {
        index,
        content:
          isOptional && !hasOptionalValue
            ? '—'
            : isMoney
              ? formatMoney(totalVal)
              : formatNum(totalVal),
        align: 'right',
      }
    }
    return { index, content: '—', align: undefined }
  }),
)

function formatNum(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '0.00'
  return num.toFixed(2)
}

function formatMoney(val) {
  return formatNum(val)
}

function formatOptionalNum(val) {
  if (val == null || val === '') return '—'
  return formatNum(val)
}

function formatCell(record, key) {
  const val = record[key]
  if (val === 0) return '0'
  return val ?? '—'
}

function filterEmployee(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function filterProcess(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function applyRouteQuery() {
  if (route.query.startDate) filters.startDate = String(route.query.startDate)
  if (route.query.endDate) filters.endDate = String(route.query.endDate)
  if (route.query.employee) filters.employeeName = String(route.query.employee)
}

function loadData() {
  reloadProcessReports()
  reloadQuickReports()
  statsResult.value = querySalaryStats(appliedFilters.value)
}

function handleSearch() {
  appliedFilters.value = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    employeeName: filters.employeeName || '',
    processName: filters.processName || '',
  }
  pagination.current = 1
  loadData()
}

function handleReset() {
  filters.startDate = ''
  filters.endDate = ''
  filters.employeeName = undefined
  filters.processName = undefined
  handleSearch()
}

function onBatchAction({ key }) {
  if (key === 'export') message.info('导出 Excel 功能开发中')
}

watch(
  () => ({ ...route.query }),
  () => {
    applyRouteQuery()
    handleSearch()
  },
  { immediate: true },
)
</script>

<style lang="less" scoped>
.salary-detail-page {
  .filter-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .nowrap-cell,
  .ellipsis-cell {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  :deep(.summary-label-cell) {
    font-weight: 600;
  }
}
</style>
