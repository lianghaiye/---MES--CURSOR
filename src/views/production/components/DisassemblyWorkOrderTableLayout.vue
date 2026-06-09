<template>
  <div class="table-layout-card">
    <div class="table-toolbar">
      <span class="table-summary">共 {{ total }} 条工单</span>
      <div class="table-toolbar-right">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" class="toolbar-icon-btn" @click="emit('refresh')">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
        <a-tooltip title="切换为卡片视图">
          <a-button
            type="text"
            size="small"
            class="toolbar-icon-btn"
            @click="emit('toggle-layout')"
          >
            <AppstoreOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <a-table
      :columns="displayColumns"
      :data-source="dataSource"
      row-key="id"
      size="small"
      bordered
      :scroll="{ x: tableScrollX }"
      :pagination="false"
      :row-selection="rowSelection"
      :custom-row="customRow"
      class="work-order-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">
          {{ rowIndex(index) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'urgency'">
          <a-tag :color="urgencyTagColor(record.urgency)">
            {{ urgencyLabel(record.urgency) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="0" wrap>
            <a-button type="link" size="small" @click.stop="emit('action', 'view', record)">
              查看
            </a-button>
            <a-button type="link" size="small" @click.stop="emit('action', 'edit', record)">
              编辑
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              @click.stop="emit('action', 'delete', record)"
            >
              删除
            </a-button>
            <a-button
              v-if="record.status === '待下发'"
              type="link"
              size="small"
              @click.stop="emit('action', 'dispatch', record)"
            >
              下发任务
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <div class="table-pagination">
      <a-pagination
        :current="pagination.current"
        :page-size="pagination.pageSize"
        :total="total"
        size="small"
        show-size-changer
        :page-size-options="['10', '20', '50', '100']"
        :show-total="(t) => `共 ${t} 条`"
        @change="onPageChange"
        @showSizeChange="onPageSizeChange"
      />
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AppstoreOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { statusColor, urgencyTagColor, urgencyLabel } from '@/utils/disassemblyWorkOrder'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const props = defineProps({
  dataSource: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  pagination: { type: Object, required: true },
  selectedIds: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
})

const emit = defineEmits([
  'refresh',
  'toggle-layout',
  'select',
  'action',
  'update:pagination',
  'update:selectedIds',
])

const baseColumns = [
  { title: '#', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '工单编号', dataIndex: 'code', key: 'code', width: 150, ellipsis: true },
  { title: '工单名称', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', key: 'itemName', width: 120, ellipsis: true },
  { title: '关联报废单', dataIndex: 'relatedScrapNo', key: 'relatedScrapNo', width: 130 },
  { title: '进度', key: 'status', dataIndex: 'status', width: 90 },
  { title: '紧急程度', key: 'urgency', dataIndex: 'urgency', width: 90 },
  { title: '工作中心', dataIndex: 'workCenter', key: 'workCenter', width: 100 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('disassembly-work-order-list', baseColumns, { minScrollX: 1400 })

const rowSelection = computed(() => ({
  selectedRowKeys: props.selectedIds,
  onChange: (keys) => emit('update:selectedIds', keys),
}))

function rowIndex(index) {
  return (props.pagination.current - 1) * props.pagination.pageSize + index + 1
}

function customRow(record) {
  return {
    class: record.id === props.activeId ? 'table-row-active' : '',
    onClick: () => emit('select', record.id),
  }
}

function onPageChange(page, pageSize) {
  emit('update:pagination', { ...props.pagination, current: page, pageSize })
}

function onPageSizeChange(_current, size) {
  emit('update:pagination', { ...props.pagination, current: 1, pageSize: size })
}
</script>

<style lang="less" scoped>
.table-layout-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 8px 12px 12px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .table-summary {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .table-toolbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-icon-btn {
    color: rgba(0, 0, 0, 0.45);

    &:hover {
      color: #1677ff;
    }
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.table-row-active) {
  td {
    background: #f0f7ff !important;
  }
}
</style>
