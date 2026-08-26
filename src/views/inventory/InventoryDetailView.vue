<template>
  <div class="inventory-detail-page">
    <a-tabs v-model:activeKey="viewTab" size="small" class="view-tabs">
      <a-tab-pane key="ledger" tab="库存台账" />
      <a-tab-pane key="batches" tab="按批次查询" />
    </a-tabs>

    <template v-if="viewTab === 'ledger'">
      <div class="filter-card">
        <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="所属仓库">
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
              <a-form-item label="类型">
                <a-select
                  v-model:value="filters.materialType"
                  allow-clear
                  placeholder="请选择"
                  size="small"
                  :options="materialTypeOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="产品编码">
                <a-input
                  v-model:value="filters.itemCode"
                  allow-clear
                  placeholder="编码 / SKU / 产品族"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="产品名称">
                <a-input
                  v-model:value="filters.itemName"
                  allow-clear
                  placeholder="请输入"
                  size="small"
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
              <a-form-item label="图号">
                <a-input
                  v-model:value="filters.drawingNo"
                  allow-clear
                  placeholder="请输入"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="库存数量">
                <a-space :size="4">
                  <a-input-number
                    v-model:value="filters.stockQtyMin"
                    size="small"
                    placeholder="最小值"
                    :min="0"
                    style="width: 100px"
                  />
                  <span>—</span>
                  <a-input-number
                    v-model:value="filters.stockQtyMax"
                    size="small"
                    placeholder="最大值"
                    :min="0"
                    style="width: 100px"
                  />
                </a-space>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
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

      <div class="toolbar-row">
        <a-dropdown>
          <a-button size="small" @click.prevent>
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onBatchMenu">
              <a-menu-item key="export">导出</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
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
            · 查销售单挂批请用「按批次查询」
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
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ rowIndex(index) }}
            </template>
            <template v-else-if="column.key === 'materialType'">
              {{ record.materialType || '—' }}
            </template>
            <template v-else-if="column.key === 'weight'">
              {{ formatInventoryWeight(record.weight) }}
            </template>
            <template v-else-if="column.key === 'stockQty'">
              {{ formatInventoryQtyWithUnit(record.stockQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'softAllocated'">
              {{ formatInventoryQtyWithUnit(record.softAllocated, record.unit) }}
            </template>
            <template v-else-if="column.key === 'availableQty'">
              {{ formatInventoryQtyWithUnit(record.availableQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'dedicatedQty'">
              {{ formatInventoryQtyWithUnit(record.dedicatedQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'unitPrice'">
              {{ formatInventoryMoney(record.unitPrice) }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              {{ formatInventoryMoney(record.totalAmount) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a @click="openBatchDrawer(record)">查看批次</a>
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
    </template>

    <template v-else>
      <div class="filter-card">
        <a-form :model="batchFilters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="销售订单号">
                <a-input
                  v-model:value="batchFilters.salesOrderNo"
                  allow-clear
                  placeholder="按销售单号筛选"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="批次号">
                <a-input
                  v-model:value="batchFilters.batchNo"
                  allow-clear
                  placeholder="批次号"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="产品编码">
                <a-input
                  v-model:value="batchFilters.itemCode"
                  allow-clear
                  placeholder="产品编码"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="产品名称">
                <a-input
                  v-model:value="batchFilters.itemName"
                  allow-clear
                  placeholder="产品名称"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="规格型号">
                <a-input
                  v-model:value="batchFilters.specModel"
                  allow-clear
                  placeholder="规格型号"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="材质">
                <a-input
                  v-model:value="batchFilters.material"
                  allow-clear
                  placeholder="材质"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="仓库">
                <a-select
                  v-model:value="batchFilters.warehouse"
                  allow-clear
                  placeholder="请选择"
                  size="small"
                  :options="warehouseOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="归属">
                <a-select
                  v-model:value="batchFilters.ownership"
                  allow-clear
                  placeholder="全部"
                  size="small"
                  :options="ownershipOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item>
                <a-space>
                  <a-button type="primary" size="small" @click="handleBatchSearch">搜索</a-button>
                  <a-button size="small" @click="handleBatchReset">清空</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>
      <div class="table-card">
        <a-table
          :columns="batchQueryColumns"
          :data-source="filteredBatchRows"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1200 }"
          :pagination="{ pageSize: 15 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ownership'">
              <a-tag :color="record.salesOrderNo ? 'blue' : 'default'">
                {{ record.salesOrderNo ? '按单' : '自由备货' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatBatchTime(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'currentLength'">
              {{ formatInventoryQty(record.currentLength) }}
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <a-drawer
      v-model:open="batchDrawerOpen"
      :title="batchDrawerTitle"
      width="1280"
      destroy-on-close
    >
      <div v-if="batchDrawerRow" class="batch-soft-summary">
        <span
          >在库合计
          <b>{{ formatInventoryQtyWithUnit(drawerBatchStockTotal, batchDrawerRow.unit) }}</b></span
        >
        <span class="soft-sep">|</span>
        <span>
          软占用（物料级）
          <a v-if="drawerItemSoftAllocated > 0" class="soft-link" @click="openSoftAllocDetail">
            {{ formatInventoryQtyWithUnit(drawerItemSoftAllocated, batchDrawerRow.unit) }}
          </a>
          <b v-else>{{ formatInventoryQtyWithUnit(0, batchDrawerRow.unit) }}</b>
          <a-button
            v-if="drawerItemSoftAllocated > 0"
            type="link"
            size="small"
            class="soft-detail-btn"
            @click="openSoftAllocDetail"
          >
            查看占用明细
          </a-button>
        </span>
        <span class="soft-sep">|</span>
        <span
          >可用约
          <b>{{
            formatInventoryQtyWithUnit(drawerItemAvailableApprox, batchDrawerRow.unit)
          }}</b></span
        >
      </div>

      <a-tabs v-model:activeKey="drawerInnerTab" size="small" class="batch-drawer-tabs">
        <a-tab-pane key="batches" tab="批次明细">
          <div class="batch-drawer-toolbar">
            <a-radio-group v-model:value="drawerBatchScope" size="small" button-style="solid">
              <a-radio-button value="inStock">仅在库</a-radio-button>
              <a-radio-button value="all">含已出库</a-radio-button>
            </a-radio-group>
            <span class="fifo-hint">排序：{{ drawerIssueRuleLabel }}</span>
          </div>
          <a-alert
            type="info"
            show-icon
            class="batch-soft-tip"
            message="本页为批次快照：按当前出库规则排序（余料优先 → 批次号先进先出/后进先出）。一物一码批次可展开查看在库件码；有结算过磅的批次会显示件数/过磅总重/批次单重（按批次覆盖换算记录，不进主数据）。出入库痕迹请看「物料流水」。"
          />
          <a-table
            :columns="drawerBatchColumns"
            :data-source="drawerBatches"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: drawerBatchTableScrollX }"
            :expandable="drawerBatchExpandable"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'fifoIndex'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.key === 'ownership'">
                <a-tag :color="record.salesOrderNo ? 'blue' : 'default'">
                  {{ record.salesOrderNo ? '按单' : '自由备货' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatBatchTime(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'remnant'">
                <a-tag v-if="isRemnantBatch(record)" color="orange">余料</a-tag>
                <span v-else class="muted">—</span>
              </template>
              <template v-else-if="column.key === 'pieceManage'">
                <template v-if="isPieceManagedBatch(record)">
                  <a-tag color="purple">一物一码</a-tag>
                  <span class="piece-count">{{ pieceCountOf(record) }} 件</span>
                </template>
                <span v-else class="muted">—</span>
              </template>
              <template v-else-if="column.key === 'currentLength'">
                {{
                  formatInventoryQtyWithUnit(
                    record.currentLength,
                    record.unit || batchDrawerRow?.unit,
                  )
                }}
              </template>
              <template v-else-if="column.key === 'convertPieceCount'">
                {{ formatConvertPieceCount(record) }}
              </template>
              <template v-else-if="column.key === 'convertSettleQty'">
                {{ formatConvertSettleQty(record) }}
              </template>
              <template v-else-if="column.key === 'convertActualUnitWeight'">
                {{ formatConvertActualUnitWeight(record) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === '在库' ? 'green' : 'default'">
                  {{ record.status || '—' }}
                </a-tag>
              </template>
            </template>
            <template #expandedRowRender="{ record }">
              <div v-if="isPieceManagedBatch(record)" class="batch-expand">
                <div class="expand-title">在库件码（FIFO 件序）</div>
                <a-table
                  v-if="inStockPiecesOfBatch(record).length"
                  size="small"
                  bordered
                  row-key="id"
                  :pagination="false"
                  :columns="drawerPieceColumns"
                  :data-source="inStockPiecesOfBatch(record)"
                >
                  <template #bodyCell="{ column, record: piece }">
                    <template v-if="column.key === 'pieceQty'">
                      {{ formatInventoryQtyWithUnit(piece.pieceQty, piece.unit || record.unit) }}
                    </template>
                    <template v-else-if="column.key === 'remnant'">
                      <a-tag v-if="piece.remnant" color="orange">余料</a-tag>
                      <span v-else class="muted">—</span>
                    </template>
                    <template v-else-if="column.key === 'createdAt'">
                      {{ formatBatchTime(piece.createdAt) }}
                    </template>
                  </template>
                </a-table>
                <div v-else class="expand-empty">暂无在库件码</div>
              </div>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="flow" tab="物料流水">
          <div class="batch-drawer-toolbar">
            <a-input
              v-model:value="drawerFlowBatchNo"
              allow-clear
              size="small"
              placeholder="按批次号筛选"
              style="width: 180px"
            />
            <a-select
              v-model:value="drawerFlowType"
              allow-clear
              size="small"
              placeholder="流水类型"
              style="width: 120px"
              :options="drawerFlowTypeOpts"
            />
            <span class="fifo-hint">按时间倒序，含入库建批与出库扣减</span>
          </div>
          <a-alert
            type="info"
            show-icon
            class="batch-soft-tip"
            message="本页为 FIFO 相关物料流水：入库来自批次建档，出库来自出库单批次分配；件码出库痕迹一并列出。"
          />
          <a-table
            :columns="drawerFlowColumns"
            :data-source="drawerFlowRows"
            row-key="id"
            size="small"
            bordered
            :pagination="{ pageSize: 15, size: 'small' }"
            :scroll="{ x: 1200 }"
            :locale="{ emptyText: '暂无流水记录' }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'flowType'">
                <a-tag :color="record.flowType === 'inbound' ? 'cyan' : 'orange'">
                  {{ record.flowType === 'inbound' ? '入库' : '出库' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'occurredAt'">
                {{ formatBatchTime(record.occurredAt) }}
              </template>
              <template v-else-if="column.key === 'qty'">
                {{ formatInventoryQtyWithUnit(record.qty, record.unit || batchDrawerRow?.unit) }}
              </template>
              <template v-else-if="column.key === 'docNo'">
                <a
                  v-if="record.flowType === 'outbound' && record.orderId"
                  @click="goOutboundDetail(record.orderId)"
                >
                  {{ record.docNo || '—' }}
                </a>
                <span v-else>{{ record.docNo || '—' }}</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>

    <a-modal
      v-model:open="softAllocDetailOpen"
      :title="softAllocDetailTitle"
      :footer="null"
      width="860px"
      destroy-on-close
    >
      <a-table
        :columns="softAllocDetailColumns"
        :data-source="softAllocDetailRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'salesOrderNo'">
            <a v-if="record.salesOrderId" @click="goSalesOrderDetail(record.salesOrderId)">
              {{ record.salesOrderNo || record.salesOrderId }}
            </a>
            <span v-else>{{ record.salesOrderNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ formatInventoryQtyWithUnit(record.qty, batchDrawerRow?.unit) }}
          </template>
        </template>
      </a-table>
      <a-empty v-if="!softAllocDetailRows.length" description="暂无软占用记录" />
    </a-modal>

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
  </div>
</template>

<script>
export default { name: 'InventoryDetailView' }
</script>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { stockState } from '@/store/stockStore'
import { listBatches, stockBatchState, BATCH_STATUS } from '@/store/stockBatchStore'
import { isPieceManagedBatch, listStockPieces, stockPieceState } from '@/store/stockPieceStore'
import { outboundState } from '@/store/outboundStore'
import { getOutboundIssueRule, OUTBOUND_ISSUE_RULE_OPTIONS } from '@/store/functionParamStore'
import { sortBatchesByIssueRule } from '@/utils/outboundBatchAllocate'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  getSoftAllocatedQtyByItemCode,
  listSoftAllocationsByItemCode,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import { inventoryDetailExportFields } from '@/utils/exportFields/inventoryDetailExport'
import {
  buildInventoryDetailLines,
  filterInventoryDetailLines,
  formatInventoryMoney,
  formatInventoryQty,
  formatInventoryQtyWithUnit,
  formatInventoryWeight,
  inventoryMaterialTypeOptions,
} from '@/utils/inventoryDetailLines'
import { hasBatchUomConvert } from '@/utils/batchUomConvert'
import { formatQtyWithUnit, formatQty } from '@/utils/numberFormat'
import {
  CASTING_BLANK_SETTLE_CODE,
  STEEL_PIPE_CODE,
  STEEL_PLATE_CODE,
  STEEL_WEIGHT_BAR_CODE,
} from '@/mock/stockBatchSeed'

/** 库存台账置顶演示料（按批次覆盖 / 双单位），方便原型验收一眼看到 */
const DEMO_STOCK_PIN_CODES = [
  CASTING_BLANK_SETTLE_CODE,
  STEEL_PIPE_CODE,
  STEEL_PLATE_CODE,
  STEEL_WEIGHT_BAR_CODE,
]

function demoStockPinRank(itemCode) {
  const i = DEMO_STOCK_PIN_CODES.indexOf(String(itemCode || ''))
  return i === -1 ? DEMO_STOCK_PIN_CODES.length + 1 : i
}

const route = useRoute()
const router = useRouter()
const viewTab = ref('ledger')
const filters = reactive({
  warehouse: undefined,
  materialType: undefined,
  itemCode: '',
  itemName: '',
  specModel: '',
  material: '',
  drawingNo: '',
  stockQtyMin: undefined,
  stockQtyMax: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const materialTypeOpts = inventoryMaterialTypeOptions.map((v) => ({ label: v, value: v }))

const batchFilters = reactive({
  salesOrderNo: '',
  batchNo: '',
  itemCode: '',
  itemName: '',
  specModel: '',
  material: '',
  warehouse: undefined,
  ownership: undefined,
})
const appliedBatchFilters = ref({ ...batchFilters })

const batchDrawerOpen = ref(false)
const batchDrawerRow = ref(null)
/** batches | flow */
const drawerInnerTab = ref('batches')
/** inStock | all */
const drawerBatchScope = ref('inStock')
const drawerFlowBatchNo = ref('')
const drawerFlowType = ref(undefined)
const drawerFlowTypeOpts = [
  { label: '入库', value: 'inbound' },
  { label: '出库', value: 'outbound' },
]

const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const ownershipOpts = [
  { label: '按单', value: 'dedicated' },
  { label: '自由备货', value: 'free' },
]

function sumDedicatedOnHand(warehouse, itemCode) {
  return listBatches({ warehouse, itemCode, inStockOnly: true }).reduce((s, b) => {
    if (!b.salesOrderId && !b.salesOrderNo) return s
    return s + (Number(b.currentLength) || 0)
  }, 0)
}

const allLines = computed(() => {
  void stockBatchState.batches
  const base = buildInventoryDetailLines({
    stockRecords: stockState.records,
    products: productInfoState.products,
    materials: materialInfoState.materials,
    spus: [],
    warehouses: warehouseOptions.map((w) => w.value),
  })
  const rows = base.map((row) => {
    const softAllocated = getSoftAllocatedQtyByItemCode(row.itemCode)
    const stockQty = Number(row.stockQty) || 0
    const dedicatedQty = sumDedicatedOnHand(row.warehouse, row.itemCode)
    return {
      ...row,
      softAllocated,
      availableQty: Math.max(0, stockQty - softAllocated),
      dedicatedQty,
    }
  })
  // 演示料置顶：结算按批次覆盖（铸件）优先，便于不搜索即可验收
  return rows.sort((a, b) => {
    const ra = demoStockPinRank(a.itemCode)
    const rb = demoStockPinRank(b.itemCode)
    if (ra !== rb) return ra - rb
    const wh = String(a.warehouse || '').localeCompare(String(b.warehouse || ''), 'zh')
    if (wh !== 0) return wh
    return String(a.itemCode || '').localeCompare(String(b.itemCode || ''), 'zh')
  })
})

const filteredList = computed(() =>
  filterInventoryDetailLines(allLines.value, appliedFilters.value),
)

const filteredBatchRows = computed(() => {
  void stockBatchState.batches
  void productInfoState.products
  void materialInfoState.materials
  const f = appliedBatchFilters.value
  const nameKw = String(f.itemName || '')
    .trim()
    .toLowerCase()
  const specKw = String(f.specModel || '')
    .trim()
    .toLowerCase()
  const materialKw = String(f.material || '')
    .trim()
    .toLowerCase()
  return listBatches({ inStockOnly: false }).filter((b) => {
    if (b.status !== BATCH_STATUS.IN_STOCK) return false
    if (f.salesOrderNo && !String(b.salesOrderNo || '').includes(String(f.salesOrderNo).trim())) {
      return false
    }
    if (f.batchNo && !String(b.batchNo || '').includes(String(f.batchNo).trim())) return false
    if (f.itemCode && !String(b.itemCode || '').includes(String(f.itemCode).trim())) return false
    if (
      nameKw &&
      !String(b.itemName || '')
        .toLowerCase()
        .includes(nameKw)
    )
      return false
    if (specKw || materialKw) {
      const meta = resolveBatchSpecMaterial(b)
      if (
        specKw &&
        !String(meta.specModel || '')
          .toLowerCase()
          .includes(specKw)
      )
        return false
      if (
        materialKw &&
        !String(meta.material || '')
          .toLowerCase()
          .includes(materialKw)
      )
        return false
    }
    if (f.warehouse && b.warehouse !== f.warehouse) return false
    if (f.ownership === 'dedicated' && !(b.salesOrderId || b.salesOrderNo)) return false
    if (f.ownership === 'free' && (b.salesOrderId || b.salesOrderNo)) return false
    return true
  })
})

function resolveBatchSpecMaterial(batch) {
  const attrs = batch?.attrs || {}
  let specModel = attrs.specModel || attrs.spec || ''
  let material = attrs.material || ''
  if (specModel && material) return { specModel, material }
  const code = batch?.itemCode
  if (!code) return { specModel, material }
  const product = productInfoState.products.find((p) => p.code === code)
  const mat = materialInfoState.materials.find((m) => m.code === code)
  const master = product || mat
  if (!specModel) specModel = master?.specModel || master?.spec || ''
  if (!material) material = master?.material || ''
  return { specModel, material }
}

const batchQueryColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '入库时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '归属', key: 'ownership', width: 96 },
  { title: '销售订单号', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 130 },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '产品编码', dataIndex: 'itemCode', key: 'itemCode', width: 130 },
  { title: '产品名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 64 },
  { title: '在库数量', key: 'currentLength', width: 100, align: 'right' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 140 },
]

const drawerBatchColumns = computed(() => {
  const cols = [
    { title: 'FIFO序', key: 'fifoIndex', width: 64, align: 'center', fixed: 'left' },
    { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140, fixed: 'left' },
    { title: '入库时间', key: 'createdAt', width: 150 },
    { title: '余料', key: 'remnant', width: 72 },
    { title: '归属', key: 'ownership', width: 88 },
    { title: '销售订单号', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 130 },
    { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
    { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 130 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 56 },
    { title: '在库数量', key: 'currentLength', width: 100, align: 'right' },
  ]
  if (drawerHasUomConvert.value) {
    cols.push(
      { title: '件数', key: 'convertPieceCount', width: 72, align: 'right' },
      { title: '过磅总重', key: 'convertSettleQty', width: 110, align: 'right' },
      { title: '批次单重', key: 'convertActualUnitWeight', width: 110, align: 'right' },
    )
  }
  cols.push(
    { title: '件码', key: 'pieceManage', width: 110 },
    { title: '状态', key: 'status', width: 72 },
  )
  return cols
})

const drawerBatchTableScrollX = computed(() => (drawerHasUomConvert.value ? 1600 : 1280))

const drawerPieceColumns = [
  { title: '件码', dataIndex: 'serialNo', key: 'serialNo', width: 160 },
  { title: '数量', key: 'pieceQty', width: 100, align: 'right' },
  { title: '余料', key: 'remnant', width: 72 },
  { title: '入库时间', key: 'createdAt', width: 150 },
  { title: '来源件码', dataIndex: 'remnantFromSerialNo', key: 'remnantFromSerialNo', width: 140 },
]

const drawerFlowColumns = [
  { title: '类型', key: 'flowType', width: 72 },
  { title: '发生时间', key: 'occurredAt', width: 150 },
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 140 },
  { title: '数量', key: 'qty', width: 100, align: 'right' },
  { title: '件码', dataIndex: 'pieceSerialNos', key: 'pieceSerialNos', width: 180, ellipsis: true },
  { title: '单据类型', dataIndex: 'docType', key: 'docType', width: 100 },
  { title: '单据号', key: 'docNo', width: 140 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 160, ellipsis: true },
]

const softAllocDetailColumns = [
  { title: '销售订单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 150 },
  { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 140, ellipsis: true },
  { title: '销售行', dataIndex: 'salesLineId', key: 'salesLineId', width: 160, ellipsis: true },
  { title: '占用数量', key: 'qty', width: 100, align: 'right' },
  { title: '交期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 120 },
  { title: '占用时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
]

const batchDrawerTitle = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return '批次明细'
  return `批次 · ${r.warehouse || ''} / ${r.itemCode || ''}`
})

const drawerBatches = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return []
  void stockBatchState.batches
  const list = listBatches({
    warehouse: r.warehouse,
    itemCode: r.itemCode,
    inStockOnly: drawerBatchScope.value === 'inStock',
  })
  return sortBatchesByIssueRule(list, getOutboundIssueRule())
})

const drawerHasUomConvert = computed(() => drawerBatches.value.some((b) => hasBatchUomConvert(b)))

function formatConvertPieceCount(batch) {
  if (!hasBatchUomConvert(batch)) return '—'
  return formatQty(batch.uomConvert.pieceCount)
}

function formatConvertSettleQty(batch) {
  if (!hasBatchUomConvert(batch)) return '—'
  return formatQtyWithUnit(batch.uomConvert.settleQty, batch.uomConvert.settleUnit)
}

function formatConvertActualUnitWeight(batch) {
  if (!hasBatchUomConvert(batch)) return '—'
  const u = batch.uomConvert.settleUnit
  const stockU = batch.uomConvert.stockUnit || batch.unit || '件'
  return `${formatQty(batch.uomConvert.actualUnitWeight)} ${u}/${stockU}`
}

const drawerBatchStockTotal = computed(() =>
  drawerBatches.value
    .filter((b) => b.status === BATCH_STATUS.IN_STOCK)
    .reduce((s, b) => s + (Number(b.currentLength) || 0), 0),
)

const drawerIssueRuleLabel = computed(() => {
  const rule = getOutboundIssueRule()
  const hit = OUTBOUND_ISSUE_RULE_OPTIONS.find((o) => o.value === rule)
  return hit?.label || '先进先出'
})

const drawerBatchExpandable = computed(() => ({
  rowExpandable: (record) => isPieceManagedBatch(record),
  /** 非一物一码不渲染展开图标，避免空加号 */
  expandIcon: ({ expanded, onExpand, record }) => {
    if (!isPieceManagedBatch(record)) return null
    return h('button', {
      type: 'button',
      class: [
        'ant-table-row-expand-icon',
        expanded ? 'ant-table-row-expand-icon-expanded' : 'ant-table-row-expand-icon-collapsed',
      ],
      'aria-label': expanded ? '关闭行' : '展开行',
      onClick: (e) => {
        e.stopPropagation()
        onExpand(record, e)
      },
    })
  },
}))

/** 本物料全部批次（含已出库），供流水拼装 */
const drawerAllBatchesForItem = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return []
  void stockBatchState.batches
  return listBatches({
    warehouse: r.warehouse,
    itemCode: r.itemCode,
    inStockOnly: false,
  })
})

const drawerFlowRows = computed(() => {
  const r = batchDrawerRow.value
  if (!r) return []
  void stockBatchState.batches
  void stockPieceState.pieces
  void outboundState.orders

  const batchNoFilter = String(drawerFlowBatchNo.value || '')
    .trim()
    .toLowerCase()
  const typeFilter = drawerFlowType.value
  const batches = drawerAllBatchesForItem.value
  const batchIdSet = new Set(batches.map((b) => b.id))
  const batchNoSet = new Set(batches.map((b) => String(b.batchNo || '')).filter(Boolean))
  const outQtyByBatchKey = new Map()
  const rows = []

  for (const order of outboundState.orders || []) {
    for (const line of order.lineItems || []) {
      const allocs = Array.isArray(line.batchAllocations) ? line.batchAllocations : []
      for (const a of allocs) {
        const matchId = a.batchId && batchIdSet.has(a.batchId)
        const matchNo = a.batchNo && batchNoSet.has(a.batchNo)
        if (!matchId && !matchNo) continue
        const key = a.batchId || a.batchNo
        outQtyByBatchKey.set(key, (outQtyByBatchKey.get(key) || 0) + (Number(a.qty) || 0))
        const serials = Array.isArray(a.pieceSerialNos)
          ? a.pieceSerialNos.join('、')
          : a.pieceSerialNos || line.issuedPieceSerialNos || ''
        rows.push({
          id: `out-${order.id}-${line.id || line.lineId || ''}-${a.batchId || a.batchNo}-${rows.length}`,
          flowType: 'outbound',
          occurredAt: order.outboundTime || order.confirmedAt || order.updatedAt || order.createdAt,
          batchNo: a.batchNo || '',
          qty: Number(a.qty) || 0,
          unit: a.unit || line.unit || r.unit || '',
          pieceSerialNos: serials || '—',
          docType: order.outboundType || '出库',
          docNo: order.docNo || order.outboundNo || '',
          orderId: order.id,
          remark: order.status ? `单据状态：${order.status}` : '',
        })
      }
    }
  }

  for (const batch of batches) {
    const outQty =
      (batch.id && outQtyByBatchKey.get(batch.id)) ||
      (batch.batchNo && outQtyByBatchKey.get(batch.batchNo)) ||
      0
    const remain = Number(batch.currentLength) || 0
    const inboundQty = Math.round((remain + Number(outQty) || 0) * 10000) / 10000 || remain
    rows.push({
      id: `in-batch-${batch.id}`,
      flowType: 'inbound',
      occurredAt: batch.createdAt,
      batchNo: batch.batchNo || '',
      qty: inboundQty,
      unit: batch.unit || r.unit || '',
      pieceSerialNos: '—',
      docType: batch.sourceType || '入库',
      docNo: batch.sourceDocNo || '',
      orderId: '',
      remark: isRemnantBatch(batch)
        ? `余料建批${batch.attrs?.remnantFrom ? `（来自 ${batch.attrs.remnantFrom}）` : ''}`
        : '批次建档',
    })

    const issuedPieces = listStockPieces({ batchId: batch.id }).filter(
      (p) => p.status === '已出库' && p.issuedAt,
    )
    for (const p of issuedPieces) {
      const already = rows.some(
        (row) =>
          row.flowType === 'outbound' &&
          row.batchNo === batch.batchNo &&
          String(row.pieceSerialNos || '').includes(p.serialNo),
      )
      if (already) continue
      rows.push({
        id: `out-piece-${p.id}`,
        flowType: 'outbound',
        occurredAt: p.issuedAt,
        batchNo: batch.batchNo || '',
        qty: Number(p.pieceQty) || 0,
        unit: p.unit || batch.unit || r.unit || '',
        pieceSerialNos: p.serialNo || '—',
        docType: '件码出库',
        docNo: p.issueDocNo || '',
        orderId: '',
        remark: p.remnant ? '余料件出库' : '',
      })
    }
  }

  return rows
    .filter((row) => {
      if (typeFilter && row.flowType !== typeFilter) return false
      if (
        batchNoFilter &&
        !String(row.batchNo || '')
          .toLowerCase()
          .includes(batchNoFilter)
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const ta = dayjs(a.occurredAt || 0).valueOf()
      const tb = dayjs(b.occurredAt || 0).valueOf()
      return tb - ta
    })
})

const drawerItemSoftAllocated = computed(() => {
  const code = batchDrawerRow.value?.itemCode
  if (!code) return 0
  void salesStockAllocationState.allocations
  return getSoftAllocatedQtyByItemCode(code)
})

const drawerItemAvailableApprox = computed(() =>
  Math.max(0, drawerBatchStockTotal.value - drawerItemSoftAllocated.value),
)

const softAllocDetailTitle = computed(() => {
  const code = batchDrawerRow.value?.itemCode || ''
  return `软占用明细 · ${code}`
})

const softAllocDetailOpen = ref(false)

const softAllocDetailRows = computed(() => {
  const code = batchDrawerRow.value?.itemCode
  if (!code || !softAllocDetailOpen.value) return []
  void salesStockAllocationState.allocations
  return listSoftAllocationsByItemCode(code)
})

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'inventory-detail-list',
  fieldDefinitions: inventoryDetailExportFields,
  getFilteredRows: () => filteredList.value,
  getSelectedRows: () =>
    filteredList.value.filter((item) => selectedRowKeys.value.includes(item.id)),
  fileNamePrefix: '库存明细',
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  columnWidth: 40,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const baseColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center', fixed: 'left' },
  { title: '所属仓库', dataIndex: 'warehouse', width: 100, fixed: 'left' },
  { title: '产品名称', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '产品编码', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '类型', key: 'materialType', width: 88, align: 'center' },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88 },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '重量', key: 'weight', width: 88, align: 'right' },
  { title: '现存量', key: 'stockQty', width: 110, align: 'right' },
  { title: '软占用', key: 'softAllocated', width: 110, align: 'right' },
  { title: '可用', key: 'availableQty', width: 110, align: 'right' },
  { title: '按单在库', key: 'dedicatedQty', width: 110, align: 'right' },
  { title: '库位', dataIndex: 'locationNo', width: 110 },
  { title: '单价', key: 'unitPrice', width: 100, align: 'right' },
  { title: '库存总金额', key: 'totalAmount', width: 110, align: 'right' },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inventory-detail-list-v4', baseColumns, { minScrollX: 1880 })

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    warehouse: undefined,
    materialType: undefined,
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
    drawingNo: '',
    stockQtyMin: undefined,
    stockQtyMax: undefined,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function handleBatchSearch() {
  appliedBatchFilters.value = { ...batchFilters }
}

function handleBatchReset() {
  Object.assign(batchFilters, {
    salesOrderNo: '',
    batchNo: '',
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
    warehouse: undefined,
    ownership: undefined,
  })
  appliedBatchFilters.value = { ...batchFilters }
}

function openBatchDrawer(record) {
  batchDrawerRow.value = record
  drawerInnerTab.value = 'batches'
  drawerBatchScope.value = 'inStock'
  drawerFlowBatchNo.value = ''
  drawerFlowType.value = undefined
  batchDrawerOpen.value = true
  softAllocDetailOpen.value = false
}

function formatBatchTime(val) {
  if (!val) return '—'
  const d = dayjs(val)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : String(val)
}

function isRemnantBatch(batch) {
  return Boolean(batch?.attrs?.remnant)
}

function pieceCountOf(batch) {
  void stockPieceState.pieces
  if (!batch?.id) return 0
  return listStockPieces({ batchId: batch.id, inStockOnly: true }).length
}

function inStockPiecesOfBatch(batch) {
  void stockPieceState.pieces
  if (!batch?.id) return []
  return listStockPieces({ batchId: batch.id, inStockOnly: true })
    .slice()
    .sort((a, b) => {
      const sa = String(a.serialNo || '')
      const sb = String(b.serialNo || '')
      if (sa !== sb) return sa < sb ? -1 : 1
      return (a.index || 0) - (b.index || 0)
    })
}

function goOutboundDetail(id) {
  if (!id) return
  batchDrawerOpen.value = false
  router.push(`/inventory/outbound/${id}`)
}

function openSoftAllocDetail() {
  if (!(drawerItemSoftAllocated.value > 0)) return
  softAllocDetailOpen.value = true
}

function goSalesOrderDetail(id) {
  if (!id) return
  softAllocDetailOpen.value = false
  router.push(`/sales/orders/${id}`)
}

function onBatchMenu({ key }) {
  if (key === 'export') openExportModal()
}

watch(
  () => route.query.salesOrderNo,
  (no) => {
    if (!no) return
    viewTab.value = 'batches'
    batchFilters.salesOrderNo = String(no)
    appliedBatchFilters.value = { ...batchFilters }
  },
  { immediate: true },
)
</script>

<style scoped>
.inventory-detail-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100%;
}

.view-tabs {
  background: #fff;
  padding: 0 12px;
  border-radius: 4px;
}

.filter-card {
  background: #fff;
  padding: 12px 12px 4px;
  border-radius: 4px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.summary-bar {
  margin: 0;
}

.table-card {
  background: #fff;
  padding: 8px 12px 12px;
  border-radius: 4px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.batch-soft-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  font-size: 13px;
  color: #595959;
}

.batch-soft-summary b {
  color: #262626;
  font-weight: 600;
  margin-left: 4px;
}

.soft-sep {
  color: #d9d9d9;
  margin: 0 4px;
}

.soft-link {
  margin-left: 4px;
  font-weight: 600;
}

.batch-drawer-tabs {
  margin-top: 4px;
}

.batch-drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.fifo-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.batch-expand {
  padding: 4px 8px 8px;
  background: #fafafa;
}

.expand-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 8px;
}

.expand-empty {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  padding: 4px 0;
}

.piece-count {
  margin-left: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.soft-detail-btn {
  padding-inline: 4px;
  height: auto;
}

.batch-soft-tip {
  margin-bottom: 12px;
}
</style>
