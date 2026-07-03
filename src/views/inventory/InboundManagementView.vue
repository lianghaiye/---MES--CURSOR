<template>
  <div class="inbound-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库状态">
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
            <a-form-item label="入库单号">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库类型">
              <a-select
                v-model:value="filters.inboundType"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="inboundTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发票号码">
              <a-input
                v-model:value="filters.invoiceNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="入库日期">
              <a-range-picker
                v-model:value="filters.inboundDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
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

    <div class="list-panel">
      <div class="toolbar-row">
        <a-space wrap :size="8">
          <a-button type="primary" size="small" @click="openCreate">
            <PlusOutlined />
            新增
          </a-button>
          <a-button size="small" @click="handleConfirmInbound">
            <CheckOutlined />
            确认入库
          </a-button>
          <a-button size="small" @click="handleBatchDelete">
            <DeleteOutlined />
            删除
          </a-button>
          <a-button size="small" @click="stubAction('批量打印')">
            <PrinterOutlined />
            批量打印
          </a-button>
          <a-dropdown>
            <a-button size="small" @click.prevent>
              批量操作
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="({ key }) => stubAction(`批量操作：${key}`)">
                <a-menu-item key="export">导出</a-menu-item>
                <a-menu-item key="import">导入</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
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
            当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
            <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
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
          :scroll="{ x: tableScrollX }"
          :pagination="false"
          :row-selection="rowSelection"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'docNo'">
              <a class="link-code" @click="goDetail(record)">{{ record.docNo }}</a>
            </template>
            <template v-else-if="column.key === 'sourceOrderNo'">
              <a v-if="record.sourceOrderNo" class="link-code" @click="goSource(record)">
                {{ record.sourceOrderNo }}
              </a>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0" wrap>
                <a-button
                  v-if="canEditInbound(record)"
                  type="link"
                  size="small"
                  @click="openEdit(record)"
                >
                  编辑
                </a-button>
                <template v-if="canApproveInbound(record)">
                  <a-button type="link" size="small" @click="handleApprovePass(record)">
                    通过
                  </a-button>
                  <a-button type="link" size="small" danger @click="handleApproveReject(record)">
                    拒绝
                  </a-button>
                </template>
                <a-button
                  v-if="canDeleteInbound(record)"
                  type="link"
                  size="small"
                  danger
                  @click="confirmDelete(record)"
                >
                  删除
                </a-button>
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
            :page-size-options="['10', '20', '50', '100']"
            :show-total="(t) => `共 ${t} 条`"
            show-quick-jumper
          />
        </div>
      </div>
    </div>

    <InboundOrderFormModal
      v-model:open="formOpen"
      :edit-record="editRecord"
      @saved="handleSearch"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'InboundManagementView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckOutlined,
  PrinterOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { filterInboundOrders } from '@/mock/inboundOrders'
import { inboundTypeOptions, inboundStatusOptions } from '@/mock/inboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  inboundOrderState,
  confirmInboundOrders,
  deleteInboundOrder,
  approveInboundOrder,
  rejectInboundOrder,
  canEditInbound,
  canDeleteInbound,
  canApproveInbound,
} from '@/store/inboundOrderStore'
import { resolveInboundSourceRoute } from '@/utils/inboundSourceLink'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import InboundOrderFormModal from './components/InboundOrderFormModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  docNo: '',
  warehouse: undefined,
  inboundType: undefined,
  invoiceNo: '',
  inboundDateRange: null,
})
const appliedFilters = ref({ ...filters, inboundDateRange: null })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const editRecord = ref(null)

const statusOpts = inboundStatusOptions.map((v) => ({ label: v, value: v }))
const inboundTypeOpts = inboundTypeOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const baseColumns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '入库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
  { title: '入库日期', dataIndex: 'inboundDate', width: 110 },
  { title: '仓库', dataIndex: 'warehouse', width: 100 },
  { title: '入库类型', dataIndex: 'inboundType', width: 100 },
  { title: '源单号', key: 'sourceOrderNo', width: 140 },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '供应商', dataIndex: 'supplier', width: 120, ellipsis: true },
  { title: '来源车间', dataIndex: 'sourceWorkshop', width: 100 },
  { title: '发票号码', dataIndex: 'invoiceNo', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 80 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
  { title: '仓管员', dataIndex: 'warehouseKeeper', width: 80 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inbound-list', baseColumns)

const filteredList = computed(() => {
  const range = appliedFilters.value.inboundDateRange
  const inboundDateRange =
    range?.length === 2 ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')] : null
  return filterInboundOrders(inboundOrderState.orders, {
    ...appliedFilters.value,
    inboundDateRange,
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已拒绝') return 'error'
  if (status === '待审批') return 'warning'
  return 'processing'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    status: undefined,
    docNo: '',
    warehouse: undefined,
    inboundType: undefined,
    invoiceNo: '',
    inboundDateRange: null,
  })
  handleSearch()
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function openCreate() {
  const page = findCreatePageByListPath('/inventory/inbound')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  editRecord.value = record
  formOpen.value = true
}

function goDetail(record) {
  router.push(`/inventory/inbound/${record.id}`)
}

function goSource(record) {
  const route = resolveInboundSourceRoute(record)
  if (route?.path) {
    router.push(route.path)
  } else {
    message.info('暂无源单跳转')
  }
}

function handleConfirmInbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择入库单')
    return
  }
  const { count, blocked } = confirmInboundOrders(selectedRowKeys.value)
  if (blocked.length) {
    message.warning(
      blocked
        .map((b) => `${b.docNo}: ${b.message}`)
        .slice(0, 3)
        .join('；'),
    )
  }
  if (count > 0) {
    message.success(`已确认入库 ${count} 条`)
    selectedRowKeys.value = []
  } else if (!blocked.length) {
    message.warning('所选单据无法确认入库')
  }
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的入库单')
    return
  }
  Modal.confirm({
    title: '确认删除所选入库单？',
    onOk: () => {
      let n = 0
      selectedRowKeys.value.forEach((id) => {
        if (deleteInboundOrder(id)) n += 1
      })
      message.success(`已删除 ${n} 条`)
      selectedRowKeys.value = []
    },
  })
}

function confirmDelete(record) {
  Modal.confirm({
    title: `确认删除入库单 ${record.docNo}？`,
    onOk: () => {
      if (deleteInboundOrder(record.id)) {
        message.success('已删除')
        selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}

function handleApprovePass(record) {
  Modal.confirm({
    title: `通过审批 ${record.docNo}？`,
    content: '通过后状态变为「待处理」，可进行确认入库。',
    onOk: () => {
      const res = approveInboundOrder(record.id)
      if (res.ok) message.success('审批已通过')
      else message.warning(res.message)
    },
  })
}

function handleApproveReject(record) {
  Modal.confirm({
    title: `拒绝入库单 ${record.docNo}？`,
    content: '拒绝后小程序入库任务将恢复为「待开始」。',
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(record.id)
      if (res.ok) message.success('已拒绝，小程序任务已恢复为待开始')
      else message.warning(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.inbound-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.list-panel,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.list-panel {
  padding: 10px 12px 12px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
    white-space: nowrap;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-input),
  :deep(.ant-select),
  :deep(.ant-picker) {
    width: 100%;
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
}

.table-card {
  padding: 0;
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
</style>
