<template>
  <div class="io-detail-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item :label="docNoLabel">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                size="small"
                :placeholder="`请输入${docNoLabel}`"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item :label="docTypeLabel">
              <a-select
                v-model:value="filters.docType"
                allow-clear
                size="small"
                :placeholder="`请选择${docTypeLabel}`"
                :options="docTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                size="small"
                placeholder="请输入物品名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                size="small"
                placeholder="请输入物品编码"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品类型">
              <a-select
                v-model:value="filters.itemType"
                allow-clear
                size="small"
                placeholder="请选择物品类型"
                :options="itemTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                show-search
                size="small"
                placeholder="请选择仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="条码/批次号">
              <a-input
                v-model:value="filters.barcodeBatchNo"
                allow-clear
                size="small"
                placeholder="请输入条码编号/批次号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="过账日期">
              <a-range-picker
                v-model:value="filters.postingDateRange"
                size="small"
                style="width: 100%"
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
                <a-button size="small" @click="handleReset">
                  <ReloadOutlined />
                  重置
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row list-action-card">
      <a-space :size="8">
        <a-button size="small" @click="exportModalOpen = true">导出</a-button>
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
          共计 {{ filteredList.length }} 条明细，{{ qtyLabel }}合计：{{ formatQty(summary.qty) }}。
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
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'docNo'">
            <a class="link-code" @click.prevent="openOrderDetail(record)">{{ record.docNo }}</a>
          </template>
          <template v-else-if="column.key === 'docStatus'">
            <a-tag :color="statusColor(record.docStatus)">{{ record.docStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'qty'">
            <span :class="{ 'qty-negative': Number(record.qty) < 0 }">{{
              formatQty(record.qty)
            }}</span>
          </template>
          <template v-else-if="column.key === 'stockAfter'">
            {{
              record.stockAfter === '' || record.stockAfter == null
                ? '—'
                : formatQty(record.stockAfter)
            }}
          </template>
          <template v-else>
            {{ displayCell(record[column.dataIndex]) }}
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
        />
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
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useListExport } from '@/composables/useListExport'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { formatQty } from '@/utils/numberFormat'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { inOutDocTypeOptions } from '@/mock/inOutDetailOptions'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { outboundStatusColor } from '@/mock/outboundOptions'
import { materialTypeOptions } from '@/mock/productInfoOptions'
import {
  listCompletedInboundDetailRows,
  listCompletedOutboundDetailRows,
  filterIoDetailRows,
  summarizeIoDetailRows,
  buildIoDetailOrderRowSpans,
  IO_DETAIL_ORDER_MERGE_KEYS,
} from '@/utils/ioCompletedDetailList'
import { buildIoCompletedDetailExportFields } from '@/utils/exportFields/ioCompletedDetailExport'

defineOptions({ name: 'IoCompletedDetailListView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const isOutbound = route.meta?.ioKind === 'outbound'
const pageTitle = isOutbound ? '出库详情' : '入库详情'
const docNoLabel = isOutbound ? '出库单号' : '入库单号'
const docTypeLabel = isOutbound ? '出库类型' : '入库类型'
const qtyLabel = isOutbound ? '出库数量' : '入库数量'

const filters = reactive({
  docNo: '',
  docType: undefined,
  itemName: '',
  itemCode: '',
  itemType: undefined,
  warehouse: undefined,
  barcodeBatchNo: '',
  postingDateRange: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const warehouseOpts = computed(() => getWarehouseSelectOptions())
const docTypeOpts = inOutDocTypeOptions
  .filter((v) => (isOutbound ? v.includes('出库') : v.includes('入库')))
  .map((v) => ({ label: v, value: v }))
const itemTypeOpts = materialTypeOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  {
    title: docNoLabel,
    key: 'docNo',
    dataIndex: 'docNo',
    width: 150,
    fixed: 'left',
    ellipsis: true,
  },
  { title: docTypeLabel, key: 'docType', dataIndex: 'docType', width: 100, ellipsis: true },
  { title: '单据状态', key: 'docStatus', dataIndex: 'docStatus', width: 90 },
  { title: '仓库', key: 'warehouse', dataIndex: 'warehouse', width: 110, ellipsis: true },
  { title: '物品类型', key: 'itemType', dataIndex: 'itemType', width: 90 },
  { title: '物品名称', key: 'itemName', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '物品编码', key: 'itemCode', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantSummary',
    dataIndex: 'variantSummary',
    width: 140,
    ellipsis: true,
  },
  { title: '图号', key: 'drawingNo', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: qtyLabel, key: 'qty', dataIndex: 'qty', width: 100, align: 'right' },
  { title: '变动后库存', key: 'stockAfter', dataIndex: 'stockAfter', width: 110, align: 'right' },
  { title: '单位', key: 'unit', dataIndex: 'unit', width: 70, align: 'center' },
  {
    title: '条码/批次号',
    key: 'barcodeBatchNo',
    dataIndex: 'barcodeBatchNo',
    width: 140,
    ellipsis: true,
  },
  { title: '过账日期', key: 'postingDate', dataIndex: 'postingDate', width: 110 },
  { title: '操作人', key: 'operator', dataIndex: 'operator', width: 90, ellipsis: true },
  { title: '创建人', key: 'creator', dataIndex: 'creator', width: 90, ellipsis: true },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 160, ellipsis: true },
  { title: '备注', key: 'remark', dataIndex: 'remark', width: 140, ellipsis: true },
]

const storageKey = isOutbound
  ? 'inventory-outbound-details-list-v2'
  : 'inventory-inbound-details-list-v2'

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings(storageKey, baseColumns, { minScrollX: 2400 })

const sourceList = computed(() =>
  isOutbound ? listCompletedOutboundDetailRows() : listCompletedInboundDetailRows(),
)

const filteredList = computed(() => {
  const f = { ...appliedFilters.value }
  let list = filterIoDetailRows(sourceList.value, f)
  if (f.itemCode) {
    const q = String(f.itemCode).trim()
    list = list.filter((r) => String(r.itemCode || '').includes(q))
  }
  return list
})

const summary = computed(() => summarizeIoDetailRows(filteredList.value))

const exportFieldDefinitions = buildIoCompletedDetailExportFields(isOutbound)

const { exportModalOpen, exportFieldSettings, defaultExportFieldSettings, doExport } =
  useListExport({
    storageKey,
    fieldDefinitions: exportFieldDefinitions,
    getFilteredRows: () => filteredList.value,
    getSelectedRows: () => filteredList.value.filter((o) => selectedRowKeys.value.includes(o.id)),
    fileNamePrefix: pageTitle,
  })

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const pageOrderRowSpans = computed(() => buildIoDetailOrderRowSpans(pagedList.value))
const orderMergeKeySet = new Set(IO_DETAIL_ORDER_MERGE_KEYS)
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
  columnWidth: 40,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function statusColor(status) {
  return isOutbound ? outboundStatusColor(status) : inboundStatusColor(status)
}

function handleSearch() {
  appliedFilters.value = {
    ...filters,
    postingDateRange: filters.postingDateRange
      ? filters.postingDateRange.map((d) => (d?.format ? d.format('YYYY-MM-DD') : d))
      : undefined,
  }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    docNo: '',
    docType: undefined,
    itemName: '',
    itemCode: '',
    itemType: undefined,
    warehouse: undefined,
    barcodeBatchNo: '',
    postingDateRange: undefined,
  })
  handleSearch()
}

function openOrderDetail(record) {
  if (!record?.headerId) return
  const path = isOutbound
    ? `/inventory/outbound/${record.headerId}`
    : `/inventory/inbound/${record.headerId}`
  openTab(path, record.docNo || pageTitle)
  router.push(path)
}
</script>

<style lang="less" scoped>
.io-detail-page {
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
}

.filter-card {
  padding: 12px 12px 4px;
}

.toolbar-row.list-action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar-icons {
  margin-left: auto;
}

.filter-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
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
  padding: 8px 12px 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.qty-negative {
  color: #ff4d4f;
}
</style>
