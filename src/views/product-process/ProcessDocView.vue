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
    <div class="table-toolbar">
      <a-space :size="4" class="toolbar-icons">
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>
    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="{ pageSize: 15, size: 'small' }"
      />
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'ProcessDocView' }
</script>

<script setup>
import { computed, reactive } from 'vue'
import { processDocState, filterProcessDocs } from '@/store/processDocStore'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const filters = reactive({ name: '' })
const applied = reactive({ name: '' })

const baseColumns = [
  { title: '文件编号', dataIndex: 'code', width: 120 },
  { title: '文件名称', dataIndex: 'name', width: 200 },
  { title: '版本', dataIndex: 'version', width: 80 },
  { title: '分类', dataIndex: 'category', width: 100 },
  { title: '状态', dataIndex: 'status', width: 80 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('process-doc-list', baseColumns)

const filteredList = computed(() => filterProcessDocs(processDocState.docs, applied))

function handleSearch() {
  applied.name = filters.name.trim()
}
</script>

<style scoped>
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
