<template>
  <div class="qc-field-library-page">
    <a-alert
      type="info"
      show-icon
      class="page-tip"
      message="指标类型分「基础 / 复合」。复合子项支持与基础相同的字段类型与判定；多点暂未开放。演示：出厂试验-运转。"
    />
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
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
            <a-form-item label="指标类型">
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
            <a-form-item label="指标编码">
              <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
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
          新增检验项
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
          共计
          {{ filteredList.length }}
          条。检验项库供质检模板复用；系统字段（方式/数量/结果）不在此维护。
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
        :pagination="false"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '启用' ? 'success' : 'default'">
              {{ record.status || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag v-if="record.type === 'composite'" color="processing">复合项</a-tag>
            <template v-else>{{ qcFieldTypeLabel(record.type) }}</template>
          </template>
          <template v-else-if="column.key === 'required'">
            {{ record.required ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'unit'">
            {{ displayUnit(record) }}
          </template>
          <template v-else-if="column.key === 'standard'">
            {{ buildStandardText(record) || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="handleToggle(record)">
                {{ record.status === '启用' ? '停用' : '启用' }}
              </a-button>
              <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
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
  </div>
</template>

<script>
export default { name: 'QcFieldLibraryView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  qcFieldLibraryStatusOptions,
  qcFieldLibraryTypeOptions,
  qcFieldTypeLabel,
} from '@/mock/qcFieldLibrary'
import {
  deleteQcLibraryField,
  ensureQcLibraryDemoSeed,
  listQcLibraryFields,
  qcFieldLibraryState,
  toggleQcLibraryFieldStatus,
} from '@/store/qcFieldLibraryStore'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { buildStandardText } from '@/utils/qcFieldStandard'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'

onMounted(() => {
  ensureQcLibraryDemoSeed()
})

const router = useRouter()
const { openTab } = useTabs()
const createPage = findCreatePageByListPath('/quality/qc-field-library')

const filters = reactive({
  status: undefined,
  type: undefined,
  code: '',
  name: '',
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })

const statusOpts = qcFieldLibraryStatusOptions.map((v) => ({ label: v, value: v }))
const typeOpts = qcFieldLibraryTypeOptions

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 80, fixed: 'left' },
  { title: '指标编码', dataIndex: 'code', width: 140, fixed: 'left' },
  { title: '名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '字段类型', key: 'type', width: 110 },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', key: 'unit', width: 96 },
  { title: '合格标准', key: 'standard', width: 160, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const filteredList = computed(() => {
  // 依赖 state 触发刷新
  void qcFieldLibraryState.fields.length
  return listQcLibraryFields(appliedFilters.value)
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

function displayUnit(record) {
  if (!record?.withUnit && !record?.unit) return '—'
  const unit = String(record.unit || '').trim()
  if (!unit) return '—'
  return record.unitPosition === 'prefix' ? `${unit}（前）` : `${unit}（后）`
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.type = undefined
  filters.code = ''
  filters.name = ''
  handleSearch()
}

function handleCreate() {
  if (!createPage) {
    message.warning('未配置新增页')
    return
  }
  openCreateTab(router, openTab, {
    path: createPage.newPath,
    title: createPage.title,
  })
}

function handleEdit(record) {
  if (!createPage || !record?.id) return
  openCreateTab(router, openTab, {
    path: createPage.newPath,
    title: `编辑检验项 ${record.code || record.name || ''}`.trim(),
    query: { id: record.id },
  })
}

function handleToggle(record) {
  const next = record.status === '启用' ? '停用' : '启用'
  Modal.confirm({
    title: '操作确认',
    content: `确定要${next}检验项「${record.name}」吗？`,
    onOk: () => {
      const res = toggleQcLibraryFieldStatus(record.id)
      if (!res.ok) {
        message.warning(res.message || '操作失败')
        return
      }
      message.success(`已${next}`)
    },
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: '删除确认',
    content: `确定删除检验项「${record.name}」吗？已被模板引用的项无法删除。`,
    okType: 'danger',
    onOk: () => {
      const res = deleteQcLibraryField(record.id)
      if (!res.ok) {
        message.warning(res.message || '删除失败')
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.qc-field-library-page {
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
  padding: 12px 16px;
  margin-bottom: 8px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  margin-bottom: 8px;
}

.summary-bar {
  margin: 0 0 8px;
}

.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.filter-actions-item :deep(.ant-form-item-control-input-content) {
  display: flex;
}
</style>
