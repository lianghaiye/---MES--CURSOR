<template>
  <div class="ecn-list-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据编号">
              <a-input
                v-model:value="filters.documentNo"
                allow-clear
                :placeholder="mod.docNoFilterPlaceholder"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="变更类型">
              <a-select
                v-model:value="filters.type"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="typeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                placeholder="请输入"
                size="small"
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
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="创建时间">
              <a-range-picker
                v-model:value="filters.createdRange"
                size="small"
                style="width: 100%"
              />
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
      <a-button type="primary" size="small" @click="goCreate">
        <PlusOutlined />
        新增变更
      </a-button>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleRefresh">
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
        :pagination="false"
        :scroll="{ x: tableScrollX }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="ecnStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            {{ record.type || '—' }}
          </template>
          <template v-else-if="column.key === 'changeReason'">
            <a-tooltip :title="resolveEcnChangeReason(record)">
              <span class="ellipsis-cell">{{ resolveEcnChangeReason(record) }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'originDoc'">
            <a-tooltip :title="formatEcnOriginDoc(record)">
              <span class="ellipsis-cell">{{ formatEcnOriginDoc(record) }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'urgency'">
            {{ record.urgency || '—' }}
          </template>
          <template v-else-if="column.key === 'docNo'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ getDocNo(record, moduleConfig) }}</a>
          </template>
          <template v-else-if="column.key === 'execScope'">
            <a-tooltip :title="record.execScope">
              <span class="ellipsis-cell">{{ record.execScope || '—' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'reviewer'">
            {{ record.reviewer || '—' }}
          </template>
          <template v-else-if="column.key === 'reviewTime'">
            {{ record.reviewTime || '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <template v-if="record.status === ECN_STATUS.DRAFT">
                <a-button type="link" size="small" @click="goEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
                <a-button type="link" size="small" @click="handleSubmitApproval(record)">提交审批</a-button>
              </template>
              <template v-else-if="record.status === ECN_STATUS.APPROVING">
                <a-button type="link" size="small" @click="openDetail(record)">审批</a-button>
              </template>
              <template v-else-if="record.status === ECN_STATUS.APPROVED">
                <a-button
                  v-if="isRecordOnlyExec(record)"
                  type="link"
                  size="small"
                  @click="openDetail(record)"
                >
                  详情
                </a-button>
                <a-button v-else type="link" size="small" @click="openExecute(record)">
                  执行情况
                </a-button>
              </template>
              <template v-else-if="record.status === ECN_STATUS.REJECTED">
                <a-button type="link" size="small" @click="goEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="goResubmit(record)">重新提交</a-button>
              </template>
              <span v-else class="action-empty">—</span>
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
          :page-size-options="['10', '20', '50']"
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
export default { name: 'EcnListView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  ECN_STATUS,
  ecnStatusOptions,
  ecnTypeOptions,
  ecnStatusColor,
  isEcnRecordOnlyExecScope,
  formatEcnOriginDoc,
  resolveEcnChangeReason,
} from '@/constants/ecn'
import { resolveChangeRequestModule, getDocNo } from '@/constants/changeRequestModule'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const route = useRoute()
const router = useRouter()
const moduleConfig = resolveChangeRequestModule(route)

const defaultFilters = () => ({
  documentNo: '',
  status: undefined,
  type: undefined,
  productName: '',
  customerName: '',
  createdRange: null,
})

const filters = reactive(defaultFilters())
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })

const statusOpts = ecnStatusOptions.filter((o) => o.value !== '')
const typeOpts = ecnTypeOptions.filter((o) => o.value !== '')

const baseColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90, fixed: 'left' },
  { title: moduleConfig.docNoLabel, key: 'docNo', width: 130, fixed: 'left' },
  { title: '变更类型', key: 'type', dataIndex: 'type', width: 100 },
  { title: '变更原因', key: 'changeReason', dataIndex: 'changeReason', width: 120, ellipsis: true },
  { title: '关联单据', key: 'originDoc', width: 140, ellipsis: true },
  { title: '产品名称', key: 'productName', dataIndex: 'productName', width: 120, ellipsis: true },
  { title: '销售单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '客户名称', key: 'customerName', dataIndex: 'customerName', width: 110, ellipsis: true },
  { title: '工单编号', key: 'workOrderNo', dataIndex: 'workOrderNo', width: 130, ellipsis: true },
  { title: '执行配置', key: 'execScope', dataIndex: 'execScope', width: 180, ellipsis: true },
  { title: '申请人', key: 'applicant', dataIndex: 'applicant', width: 90 },
  { title: '紧急度', key: 'urgency', dataIndex: 'urgency', width: 80 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '审核人', key: 'reviewer', dataIndex: 'reviewer', width: 90 },
  { title: '审核时间', key: 'reviewTime', dataIndex: 'reviewTime', width: 150 },
  { title: '操作', key: 'action', fixed: 'right', width: 200 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings(moduleConfig.columnSettingsKey, baseColumns, { excludeKeys: ['index', 'action'] })

const filteredList = computed(() => moduleConfig.store.filterList(appliedFilters.value))

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, defaultFilters())
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleRefresh() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
  message.success('列表已刷新')
}

function goCreate() {
  router.push(moduleConfig.newPath)
}

function openDetail(record) {
  router.push(moduleConfig.approvePath(record.id))
}

function openExecute(record) {
  router.push(moduleConfig.executePath(record.id))
}

function handleSubmitApproval(record) {
  Modal.confirm({
    title: '提交审批',
    content: `确定提交变更单「${getDocNo(record, moduleConfig)}」进入审批流程吗？`,
    onOk: () => {
      const res = moduleConfig.store.submitForApproval(record.id)
      if (res.ok) message.success('已提交审批')
      else message.warning(res.message)
    },
  })
}

function isRecordOnlyExec(record) {
  return isEcnRecordOnlyExecScope(record.execScope)
}

function goEdit(record) {
  router.push({ path: moduleConfig.newPath, query: { edit: record.id } })
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除草稿「${getDocNo(record, moduleConfig)}」吗？删除后不可恢复。`,
    okType: 'danger',
    onOk: () => {
      const res = moduleConfig.store.deleteById(record.id)
      if (res.ok) message.success('草稿已删除')
      else message.warning(res.message)
    },
  })
}

function goResubmit(record) {
  router.push({ path: moduleConfig.newPath, query: { from: record.id } })
}
</script>

<style lang="less" scoped>
.ecn-list-page {
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
  flex-wrap: wrap;
  gap: 8px;
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
  }
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

.ellipsis-cell {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.action-empty {
  color: #bfbfbf;
}
</style>
