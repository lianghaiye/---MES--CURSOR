<template>
  <div class="stocktake-page list-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="盘点单号">
              <a-input
                v-model:value="filters.docNo"
                size="small"
                allow-clear
                placeholder="请输入 盘点单号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="盘点仓库">
              <a-select
                v-model:value="filters.warehouse"
                size="small"
                allow-clear
                show-search
                placeholder="请选择 盘点仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                size="small"
                allow-clear
                placeholder="请选择 状态"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="过账状态">
              <a-select
                v-model:value="filters.postingStatus"
                size="small"
                allow-clear
                placeholder="请选择 过账状态"
                :options="postingOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="盘点类型">
              <a-select
                v-model:value="filters.stocktakeType"
                size="small"
                allow-clear
                placeholder="请选择 类型"
                :options="typeOpts"
              />
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
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleSubmitSelected">提交审核</a-button>
        <a-button size="small" @click="handleApproveSelected">
          <CheckOutlined />
          审核通过
        </a-button>
        <a-button size="small" danger @click="handleRefuseSelected">
          <CloseCircleOutlined />
          拒绝
        </a-button>
        <a-button size="small" @click="handleWithdrawSelected">撤回</a-button>
        <a-button size="small" @click="handlePostSelected">
          <FileDoneOutlined />
          生成盘盈盘亏
        </a-button>
        <a-button size="small" @click="handleBatchDelete">
          <DeleteOutlined />
          删除
        </a-button>
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
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :row-selection="rowSelection"
        :scroll="{ x: 1380 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'docNo'">
            <a class="link-code" @click="goDetail(record)">{{ record.docNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="stocktakeStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'postingStatus'">
            <a-tag v-if="postingLabel(record)" :color="stocktakePostingColor(record.postingStatus)">
              {{ postingLabel(record) }}
            </a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'sourceChannel'">
            {{ stocktakeSourceLabel(record.sourceChannel) }}
          </template>
          <template v-else-if="column.key === 'stocktakeQty'">
            <a-tooltip title="差异行数 / 全部行数">
              {{ formatStocktakeQtyRatio(record) }}
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <a-button
                v-if="canEditStocktake(record)"
                type="link"
                size="small"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canSubmitStocktake(record)"
                type="link"
                size="small"
                @click="handleSubmitOne(record)"
              >
                提交审核
              </a-button>
              <a-button
                v-if="canApproveStocktake(record)"
                type="link"
                size="small"
                @click="handleApproveOne(record)"
              >
                审核通过
              </a-button>
              <a-button
                v-if="canRefuseStocktake(record)"
                type="link"
                size="small"
                danger
                @click="openRefuse([record])"
              >
                拒绝
              </a-button>
              <a-button
                v-if="canWithdrawStocktake(record)"
                type="link"
                size="small"
                @click="handleWithdrawOne(record)"
              >
                撤回
              </a-button>
              <a-button
                v-if="canPostStocktake(record)"
                type="link"
                size="small"
                @click="handlePostOne(record)"
              >
                {{
                  record.postingStatus === 'failed'
                    ? '重新过账'
                    : record.postingStatus === 'partial'
                      ? '继续过账'
                      : '生成盘盈盘亏'
                }}
              </a-button>
              <a-button
                v-if="canDeleteStocktake(record)"
                type="link"
                size="small"
                danger
                @click="confirmDelete(record)"
              >
                删除
              </a-button>
            </a-space>
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
          show-size-changer
          :show-total="(t) => `共 ${t} 条`"
        />
      </div>
    </div>

    <InventoryDocRefuseModal
      v-model:open="refuseModalOpen"
      doc-label="盘点"
      :doc-nos="refuseDocNos"
      @confirm="onRefuseConfirm"
    />

    <StocktakePostModeModal
      v-model:open="postModeModalOpen"
      :title="postModeModalTitle"
      :hint="postModeModalHint"
      @confirm="onPostModeConfirm"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileDoneOutlined,
} from '@ant-design/icons-vue'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import {
  STOCKTAKE_POSTING,
  stocktakeStatusColor,
  stocktakeSourceLabel,
  stocktakeStatusOptions,
  stocktakeTypeOptions,
  stocktakePostingOptions,
  stocktakePostingLabel,
  stocktakePostingColor,
  formatStocktakeQtyRatio,
} from '@/mock/stocktakeOptions'
import {
  stocktakeOrderState,
  filterStocktakeOrders,
  canEditStocktake,
  canDeleteStocktake,
  canSubmitStocktake,
  canApproveStocktake,
  canPostStocktake,
  canRefuseStocktake,
  canWithdrawStocktake,
  submitStocktake,
  approveStocktake,
  postStocktake,
  refuseStocktake,
  withdrawStocktake,
  deleteStocktakeOrder,
} from '@/store/stocktakeOrderStore'
import { isStocktakeAutoPostOnApprove } from '@/store/stocktakeSettingsStore'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'
import StocktakePostModeModal from './components/StocktakePostModeModal.vue'

defineOptions({ name: 'StocktakeManagementView' })

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  docNo: '',
  warehouse: undefined,
  status: undefined,
  postingStatus: undefined,
  stocktakeType: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const refuseModalOpen = ref(false)
const refuseTargets = ref([])
const postModeModalOpen = ref(false)
const postModeModalTitle = ref('生成盘盈盘亏')
const postModeModalHint = ref('请选择本次要生成的单据范围。')
const postTargetIds = ref([])

const warehouseOpts = computed(() => getWarehouseSelectOptions())
const statusOpts = stocktakeStatusOptions.map((v) => ({ label: v, value: v }))
const postingOpts = stocktakePostingOptions
const typeOpts = stocktakeTypeOptions.map((v) => ({ label: v, value: v }))
const refuseDocNos = computed(() => refuseTargets.value.map((o) => o.docNo || o.id))

const columns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '盘点单号', key: 'docNo', width: 160, fixed: 'left' },
  { title: '状态', key: 'status', width: 100 },
  { title: '过账状态', key: 'postingStatus', width: 100 },
  { title: '盘点类型', dataIndex: 'stocktakeType', width: 100 },
  { title: '来源', key: 'sourceChannel', width: 72 },
  { title: '盘点仓库', dataIndex: 'warehouse', width: 110 },
  { title: '盘点数量', key: 'stocktakeQty', width: 120, align: 'right' },
  { title: '盘点日期', dataIndex: 'stocktakeDate', width: 110 },
  { title: '申请人', dataIndex: 'applicant', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
]

const filteredList = computed(() => {
  void stocktakeOrderState.orders
  return filterStocktakeOrders(stocktakeOrderState.orders, appliedFilters.value)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function postingLabel(record) {
  return stocktakePostingLabel(record?.postingStatus)
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    docNo: '',
    warehouse: undefined,
    status: undefined,
    postingStatus: undefined,
    stocktakeType: undefined,
  })
  handleSearch()
}

function openCreate() {
  const page = findCreatePageByListPath('/inventory/stocktake')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  openCreateTab(router, openTab, {
    path: `/inventory/stocktake/${record.id}/edit`,
    title: `编辑盘点单 ${record.docNo || ''}`.trim(),
  })
}

function goDetail(record) {
  const path = `/inventory/stocktake/${record.id}`
  openTab(path, record.docNo || '盘点单详情')
  router.push(path)
}

function reportApproveResult({ count, blocked, posted }) {
  if (blocked?.length) {
    message.warning(blocked.map((b) => `${b.docNo}: ${b.message}`).join('；'))
  }
  if (count) {
    const postHint = posted?.length ? `，已过账 ${posted.length} 条` : ''
    message.success(`审核通过 ${count} 条${postHint}`)
  }
}

function reportPostResult({ count, blocked, partialCount }) {
  if (blocked?.length) {
    message.warning(blocked.map((b) => `${b.docNo}: ${b.message}`).join('；'))
  }
  if (!count) return
  if (partialCount) {
    message.success(`已生成 ${count} 条（其中 ${partialCount} 条尚有差异可继续过账）`)
  } else {
    message.success(`已过账 ${count} 条`)
  }
}

function openPostModeModal({ title, hint, ids }) {
  postModeModalTitle.value = title
  postModeModalHint.value = hint
  postTargetIds.value = ids || []
  postModeModalOpen.value = true
}

function onPostModeConfirm(mode) {
  const ids = postTargetIds.value
  if (!ids.length) return
  const res = postStocktake(ids, { mode })
  reportPostResult(res)
  if (res.count) {
    selectedRowKeys.value = selectedRowKeys.value.filter((id) => !ids.includes(id))
  }
  postTargetIds.value = []
}

function handlePostOne(record) {
  const isRetry = record.postingStatus === STOCKTAKE_POSTING.FAILED
  const isPartial = record.postingStatus === STOCKTAKE_POSTING.PARTIAL
  openPostModeModal({
    title: isRetry
      ? `重新过账 ${record.docNo}`
      : isPartial
        ? `继续过账 ${record.docNo}`
        : `生成盘盈盘亏 ${record.docNo}`,
    hint: isRetry
      ? record.postingError || '请选择本次要重新生成的单据范围。'
      : isPartial
        ? '当前为部分过账，请选择要继续生成的单据范围。'
        : '请选择本次要生成的单据范围。',
    ids: [record.id],
  })
}

function handlePostSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择盘点单')
    return
  }
  openPostModeModal({
    title: '对所选盘点单生成盘盈盘亏',
    hint: '仅「审核通过」且待过账/过账失败的单据会执行；请选择生成范围。',
    ids: [...selectedRowKeys.value],
  })
}

function handleSubmitOne(record) {
  Modal.confirm({
    title: `提交盘点单 ${record.docNo}？`,
    content: '提交后进入待审核，可审核、拒绝或撤回。',
    onOk: () => {
      const { count, blocked } = submitStocktake([record.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已提交')
    },
  })
}

function handleSubmitSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择盘点单')
    return
  }
  Modal.confirm({
    title: '提交所选盘点单？',
    content: '仅「待提交」单据会提交审核。',
    onOk: () => {
      const { count, blocked } = submitStocktake(selectedRowKeys.value)
      if (blocked?.length)
        message.warning(blocked.map((b) => `${b.docNo}: ${b.message}`).join('；'))
      if (count) {
        message.success(`已提交 ${count} 条`)
        selectedRowKeys.value = []
      }
    },
  })
}

function handleWithdrawOne(record) {
  Modal.confirm({
    title: `撤回盘点单 ${record.docNo}？`,
    content: '撤回后回到待提交，可继续编辑。',
    onOk: () => {
      const { count, blocked } = withdrawStocktake([record.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已撤回')
    },
  })
}

function handleWithdrawSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择盘点单')
    return
  }
  Modal.confirm({
    title: '撤回所选盘点单？',
    content: '仅「待审核」单据可撤回。',
    onOk: () => {
      const { count, blocked } = withdrawStocktake(selectedRowKeys.value)
      if (blocked?.length)
        message.warning(blocked.map((b) => `${b.docNo}: ${b.message}`).join('；'))
      if (count) {
        message.success(`已撤回 ${count} 条`)
        selectedRowKeys.value = []
      }
    },
  })
}

function handleApproveOne(record) {
  Modal.confirm({
    title: `审核通过 ${record.docNo}？`,
    content: isStocktakeAutoPostOnApprove()
      ? '将审核通过，并按配置自动生成盘盈入库 / 盘亏出库。'
      : '将审核通过；需手动点击「生成盘盈盘亏」过账。',
    onOk: () => {
      reportApproveResult(approveStocktake([record.id]))
    },
  })
}

function handleApproveSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择盘点单')
    return
  }
  Modal.confirm({
    title: '审核通过所选盘点单？',
    content: isStocktakeAutoPostOnApprove()
      ? '将审核通过，并按配置自动过账。'
      : '将审核通过；需手动生成盘盈盘亏。',
    onOk: () => {
      const res = approveStocktake(selectedRowKeys.value)
      reportApproveResult(res)
      if (res.count) selectedRowKeys.value = []
    },
  })
}

function openRefuse(records) {
  refuseTargets.value = records || []
  refuseModalOpen.value = true
}

function handleRefuseSelected() {
  const rows = stocktakeOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  if (!rows.length) {
    message.warning('请先选择盘点单')
    return
  }
  openRefuse(rows)
}

function onRefuseConfirm(reason) {
  const ids = refuseTargets.value.map((o) => o.id)
  const { count, blocked } = refuseStocktake(ids, { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success(count === 1 ? '已拒绝' : `已拒绝 ${count} 条`)
    refuseModalOpen.value = false
    selectedRowKeys.value = []
  }
}

function confirmDelete(record) {
  Modal.confirm({
    title: `确认删除盘点单 ${record.docNo}？`,
    onOk: () => {
      if (deleteStocktakeOrder(record.id)) message.success('已删除')
      else message.warning('当前单据不可删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的盘点单')
    return
  }
  Modal.confirm({
    title: '确认删除所选盘点单？',
    onOk: () => {
      let n = 0
      selectedRowKeys.value.forEach((id) => {
        if (deleteStocktakeOrder(id)) n += 1
      })
      message.success(n ? `已删除 ${n} 条` : '没有可删除的单据')
      selectedRowKeys.value = []
    },
  })
}
</script>

<style lang="less" scoped>
.stocktake-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 12px 16px;
  margin-bottom: 8px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-bar {
  margin-top: 0;
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

  :deep(.ant-table-cell-fix-left),
  :deep(.ant-table-cell-fix-right) {
    background: #fff;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding: 0 8px 8px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

:deep(.ant-table-wrapper .ant-btn-link) {
  padding: 0 4px;
  height: auto;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  .filter-actions-item :deep(.ant-form-item-control-input-content) {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
