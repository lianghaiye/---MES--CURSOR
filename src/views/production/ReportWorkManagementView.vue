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
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="报工时间">
              <a-range-picker
                v-model:value="filters.reportDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="10">
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
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'workOrderNo'">
            <a class="link-code" @click="openDetail(record)">{{ record.workOrderNo }}</a>
          </template>
          <template v-else-if="column.key === 'productName'">
            {{ record.productName || '—' }}
          </template>
          <template v-else-if="column.key === 'productCode'">
            {{ record.productCode || '—' }}
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
          <template v-else-if="column.key === 'displayStatus'">
            <a-tag color="success">{{ record.displayStatus }}</a-tag>
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
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
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

    <ReportWorkFormModal v-model:open="formOpen" :mode="formMode" @saved="onFormSaved" />
  </div>
</template>

<script>
export default { name: 'ReportWorkManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ReportWorkStatsPanel from './components/ReportWorkStatsPanel.vue'
import ReportWorkFormModal from './components/ReportWorkFormModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { filterQuickReports, calcQuickReportStats } from '@/mock/quickReports'
import { quickReportState, reloadQuickReports } from '@/store/quickReportStore'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  productName: '',
  workOrderNo: '',
  reportDateRange: null,
  quickRange: null,
})
const appliedFilters = ref({ ...filters, reportDateRange: null })
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const formMode = ref('quick')

const baseColumns = [
  { title: '工单号', key: 'workOrderNo', width: 150, fixed: 'left' },
  { title: '登记类型', dataIndex: 'registrationType', width: 100 },
  { title: '登记方式', dataIndex: 'registerMode', width: 110 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '生产日期', dataIndex: 'productionDate', width: 110 },
  { title: '良品数', key: 'goodQty', width: 88, align: 'right' },
  { title: '不良品数', key: 'defectQty', width: 88, align: 'right' },
  { title: '不良原因', key: 'defectReasons', width: 180, ellipsis: true },
  { title: '工序', key: 'processes', width: 220 },
  { title: '操作人员', key: 'operators', width: 140, ellipsis: true },
  { title: '状态', key: 'displayStatus', width: 90 },
  { title: '登记人', dataIndex: 'reporter', width: 100, ellipsis: true },
  { title: '登记日期', dataIndex: 'registeredDate', width: 110 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('report-work-list', baseColumns, { minScrollX: 1860 })

const filteredList = computed(() =>
  filterQuickReports(quickReportState.reports, appliedFilters.value),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const stats = computed(() => calcQuickReportStats(quickReportState.reports))

function activeProcesses(record) {
  return (record.processes || []).filter((p) => !p.deleted)
}

function handleSearch() {
  reloadQuickReports()
  if (filters.reportDateRange?.length === 2) {
    filters.quickRange = null
  }
  appliedFilters.value = {
    productName: filters.productName,
    workOrderNo: filters.workOrderNo,
    reportDateRange: filters.reportDateRange,
    quickRange: filters.quickRange,
  }
  pagination.current = 1
}

function handleReset() {
  filters.productName = ''
  filters.workOrderNo = ''
  filters.reportDateRange = null
  filters.quickRange = null
  handleSearch()
}

function onQuickRange() {
  if (filters.quickRange) {
    filters.reportDateRange = null
  }
  handleSearch()
}

function openDetail(record) {
  const path = `/production/report-work/${record.id}`
  openTab(path, record.workOrderNo || '登记详情')
  router.push(path)
}

function openWorkOrderCreate() {
  formMode.value = 'workorder'
  formOpen.value = true
}

function openQuickCreate() {
  formMode.value = 'quick'
  formOpen.value = true
}

function onFormSaved() {
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
}
</style>
