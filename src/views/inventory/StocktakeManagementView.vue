<template>
  <div class="page-wrap">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form">
        <a-form-item label="盘点单号">
          <a-input v-model:value="filters.docNo" size="small" allow-clear placeholder="单号" />
        </a-form-item>
        <a-form-item label="盘点仓库">
          <a-select
            v-model:value="filters.warehouse"
            size="small"
            allow-clear
            show-search
            style="width: 140px"
            :options="warehouseOpts"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filters.status"
            size="small"
            allow-clear
            style="width: 120px"
            :options="statusOpts"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
            <a-button size="small" @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="list-panel">
      <div class="toolbar-row">
        <a-space>
          <a-button type="primary" size="small" @click="openCreate">
            <PlusOutlined />
            新增
          </a-button>
          <a-button size="small" @click="handleConfirmSelected">确认</a-button>
          <a-button size="small" danger @click="handleRefuseSelected">拒绝</a-button>
          <a-button size="small" @click="handleBatchDelete">删除</a-button>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :row-selection="rowSelection"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
          <template v-else-if="column.key === 'docNo'">
            <a @click="goDetail(record)">{{ record.docNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="stocktakeStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'sourceChannel'">
            {{ stocktakeSourceLabel(record.sourceChannel) }}
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
                v-if="canConfirmStocktake(record)"
                type="link"
                size="small"
                @click="handleConfirmOne(record)"
              >
                确认
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
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import {
  stocktakeStatusColor,
  stocktakeSourceLabel,
  stocktakeStatusOptions,
} from '@/mock/stocktakeOptions'
import {
  stocktakeOrderState,
  filterStocktakeOrders,
  canEditStocktake,
  canDeleteStocktake,
  canConfirmStocktake,
  canRefuseStocktake,
  confirmStocktake,
  refuseStocktake,
  deleteStocktakeOrder,
} from '@/store/stocktakeOrderStore'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'

defineOptions({ name: 'StocktakeManagementView' })

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  docNo: '',
  warehouse: undefined,
  status: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const refuseModalOpen = ref(false)
const refuseTargets = ref([])

const warehouseOpts = computed(() => getWarehouseSelectOptions())
const statusOpts = stocktakeStatusOptions.map((v) => ({ label: v, value: v }))
const refuseDocNos = computed(() => refuseTargets.value.map((o) => o.docNo || o.id))

const columns = [
  { title: '#', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '盘点单号', key: 'docNo', width: 160, fixed: 'left' },
  { title: '状态', key: 'status', width: 100 },
  { title: '来源', key: 'sourceChannel', width: 72 },
  { title: '盘点仓库', dataIndex: 'warehouse', width: 110 },
  { title: '盘点日期', dataIndex: 'stocktakeDate', width: 110 },
  { title: '申请人', dataIndex: 'applicant', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
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

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, { docNo: '', warehouse: undefined, status: undefined })
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

function handleConfirmOne(record) {
  Modal.confirm({
    title: `确认盘点 ${record.docNo}？`,
    content: '将按差异生成盘盈入库或盘亏出库并入账。',
    onOk: () => {
      const { count, blocked } = confirmStocktake([record.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认盘点')
    },
  })
}

function handleConfirmSelected() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择盘点单')
    return
  }
  Modal.confirm({
    title: '确认所选盘点单？',
    onOk: () => {
      const { count, blocked } = confirmStocktake(selectedRowKeys.value)
      if (blocked?.length)
        message.warning(blocked.map((b) => `${b.docNo}: ${b.message}`).join('；'))
      if (count) {
        message.success(`已确认 ${count} 条`)
        selectedRowKeys.value = []
      }
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
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.filter-card,
.list-panel {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
}
.toolbar-row {
  margin-bottom: 12px;
}
.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
