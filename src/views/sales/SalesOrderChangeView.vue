<template>
  <div class="order-change-page list-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="priceChangeStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="变更单号">
              <a-input
                v-model:value="filters.changeNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-input
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售订单号">
              <a-input
                v-model:value="filters.salesOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发起人">
              <a-input
                v-model:value="filters.creator"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发起时间">
              <a-range-picker
                v-model:value="filters.createdRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="10">
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
        <a-button type="primary" size="small" @click="openInitiateChange">
          <PlusOutlined />
          发起变更
        </a-button>
        <a-button size="small" @click="openToolbarApprove">
          <CheckOutlined />
          审核
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredList.length }} 条变更单。
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
        :row-selection="rowSelection"
        :pagination="false"
        :scroll="{ x: 1680 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="priceChangeStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'changeNo'">
            <a class="link-code" @click="openChange(record)">{{ record.changeNo }}</a>
          </template>
          <template v-else-if="column.key === 'salesOrderNo'">
            <a class="link-code" @click="openOrderDetail(record)">{{
              record.salesOrderNo || '—'
            }}</a>
          </template>
          <template v-else-if="column.key === 'customer'">
            {{ customerDisplay(record) }}
          </template>
          <template v-else-if="column.key === 'reasonType'">
            {{ formatReasonTypes(record.reasonType) }}
          </template>
          <template v-else-if="column.key === 'deltaAmountExTax'">
            <span :class="deltaClass(record.deltaAmountExTax)">
              {{ formatPriceChangeMoney(record.deltaAmountExTax) }}
            </span>
          </template>
          <template v-else-if="column.key === 'deltaAmountInTax'">
            <span :class="deltaClass(record.deltaAmountInTax)">
              {{ formatPriceChangeMoney(record.deltaAmountInTax) }}
            </span>
          </template>
          <template v-else-if="column.key === 'creator'">
            {{ record.creator || record.submitter || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ record.submittedAt || record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'approver'">
            {{ record.approver || '—' }}
          </template>
          <template v-else-if="column.key === 'approvedAt'">
            {{ record.approvedAt || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8" wrap>
              <a v-if="canApprove(record)" @click="openApprove(record)">审核</a>
              <a @click="openOrderDetail(record)">订单</a>
            </a-space>
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          size="small"
          show-size-changer
          :total="filteredList.length"
          :show-total="(total) => `共 ${total} 条`"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { CheckOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  getPriceChangeById,
  listAllPriceChanges,
  salesPriceChangeState,
} from '@/store/salesPriceChangeStore'
import {
  formatPriceChangeMoney,
  formatReasonTypes,
  PRICE_CHANGE_STATUS,
  priceChangeStatusColor,
  priceChangeStatusOptions,
} from '@/utils/salesPriceChange'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'

defineOptions({ name: 'SalesOrderChangeView' })

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  changeNo: '',
  customerName: '',
  salesOrderNo: '',
  creator: '',
  createdRange: null,
})
const appliedFilters = ref({ ...filters, createdRange: null })
const pagination = reactive({ current: 1, pageSize: 10 })
const selectedRowKeys = ref([])
const tick = ref(0)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '变更单号', key: 'changeNo', width: 150, fixed: 'left' },
  { title: '销售订单号', key: 'salesOrderNo', width: 150 },
  { title: '客户名称', key: 'customer', width: 180, ellipsis: true },
  { title: '变更原因', key: 'reasonType', width: 160, ellipsis: true },
  { title: '差额（不含税）', key: 'deltaAmountExTax', width: 130, align: 'right' },
  { title: '差额（含税）', key: 'deltaAmountInTax', width: 120, align: 'right' },
  { title: '发起人', key: 'creator', width: 90 },
  { title: '发起时间', key: 'createdAt', width: 140 },
  { title: '审核人', key: 'approver', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 140 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

function inCreatedRange(createdAt, range) {
  if (!range || !range[0] || !range[1]) return true
  const t = dayjs(createdAt)
  if (!t.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end))
}

function customerDisplay(record) {
  return (
    String(record.newCustomerName || record.oldCustomerName || record.customerName || '').trim() ||
    '—'
  )
}

function deltaClass(val) {
  const n = Number(val)
  if (!Number.isFinite(n) || n === 0) return ''
  return n > 0 ? 'delta-up' : 'delta-down'
}

const filteredList = computed(() => {
  void salesPriceChangeState.orders
  void tick.value
  const f = appliedFilters.value
  const changeNo = String(f.changeNo || '')
    .trim()
    .toLowerCase()
  const customer = String(f.customerName || '')
    .trim()
    .toLowerCase()
  const salesOrderNo = String(f.salesOrderNo || '')
    .trim()
    .toLowerCase()
  const creator = String(f.creator || '')
    .trim()
    .toLowerCase()
  return listAllPriceChanges().filter((item) => {
    if (f.status && item.status !== f.status) return false
    if (
      changeNo &&
      !String(item.changeNo || '')
        .toLowerCase()
        .includes(changeNo)
    )
      return false
    if (customer && !customerDisplay(item).toLowerCase().includes(customer)) return false
    if (
      salesOrderNo &&
      !String(item.salesOrderNo || '')
        .toLowerCase()
        .includes(salesOrderNo)
    )
      return false
    if (
      creator &&
      !String(item.creator || item.submitter || '')
        .toLowerCase()
        .includes(creator)
    )
      return false
    if (!inCreatedRange(item.submittedAt || item.createdAt, f.createdRange)) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function handleSearch() {
  appliedFilters.value = {
    ...filters,
    createdRange: filters.createdRange ? [...filters.createdRange] : null,
  }
  pagination.current = 1
  tick.value += 1
}

function handleReset() {
  filters.status = undefined
  filters.changeNo = ''
  filters.customerName = ''
  filters.salesOrderNo = ''
  filters.creator = ''
  filters.createdRange = null
  handleSearch()
}

function getSelectedChange() {
  if (selectedRowKeys.value.length !== 1) return null
  return getPriceChangeById(selectedRowKeys.value[0])
}

function canApprove(record) {
  return record?.status === PRICE_CHANGE_STATUS.PENDING
}

function openOrderDetail(record) {
  const orderId = record?.salesOrderId
  if (!orderId) {
    message.warning('未关联销售订单')
    return
  }
  const path = `/sales/orders/${orderId}`
  openTab(path, `销售订单 ${record.salesOrderNo || ''}`.trim())
  router.push(path)
}

function openApprove(record) {
  if (!canApprove(record)) {
    message.warning('仅「待审核」的变更单可审核')
    return
  }
  const path = `/sales/order-changes/${record.id}/approve`
  openTab(path, `审核订单变更 ${record.changeNo || ''}`.trim())
  router.push(path)
}

function openChange(record) {
  if (canApprove(record)) {
    openApprove(record)
    return
  }
  openOrderDetail(record)
}

function openToolbarApprove() {
  const row = getSelectedChange()
  if (!row) {
    message.warning('请勾选一条待审变更单')
    return
  }
  if (!canApprove(row)) {
    message.warning('仅「待审核」的变更单可审核')
    return
  }
  openApprove(row)
}

function openInitiateChange() {
  openCreateTab(router, openTab, {
    path: '/sales/order-changes/new',
    title: '发起订单变更',
  })
}
</script>

<style lang="less" scoped>
.order-change-page {
  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .field-tip {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .delta-up {
    color: #cf1322;
  }

  .delta-down {
    color: #389e0d;
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
}
</style>
