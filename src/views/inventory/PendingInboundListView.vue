<template>
  <div class="pending-inbound-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库单号">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库类型">
              <a-select
                v-model:value="filters.inboundType"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="inboundTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="源单号">
              <a-input
                v-model:value="filters.sourceOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="材质">
              <a-input
                v-model:value="filters.material"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="创建时间">
              <a-range-picker
                v-model:value="filters.createdAtRange"
                size="small"
                style="width: 100%"
                :placeholder="['开始日期', '结束日期']"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item" label=" ">
              <a-space :size="8">
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
      <a-space wrap :size="8" class="split-action-left">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleConfirmInbound">
          <CheckOutlined />
          确认入库
        </a-button>
        <a-button size="small" danger @click="handleRefuseInbound">
          <CloseCircleOutlined />
          拒绝入库
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
      </a-space>
      <div class="split-action-right">
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
          <a-button type="text" class="layout-toggle-btn" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </div>
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
          <span class="list-title">待入库单列表</span>
          <span v-if="selectedOrderIds.length" class="selected-count"
            >已选 {{ selectedOrderIds.length }}</span
          >
        </div>
        <div class="list-body">
          <div
            v-for="row in pagedOrders"
            :key="row.id"
            class="order-card"
            :class="{ active: selectedId === row.id, checked: selectedOrderIds.includes(row.id) }"
            @click="selectOrder(row.id)"
          >
            <a-checkbox
              class="card-checkbox"
              :checked="selectedOrderIds.includes(row.id)"
              @click.stop
              @change="(e) => toggleSelectOrder(row.id, e.target.checked)"
            />
            <div class="card-content">
              <div class="card-head">
                <a-tag :color="statusColor(row.status)" class="status-tag">
                  {{ row.status }}
                </a-tag>
                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small" class="more-btn" @click.stop>
                    <EllipsisOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="({ key }) => onCardAction(key, row)">
                      <a-menu-item v-if="canEditInbound(row)" key="edit">编辑</a-menu-item>
                      <a-menu-item v-if="canConfirmInbound(row)" key="confirm"
                        >确认入库</a-menu-item
                      >
                      <a-menu-item v-if="canRefuseInbound(row)" key="refuse" danger>
                        拒绝入库
                      </a-menu-item>
                      <a-menu-item v-if="canDeleteInbound(row)" key="delete" danger>
                        删除
                      </a-menu-item>
                      <a-menu-item key="detail">打开详情</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
              <div class="card-code">{{ row.docNo }}</div>
              <div class="card-name">{{ row.inboundType }} · {{ row.warehouse || '—' }}</div>
              <div class="card-meta">
                <span>{{ inboundSourceLabel(row.sourceChannel) }}</span>
                <span class="meta-divider">·</span>
                <span>数量 {{ formatInboundQtyRatio(row, formatQty) }}</span>
              </div>
              <div v-if="row.handler || row.creator" class="card-meta">
                <span>申请人 {{ row.handler || row.creator }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="list-pagination">
          <a-pagination
            v-model:current="pagination.current"
            :total="filteredOrders.length"
            :page-size="pagination.pageSize"
            size="small"
            simple
          />
        </div>
      </div>

      <div class="detail-card">
        <InboundOrderDetailPanel
          :order-id="selectedId"
          v-model:detail-tab="detailTab"
          @confirm="selectedRecord && handleConfirmOne(selectedRecord)"
          @refuse="selectedRecord && openRefuse([selectedRecord])"
          @edit="selectedRecord && openEdit(selectedRecord)"
          @delete="selectedRecord && confirmDelete(selectedRecord)"
          @approve-pass="selectedRecord && handleApprovePass(selectedRecord)"
          @approve-reject="selectedRecord && handleApproveReject(selectedRecord)"
          @open-full="selectedRecord && goDetail(selectedRecord)"
          @print="selectedRecord && openPrintOne(selectedRecord)"
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
          <a-button size="small" @click="handleConfirmInbound">
            <CheckOutlined />
            确认入库
          </a-button>
          <a-button size="small" danger @click="handleRefuseInbound">
            <CloseCircleOutlined />
            拒绝入库
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
            <a-button type="text" @click="handleSearch">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
          <TableColumnSettingButton @click="columnDrawerOpen = true" />
        </a-space>
      </div>

      <a-alert type="info" show-icon class="summary-bar" :banner="false">
        <template #message>
          <span>
            仅展示「待入库 / 部分入库」明细，共 {{ filteredList.length }} 条；当前表格已选择
            <strong>{{ selectedOrderIds.length }}</strong> 项
            <a-button type="link" size="small" @click="selectedOrderIds = []">清空</a-button>
          </span>
        </template>
      </a-alert>

      <div class="table-card">
        <a-table
          :columns="mergedDisplayColumns"
          :data-source="pagedList"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: tableScrollX }"
          :pagination="false"
          :row-selection="rowSelection"
          :custom-row="
            (record) => ({
              onClick: () => selectOrder(record.orderId),
            })
          "
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ rowIndex(index) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'docNo'">
              <a class="link-code" @click.stop="goDetail(record)">{{ record.docNo || '—' }}</a>
            </template>
            <template v-else-if="column.key === 'inboundQtyTotal'">
              {{ record.inboundQtyTotal || '—' }}
            </template>
            <template v-else-if="column.key === 'itemName'">
              {{ record.itemName || '—' }}
            </template>
            <template v-else-if="column.key === 'itemCode'">
              {{ record.itemCode || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">
              {{ record.specModel || '—' }}
            </template>
            <template v-else-if="column.key === 'material'">
              {{ record.material || '—' }}
            </template>
            <template v-else-if="column.key === 'drawingNo'">
              {{ record.drawingNo || '—' }}
            </template>
            <template v-else-if="column.key === 'qty'">
              {{ formatQtyWithUnit(record.qty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'warehouse'">
              {{ record.warehouse || '—' }}
            </template>
            <template v-else-if="column.key === 'salesOrderNo'">
              {{ record.salesOrderNo || '—' }}
            </template>
            <template v-else-if="column.key === 'sourceOrderNo'">
              {{ record.sourceOrderNo || '—' }}
            </template>
            <template v-else-if="column.key === 'supplier'">
              {{ record.supplier || '—' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0" wrap>
                <a-button
                  v-if="canEditInbound(resolveOrder(record))"
                  type="link"
                  size="small"
                  @click.stop="openEdit(resolveOrder(record))"
                >
                  编辑
                </a-button>
                <template v-if="canApproveInbound(resolveOrder(record))">
                  <a-button
                    type="link"
                    size="small"
                    @click.stop="handleApprovePass(resolveOrder(record))"
                  >
                    通过
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click.stop="handleApproveReject(resolveOrder(record))"
                  >
                    拒绝
                  </a-button>
                </template>
                <a-button
                  v-if="canConfirmInbound(resolveOrder(record))"
                  type="link"
                  size="small"
                  @click.stop="handleConfirmOne(resolveOrder(record))"
                >
                  确认入库
                </a-button>
                <a-button
                  v-if="canRefuseInbound(resolveOrder(record))"
                  type="link"
                  size="small"
                  danger
                  @click.stop="openRefuse([resolveOrder(record)])"
                >
                  拒绝入库
                </a-button>
                <a-button
                  v-if="canDeleteInbound(resolveOrder(record))"
                  type="link"
                  size="small"
                  danger
                  @click.stop="confirmDelete(resolveOrder(record))"
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

    <InboundRefuseModal
      v-model:open="refuseModalOpen"
      :doc-nos="refuseDocNos"
      @confirm="onRefuseConfirm"
    />

    <InboundOrderPrintModal
      v-model:open="printModalOpen"
      :order="printOrder"
      :orders="printOrders"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'PendingInboundListView' }
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
  EllipsisOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { inboundTypeOptions, inboundStatusColor, inboundSourceLabel } from '@/mock/inboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  inboundOrderState,
  confirmInboundOrders,
  deleteInboundOrder,
  approveInboundOrder,
  rejectInboundOrder,
  refuseInbound,
  canEditInbound,
  canDeleteInbound,
  canApproveInbound,
  canConfirmInbound,
  canRefuseInbound,
} from '@/store/inboundOrderStore'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import InboundOrderDetailPanel from './components/InboundOrderDetailPanel.vue'
import InboundRefuseModal from './components/InboundRefuseModal.vue'
import InboundOrderPrintModal from './components/InboundOrderPrintModal.vue'
import {
  PENDING_INBOUND_STATUSES,
  PENDING_INBOUND_ORDER_MERGE_KEYS,
  flattenPendingInboundLines,
  filterPendingInboundLines,
  comparePendingInboundLinesDefault,
  buildPendingInboundLineRowSpans,
  formatInboundQtyRatio,
} from '@/utils/pendingInboundLines'

const LAYOUT_STORAGE_KEY = 'i_doms_pending_inbound_layout'

const router = useRouter()
const { openTab } = useTabs()

const layoutMode = ref(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'split')
const selectedId = ref('')
const detailTab = ref('basic')

const filters = reactive({
  docNo: '',
  inboundType: undefined,
  status: undefined,
  sourceOrderNo: '',
  itemName: '',
  itemCode: '',
  warehouse: undefined,
  specModel: '',
  material: '',
  createdAtRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedOrderIds = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const refuseModalOpen = ref(false)
const refuseTargets = ref([])
const printModalOpen = ref(false)
const printOrder = ref(null)
const printOrders = ref([])
const refuseDocNos = computed(() => (refuseTargets.value || []).map((o) => o.docNo || o.id))

const inboundTypeOpts = inboundTypeOptions.map((v) =>
  typeof v === 'string' ? { label: v, value: v } : v,
)
const statusOpts = PENDING_INBOUND_STATUSES.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const allLines = computed(() => flattenPendingInboundLines(inboundOrderState.orders))

const filteredList = computed(() =>
  [...filterPendingInboundLines(allLines.value, appliedFilters.value)].sort(
    comparePendingInboundLinesDefault,
  ),
)

const filteredOrders = computed(() => {
  const seen = new Set()
  const orders = []
  for (const line of filteredList.value) {
    const oid = line.orderId
    if (!oid || seen.has(oid)) continue
    seen.add(oid)
    const order = inboundOrderState.orders.find((o) => o.id === oid)
    if (order) orders.push(order)
  }
  return orders
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const selectedRecord = computed(
  () => inboundOrderState.orders.find((o) => o.id === selectedId.value) || null,
)

const allPageSelected = computed(
  () =>
    pagedOrders.value.length > 0 &&
    pagedOrders.value.every((row) => selectedOrderIds.value.includes(row.id)),
)
const pageIndeterminate = computed(() => {
  const n = pagedOrders.value.filter((row) => selectedOrderIds.value.includes(row.id)).length
  return n > 0 && n < pagedOrders.value.length
})

const baseColumns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', dataIndex: 'status', width: 100, fixed: 'left' },
  { title: '入库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
  { title: '入库类型', key: 'inboundType', dataIndex: 'inboundType', width: 110 },
  { title: '入库数量', key: 'inboundQtyTotal', width: 120, align: 'right' },
  { title: '物品编码', key: 'itemCode', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '物品名称', key: 'itemName', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', key: 'drawingNo', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '入库数量', key: 'qty', width: 110, align: 'right' },
  { title: '入库仓库', key: 'warehouse', dataIndex: 'warehouse', width: 100 },
  { title: '源单号', key: 'sourceOrderNo', dataIndex: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '销售单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '供应商', key: 'supplier', dataIndex: 'supplier', width: 120, ellipsis: true },
  { title: '入库日期', key: 'inboundDate', dataIndex: 'inboundDate', width: 110 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 160 },
  { title: '创建人', key: 'creator', dataIndex: 'creator', width: 80 },
  { title: '确认时间', key: 'confirmedAt', dataIndex: 'confirmedAt', width: 160 },
  { title: '确认人', key: 'confirmer', dataIndex: 'confirmer', width: 80 },
  { title: '仓管员', key: 'warehouseKeeper', dataIndex: 'warehouseKeeper', width: 80 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('pending-inbound-list-v2', baseColumns, { minScrollX: 2800 })

const pageOrderRowSpans = computed(() => buildPendingInboundLineRowSpans(pagedList.value))
const orderMergeKeySet = new Set(PENDING_INBOUND_ORDER_MERGE_KEYS)
const mergedDisplayColumns = computed(() =>
  displayColumns.value.map((col) => {
    if (!orderMergeKeySet.has(col.key)) return col
    return {
      ...col,
      customCell: (_record, index) => ({
        rowSpan: pageOrderRowSpans.value[index] ?? 1,
        style: { verticalAlign: 'middle' },
      }),
    }
  }),
)

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: pagedList.value
    .filter((r) => selectedOrderIds.value.includes(r.orderId))
    .map((r) => r.id),
  onSelect: (record, selected) => {
    toggleSelectOrder(record.orderId, selected)
  },
  onSelectAll: (selected) => {
    const pageOrderIds = [...new Set(pagedList.value.map((r) => r.orderId).filter(Boolean))]
    if (selected) {
      selectedOrderIds.value = Array.from(new Set([...selectedOrderIds.value, ...pageOrderIds]))
    } else {
      const drop = new Set(pageOrderIds)
      selectedOrderIds.value = selectedOrderIds.value.filter((id) => !drop.has(id))
    }
  },
}))

watch(
  filteredOrders,
  (list) => {
    if (!list.length) {
      selectedId.value = ''
      return
    }
    if (!list.some((o) => o.id === selectedId.value)) {
      selectedId.value = list[0].id
      detailTab.value = canEditInbound(list[0]) ? 'edit' : 'basic'
    }
  },
  { immediate: true },
)

function resolveOrder(record) {
  if (!record) return null
  const id = record.orderId || record.id
  return inboundOrderState.orders.find((o) => o.id === id) || null
}

function statusColor(status) {
  return inboundStatusColor(status)
}

function setLayoutMode(mode) {
  if (mode !== 'split' && mode !== 'table') return
  if (layoutMode.value === mode) return
  layoutMode.value = mode
  localStorage.setItem(LAYOUT_STORAGE_KEY, mode)
}

function onLayoutModeChange(e) {
  setLayoutMode(e?.target?.value ?? e)
}

function selectOrder(id) {
  if (!id) return
  selectedId.value = id
  const row = inboundOrderState.orders.find((o) => o.id === id)
  detailTab.value = canEditInbound(row) ? 'edit' : 'basic'
}

function toggleSelectOrder(id, checked) {
  if (!id) return
  if (checked) {
    if (!selectedOrderIds.value.includes(id)) {
      selectedOrderIds.value = [...selectedOrderIds.value, id]
    }
  } else {
    selectedOrderIds.value = selectedOrderIds.value.filter((k) => k !== id)
  }
}

function onToggleSelectAllPage(e) {
  const ids = pagedOrders.value.map((r) => r.id)
  if (e.target.checked) {
    selectedOrderIds.value = Array.from(new Set([...selectedOrderIds.value, ...ids]))
  } else {
    const drop = new Set(ids)
    selectedOrderIds.value = selectedOrderIds.value.filter((id) => !drop.has(id))
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

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    docNo: '',
    inboundType: undefined,
    status: undefined,
    sourceOrderNo: '',
    itemName: '',
    itemCode: '',
    warehouse: undefined,
    specModel: '',
    material: '',
    createdAtRange: null,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openPrintOne(record) {
  const order = resolveOrder(record)
  if (!order) return
  printOrder.value = order
  printOrders.value = []
  printModalOpen.value = true
}

function openPrintSelected() {
  const rows = selectedOrderIds.value.length
    ? filteredOrders.value.filter((r) => selectedOrderIds.value.includes(r.id))
    : selectedRecord.value
      ? [selectedRecord.value]
      : []
  if (!rows.length) {
    message.warning('请先选择要打印的入库单')
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

function onBatchMenu({ key }) {
  message.info(`批量操作：${key}功能开发中`)
}

function openCreate() {
  const page = findCreatePageByListPath('/inventory/inbound')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  const order = resolveOrder(record)
  if (!order?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/inbound/${order.id}/edit`,
    title: `编辑入库单 ${order.docNo || ''}`.trim(),
  })
}

function goDetail(record) {
  const order = resolveOrder(record)
  if (!order?.id) return
  const path = `/inventory/inbound/${order.id}`
  openTab(path, order.docNo || '入库单详情')
  router.push(path)
}

function handleConfirmOne(record) {
  const order = resolveOrder(record)
  if (!order) return
  Modal.confirm({
    title: `确认入库 ${order.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmInboundOrders([order.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认入库')
        handleSearch()
      }
    },
  })
}

function handleConfirmInbound() {
  if (!selectedOrderIds.value.length) {
    message.warning('请先选择入库单')
    return
  }
  const { count, blocked } = confirmInboundOrders(selectedOrderIds.value)
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
    selectedOrderIds.value = []
    handleSearch()
  } else if (!blocked.length) {
    message.warning('所选单据无法确认入库')
  }
}

function handleBatchDelete() {
  if (!selectedOrderIds.value.length) {
    message.warning('请先选择要删除的入库单')
    return
  }
  Modal.confirm({
    title: '确认删除所选入库单？',
    onOk: () => {
      let n = 0
      selectedOrderIds.value.forEach((id) => {
        if (deleteInboundOrder(id)) n += 1
      })
      message.success(`已删除 ${n} 条`)
      selectedOrderIds.value = []
      handleSearch()
    },
  })
}

function confirmDelete(record) {
  const order = resolveOrder(record)
  if (!order) return
  Modal.confirm({
    title: `确认删除入库单 ${order.docNo}？`,
    onOk: () => {
      if (deleteInboundOrder(order.id)) {
        message.success('已删除')
        selectedOrderIds.value = selectedOrderIds.value.filter((k) => k !== order.id)
        if (selectedId.value === order.id) selectedId.value = ''
        handleSearch()
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}

function handleApprovePass(record) {
  const order = resolveOrder(record)
  if (!order) return
  Modal.confirm({
    title: `通过审批 ${order.docNo}？`,
    content: '通过后状态变为「待入库」，可进行确认入库。',
    onOk: () => {
      const res = approveInboundOrder(order.id)
      if (res.ok) {
        message.success('审批已通过')
        handleSearch()
      } else message.warning(res.message)
    },
  })
}

function handleApproveReject(record) {
  const order = resolveOrder(record)
  if (!order) return
  Modal.confirm({
    title: `拒绝入库单 ${order.docNo}？`,
    content: '拒绝后小程序入库任务将恢复为「待开始」。',
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(order.id)
      if (res.ok) {
        message.success('已拒绝，小程序任务已恢复为待开始')
        handleSearch()
      } else message.warning(res.message)
    },
  })
}

function applyRefuseResult({ count, blocked }) {
  if (blocked?.length) {
    message.warning(
      blocked
        .map((b) => `${b.docNo}: ${b.message}`)
        .slice(0, 3)
        .join('；'),
    )
  }
  if (count > 0) {
    message.success(count === 1 ? '已拒绝入库' : `已拒绝入库 ${count} 条`)
    selectedOrderIds.value = []
    refuseModalOpen.value = false
    refuseTargets.value = []
    handleSearch()
  } else if (!blocked?.length) {
    message.warning('所选单据无法拒绝入库')
  }
}

function openRefuse(records) {
  const list = (records || []).filter(Boolean)
  if (!list.length) {
    message.warning('请先选择入库单')
    return
  }
  refuseTargets.value = list
  refuseModalOpen.value = true
}

function onRefuseConfirm(reason) {
  const ids = refuseTargets.value.map((o) => o.id)
  applyRefuseResult(refuseInbound(ids, { reason }))
}

function handleRefuseInbound() {
  if (!selectedOrderIds.value.length) {
    message.warning('请先选择入库单')
    return
  }
  const rows = inboundOrderState.orders.filter((o) => selectedOrderIds.value.includes(o.id))
  openRefuse(rows)
}
</script>

<style lang="less" scoped>
.pending-inbound-page {
  margin: -12px;
  padding: 12px;
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
    }

    .selected-count {
      font-size: 12px;
      color: #1677ff;
      margin-left: auto;
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
  border: 1px solid #e8eef8;
  border-radius: 6px;
  padding: 6px 8px 6px 6px;
  margin-bottom: 6px;
  cursor: pointer;
  background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);
  transition: all 0.2s;
  border-left: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border-color: #91caff;
    box-shadow: 0 1px 6px rgba(22, 119, 255, 0.12);
  }

  &.active {
    border-color: #1677ff;
    border-left-color: #1677ff;
    background: linear-gradient(180deg, #e6f4ff 0%, #f5faff 55%, #ffffff 100%);
    box-shadow: 0 1px 6px rgba(22, 119, 255, 0.16);
  }

  &.checked {
    border-color: #91caff;
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
