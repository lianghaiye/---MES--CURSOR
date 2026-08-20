<template>
  <div class="outsourcing-return-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
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
            <a-form-item label="异常处理单号">
              <a-input
                v-model:value="filters.returnNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="外协单号">
              <a-input
                v-model:value="filters.outsourcingOrderNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-select
                v-model:value="filters.supplier"
                allow-clear
                size="small"
                placeholder="请选择"
                show-search
                :options="supplierOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="创建日期">
              <a-range-picker
                v-model:value="filters.createdAtRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="操作人">
              <a-select
                v-model:value="filters.operator"
                allow-clear
                size="small"
                placeholder="请选择"
                show-search
                :options="operatorOpts"
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

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleGenerateOutbound">生成出库单</a-button>
        <a-button size="small" type="primary" @click="handleComplete">完成</a-button>
        <a-dropdown>
          <a-button size="small">
            打印
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onPrintMenuClick">
              <a-menu-item key="打印异常处理明细">打印异常处理明细</a-menu-item>
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
          共计 {{ filteredList.length }} 条数据。
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
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'returnNo'">
            <a class="link-code" @click.prevent="openDetail(record)">
              {{ record.returnNo }}
            </a>
          </template>
          <template v-else-if="column.key === 'outsourcingOrderNo'">
            <a
              v-if="record.outsourcingOrderId"
              class="link-code"
              @click.prevent="openOutsourcingOrder(record)"
            >
              {{ record.outsourcingOrderNo || '—' }}
            </a>
            <span v-else>{{ record.outsourcingOrderNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'productInfo'">
            <span :title="formatReturnProductInfo(record)">{{
              formatReturnProductInfo(record)
            }}</span>
          </template>
          <template v-else-if="column.key === 'qtySummary'">
            {{ formatReturnQtySummary(record) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTimeMinute(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button
                v-if="canEditOutsourcingReturn(record)"
                type="link"
                size="small"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canVoidOutsourcingReturn(record)"
                type="link"
                size="small"
                danger
                @click="handleVoid(record)"
              >
                作废
              </a-button>
              <span
                v-if="!canEditOutsourcingReturn(record) && !canVoidOutsourcingReturn(record)"
                class="action-disabled"
              >
                -
              </span>
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

    <OutsourcingReturnPrintModal
      v-model:open="printModalOpen"
      :outsourcing-returns="printReturns"
    />

    <ReturnGenerateOutboundModal
      v-model:open="outboundModalOpen"
      return-type="outsourcing"
      :return-record="outboundReturn"
      @confirmed="onOutboundConfirmed"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'OutsourcingReturnView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  filterOutsourcingReturns,
  formatReturnQtySummary,
  outsourcingReturnStatusOptions,
} from '@/mock/outsourcingReturns'
import {
  outsourcingReturnState,
  canEditOutsourcingReturn,
  canVoidOutsourcingReturn,
  voidOutsourcingReturn,
  canCompleteOutsourcingReturn,
  completeOutsourcingReturn,
  listOutsourcingReturnOperators,
} from '@/store/outsourcingReturnStore'
import { supplierOptions } from '@/mock/purchaseOrderOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import OutsourcingReturnPrintModal from './components/OutsourcingReturnPrintModal.vue'
import ReturnGenerateOutboundModal from './components/ReturnGenerateOutboundModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { formatReturnProductInfo } from '@/utils/returnProductInfo'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  returnNo: '',
  outsourcingOrderNo: '',
  supplier: undefined,
  createdAtRange: undefined,
  operator: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const printModalOpen = ref(false)
const printReturns = ref([])
const outboundModalOpen = ref(false)
const outboundReturn = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const statusOpts = outsourcingReturnStatusOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions
const operatorOpts = computed(() => listOutsourcingReturnOperators())

const baseColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90 },
  { title: '异常处理单号', key: 'returnNo', dataIndex: 'returnNo', width: 150 },
  { title: '外协单号', key: 'outsourcingOrderNo', dataIndex: 'outsourcingOrderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', width: 160, ellipsis: true },
  { title: '产品信息', key: 'productInfo', width: 180, ellipsis: true },
  { title: '处理数量', key: 'qtySummary', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outsourcing-return-list-v4', baseColumns)

const filteredList = computed(() =>
  filterOutsourcingReturns(outsourcingReturnState.returns, appliedFilters.value),
)

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

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function statusColor(status) {
  const map = {
    新建: 'default',
    进行中: 'processing',
    已完成: 'success',
    作废: 'default',
  }
  return map[status] || 'default'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.returnNo = ''
  filters.outsourcingOrderNo = ''
  filters.supplier = undefined
  filters.createdAtRange = undefined
  filters.operator = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openCreate() {
  const page = findCreatePageByListPath('/procurement/outsourcing-returns')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openDetail(record) {
  if (!record?.id) return
  const path = `/procurement/outsourcing-returns/${record.id}`
  openTab(path, `外协异常处理 ${record.returnNo || ''}`)
  router.push({ name: 'procurement-outsourcing-returns-detail', params: { id: record.id } })
}

function openOutsourcingOrder(record) {
  if (!record?.outsourcingOrderId) return
  const path = `/procurement/outsourcing-orders/${record.outsourcingOrderId}`
  openTab(path, `外协订单 ${record.outsourcingOrderNo || ''}`)
  router.push({
    name: 'procurement-outsourcing-orders-detail',
    params: { id: record.outsourcingOrderId },
  })
}

function handleEdit(record) {
  if (!canEditOutsourcingReturn(record)) {
    message.warning('仅「新建」状态的异常处理单可编辑')
    return
  }
  const path = `/procurement/outsourcing-returns/${record.id}/edit`
  openTab(path, `编辑异常处理单 ${record.returnNo || ''}`)
  router.push({ name: 'procurement-outsourcing-returns-edit', params: { id: record.id } })
}

function handleVoid(record) {
  if (!canVoidOutsourcingReturn(record)) {
    message.warning('仅「新建」状态的异常处理单可作废')
    return
  }
  Modal.confirm({
    title: '确认作废',
    content: `确定作废异常处理单「${record.returnNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidOutsourcingReturn(record.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
    },
  })
}

function handleComplete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择异常处理单')
    return
  }
  const targets = selectedRowKeys.value
    .map((id) => outsourcingReturnState.returns.find((r) => r.id === id))
    .filter(Boolean)
  const completable = targets.filter(canCompleteOutsourcingReturn)
  if (!completable.length) {
    message.warning('所选单据均不可完成（需为新建/进行中，且无进行中的出库单）')
    return
  }
  Modal.confirm({
    title: '确认完成',
    content: `确定完成选中的 ${completable.length} 条异常处理单吗？`,
    onOk: () => {
      let okCount = 0
      completable.forEach((row) => {
        const result = completeOutsourcingReturn(row.id)
        if (result.ok) okCount += 1
      })
      message.success(`已完成 ${okCount} 条异常处理单`)
      selectedRowKeys.value = []
    },
  })
}

function handleGenerateOutbound() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条「新建」状态的异常处理单后再生成出库单')
    return
  }
  const record = outsourcingReturnState.returns.find((r) => r.id === selectedRowKeys.value[0])
  if (!record || record.status !== '新建') {
    message.warning('仅「新建」状态的异常处理单可生成出库单')
    return
  }
  outboundReturn.value = record
  outboundModalOpen.value = true
}

function onOutboundConfirmed() {
  selectedRowKeys.value = []
}

function onPrintMenuClick({ key }) {
  if (key === '打印异常处理明细') {
    openBatchPrint()
  }
}

function openBatchPrint() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要打印的异常处理单')
    return
  }
  printReturns.value = selectedRowKeys.value
    .map((id) => outsourcingReturnState.returns.find((r) => r.id === id))
    .filter(Boolean)
  if (!printReturns.value.length) {
    message.warning('未找到可打印的异常处理单')
    return
  }
  printModalOpen.value = true
}
</script>

<style lang="less" scoped>
.outsourcing-return-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
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
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
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

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
