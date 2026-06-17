<template>
  <div class="report-confirm-page">
    <a-row :gutter="12" class="stats-row">
      <a-col v-for="card in statCards" :key="card.key" :xs="24" :sm="8">
        <div class="stat-card">
          <div class="stat-title">{{ card.title }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </div>
      </a-col>
    </a-row>

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form">
        <a-form-item label="工单号">
          <a-input v-model:value="filters.workOrderNo" allow-clear size="small" placeholder="工单号" />
        </a-form-item>
        <a-form-item label="产品名称">
          <a-input v-model:value="filters.productName" allow-clear size="small" placeholder="产品名称" />
        </a-form-item>
        <a-form-item label="执行人">
          <a-input v-model:value="filters.executor" allow-clear size="small" placeholder="执行人" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="handleSearch">
              <SearchOutlined />
              搜索
            </a-button>
            <a-button size="small" @click="handleReset">清空</a-button>
            <a-button type="text" size="small" @click="handleSearch">
              <ReloadOutlined />
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1400 }"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'confirmStatus'">
            <a-tag :color="statusColor(record.confirmStatus)">{{ record.confirmStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reportTypeLabel'">
            {{ record.reportTypeLabel }}
          </template>
          <template v-else-if="column.key === 'goodQty'">
            <span class="qty-text">{{ record.goodQty }} 件</span>
          </template>
          <template v-else-if="column.key === 'reportDuration'">
            {{ record.reportType === '时长报工' ? `${record.reportDuration || 0} h` : '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" @click="openAdjust(record)">调整</a-button>
              <a-button type="link" size="small" @click="openSubsidy(record)">补贴</a-button>
              <a-button type="link" size="small" @click="handlePush(record)">推送确认</a-button>
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
        />
      </div>
    </div>

    <ProcessReportAdjustModal
      v-model:open="adjustOpen"
      variant="task"
      :line="modalLine"
      :config="modalConfig"
      @confirm="onAdjustConfirm"
    />
    <LaborHourSubsidyModal
      v-model:open="subsidyOpen"
      :line="modalSubsidyLine"
      :config="modalConfig"
      @confirm="onSubsidyConfirm"
    />
  </div>
</template>

<script>
export default { name: 'ReportWorkManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import ProcessReportAdjustModal from './components/ProcessReportAdjustModal.vue'
import LaborHourSubsidyModal from '@/views/labor-salary/components/LaborHourSubsidyModal.vue'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import {
  reloadReportConfirmLines,
  getDirectorConfirmLines,
  adjustConfirmLine,
  subsidyConfirmLine,
  pushConfirmToWorker,
  calcConfirmStats,
} from '@/store/reportConfirmStore'

const filters = reactive({
  workOrderNo: '',
  productName: '',
  executor: '',
})
const appliedFilters = ref({ workOrderNo: '', productName: '', executor: '' })
const pagination = reactive({ current: 1, pageSize: 10 })
const adjustOpen = ref(false)
const subsidyOpen = ref(false)
const modalLine = ref(null)
const modalSubsidyLine = ref(null)
const modalConfig = ref(null)
const activeRecordId = ref('')

const columns = [
  { title: '状态', key: 'confirmStatus', width: 100, fixed: 'left' },
  { title: '任务编号', dataIndex: 'taskNo', width: 140 },
  { title: '工单号', dataIndex: 'workOrderNo', width: 130 },
  { title: '工序', dataIndex: 'processName', width: 100 },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '报工类型', key: 'reportTypeLabel', width: 180 },
  { title: '任务数量', dataIndex: 'taskQty', width: 90, align: 'right' },
  { title: '报工数量', key: 'goodQty', width: 100, align: 'right' },
  { title: '报工时长', key: 'reportDuration', width: 100 },
  { title: '报工时间', dataIndex: 'reportTime', width: 160 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const stats = computed(() => calcConfirmStats())

const statCards = computed(() => [
  { key: 'pending', title: '待确认', value: stats.value.pending },
  { key: 'workerPending', title: '待工人确认', value: stats.value.workerPending },
  { key: 'confirmed', title: '已确认', value: stats.value.confirmed },
])

const filteredList = computed(() => getDirectorConfirmLines(appliedFilters.value))

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function statusColor(status) {
  if (status === '已确认') return 'success'
  if (status === '待工人确认') return 'processing'
  return 'warning'
}

function mapModalLine(record) {
  return {
    taskNo: record.taskNo,
    reporter: record.executor,
    processName: record.processName,
    reportType: record.reportType,
    goodQty: record.adjustedGoodQty ?? record.goodQty,
    defectQty: record.adjustedDefectQty ?? record.defectQty,
    reportDuration: record.adjustedDuration ?? record.reportDuration,
    adjustReason: record.adjustReason,
  }
}

function mapSubsidyLine(record) {
  return {
    taskNo: record.taskNo,
    executor: record.executor,
    processName: record.processName,
    reportQty: record.goodQty,
    reportDuration: record.reportDuration,
  }
}

function openAdjust(record) {
  activeRecordId.value = record.id
  modalLine.value = mapModalLine(record)
  modalConfig.value = resolveLaborConfig(record.productCode, record.processName)
  adjustOpen.value = true
}

function openSubsidy(record) {
  activeRecordId.value = record.id
  modalSubsidyLine.value = mapSubsidyLine(record)
  modalConfig.value = resolveLaborConfig(record.productCode, record.processName)
  subsidyOpen.value = true
}

function onAdjustConfirm(payload) {
  const res = adjustConfirmLine(activeRecordId.value, {
    goodQty: payload.adjustedGoodQty,
    defectQty: payload.adjustedDefectQty,
    reportDuration: payload.adjustedWorkHours,
    adjustReason: payload.adjustReason,
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('调整已保存')
  adjustOpen.value = false
  handleSearch()
}

function onSubsidyConfirm(payload) {
  const res = subsidyConfirmLine(activeRecordId.value, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('补贴已保存')
  subsidyOpen.value = false
  handleSearch()
}

function handlePush(record) {
  Modal.confirm({
    title: '推送工人确认',
    content: `将任务 ${record.taskNo} 推送给 ${record.executor} 确认？`,
    onOk: () => {
      const res = pushConfirmToWorker(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      handleSearch()
    },
  })
}

function handleSearch() {
  reloadReportConfirmLines()
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.workOrderNo = ''
  filters.productName = ''
  filters.executor = ''
  handleSearch()
}

onMounted(handleSearch)
</script>

<style lang="less" scoped>
.report-confirm-page {
  .stats-row {
    margin-bottom: 8px;
  }

  .stat-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 8px;
  }

  .stat-title {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.55);
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 600;
  }

  .filter-card {
    background: #fff;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .table-card {
    background: #fff;
    padding: 12px;
    border-radius: 6px;
  }

  .qty-text {
    color: #1677ff;
    font-weight: 500;
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>
