<template>
  <div class="design-task-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="设计任务编号">
              <a-input
                v-model:value="filters.taskNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="紧急度">
              <a-select
                v-model:value="filters.urgency"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="urgencyOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-input
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="订单日期">
              <a-range-picker
                v-model:value="filters.orderDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="订单类型">
              <a-select
                v-model:value="filters.orderType"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="orderTypeOpts"
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
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="handleApprove">
          <CheckOutlined />
          审核
        </a-button>
        <a-button size="small" @click="handleWithdraw">
          <RollbackOutlined />
          撤回申请
        </a-button>
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
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
          <template v-if="column.key === 'status'">
            <a-tag :color="designTaskStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'source'">
            <span>{{ designTaskSourceLabel(record.source) }}</span>
          </template>
          <template v-else-if="column.key === 'taskNo'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.taskNo }}</a>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
              <a-button
                v-if="canStartDesign(record)"
                type="link"
                size="small"
                @click="openEbomDesign(record)"
              >
                设计
              </a-button>
              <a-button
                v-if="canOpenDraft(record)"
                type="link"
                size="small"
                @click="openEbomDesign(record)"
              >
                草稿
              </a-button>
            </a-space>
          </template>
          <template v-else>
            <span>{{ record[column.dataIndex] || '—' }}</span>
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

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'DesignTaskView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  SearchOutlined,
  ClearOutlined,
  CheckOutlined,
  RollbackOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import {
  DESIGN_TASK_STATUS,
  designTaskStatusColor,
  designTaskSourceLabel,
} from '@/constants/designTask'
import {
  designTaskState,
  filterDesignTasks,
  approveDesignTasks,
  withdrawDesignTaskAudit,
  canOpenEbomDesign,
} from '@/store/designTaskStore'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  taskNo: '',
  urgency: undefined,
  customerName: '',
  orderDateRange: undefined,
  orderType: undefined,
})

const pagination = reactive({ current: 1, pageSize: 20 })
const selectedRowKeys = ref([])

const statusOpts = Object.values(DESIGN_TASK_STATUS).map((v) => ({ label: v, value: v }))
const urgencyOpts = ['紧急', '加急', '普通'].map((v) => ({ label: v, value: v }))
const orderTypeOpts = ['标准订单', '项目订单', '备件订单'].map((v) => ({ label: v, value: v }))

const allColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 88, fixed: 'left' },
  { title: '设计任务编号', key: 'taskNo', dataIndex: 'taskNo', width: 130 },
  { title: '来源', key: 'source', dataIndex: 'source', width: 88 },
  { title: '产品名称', key: 'productName', dataIndex: 'productName', width: 160, ellipsis: true },
  { title: '型号规格', key: 'specModel', dataIndex: 'specModel', width: 110 },
  { title: '规格属性', key: 'specAttr', dataIndex: 'specAttr', width: 90 },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80 },
  { title: '紧急度', key: 'urgency', dataIndex: 'urgency', width: 72 },
  { title: '交货日期', key: 'deliveryDate', dataIndex: 'deliveryDate', width: 100 },
  { title: '技术参数', key: 'techParams', dataIndex: 'techParams', width: 140, ellipsis: true },
  { title: 'EBOM名称', key: 'ebomName', dataIndex: 'ebomName', width: 130, ellipsis: true },
  { title: 'EBOM编码', key: 'ebomCode', dataIndex: 'ebomCode', width: 120 },
  { title: '工艺文件', key: 'processFile', dataIndex: 'processFile', width: 120, ellipsis: true },
  { title: '设计人', key: 'designer', dataIndex: 'designer', width: 80 },
  { title: '设计时间', key: 'designTime', dataIndex: 'designTime', width: 130 },
  { title: '校核人', key: 'checker', dataIndex: 'checker', width: 80 },
  { title: '校核时间', key: 'checkTime', dataIndex: 'checkTime', width: 130 },
  { title: '工单创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 130 },
  { title: '业务员', key: 'salesperson', dataIndex: 'salesperson', width: 80 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('design-task-list', allColumns, { excludeKeys: ['action'] })

const filteredList = computed(() => {
  const f = { ...filters }
  if (f.orderDateRange?.length === 2) {
    f.orderDateRange = [f.orderDateRange[0], f.orderDateRange[1]]
  } else {
    f.orderDateRange = null
  }
  return filterDesignTasks(designTaskState.tasks, f)
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

function openCreate() {
  const page = findCreatePageByListPath('/planning/design-task')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function handleSearch() {
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.taskNo = ''
  filters.urgency = undefined
  filters.customerName = ''
  filters.orderDateRange = undefined
  filters.orderType = undefined
  handleSearch()
}

function canStartDesign(record) {
  return record.status === DESIGN_TASK_STATUS.PENDING && canOpenEbomDesign(record)
}

function canOpenDraft(record) {
  return (
    record.hasEbomDraft && canOpenEbomDesign(record) && record.status !== DESIGN_TASK_STATUS.PENDING
  )
}

function openDetail(record) {
  const resolved = router.resolve({
    name: 'planning-design-task-detail',
    params: { id: record.id },
  })
  openTab(resolved.path, `设计任务·${record.taskNo || ''}`)
  router.push(resolved)
}

function openEbomDesign(record) {
  const resolved = router.resolve({
    name: 'planning-ebom-design',
    params: { taskId: record.id },
  })
  openTab(resolved.path, `EBOM设计·${record.taskNo || ''}`)
  router.push(resolved)
}

function handleApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择待审核的设计任务')
    return
  }
  Modal.confirm({
    title: '审核设计任务',
    content: `确认审核通过已选的 ${selectedRowKeys.value.length} 条设计任务？审核通过后将更新或生成生产计划。`,
    okText: '通过',
    cancelText: '取消',
    onOk: () => {
      const results = approveDesignTasks(selectedRowKeys.value)
      const ok = results.filter((r) => r.ok)
      const fail = results.filter((r) => !r.ok)
      ok.forEach((r) => message.success(r.message))
      fail.forEach((r) => message.warning(r.message))
      selectedRowKeys.value = []
    },
  })
}

function handleWithdraw() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要撤回的设计任务')
    return
  }
  const results = selectedRowKeys.value.map((id) => withdrawDesignTaskAudit(id))
  const ok = results.filter((r) => r.ok)
  const fail = results.filter((r) => !r.ok)
  ok.forEach((r) => message.success(r.message))
  fail.forEach((r) => message.warning(r.message))
  selectedRowKeys.value = []
}
</script>

<style lang="less" scoped>
.design-task-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 4px;
  padding: 12px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
