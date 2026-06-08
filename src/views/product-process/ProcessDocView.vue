<template>
  <div class="process-doc-page">
    <div class="filter-card">
      <a-form layout="inline" class="horizontal-form">
        <a-form-item label="名称">
          <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
        </a-form-item>
      </a-form>
    </div>
    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 15, size: 'small' }"
      />
    </div>
  </div>
</template>

<script>
export default { name: 'ProcessDocView' }
</script>

<script setup>
import { computed, reactive } from 'vue'
import { processDocState, filterProcessDocs } from '@/store/processDocStore'

const filters = reactive({ name: '' })
const applied = reactive({ name: '' })

const columns = [
  { title: '文件编号', dataIndex: 'code', width: 120 },
  { title: '文件名称', dataIndex: 'name', width: 200 },
  { title: '版本', dataIndex: 'version', width: 80 },
  { title: '分类', dataIndex: 'category', width: 100 },
  { title: '状态', dataIndex: 'status', width: 80 },
]

const filteredList = computed(() => filterProcessDocs(processDocState.docs, applied))

function handleSearch() {
  applied.name = filters.name.trim()
}
</script>
