<template>
  <div class="outbound-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库单号">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                placeholder="请输入 出库单号"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库类型">
              <a-select
                v-model:value="filters.outboundType"
                allow-clear
                placeholder="请选择 出库类型"
                size="small"
                :options="outboundTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                placeholder="请选择 出库仓库"
                size="small"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库时间">
              <a-input-group compact class="outbound-time-filter">
                <a-select
                  v-model:value="filters.outboundTimeUnit"
                  size="small"
                  :options="outboundTimeUnitOpts"
                  style="width: 64px"
                />
                <a-range-picker
                  v-model:value="filters.outboundTimeRange"
                  size="small"
                  style="flex: 1; min-width: 0"
                  :picker="outboundTimePicker"
                  :placeholder="['开始日期', '结束日期']"
                />
              </a-input-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请部门">
              <a-select
                v-model:value="filters.requisitionDept"
                allow-clear
                placeholder="请选择 申请部门"
                size="small"
                :options="requisitionDeptOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="源单编号">
              <a-input
                v-model:value="filters.sourceOrderNo"
                allow-clear
                placeholder="请输入 源单编号"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择 状态"
                size="small"
                :options="statusOpts"
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

    <!-- 卡片视图：搜索下方独立操作条 -->
    <div v-if="layoutMode === 'split'" class="split-action-card">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleConfirmOutbound">确认出库</a-button>
        <a-button size="small" danger @click="handleRefuseOutbound">拒绝出库</a-button>
        <a-button size="small" @click="handleBatchDelete">删除</a-button>
        <a-button size="small" @click="openPrintSelected">
          <PrinterOutlined />
          打印
        </a-button>
      </a-space>
    </div>

    <!-- 卡片主从视图 -->
    <div v-if="layoutMode === 'split'" class="master-detail">
      <div class="list-card">
        <div class="list-title-row">
          <a-checkbox
            :checked="allPageSelected"
            :indeterminate="pageIndeterminate"
            @change="onToggleSelectAllPage"
          />
          <span class="list-title">出库单列表</span>
          <span v-if="selectedRowKeys.length" class="selected-count"
            >已选 {{ selectedRowKeys.length }}</span
          >
          <div class="list-title-actions">
            <a-tooltip title="刷新">
              <a-button type="text" size="small" class="layout-toggle-btn" @click="handleSearch">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="切换为列表视图">
              <a-button type="text" size="small" class="layout-toggle-btn" @click="toggleLayout">
                <TableOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>
        <div class="list-body">
          <div
            v-for="row in pagedList"
            :key="row.id"
            class="order-card"
            :class="{ active: selectedId === row.id, checked: selectedRowKeys.includes(row.id) }"
            @click="selectOrder(row.id)"
          >
            <a-checkbox
              class="card-checkbox"
              :checked="selectedRowKeys.includes(row.id)"
              @click.stop
              @change="(e) => toggleSelect(row.id, e.target.checked)"
            />
            <div class="card-content">
              <div class="card-head">
                <a-tag :color="outboundStatusColor(row.status)" class="status-tag">
                  {{ row.status }}
                </a-tag>
                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small" class="more-btn" @click.stop>
                    <EllipsisOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="({ key }) => onCardAction(key, row)">
                      <a-menu-item v-if="canEditOutbound(row)" key="edit">编辑</a-menu-item>
                      <a-menu-item v-if="canConfirm(row)" key="confirm">确认出库</a-menu-item>
                      <a-menu-item v-if="canRefuseOutbound(row)" key="refuse" danger>
                        拒绝出库
                      </a-menu-item>
                      <a-menu-item v-if="canDeleteOutbound(row)" key="delete" danger>
                        删除
                      </a-menu-item>
                      <a-menu-item key="detail">打开详情</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
              <div class="card-code">{{ row.docNo }}</div>
              <div class="card-name">{{ row.outboundType }} · {{ row.warehouse || '—' }}</div>
              <div class="card-meta">
                <span>{{ outboundSourceLabel(row.sourceChannel) }}</span>
                <span class="meta-divider">·</span>
                <span>数量 {{ formatOutboundQtyRatio(row, formatQty) }}</span>
              </div>
              <div v-if="row.requisitionDept" class="card-meta">
                <span>申请部门 {{ row.requisitionDept }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="list-pagination">
          <a-pagination
            v-model:current="pagination.current"
            :total="filteredList.length"
            :page-size="pagination.pageSize"
            size="small"
            simple
          />
        </div>
      </div>

      <div class="detail-card">
        <OutboundOrderDetailPanel
          :order-id="selectedId"
          v-model:detail-tab="detailTab"
          @approve="selectedRecord && handleApprove(selectedRecord)"
          @confirm="selectedRecord && handleConfirmOne(selectedRecord)"
          @refuse="selectedRecord && openRefuse([selectedRecord])"
          @delete="selectedRecord && confirmDelete(selectedRecord)"
          @initiate-qc="selectedRecord && handleInitiateQc(selectedRecord)"
          @print="selectedRecord && openPrintOne(selectedRecord)"
          @open-full="selectedRecord && goDetail(selectedRecord)"
          @saved="handleSearch"
        />
      </div>
    </div>

    <!-- 表格视图 -->
    <div v-else class="list-panel">
      <div class="toolbar-row">
        <a-space wrap :size="8">
          <a-button type="primary" size="small" @click="openCreate">
            <PlusOutlined />
            新增
          </a-button>
          <a-button size="small" @click="handleConfirmOutbound">
            <CheckOutlined />
            确认出库
          </a-button>
          <a-button size="small" danger @click="handleRefuseOutbound">
            <CloseCircleOutlined />
            拒绝出库
          </a-button>
          <a-button size="small" @click="stubAction('生成采购单')">
            <CheckOutlined />
            生成采购单
          </a-button>
          <a-button size="small" @click="handleBatchDelete">
            <DeleteOutlined />
            删除
          </a-button>
          <a-button size="small" @click="openPrintSelected">
            <PrinterOutlined />
            打印
          </a-button>
          <a-dropdown>
            <a-button size="small" @click.prevent>
              批量操作
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="onBatchMenu">
                <a-menu-item key="export">导出</a-menu-item>
                <a-menu-item key="import">导入</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button size="small" type="primary" ghost @click="handleBatchInitiateQc">
            发起出厂质检
          </a-button>
        </a-space>
        <a-space :size="4" class="toolbar-icons">
          <a-tooltip title="刷新">
            <a-button type="text" size="small" @click="handleSearch">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
          <a-tooltip title="切换为卡片视图">
            <a-button type="text" size="small" @click="toggleLayout">
              <AppstoreOutlined />
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
          :custom-row="
            (record) => ({
              onClick: () => selectOrder(record.id),
            })
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'docNo'">
              <a class="link-code" @click.stop="goDetail(record)">{{ record.docNo }}</a>
            </template>
            <template v-else-if="column.key === 'sourceOrderNo'">
              <a v-if="record.sourceOrderNo" class="link-code">{{ record.sourceOrderNo }}</a>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'salesOrderNo'">
              <a v-if="record.salesOrderNo" class="link-code" @click.stop="goSalesOrder(record)">
                {{ record.salesOrderNo }}
              </a>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'shipQtyTotal'">
              {{ formatOutboundQtyRatio(record, formatQty) }}
            </template>
            <template v-else-if="column.key === 'sourceChannel'">
              {{ outboundSourceLabel(record.sourceChannel) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0" wrap>
                <a-button
                  v-if="canApproveOutbound(record)"
                  type="link"
                  size="small"
                  @click.stop="handleApprove(record)"
                >
                  审批
                </a-button>
                <a-button
                  v-if="canEditOutbound(record)"
                  type="link"
                  size="small"
                  @click.stop="openEdit(record)"
                >
                  编辑
                </a-button>
                <a-button
                  v-if="canConfirm(record)"
                  type="link"
                  size="small"
                  @click.stop="handleConfirmOne(record)"
                >
                  确认出库
                </a-button>
                <a-button
                  v-if="canRefuseOutbound(record)"
                  type="link"
                  size="small"
                  danger
                  @click.stop="openRefuse([record])"
                >
                  拒绝出库
                </a-button>
                <a-button
                  v-if="canDeleteOutbound(record)"
                  type="link"
                  size="small"
                  danger
                  @click.stop="confirmDelete(record)"
                >
                  删除
                </a-button>
                <a-button
                  v-if="canInitiateFactoryQc(record)"
                  type="link"
                  size="small"
                  @click.stop="handleInitiateQc(record)"
                >
                  {{ initiateQcActionLabel(record) }}
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

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="filteredList.length"
      :selected-count="selectedRowKeys.length"
      @export="doExport"
    />

    <OutboundRefuseModal
      v-model:open="refuseModalOpen"
      :doc-nos="refuseDocNos"
      @confirm="submitRefuse"
    />

    <OutboundOrderPrintModal
      v-model:open="printModalOpen"
      :order="printOrder"
      :orders="printOrders"
    />
  </div>
</template>

<script>
export default { name: 'OutboundManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  DownOutlined,
  TableOutlined,
  AppstoreOutlined,
  EllipsisOutlined,
} from '@ant-design/icons-vue'
import { formatQty } from '@/utils/numberFormat'
import { filterOutboundOrders, formatOutboundQtyRatio } from '@/mock/outboundOrders'
import {
  outboundTypeOptions,
  outboundStatusOptions,
  outboundStatusColor,
  outboundTimeUnitOptions,
  warehouseOptions,
  requisitionDeptOptions,
  outboundSourceLabel,
  isOutboundBusinessSource,
} from '@/mock/outboundOptions'
import {
  outboundState,
  confirmOutbound,
  refuseOutbound,
  canRefuseOutbound,
  deleteOutboundOrder,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
  approveOutboundOrder,
  canApproveOutbound,
  canEditOutbound,
  canDeleteOutbound,
  validateOutboundForConfirm,
} from '@/store/outboundStore'
import { syncMaterialReqOnOutboundRefuse } from '@/store/mobileMaterialReqStore'
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { outboundExportFields } from '@/utils/exportFields/outboundExport'
import { useTabs } from '@/composables/useTabs'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import OutboundOrderDetailPanel from './components/OutboundOrderDetailPanel.vue'
import OutboundRefuseModal from './components/OutboundRefuseModal.vue'
import OutboundOrderPrintModal from './components/OutboundOrderPrintModal.vue'

const LAYOUT_STORAGE_KEY = 'i_doms_outbound_layout'

const router = useRouter()
const { openTab } = useTabs()

const layoutMode = ref(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'split')
const selectedId = ref('')
const detailTab = ref('basic')
const refuseModalOpen = ref(false)
const refuseTargets = ref([])
const printModalOpen = ref(false)
const printOrder = ref(null)
const printOrders = ref([])

const filters = reactive({
  docNo: '',
  outboundType: undefined,
  warehouse: undefined,
  requisitionDept: undefined,
  sourceOrderNo: '',
  status: undefined,
  outboundTimeUnit: 'day',
  outboundTimeRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const outboundTypeOpts = outboundTypeOptions.map((v) => ({ label: v, value: v }))
const statusOpts = outboundStatusOptions.map((v) => ({ label: v, value: v }))
const outboundTimeUnitOpts = outboundTimeUnitOptions
const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const requisitionDeptOpts = requisitionDeptOptions.map((v) => ({ label: v, value: v }))

const outboundTimePicker = computed(() => {
  if (filters.outboundTimeUnit === 'month') return 'month'
  if (filters.outboundTimeUnit === 'year') return 'year'
  return 'date'
})

const baseColumns = [
  { title: '状态', key: 'status', width: 120, fixed: 'left' },
  { title: '出库单号', key: 'docNo', dataIndex: 'docNo', width: 168, fixed: 'left' },
  { title: '出库类型', dataIndex: 'outboundType', width: 110 },
  { title: '出库仓库', dataIndex: 'warehouse', width: 100 },
  { title: '出库数量', key: 'shipQtyTotal', width: 120, align: 'right' },
  { title: '源单号', key: 'sourceOrderNo', width: 140 },
  { title: '销售订单', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '合同编号', dataIndex: 'contractNo', width: 130, ellipsis: true },
  { title: '申请部门', dataIndex: 'requisitionDept', width: 100, ellipsis: true },
  { title: '出库时间', dataIndex: 'outboundTime', width: 160 },
  { title: '来源', key: 'sourceChannel', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '创建人', dataIndex: 'creator', width: 80 },
  { title: '操作时间', dataIndex: 'auditDate', width: 160 },
  { title: '操作人', dataIndex: 'auditor', width: 80 },
  { title: '仓管员', dataIndex: 'warehouseKeeper', width: 80 },
  { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outbound-list-v6', baseColumns, { minScrollX: 2200 })

const filteredList = computed(() =>
  filterOutboundOrders(outboundState.orders, appliedFilters.value),
)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'outbound-list-v6',
  fieldDefinitions: outboundExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () => outboundState.orders.filter((o) => selectedRowKeys.value.includes(o.id)),
  fileNamePrefix: '出库管理',
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const selectedRecord = computed(
  () => outboundState.orders.find((o) => o.id === selectedId.value) || null,
)

const refuseDocNos = computed(() => (refuseTargets.value || []).map((o) => o.docNo || o.id))

const allPageSelected = computed(
  () =>
    pagedList.value.length > 0 &&
    pagedList.value.every((row) => selectedRowKeys.value.includes(row.id)),
)
const pageIndeterminate = computed(() => {
  const n = pagedList.value.filter((row) => selectedRowKeys.value.includes(row.id)).length
  return n > 0 && n < pagedList.value.length
})

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  filteredList,
  (list) => {
    if (!list.length) {
      selectedId.value = ''
      return
    }
    if (!list.some((o) => o.id === selectedId.value)) {
      selectedId.value = list[0].id
      detailTab.value = canEditOutbound(list[0]) ? 'edit' : 'basic'
    }
  },
  { immediate: true },
)

function toggleLayout() {
  layoutMode.value = layoutMode.value === 'split' ? 'table' : 'split'
  localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode.value)
}

function selectOrder(id) {
  selectedId.value = id
  const row = outboundState.orders.find((o) => o.id === id)
  detailTab.value = canEditOutbound(row) ? 'edit' : 'basic'
}

function toggleSelect(id, checked) {
  if (checked) {
    if (!selectedRowKeys.value.includes(id)) selectedRowKeys.value = [...selectedRowKeys.value, id]
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== id)
  }
}

function onToggleSelectAllPage(e) {
  const ids = pagedList.value.map((r) => r.id)
  if (e.target.checked) {
    selectedRowKeys.value = Array.from(new Set([...selectedRowKeys.value, ...ids]))
  } else {
    const drop = new Set(ids)
    selectedRowKeys.value = selectedRowKeys.value.filter((id) => !drop.has(id))
  }
}

function onCardAction(key, row) {
  if (key === 'edit') {
    selectOrder(row.id)
    detailTab.value = 'edit'
  } else if (key === 'confirm') handleConfirmOne(row)
  else if (key === 'refuse') openRefuse([row])
  else if (key === 'delete') confirmDelete(row)
  else if (key === 'detail') goDetail(row)
}

function canConfirm(record) {
  return validateOutboundForConfirm(record).ok
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    docNo: '',
    outboundType: undefined,
    warehouse: undefined,
    requisitionDept: undefined,
    sourceOrderNo: '',
    status: undefined,
    outboundTimeUnit: 'day',
    outboundTimeRange: null,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function onBatchMenu({ key }) {
  if (key === 'export') {
    openExportModal()
    return
  }
  stubAction(`批量操作：${key}`)
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function openPrintOne(record) {
  if (!record) return
  printOrder.value = record
  printOrders.value = []
  printModalOpen.value = true
}

function openPrintSelected() {
  const rows = selectedRowKeys.value.length
    ? filteredList.value.filter((r) => selectedRowKeys.value.includes(r.id))
    : selectedRecord.value
      ? [selectedRecord.value]
      : []
  if (!rows.length) {
    message.warning('请先选择要打印的出库单')
    return
  }
  if (rows.length === 1) {
    openPrintOne(rows[0])
    return
  }
  printOrder.value = null
  printOrders.value = rows
  printModalOpen.value = true
}

function openCreate() {
  const page = findCreatePageByListPath('/inventory/outbound')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  if (!record?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/outbound/${record.id}/edit`,
    title: `编辑出库单 ${record.docNo || ''}`.trim(),
  })
}

function handleApprove(record) {
  Modal.confirm({
    title: `审批通过出库单 ${record.docNo}？`,
    okText: '审批',
    onOk: () => {
      const res = approveOutboundOrder(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('审批已通过')
      handleSearch()
    },
  })
}

function handleConfirmOne(record) {
  Modal.confirm({
    title: `确认出库 ${record.docNo}？`,
    onOk: () => {
      const { count, blocked, warnings } = confirmOutbound([record.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (warnings?.length) {
        message.warning(warnings.join('；'))
      }
      if (count > 0) {
        message.success('已确认出库')
        handleSearch()
      }
    },
  })
}

function applyRefuseResult({ count, blocked, refused }) {
  ;(refused || []).forEach((order) => syncMaterialReqOnOutboundRefuse(order))
  if (blocked?.length) {
    message.warning(
      blocked
        .map((b) => `${b.docNo}: ${b.message}`)
        .slice(0, 3)
        .join('；'),
    )
  }
  if (count > 0) {
    message.success(count === 1 ? '已拒绝出库' : `已拒绝出库 ${count} 条`)
    selectedRowKeys.value = []
    refuseModalOpen.value = false
    refuseTargets.value = []
    handleSearch()
  }
}

function openRefuse(records) {
  const list = (records || []).filter(Boolean)
  if (!list.length) {
    message.warning('请先选择出库单')
    return
  }
  refuseTargets.value = list
  refuseModalOpen.value = true
}

function submitRefuse(reason) {
  const ids = refuseTargets.value.map((o) => o.id)
  applyRefuseResult(refuseOutbound(ids, { reason }))
}

function handleRefuseOutbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择出库单')
    return
  }
  const rows = outboundState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  openRefuse(rows)
}

function goDetail(record) {
  const path = `/inventory/outbound/${record.id}`
  openTab(path, record.docNo || '出库单详情')
  router.push(path)
}

function goSalesOrder(record) {
  const no = record?.salesOrderNo
  if (!no) return
  const order = findSalesOrderByOrderNo(no)
  if (!order) {
    message.info('未找到关联销售订单')
    return
  }
  const path = `/sales/orders/${order.id}`
  openTab(path, `销售订单 ${no}`)
  router.push(path)
}

function initiateQcActionLabel(record) {
  const qc = getFactoryQcById(record?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function handleConfirmOutbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择出库单')
    return
  }
  const { count, blocked, warnings } = confirmOutbound(selectedRowKeys.value)
  const qcBlocked = blocked.filter((b) => b.qcBlocked)
  if (qcBlocked.length) {
    Modal.warning({
      title: '无法确认出库',
      content: '出厂质检结果不符合出库要求，请重新发起出厂质检',
    })
  }
  const otherBlocked = blocked.filter((b) => !b.qcBlocked)
  if (otherBlocked.length) {
    message.warning(
      otherBlocked
        .map((b) => `${b.docNo}: ${b.message}`)
        .slice(0, 3)
        .join('；'),
    )
  }
  if (warnings?.length) {
    message.warning(warnings.slice(0, 3).join('；'))
  }
  if (count > 0) {
    message.success(`已确认出库 ${count} 条`)
    selectedRowKeys.value = []
  } else if (!qcBlocked.length && !otherBlocked.length) {
    message.warning('所选单据均已出库或无效')
  }
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的出库单')
    return
  }
  const rows = outboundState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  const blockedBiz = rows.filter((o) => isOutboundBusinessSource(o))
  Modal.confirm({
    title: '确认删除所选出库单？',
    content: blockedBiz.length
      ? `其中 ${blockedBiz.length} 条为业务来源，不支持删除，将自动跳过。`
      : undefined,
    onOk: () => {
      let n = 0
      selectedRowKeys.value.forEach((id) => {
        if (deleteOutboundOrder(id)) n += 1
      })
      if (n > 0) message.success(`已删除 ${n} 条`)
      else message.warning('没有可删除的单据（业务来源或状态不允许）')
      selectedRowKeys.value = []
    },
  })
}

function confirmDelete(record) {
  if (!canDeleteOutbound(record)) {
    message.warning(
      isOutboundBusinessSource(record) ? '业务来源出库单不支持删除' : '当前状态不可删除',
    )
    return
  }
  Modal.confirm({
    title: `确认删除出库单 ${record.docNo}？`,
    onOk: () => {
      if (deleteOutboundOrder(record.id)) {
        message.success('已删除')
        selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
        if (selectedId.value === record.id) selectedId.value = ''
      }
    },
  })
}

function handleInitiateQc(record) {
  const result = initiateFactoryQcFromOutbound(record.id)
  if (result.ok) {
    message.success(result.message || '已在出厂质检生成待质检记录')
  } else {
    message.warning(result.message)
  }
}

function handleBatchInitiateQc() {
  const ids = selectedRowKeys.value.length ? selectedRowKeys.value : []
  if (!ids.length) {
    message.warning('请先勾选要发起出厂质检的销售出库单')
    return
  }
  let ok = 0
  const errors = []
  ids.forEach((id) => {
    const record = outboundState.orders.find((o) => o.id === id)
    if (!canInitiateFactoryQc(record)) {
      errors.push(record?.docNo || id)
      return
    }
    const result = initiateFactoryQcFromOutbound(id)
    if (result.ok) ok += 1
    else errors.push(`${record?.docNo}: ${result.message}`)
  })
  if (ok) message.success(`成功发起 ${ok} 条出厂质检`)
  if (errors.length) message.warning(errors.slice(0, 3).join('；'))
}
</script>

<style lang="less" scoped>
.outbound-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.list-panel,
.table-card,
.list-card,
.detail-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.split-action-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px 12px;
  margin-bottom: 8px;
  box-sizing: border-box;

  :deep(.ant-space) {
    align-items: center;
  }

  :deep(.ant-btn) {
    display: inline-flex;
    align-items: center;
  }
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

    &::after {
      margin-inline: 2px 6px;
    }
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

  .toolbar-icons {
    color: rgba(0, 0, 0, 0.45);
  }
}

.summary-bar {
  margin-bottom: 8px;
  padding: 0;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  padding: 0;

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

  :deep(.ant-table-cell-fix-right) {
    background: #fff;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 4px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

:deep(.ant-table-wrapper .ant-btn-link) {
  padding: 0 4px;
  height: auto;
}

.outbound-time-filter {
  display: flex;
  width: 100%;

  :deep(.ant-picker) {
    flex: 1;
    min-width: 0;
  }
}

.master-detail {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-height: 520px;
}

.list-card {
  width: 22%;
  min-width: 240px;
  max-width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);

  .list-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid #f0f0f0;

    .list-title {
      font-weight: 600;
      font-size: 14px;
      flex: 1;
    }

    .selected-count {
      font-size: 12px;
      color: #1677ff;
    }

    .list-title-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
    }

    .layout-toggle-btn {
      color: rgba(0, 0, 0, 0.45);

      &:hover {
        color: #1677ff;
      }
    }
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }

  .list-pagination {
    padding: 6px 8px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
  }
}

.detail-card {
  flex: 1;
  min-width: 0;
  padding: 8px 12px 10px;
  max-height: calc(100vh - 220px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.order-card {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px 8px 6px 6px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  border-left: 2px solid transparent;

  &:hover {
    border-color: #d6e4ff;
    box-shadow: 0 1px 4px rgba(22, 119, 255, 0.08);
  }

  &.active {
    border-color: #91caff;
    border-left-color: #1677ff;
    background: #f0f7ff;
  }

  &.checked {
    background: #fafcff;
  }

  .card-checkbox {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .status-tag {
      margin: 0;
      line-height: 18px;
      font-size: 12px;
      padding-inline: 6px;
    }

    .more-btn {
      padding: 0 2px;
      height: 22px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .card-code {
    font-weight: 600;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }

  .card-name {
    margin-top: 2px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
  }

  .card-meta {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);

    .meta-divider {
      margin: 0 4px;
    }
  }
}

@media (max-width: 960px) {
  .master-detail {
    flex-direction: column;
  }

  .list-card {
    width: 100%;
    max-width: none;
    max-height: 360px;
  }

  .detail-card {
    max-height: none;
  }
}
</style>
