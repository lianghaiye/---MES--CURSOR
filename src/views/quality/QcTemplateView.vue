<template>
  <div class="qc-template-page">
    <a-alert
      type="info"
      show-icon
      class="page-tip"
      message="模板字段支持「基础 / 复合」指标类型；复合子项可各自配置类型与判定。多点暂未开放。演示：编辑「密封件来料检模板」。"
    />
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务类型">
              <a-select
                v-model:value="filters.bizScope"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="bizScopeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="适用范围">
              <a-select
                v-model:value="filters.scopeType"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="scopeTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="类型">
              <a-select
                v-model:value="filters.type"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="typeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="编码">
              <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="创建人">
              <a-input
                v-model:value="filters.creator"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="创建时间">
              <a-range-picker
                v-model:value="filters.dateRange"
                size="small"
                style="width: 100%"
                value-format="YYYY-MM-DD"
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
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="handleCreate">
          <PlusOutlined />
          新增模板
        </a-button>
        <a-button size="small" @click="probeOpen = true">匹配试算</a-button>
        <a-button
          size="small"
          :type="effectiveView ? 'primary' : 'default'"
          ghost
          @click="toggleEffectiveView"
        >
          {{ effectiveView ? '退出生效视图' : '生效视图' }}
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

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          共计 {{ filteredList.length }} 条。
          <template v-if="effectiveView">
            当前为生效视图：仅启用模板，按业务类型与适用范围（单产品→类别→全局）排序。
          </template>
          不确定某物料用哪份模板时，请用「匹配试算」。
        </span>
      </template>
    </a-alert>

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
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '启用' ? 'success' : 'default'">
              {{ record.status || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'code'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.code }}</a>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag :color="record.type === '系统模板' ? 'blue' : 'processing'">
              {{ record.type || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'scopeType'">
            {{ qcTemplateScopeTypeLabel(record.scopeType) }}
          </template>
          <template v-else-if="column.key === 'objects'">
            <span :title="formatQcTemplateObjects(record)">
              {{ formatQcTemplateObjects(record) }}
            </span>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTimeMinute(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openFillPreview(record)">预览</a-button>
              <template v-if="record.isSystem">
                <a-button type="link" size="small" @click="handleCopy(record)">复制</a-button>
              </template>
              <template v-else>
                <a-button type="link" size="small" @click="handleToggleStatus(record)">
                  {{ record.status === '启用' ? '停用' : '启用' }}
                </a-button>
                <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="handleCopy(record)">复制</a-button>
              </template>
            </a-space>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
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
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <QcTemplatePreviewDrawer
      v-model:open="previewOpen"
      :record="previewRecord"
      :initial-tab="previewTab"
      @copy="handleCopyFromPreview"
    />

    <QcTemplateConflictModal
      v-model:open="conflictOpen"
      :kind="conflictKind"
      :conflicts="conflictRows"
      :current-template-name="conflictTemplateName"
      @confirm="onConflictConfirm"
      @cancel="pendingEnableId = ''"
    />

    <QcTemplateMatchProbeDrawer v-model:open="probeOpen" />
  </div>
</template>

<script>
export default { name: 'QcTemplateView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  filterQcTemplates,
  formatQcTemplateObjects,
  qcTemplateBizScopeOptions,
  qcTemplateScopeTypeLabel,
  qcTemplateScopeTypeOptions,
  qcTemplateStatusOptions,
  qcTemplateTypeOptions,
  sortQcTemplatesForBrowse,
} from '@/mock/qcTemplates'
import {
  qcTemplateState,
  enableQcTemplate,
  disableQcTemplate,
  copyQcTemplate,
  ensureQcTemplateDemoSeed,
} from '@/store/qcTemplateStore'
import { processConfigState } from '@/store/processConfigStore'
import { qcTaskState, QC_TASK_STATUS } from '@/store/qcTaskStore'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import QcTemplatePreviewDrawer from './components/QcTemplatePreviewDrawer.vue'
import QcTemplateConflictModal from './components/QcTemplateConflictModal.vue'
import QcTemplateMatchProbeDrawer from './components/QcTemplateMatchProbeDrawer.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'

onMounted(() => {
  ensureQcLibraryDemoSeed()
  ensureQcTemplateDemoSeed()
})
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()
const qcTemplateCreatePage = findCreatePageByListPath('/quality/qc-template')

const filters = reactive({
  status: undefined,
  type: undefined,
  bizScope: undefined,
  scopeType: undefined,
  code: '',
  name: '',
  creator: '',
  dateRange: undefined,
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const previewOpen = ref(false)
const previewRecord = ref(null)
const previewTab = ref('detail')
const conflictOpen = ref(false)
const conflictKind = ref('single')
const conflictRows = ref([])
const conflictTemplateName = ref('')
const pendingEnableId = ref('')
const probeOpen = ref(false)
const effectiveView = ref(false)

function isTemplateReferenced(template) {
  const code = String(template?.code || '').trim()
  if (!code) return false
  const processHit = (processConfigState.processes || []).some((p) =>
    (p.qcConfigs || []).some((cfg) => String(cfg.templateCode || '').trim() === code),
  )
  if (processHit) return true
  return (qcTaskState.tasks || []).some(
    (t) =>
      String(t.templateCode || '').trim() === code &&
      (t.qcStatus === QC_TASK_STATUS.PENDING || t.qcStatus === QC_TASK_STATUS.IN_PROGRESS),
  )
}

const statusOpts = qcTemplateStatusOptions.map((v) => ({ label: v, value: v }))
const typeOpts = qcTemplateTypeOptions.map((v) => ({ label: v, value: v }))
const bizScopeOpts = qcTemplateBizScopeOptions.map((v) => ({ label: v, value: v }))
const scopeTypeOpts = qcTemplateScopeTypeOptions

const baseColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 80, fixed: 'left' },
  { title: '模板编号', key: 'code', dataIndex: 'code', width: 140, fixed: 'left' },
  { title: '模板名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '类型', key: 'type', width: 100 },
  { title: '业务类型', key: 'bizScope', dataIndex: 'bizScope', width: 110 },
  { title: '适用范围', key: 'scopeType', width: 90 },
  { title: '适用对象', key: 'objects', width: 160, ellipsis: true },
  { title: '字段数量', dataIndex: 'fieldCount', width: 90, align: 'right' },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'action', width: 260, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('qc-template-list-v4', baseColumns)

const filteredList = computed(() => {
  const base = filterQcTemplates(qcTemplateState.templates, appliedFilters.value)
  return sortQcTemplatesForBrowse(base)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function handleSearch() {
  appliedFilters.value = {
    ...filters,
    dateRange: filters.dateRange ? [...filters.dateRange] : undefined,
  }
  pagination.current = 1
}

function handleReset() {
  filters.status = effectiveView.value ? '启用' : undefined
  filters.type = undefined
  filters.bizScope = undefined
  filters.scopeType = undefined
  filters.code = ''
  filters.name = ''
  filters.creator = ''
  filters.dateRange = undefined
  handleSearch()
}

function toggleEffectiveView() {
  effectiveView.value = !effectiveView.value
  if (effectiveView.value) {
    filters.status = '启用'
  } else if (filters.status === '启用') {
    filters.status = undefined
  }
  handleSearch()
}

function handleCreate() {
  if (!qcTemplateCreatePage) {
    message.warning('未配置新增页')
    return
  }
  openCreateTab(router, openTab, {
    path: qcTemplateCreatePage.newPath,
    title: qcTemplateCreatePage.title,
  })
}

function openTemplateDrawer(record, tab = 'detail') {
  if (!record) return
  previewTab.value = tab === 'fill' ? 'fill' : 'detail'
  previewRecord.value = {
    ...record,
    fields: (record.fields || []).map((f) => ({
      ...f,
      options: f.options ? [...f.options] : [],
      optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
      children: Array.isArray(f.children) ? f.children.map((c) => ({ ...c })) : [],
    })),
  }
  previewOpen.value = true
}

function openDetail(record) {
  openTemplateDrawer(record, 'detail')
}

function openFillPreview(record) {
  openTemplateDrawer(record, 'fill')
}

function openEditTab(template, title) {
  if (!qcTemplateCreatePage || !template?.id) return
  openCreateTab(router, openTab, {
    path: qcTemplateCreatePage.newPath,
    title: title || `编辑质检模板 ${template.code || ''}`,
    query: { id: template.id },
  })
}

function handleCopy(record) {
  const res = copyQcTemplate(record.id)
  if (!res.ok) {
    message.warning(res.message || '复制失败')
    return
  }
  message.success(`已复制为 ${res.template.code}`)
  previewOpen.value = false
  openEditTab(res.template, `编辑质检模板 ${res.template.code}`)
}

function handleCopyFromPreview(record) {
  if (!record) return
  handleCopy(record)
}

function handleEdit(record) {
  if (record.isSystem) {
    message.warning('系统模板不可编辑')
    return
  }
  openEditTab(record)
}

function handleToggleStatus(record) {
  if (record.status === '启用') {
    const referenced = isTemplateReferenced(record)
    Modal.confirm({
      title: '停用确认',
      content: referenced
        ? '当前模板已被引用，停用后，该工序将按优先级匹配已启用的模板。是否确认停用？'
        : `确定要停用模板「${record.name}」吗？`,
      onOk: () => {
        const res = disableQcTemplate(record.id, { force: true })
        if (!res.ok) {
          message.warning(res.message || '操作失败')
          return
        }
        message.success('已停用')
      },
    })
    return
  }

  const res = enableQcTemplate(record.id)
  if (res.needConflict) {
    pendingEnableId.value = record.id
    conflictKind.value = res.conflict.kind
    conflictRows.value = res.conflict.conflicts || []
    conflictTemplateName.value = record.name || ''
    conflictOpen.value = true
    return
  }
  if (!res.ok) {
    message.warning(res.message || '启用失败')
    return
  }
  message.success('已启用')
}

function onConflictConfirm({ mode }) {
  if (!pendingEnableId.value) return
  const res = enableQcTemplate(pendingEnableId.value, {
    conflictResolution: { mode },
  })
  pendingEnableId.value = ''
  if (!res.ok) {
    message.warning(res.message || '启用失败')
    return
  }
  message.success('已启用')
}
</script>

<style lang="less" scoped>
.qc-template-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-tip {
  margin: 12px 12px 0;
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

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
