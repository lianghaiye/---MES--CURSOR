<template>
  <div class="salary-summary-page">
    <SalaryStatsNav active="summary" />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="统计时间">
              <a-range-picker
                v-model:value="dateRangeValue"
                size="small"
                style="width: 100%"
                :placeholder="['开始日期', '结束日期']"
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
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :scroll="{ x: 1580 }"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'positions'">
          <span class="positions-text" :title="record.positions">{{ record.positions }}</span>
        </template>
        <template
          v-else-if="
            column.key === 'salaryAmount' ||
            column.key === 'subsidyAmount' ||
            column.key === 'qualityDeduction'
          "
        >
          {{ formatMoney(record[column.dataIndex]) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
        </template>
        <template v-else-if="column.dataIndex">
          {{ formatNum(record[column.dataIndex]) }}
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
export default { name: 'SalarySummaryView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { ClearOutlined, DownOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import SalaryStatsNav from './components/SalaryStatsNav.vue'
import { employeeNameOptions } from '@/utils/employeeProfileResolver'
import { querySalaryStats } from '@/utils/salaryStatsAggregate'
import { reloadProcessReports } from '@/store/processReportStore'
import { reloadQuickReports } from '@/store/quickReportStore'
import { ensureSalaryStatsDemoData } from '@/store/laborHourStore'

const router = useRouter()

function getCurrentMonthRange() {
  return {
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  }
}

const defaultMonth = getCurrentMonthRange()

const filters = reactive({
  startDate: defaultMonth.startDate,
  endDate: defaultMonth.endDate,
  employeeName: undefined,
})

const appliedFilters = ref({
  startDate: defaultMonth.startDate,
  endDate: defaultMonth.endDate,
  employeeName: '',
})
const pagination = reactive({ current: 1, pageSize: 10 })

const employeeOptions = employeeNameOptions()

const dateRangeValue = computed({
  get() {
    if (!filters.startDate || !filters.endDate) return null
    return [dayjs(filters.startDate), dayjs(filters.endDate)]
  },
  set(val) {
    if (val?.length === 2) {
      filters.startDate = val[0].format('YYYY-MM-DD')
      filters.endDate = val[1].format('YYYY-MM-DD')
    } else {
      filters.startDate = ''
      filters.endDate = ''
    }
  },
})

const columns = [
  { title: '员工工号', dataIndex: 'employeeNo', width: 110 },
  { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
  { title: '员工岗位', key: 'positions', dataIndex: 'positions', width: 220, ellipsis: true },
  { title: '工作中心', dataIndex: 'workCenter', width: 100 },
  { title: '完成任务数', dataIndex: 'taskCount', width: 110, align: 'right' },
  { title: '报工总数', dataIndex: 'reportQty', width: 100, align: 'right' },
  { title: '总工时', dataIndex: 'workHours', width: 100, align: 'right' },
  {
    title: '补贴金额',
    key: 'subsidyAmount',
    dataIndex: 'subsidyAmount',
    width: 110,
    align: 'right',
  },
  {
    title: '质量扣款',
    key: 'qualityDeduction',
    dataIndex: 'qualityDeduction',
    width: 100,
    align: 'right',
  },
  { title: '计薪(元)', key: 'salaryAmount', dataIndex: 'salaryAmount', width: 110, align: 'right' },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const statsResult = ref({
  summaryRows: [],
  summaryTotals: {
    taskCount: 0,
    reportQty: 0,
    workHours: 0,
    subsidyReportQty: 0,
    subsidyHours: 0,
    subsidyAmount: 0,
    qualityDeduction: 0,
    salaryAmount: 0,
  },
})

const tableData = computed(() => statsResult.value.summaryRows)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return tableData.value.slice(start, start + pagination.pageSize)
})

const totals = computed(() => statsResult.value.summaryTotals)

const summaryCells = computed(() => {
  const cells = Array.from({ length: columns.length }, (_, index) => ({
    index,
    content: '',
    align: undefined,
  }))
  cells[0].content = '合计'
  cells[4].content = formatNum(totals.value.taskCount)
  cells[4].align = 'right'
  cells[5].content = formatNum(totals.value.reportQty)
  cells[5].align = 'right'
  cells[6].content = formatNum(totals.value.workHours)
  cells[6].align = 'right'
  cells[7].content = formatMoney(totals.value.subsidyAmount)
  cells[7].align = 'right'
  cells[8].content = formatMoney(totals.value.qualityDeduction)
  cells[8].align = 'right'
  cells[9].content = formatMoney(totals.value.salaryAmount)
  cells[9].align = 'right'
  return cells
})

function formatNum(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

function formatMoney(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

function filterEmployee(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function loadData() {
  reloadProcessReports()
  reloadQuickReports()
  ensureSalaryStatsDemoData()
  statsResult.value = querySalaryStats(appliedFilters.value)
}

function handleSearch() {
  appliedFilters.value = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    employeeName: filters.employeeName || '',
  }
  pagination.current = 1
  loadData()
}

function handleReset() {
  const month = getCurrentMonthRange()
  filters.startDate = month.startDate
  filters.endDate = month.endDate
  filters.employeeName = undefined
  handleSearch()
}

function openDetail(record) {
  const query = {}
  if (appliedFilters.value.startDate) query.startDate = appliedFilters.value.startDate
  if (appliedFilters.value.endDate) query.endDate = appliedFilters.value.endDate
  if (record.employeeName && record.employeeName !== '—') {
    query.employee = record.employeeName
  }
  router.push({ path: '/report-management/salary-detail', query })
}

function onBatchAction({ key }) {
  if (key === 'export') message.info('导出 Excel 功能开发中')
}

onMounted(() => {
  handleSearch()
})
</script>

<style lang="less" scoped>
.salary-summary-page {
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

  .positions-text {
    display: inline-block;
    max-width: 100%;
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
