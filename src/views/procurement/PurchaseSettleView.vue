<template>
  <div class="purchase-settle-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="结算单号">
              <a-input
                v-model:value="filters.settleNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="采购单号">
              <a-input
                v-model:value="filters.purchaseOrderNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-input
                v-model:value="filters.supplier"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="账期">
              <a-input
                v-model:value="filters.periodKey"
                allow-clear
                size="small"
                placeholder="如 2026-08"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="生成方式">
              <a-select
                v-model:value="filters.generateMode"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="generateModeOpts"
              />
            </a-form-item>
          </a-col>
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
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" size="small" @click="openPeriodCreate">按账期生成</a-button>
          <a-button size="small" @click="openCreate">从采购单生成结算</a-button>
        </a-space>
      </div>
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 1180 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'settleNo'">
            <a @click="openDetail(record)">{{ record.settleNo }}</a>
          </template>
          <template v-else-if="column.key === 'purchaseOrderNo'">
            {{ displayPoNos(record) }}
          </template>
          <template v-else-if="column.key === 'generateMode'">
            {{ record.generateMode === 'period' ? '账期' : '采购单' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '已确认' ? 'green' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'totalAmount'">
            {{ formatMoney(record.totalAmount) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="openDetail(record)">详情</a>
              <a v-if="record.status === '草稿'" @click="onConfirm(record)">确认</a>
              <a v-if="record.status === '草稿'" class="danger" @click="onDelete(record)">删除</a>
            </a-space>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          :show-size-changer="false"
        />
      </div>
    </div>

    <GeneratePurchaseSettleModal v-model:open="createOpen" @confirmed="onCreated" />
    <GeneratePeriodSettleModal v-model:open="periodOpen" @confirmed="onCreated" />
  </div>
</template>

<script>
export default { name: 'PurchaseSettleView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  purchaseSettleState,
  confirmPurchaseSettle,
  deletePurchaseSettle,
} from '@/store/purchaseSettleStore'
import GeneratePurchaseSettleModal from './components/GeneratePurchaseSettleModal.vue'
import GeneratePeriodSettleModal from './components/GeneratePeriodSettleModal.vue'
import { formatNumber } from '@/utils/numberFormat'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  settleNo: '',
  purchaseOrderNo: '',
  supplier: '',
  periodKey: '',
  generateMode: undefined,
  status: undefined,
})
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const createOpen = ref(false)
const periodOpen = ref(false)

const statusOpts = [
  { label: '草稿', value: '草稿' },
  { label: '已确认', value: '已确认' },
]

const generateModeOpts = [
  { label: '账期', value: 'period' },
  { label: '采购单', value: 'po' },
]

const columns = [
  { title: '结算单号', key: 'settleNo', width: 150 },
  { title: '生成方式', key: 'generateMode', width: 90 },
  { title: '账期', dataIndex: 'periodKey', key: 'periodKey', width: 120 },
  { title: '采购单号', key: 'purchaseOrderNo', width: 160, ellipsis: true },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '结算日期', dataIndex: 'settleDate', key: 'settleDate', width: 120 },
  { title: '结算金额', key: 'totalAmount', width: 120, align: 'right' },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'actions', width: 160 },
]

const filteredList = computed(() => {
  void purchaseSettleState.settles
  return purchaseSettleState.settles.filter((row) => {
    if (applied.settleNo && !String(row.settleNo || '').includes(applied.settleNo.trim())) {
      return false
    }
    if (applied.purchaseOrderNo) {
      const keyword = applied.purchaseOrderNo.trim()
      const nos = [
        row.purchaseOrderNo,
        ...(row.purchaseOrderNos || []),
        ...(row.lineItems || []).map((l) => l.purchaseOrderNo),
      ]
        .filter(Boolean)
        .join(' ')
      if (!nos.includes(keyword)) return false
    }
    if (applied.supplier && !String(row.supplier || '').includes(applied.supplier.trim())) {
      return false
    }
    if (applied.periodKey && !String(row.periodKey || '').includes(applied.periodKey.trim())) {
      return false
    }
    if (applied.generateMode && (row.generateMode || 'po') !== applied.generateMode) return false
    if (applied.status && row.status !== applied.status) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function displayPoNos(record) {
  if (record.purchaseOrderNos?.length) return record.purchaseOrderNos.join('、')
  return record.purchaseOrderNo || '—'
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 4)
}

function handleSearch() {
  Object.assign(applied, filters)
  pagination.current = 1
}

function handleReset() {
  filters.settleNo = ''
  filters.purchaseOrderNo = ''
  filters.supplier = ''
  filters.periodKey = ''
  filters.generateMode = undefined
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  createOpen.value = true
}

function openPeriodCreate() {
  periodOpen.value = true
}

function onCreated() {
  pagination.current = 1
}

function openDetail(record) {
  if (!record?.id) return
  const path = `/procurement/purchase-settles/${record.id}`
  openTab(path, `采购结算 ${record.settleNo || ''}`)
  router.push({ name: 'procurement-purchase-settles-detail', params: { id: record.id } })
}

function onConfirm(record) {
  Modal.confirm({
    title: `确认结算单 ${record.settleNo}？`,
    content: '确认后将占用入库行的结算数量，不可撤销。',
    okText: '确认',
    onOk() {
      const res = confirmPurchaseSettle(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onDelete(record) {
  Modal.confirm({
    title: `删除结算单 ${record.settleNo}？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettle(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.purchase-settle-page {
  padding: 0;
}
.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px 12px;
  margin-bottom: 8px;
}
.table-toolbar {
  margin-bottom: 8px;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.danger {
  color: #ff4d4f;
}
</style>
