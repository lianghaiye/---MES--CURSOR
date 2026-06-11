<template>
  <div class="labor-hour-page">
    <LaborHourStatsPanel v-model:period="period" :stats="stats" />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[8, 6]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :xl="6">
            <a-form-item label="工单编号">
              <a-input
                v-model:value="filters.workOrderCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="6">
            <a-form-item label="工作中心">
              <a-select
                v-model:value="filters.workCenter"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="workCenterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="8">
            <a-form-item label="工单日期">
              <a-range-picker
                v-model:value="dateRangeValue"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-space>
              <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
              <a-button size="small" @click="handleReset">清空</a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <a-table
      :columns="columns"
      :data-source="tableData"
      row-key="id"
      size="small"
      bordered
      :scroll="{ x: 2600 }"
      :pagination="paginationConfig"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'auditStatus'">
          <a-badge
            :status="statusBadge(record.auditStatus)"
            :text="record.auditStatus"
          />
        </template>
        <template v-else-if="column.key === 'workOrderCode'">
          <a @click="openDetail(record)">{{ record.workOrderCode }}</a>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
        </template>
        <template v-else-if="column.dataIndex">
          {{ formatCell(record, column.dataIndex) }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'LaborHourManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { calcPeriodStats, getLaborHourOrders } from '@/store/laborHourStore'
import LaborHourStatsPanel from './components/LaborHourStatsPanel.vue'

const router = useRouter()
const period = ref('week')

const filters = reactive({
  workOrderCode: '',
  workCenter: undefined,
  dateRange: null,
})

const appliedFilters = ref({ ...filters, period: period.value })

const pagination = reactive({ current: 1, pageSize: 10 })

const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

const dateRangeValue = computed({
  get() {
    const r = filters.dateRange
    if (!r?.length) return null
    return [dayjs(r[0]), dayjs(r[1])]
  },
  set(val) {
    filters.dateRange = val?.length === 2 ? [val[0].format('YYYY-MM-DD'), val[1].format('YYYY-MM-DD')] : null
  },
})

const columns = [
  { title: '状态', key: 'auditStatus', dataIndex: 'auditStatus', width: 100, fixed: 'left' },
  { title: '工单编号', key: 'workOrderCode', dataIndex: 'workOrderCode', width: 170, fixed: 'left' },
  { title: '工单名称', dataIndex: 'workOrderName', width: 180, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '物品名称', dataIndex: 'materialName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110 },
  { title: '工艺路线', dataIndex: 'processRouteName', width: 140, ellipsis: true },
  { title: '工作中心', dataIndex: 'workCenter', width: 100 },
  { title: '审核总工时(h)', dataIndex: 'auditedTotalHours', width: 110, align: 'right' },
  { title: '审核报工数', dataIndex: 'auditedReportCount', width: 100, align: 'right' },
  { title: '补贴总工时(h)', dataIndex: 'subsidyTotalHours', width: 110, align: 'right' },
  { title: '补贴总报工数', dataIndex: 'subsidyTotalReportQty', width: 110, align: 'right' },
  { title: '预估薪资总数(元)', dataIndex: 'estimatedSalary', width: 130, align: 'right' },
  { title: '任务数', dataIndex: 'taskCount', width: 80, align: 'right' },
  { title: '参与人数', dataIndex: 'participantCount', width: 90, align: 'right' },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '工单创建时间', dataIndex: 'createdAt', width: 150 },
  { title: '工单完工时间', dataIndex: 'completedAt', width: 150 },
  { title: '最新提交时间', dataIndex: 'latestSubmitAt', width: 150 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const filteredList = computed(() => getLaborHourOrders(appliedFilters.value))

const paginationConfig = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: filteredList.value.length,
  showSizeChanger: true,
}))

const tableData = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const stats = computed(() => calcPeriodStats(period.value, appliedFilters.value))

watch(period, () => {
  appliedFilters.value = { ...appliedFilters.value, period: period.value }
})

function statusBadge(status) {
  if (status === '已审核') return 'success'
  if (status === '部分审核') return 'warning'
  return 'default'
}

function formatCell(record, key) {
  const val = record[key]
  if (val === 0) return '0'
  return val ?? '—'
}

function handleSearch() {
  appliedFilters.value = {
    workOrderCode: filters.workOrderCode,
    workCenter: filters.workCenter,
    dateRange: filters.dateRange,
    period: period.value,
  }
  pagination.current = 1
}

function handleReset() {
  filters.workOrderCode = ''
  filters.workCenter = undefined
  filters.dateRange = null
  handleSearch()
}

function onTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

function openDetail(record) {
  router.push(`/labor-salary/labor-hour/${record.id}`)
}
</script>

<style lang="less" scoped>
.labor-hour-page {
  .filter-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
}
</style>
