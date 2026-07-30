<template>
  <div class="unit-mgmt-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="单位名称">
              <a-input
                v-model:value="filters.name"
                allow-clear
                size="small"
                placeholder="名称/编码"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="适用类型">
              <a-select
                v-model:value="filters.scope"
                allow-clear
                size="small"
                placeholder="全部"
                :options="scopeFilterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="全部"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        新增单位
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :scroll="{ x: 960 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scopes'">
            <a-space :size="4" wrap>
              <a-tag v-if="record.scopes.includes('inventory')" color="blue">库存</a-tag>
              <a-tag v-if="record.scopes.includes('purchase')" color="green">采购</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="record.status === '启用' ? 'success' : 'default'"
              :text="record.status"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="12">
              <a @click="openEdit(record)">编辑</a>
              <a @click="toggleStatus(record)">
                {{ record.status === '启用' ? '停用' : '启用' }}
              </a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <UnitFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  UNIT_SCOPE_OPTIONS,
  UNIT_STATUS,
  unitState,
  deleteUnit,
  setUnitStatus,
} from '@/store/unitStore'
import UnitFormModal from './components/UnitFormModal.vue'

const filters = reactive({ name: '', scope: undefined, status: undefined })
const applied = reactive({ name: '', scope: undefined, status: undefined })
const modalOpen = ref(false)
const editRecord = ref(null)

const scopeFilterOpts = UNIT_SCOPE_OPTIONS
const statusOpts = [
  { label: UNIT_STATUS.ENABLED, value: UNIT_STATUS.ENABLED },
  { label: UNIT_STATUS.DISABLED, value: UNIT_STATUS.DISABLED },
]

const columns = [
  { title: '单位编码', dataIndex: 'code', width: 110 },
  { title: '单位名称', dataIndex: 'name', width: 100 },
  { title: '适用类型', key: 'scopes', width: 140 },
  { title: '状态', key: 'status', width: 90 },
  { title: '排序', dataIndex: 'sort', width: 72, align: 'right' },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const filteredList = computed(() => {
  void unitState.units
  const kw = applied.name.trim().toLowerCase()
  return [...unitState.units]
    .filter((item) => {
      if (kw && !`${item.name}${item.code}`.toLowerCase().includes(kw)) return false
      if (applied.scope && !item.scopes.includes(applied.scope)) return false
      if (applied.status && item.status !== applied.status) return false
      return true
    })
    .sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.code.localeCompare(b.code))
})

function handleSearch() {
  applied.name = filters.name.trim()
  applied.scope = filters.scope
  applied.status = filters.status
}

function handleReset() {
  filters.name = ''
  filters.scope = undefined
  filters.status = undefined
  applied.name = ''
  applied.scope = undefined
  applied.status = undefined
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function toggleStatus(record) {
  const next = record.status === UNIT_STATUS.ENABLED ? UNIT_STATUS.DISABLED : UNIT_STATUS.ENABLED
  const res = setUnitStatus(record.id, next)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已${next}`)
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除该单位？',
    content: `删除后，已录入业务数据中的「${record.name}」不会自动变更，但下拉选项中将不再出现。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const res = deleteUnit(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style scoped>
.unit-mgmt-page {
  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .toolbar-row {
    margin-bottom: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
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
</style>
