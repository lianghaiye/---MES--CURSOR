<template>
  <div class="system-dict-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="关键字">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="编号 / 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="所属模块">
              <a-select
                v-model:value="filters.module"
                allow-clear
                size="small"
                placeholder="请选择模块"
                :options="moduleOpts"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择状态"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
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
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '启用' ? 'success' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'code'">
            <a class="link-code" @click="openEdit(record)">{{ record.code }}</a>
            <a-tag v-if="record.builtin" color="blue" class="builtin-tag">内置</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a
                class="danger-link"
                :class="{ disabled: record.builtin }"
                @click="handleDelete(record)"
                >删除</a
              >
              <a @click="openItemsConfig(record)">字典配置</a>
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

    <a-modal
      v-model:open="formOpen"
      :title="editing ? '编辑系统字典' : '新增系统字典'"
      width="480px"
      destroy-on-close
      @ok="handleFormSave"
    >
      <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="字典编号" required>
          <a-input
            v-model:value="form.code"
            placeholder="如 scrap_reason"
            :disabled="Boolean(editing?.builtin)"
          />
        </a-form-item>
        <a-form-item label="字典名称" required>
          <a-input v-model:value="form.name" placeholder="请输入字典名称" />
        </a-form-item>
        <a-form-item label="所属模块">
          <a-select
            v-model:value="form.module"
            allow-clear
            placeholder="请选择所属模块"
            :options="moduleOpts"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="form.status" :options="statusOpts" />
        </a-form-item>
      </a-form>
    </a-modal>

    <DictItemsConfigDrawer
      v-model:open="itemsOpen"
      :title="itemsTitle"
      :header-hint="itemsHint"
      :items="itemsTarget?.items || []"
      @save="handleItemsSave"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'SystemDictView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  DICT_STATUS,
  DICT_MODULE_OPTIONS,
  systemDictState,
  listSystemDicts,
  addSystemDict,
  updateSystemDict,
  deleteSystemDict,
  setSystemDictItems,
} from '@/store/systemDictStore'
import DictItemsConfigDrawer from './components/DictItemsConfigDrawer.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const filters = reactive({ keyword: '', module: undefined, status: undefined })
const applied = ref({ keyword: '', module: undefined, status: undefined })
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const editing = ref(null)
const form = reactive({ code: '', name: '', module: undefined, status: DICT_STATUS.ENABLED })
const itemsOpen = ref(false)
const itemsTarget = ref(null)

const statusOpts = [
  { label: DICT_STATUS.ENABLED, value: DICT_STATUS.ENABLED },
  { label: DICT_STATUS.DISABLED, value: DICT_STATUS.DISABLED },
]
const moduleOpts = DICT_MODULE_OPTIONS

const filteredList = computed(() => {
  void systemDictState.dicts
  return listSystemDicts(applied.value)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

watch(filteredList, () => {
  const maxPage = Math.max(1, Math.ceil(filteredList.value.length / pagination.pageSize) || 1)
  if (pagination.current > maxPage) pagination.current = 1
})

const baseColumns = [
  { title: '序号', key: 'index', width: 64, align: 'center' },
  { title: '状态', key: 'status', width: 80, align: 'center' },
  { title: '字典编号', key: 'code', dataIndex: 'code', width: 180 },
  { title: '字典名称', key: 'name', dataIndex: 'name', width: 180 },
  { title: '所属模块', key: 'module', dataIndex: 'module', width: 120 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('system-dict-master-v2', baseColumns)

const itemsTitle = computed(() =>
  itemsTarget.value ? `字典配置 — ${itemsTarget.value.name}` : '字典配置',
)
const itemsHint = computed(() =>
  itemsTarget.value
    ? `编号：${itemsTarget.value.code}${itemsTarget.value.builtin ? '（内置字典，可编辑字典项）' : ''}`
    : '',
)

function handleSearch() {
  applied.value = {
    keyword: filters.keyword,
    module: filters.module,
    status: filters.status,
  }
  pagination.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.module = undefined
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  editing.value = null
  form.code = ''
  form.name = ''
  form.module = undefined
  form.status = DICT_STATUS.ENABLED
  formOpen.value = true
}

function openEdit(record) {
  editing.value = record
  form.code = record.code
  form.name = record.name
  form.module = record.module || undefined
  form.status = record.status
  formOpen.value = true
}

function handleFormSave() {
  const payload = {
    code: form.code,
    name: form.name,
    module: form.module || '',
    status: form.status,
  }
  const res = editing.value ? updateSystemDict(editing.value.id, payload) : addSystemDict(payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(editing.value ? '已更新' : '已新增')
  formOpen.value = false
}

function handleDelete(record) {
  if (record.builtin) {
    message.warning('内置字典不可删除')
    return
  }
  Modal.confirm({
    title: `确定删除字典「${record.name}」？`,
    onOk: () => {
      const res = deleteSystemDict(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}

function openItemsConfig(record) {
  itemsTarget.value = record
  itemsOpen.value = true
}

function handleItemsSave(items) {
  if (!itemsTarget.value) return
  const res = setSystemDictItems(itemsTarget.value.id, items)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('字典项已保存')
}
</script>

<style lang="less" scoped>
.system-dict-page {
  padding: 0;
}
.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
  background: #fff;
}
.horizontal-form {
  width: 100%;
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
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
  gap: 8px;
}
.toolbar-icons {
  margin-left: auto;
}
.table-card {
  background: #fff;
  padding: 8px 12px 12px;
  border-radius: 4px;
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
.builtin-tag {
  margin-left: 6px;
}
.danger-link {
  color: #ff4d4f;
}
.disabled {
  color: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
</style>
