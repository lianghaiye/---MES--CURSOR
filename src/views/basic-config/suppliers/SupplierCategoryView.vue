<template>
  <div class="supplier-category-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="分类名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
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
        新增供应商分类
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
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a @click="openEdit(record)">编辑</a>
          </template>
        </template>
      </a-table>
    </div>

    <SupplierCategoryFormModal
      v-model:open="modalOpen"
      :record="editRecord"
      @saved="handleSearch"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { supplierCategoryState } from '@/store/supplierCategoryStore'
import SupplierCategoryFormModal from './components/SupplierCategoryFormModal.vue'

const filters = reactive({ name: '' })
const applied = reactive({ name: '' })
const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '编码', dataIndex: 'code', width: 120 },
  { title: '分类名称', dataIndex: 'name', width: 180 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
  { title: '操作', key: 'actions', width: 80 },
]

const filteredList = computed(() => {
  void supplierCategoryState.categories
  const kw = applied.name.trim()
  return supplierCategoryState.categories.filter((item) => !kw || item.name.includes(kw))
})

function handleSearch() {
  applied.name = filters.name.trim()
}

function handleReset() {
  filters.name = ''
  applied.name = ''
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}
</script>

<style scoped>
.supplier-category-page {
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

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}
</style>
