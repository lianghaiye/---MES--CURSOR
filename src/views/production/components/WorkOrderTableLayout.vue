<template>
  <div class="work-order-table-layout">
    <div class="toolbar-row">
      <a-space wrap :size="8">
        <slot name="toolbar" />
      </a-space>
      <a-space :size="8" class="toolbar-icons" align="center">
        <a-radio-group
          :value="layoutMode"
          button-style="solid"
          class="layout-mode-switch"
          @change="onLayoutModeChange"
        >
          <a-radio-button value="split">主从视图</a-radio-button>
          <a-radio-button value="table">列表视图</a-radio-button>
        </a-radio-group>
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="emit('refresh')">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedIds.length }}</strong> 项
          <a-button type="link" size="small" @click="emit('update:selectedIds', [])">清空</a-button>
          共计 {{ total }} 条工单
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <div :class="wrapClass">
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
            <template v-else-if="column.key === 'code'">
              <a class="link-code" @click.prevent="emit('select', record.id)">{{
                formatCell(record.code)
              }}</a>
            </template>
            <template v-else-if="column.key === 'progress'">
              <a-tag :color="statusColor(record.status)">
                {{ formatCell(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'customerName'">
              {{ formatCell(resolveWorkOrderSalesMeta(record).customerName) }}
            </template>
            <template v-else-if="column.key === 'scheduleQty'">
              <span>{{ formatScheduleProgress(record) }}</span>
              <a-tag v-if="isPartialScheduled(record)" color="processing" class="partial-tag">
                未排完
              </a-tag>
              <a-tag
                v-if="convertSideLabelOf(record)"
                :color="getWorkOrderConvertSideTagColor(convertSideLabelOf(record))"
                class="partial-tag"
              >
                {{ convertSideLabelOf(record) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'variantAttr'">
              {{ formatCell(resolveWorkOrderVariantSummary(record)) }}
            </template>
            <template v-else-if="column.key === 'planDateRange'">
              {{ formatCell(formatWorkOrderPlanDateRange(record.planDateRange)) }}
            </template>
            <template v-else-if="column.key === 'owner'">
              {{ formatCell(record.creator || record.owner) }}
            </template>
            <template v-else-if="column.key === 'urgency'">
              <a-tag :color="urgencyTagColor(record.urgency)">
                {{ urgencyLabel(record.urgency) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0" wrap>
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
                <a-button type="link" size="small" @click.stop="emit('action', 'clone', record)">
                  克隆
                </a-button>
                <a-button
                  v-if="canShowDispatchAction(record)"
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
      </div>

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
import { ReloadOutlined } from '@ant-design/icons-vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTableDensity } from '@/composables/useTableDensity'
import {
  formatWorkOrderFieldValue,
  formatWorkOrderPlanDateRange,
  resolveWorkOrderSalesMeta,
  resolveWorkOrderVariantSummary,
} from '@/utils/workOrderBasicFields'
import { formatScheduleProgress, isPartialScheduled } from '@/utils/workOrderScheduleBatch'
import {
  getWorkOrderConvertSideLabel,
  getWorkOrderConvertSideTagColor,
} from '@/utils/workOrderConvertOccupy'
import { workOrderStatusColor } from '@/utils/workOrderStatus'

const props = defineProps({
  dataSource: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  pagination: { type: Object, required: true },
  selectedIds: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
  layoutMode: { type: String, default: 'table' },
  columnSettingsKey: { type: String, default: 'work-order-list-v3' },
})

const emit = defineEmits([
  'refresh',
  'update:layoutMode',
  'select',
  'action',
  'update:pagination',
  'update:selectedIds',
])

function onLayoutModeChange(e) {
  emit('update:layoutMode', e?.target?.value ?? e)
}

const baseColumns = [
  { title: '#', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '工单编号', dataIndex: 'code', key: 'code', width: 150, ellipsis: true, fixed: 'left' },
  { title: '工单名称', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
  { title: '状态', key: 'progress', width: 90 },
  {
    title: '销售订单号',
    dataIndex: 'sourceOrderNo',
    key: 'sourceOrderNo',
    width: 130,
    ellipsis: true,
  },
  { title: '客户名称', key: 'customerName', width: 140, ellipsis: true },
  { title: '产品名称', dataIndex: 'productName', key: 'productName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantAttr',
    dataIndex: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 110, ellipsis: true },
  { title: '技术参数', dataIndex: 'techParams', key: 'techParams', width: 120, ellipsis: true },
  {
    title: '工艺路线',
    dataIndex: 'processRouteName',
    key: 'processRouteName',
    width: 120,
    ellipsis: true,
  },
  { title: '计划数量', dataIndex: 'planQty', key: 'planQty', width: 90, align: 'right' },
  {
    title: '已排产/计划',
    dataIndex: 'scheduleQty',
    key: 'scheduleQty',
    width: 130,
    align: 'right',
  },
  { title: '工作中心', dataIndex: 'workCenter', key: 'workCenter', width: 100, ellipsis: true },
  { title: '创建人', dataIndex: 'owner', key: 'owner', width: 90, ellipsis: true },
  { title: '预入仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100, ellipsis: true },
  { title: '紧急度', key: 'urgency', dataIndex: 'urgency', width: 90 },
  { title: '计划日期', key: 'planDateRange', width: 180, ellipsis: true },
  { title: '工单备注', dataIndex: 'remark', key: 'remark', width: 160, ellipsis: true },
  { title: '工单类别', dataIndex: 'orderCategory', key: 'orderCategory', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings(props.columnSettingsKey, baseColumns, { minScrollX: 2800 })

const { wrapClass } = useTableDensity(props.columnSettingsKey)

function formatCell(value) {
  return formatWorkOrderFieldValue(value)
}

function convertSideLabelOf(record) {
  return getWorkOrderConvertSideLabel(record)
}

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

function statusColor(status) {
  return workOrderStatusColor(status)
}

/** 待下发始终可下发；已下发/执行中仅未排完时可继续下发 */
function canShowDispatchAction(record) {
  if (!record) return false
  if (record.status === '待下发') return true
  if (!['已下发', '执行中'].includes(record.status)) return false
  return isPartialScheduled(record)
}

function urgencyTagColor(urgency) {
  if (urgency === '紧急' || urgency === '加急') return 'error'
  return 'default'
}

function urgencyLabel(urgency) {
  if (urgency === '紧急' || urgency === '加急') return '紧急'
  return '不紧急'
}
</script>

<style lang="less" scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  .toolbar-icons {
    color: rgba(0, 0, 0, 0.45);
  }
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

.work-order-table {
  :deep(.partial-tag) {
    margin-left: 4px;
    font-size: 12px;
    line-height: 18px;
  }

  :deep(.ant-table-tbody > tr > td) {
    cursor: pointer;
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;

    &:hover {
      color: #4096ff;
    }
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
