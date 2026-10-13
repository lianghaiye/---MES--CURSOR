<template>
  <div class="eq-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="关键字">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="编码/名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="适用类别">
              <a-select
                v-model:value="filters.category"
                allow-clear
                size="small"
                placeholder="全部"
                :options="EQUIPMENT_CATEGORY_OPTIONS"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-space>
              <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
              <a-button size="small" @click="handleReset">清空</a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        新增标准
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="list"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showTotal: (t) => `共 ${t} 条` }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'success' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ (record.items || []).length }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)"
                >删除</a-button
              >
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <InspectionStandardFormModal v-model:open="modalOpen" :record="editRecord" @saved="tick++" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { EQUIPMENT_CATEGORY_OPTIONS } from '@/mock/equipmentSeed'
import {
  deleteInspectionStandard,
  equipmentState,
  listInspectionStandards,
} from '@/store/equipmentStore'
import InspectionStandardFormModal from './components/InspectionStandardFormModal.vue'

const filters = reactive({ keyword: '', category: undefined })
const applied = ref({ ...filters })
const tick = ref(0)
const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '标准编码', dataIndex: 'code', width: 130 },
  { title: '标准名称', dataIndex: 'name', width: 160 },
  { title: '适用类别', dataIndex: 'category', width: 120 },
  { title: '周期', dataIndex: 'cycle', width: 80 },
  { title: '点检项数', key: 'itemCount', width: 90, align: 'center' },
  { title: '状态', key: 'enabled', width: 80 },
  { title: '操作', key: 'action', width: 120 },
]

const list = computed(() => {
  void tick.value
  void equipmentState.standards.length
  return listInspectionStandards(applied.value)
})

function handleSearch() {
  applied.value = { ...filters }
}

function handleReset() {
  filters.keyword = ''
  filters.category = undefined
  handleSearch()
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = JSON.parse(JSON.stringify(record))
  modalOpen.value = true
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除该点检标准？',
    onOk() {
      const res = deleteInspectionStandard(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
      tick.value += 1
    },
  })
}
</script>

<style lang="less" scoped>
@import './equipment-page.less';
</style>
