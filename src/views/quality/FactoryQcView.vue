<template>
  <div class="factory-qc-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检状态">
              <a-select
                v-model:value="filters.qcStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="质检结果">
              <a-select
                v-model:value="filters.qcResult"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="resultOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input v-model:value="filters.salesOrderNo" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-input v-model:value="filters.customerName" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
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
        <a-button type="primary" size="small" @click="createModalOpen = true">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleTerminate">
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
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredList.length }} 条数据。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1600 }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'qcStatus'">
            <a-tag :color="statusColor(record.qcStatus)">{{ record.qcStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'qcResult'">
            <a-tag v-if="record.qcResult" :color="resultColor(record.qcResult)">{{ record.qcResult }}</a-tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'qcNo'">
            <a
              v-if="record.qcNo"
              class="link-qc-no"
              @click.prevent="openDetail(record)"
            >{{ record.qcNo }}</a>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="canInspect(record)"
              type="link"
              size="small"
              @click="openInspect(record)"
            >
              质检
            </a-button>
            <span v-else class="action-disabled">-</span>
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
          :page-size-options="['10', '20', '50']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <CreateFactoryQcModal v-model:open="createModalOpen" @saved="handleSearch" />

    <FactoryQcInspectModal
      v-model:open="inspectModalOpen"
      :record="inspectRecord"
      @saved="onInspectSaved"
    />
  </div>
</template>

<script>
export default { name: 'FactoryQcView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons-vue'
import { filterFactoryQcRecords } from '@/mock/factoryQcRecords'
import {
  factoryQcState,
  canInspect,
  canTerminate,
  terminateFactoryQc,
} from '@/store/factoryQcStore'
import { qcStatusOptions, qcResultOptions } from '@/mock/factoryQcOptions'
import CreateFactoryQcModal from './components/CreateFactoryQcModal.vue'
import FactoryQcInspectModal from './components/FactoryQcInspectModal.vue'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  qcStatus: undefined,
  qcResult: undefined,
  salesOrderNo: '',
  customerName: '',
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const createModalOpen = ref(false)
const inspectModalOpen = ref(false)
const inspectRecord = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const statusOpts = qcStatusOptions.map((v) => ({ label: v, value: v }))
const resultOpts = qcResultOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '质检状态', key: 'qcStatus', width: 90, fixed: 'left' },
  { title: '质检结果', key: 'qcResult', width: 100, fixed: 'left' },
  { title: '质检单号', key: 'qcNo', width: 150, fixed: 'left' },
  { title: '源单号', dataIndex: 'sourceOrderNo', width: 140 },
  { title: '来源', dataIndex: 'source', width: 90 },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', dataIndex: 'inspectedAt', width: 140 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const filteredList = computed(() => filterFactoryQcRecords(factoryQcState.records, appliedFilters.value))

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function statusColor(status) {
  const map = { 待质检: 'processing', 已完成: 'success', 已终止: 'default' }
  return map[status] || 'default'
}

function resultColor(result) {
  const map = { 质检通过: 'success', 质检不通过: 'error', 部分通过: 'warning' }
  return map[result] || 'default'
}

function openDetail(record) {
  const resolved = router.resolve({
    name: 'quality-factory-qc-detail',
    params: { id: record.id },
  })
  openTab(resolved.path, record.qcNo || '出厂质检详情')
  router.push(resolved)
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.qcStatus = undefined
  filters.qcResult = undefined
  filters.salesOrderNo = ''
  filters.customerName = ''
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openInspect(record) {
  inspectRecord.value = record
  inspectModalOpen.value = true
}

function onInspectSaved() {
  selectedRowKeys.value = []
  handleSearch()
}

function handleTerminate() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要终止的质检任务')
    return
  }
  const targets = factoryQcState.records.filter(
    (r) => selectedRowKeys.value.includes(r.id) && canTerminate(r),
  )
  if (!targets.length) {
    message.warning('仅待质检任务可终止')
    return
  }
  targets.forEach((r) => terminateFactoryQc(r.id))
  message.success(`已终止 ${targets.length} 条任务`)
  selectedRowKeys.value = []
}
</script>

<style lang="less" scoped>
.factory-qc-page {
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

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-size: 13px;
  }
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.link-qc-no {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
