<template>
  <div class="process-report-page">
    <ProcessReportStatsPanel :stats="stats" />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="关键词">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="工单号/产品/工序/执行人"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="全部"
                :options="statusOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="5">
            <a-form-item label="报工方式">
              <a-select
                v-model:value="filters.source"
                allow-clear
                size="small"
                placeholder="全部"
                :options="sourceOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item>
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button
          type="primary"
          size="small"
          :disabled="!selectedIds.length"
          @click="handleBatchApprove"
        >
          批量通过
        </a-button>
        <a-button size="small" :disabled="!selectedIds.length" @click="openBatchReject">
          批量拒绝
        </a-button>
      </a-space>
      <a-button type="text" size="small" @click="handleSearch">
        <ReloadOutlined />
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 2000 }"
        :pagination="false"
        :row-selection="rowSelection"
        :custom-row="customRow"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-badge :status="statusBadge(record.status)" :text="record.status" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="isTaskReport(record)"
              type="link"
              size="small"
              @click.stop="openWorkOrderDetail(record)"
            >
              详情
            </a-button>
            <a-button
              v-else-if="record.status === '待审核'"
              type="link"
              size="small"
              @click.stop="openQuickDetail(record)"
            >
              审核
            </a-button>
            <a-button v-else type="link" size="small" @click.stop="openQuickDetail(record)">
              查看
            </a-button>
          </template>
          <template v-else>
            {{ formatCell(record, column) }}
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

    <ProcessReportRejectModal v-model:open="rejectOpen" @confirm="onRejectConfirm" />
  </div>
</template>

<script>
export default { name: 'ProcessReportManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import {
  batchApproveProcessReports,
  batchRejectProcessReports,
  getProcessReportStats,
  getProcessReports,
  processReportState,
  reloadProcessReports,
} from '@/store/processReportStore'
import { useTabs } from '@/composables/useTabs'
import ProcessReportStatsPanel from './components/ProcessReportStatsPanel.vue'
import ProcessReportRejectModal from './components/ProcessReportRejectModal.vue'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  keyword: '',
  status: undefined,
  source: undefined,
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const selectedIds = ref([])
const rejectOpen = ref(false)

const statusOptions = [
  { label: '待审核', value: '待审核' },
  { label: '已审核', value: '已审核' },
  { label: '已拒绝', value: '已拒绝' },
]

const sourceOptions = [
  { label: '任务报工', value: 'workorder' },
  { label: '快速报工', value: 'quick' },
]

const columns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '报工方式', dataIndex: 'reportSourceLabel', width: 100 },
  { title: '工单号', dataIndex: 'workOrderNo', width: 150, ellipsis: true },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '报工日期', dataIndex: 'reportDate', width: 110 },
  { title: '良品数', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', dataIndex: 'defectQty', width: 88, align: 'right' },
  { title: '工序', dataIndex: 'processName', width: 100 },
  { title: '不良原因', dataIndex: 'defectItems', width: 160, ellipsis: true },
  { title: '执行人', dataIndex: 'reporter', width: 90 },
  { title: '工作中心', dataIndex: 'workCenter', width: 110 },
  { title: '报工类型', dataIndex: 'reportType', width: 100 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const stats = computed(() => {
  void processReportState.records
  return getProcessReportStats()
})

const filteredList = computed(() => {
  void processReportState.records
  return getProcessReports(appliedFilters.value)
})

onMounted(() => reloadProcessReports())

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedIds.value,
  onChange: (keys) => {
    selectedIds.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: record.status !== '待审核',
  }),
}))

function isTaskReport(record) {
  return record.source === 'workorder'
}

function customRow(record) {
  return {
    onClick: () => {
      if (isTaskReport(record)) openWorkOrderDetail(record)
      else openQuickDetail(record)
    },
    style: { cursor: 'pointer' },
  }
}

function statusBadge(status) {
  if (status === '已审核') return 'success'
  if (status === '已拒绝') return 'error'
  return 'processing'
}

function formatCell(record, column) {
  const key = column.dataIndex
  const val = record[key]
  if (val === 0) return '0'
  return val || '—'
}

function handleSearch() {
  reloadProcessReports()
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedIds.value = []
}

function handleReset() {
  filters.keyword = ''
  filters.status = undefined
  filters.source = undefined
  handleSearch()
}

function openWorkOrderDetail(record) {
  if (!record.workOrderId) {
    message.warning('缺少工单关联')
    return
  }
  const path = `/production/process-report/wo/${record.workOrderId}`
  openTab(path, record.workOrderNo || '任务报工详情')
  router.push(path)
}

function openQuickDetail(record) {
  const path = `/production/process-report/${record.id}`
  openTab(path, `${record.processName} · ${record.productName}`)
  router.push(path)
}

function handleBatchApprove() {
  Modal.confirm({
    title: '批量通过',
    content: `确认通过选中的 ${selectedIds.value.length} 条工序报工？`,
    onOk: () => {
      const res = batchApproveProcessReports(selectedIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      selectedIds.value = []
      handleSearch()
    },
  })
}

function openBatchReject() {
  rejectOpen.value = true
}

function onRejectConfirm(reason) {
  const res = batchRejectProcessReports(selectedIds.value, reason)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  selectedIds.value = []
  handleSearch()
}
</script>

<style lang="less" scoped>
.process-report-page {
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>
