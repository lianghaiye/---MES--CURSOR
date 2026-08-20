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
        <a-button type="primary" size="small" @click="openCreate">从采购单生成结算</a-button>
      </div>
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 980 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'settleNo'">
            <a @click="openDetail(record)">{{ record.settleNo }}</a>
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

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  settleNo: '',
  purchaseOrderNo: '',
  status: undefined,
})
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const createOpen = ref(false)

const statusOpts = [
  { label: '草稿', value: '草稿' },
  { label: '已确认', value: '已确认' },
]

const columns = [
  { title: '结算单号', key: 'settleNo', width: 150 },
  { title: '采购单号', dataIndex: 'purchaseOrderNo', key: 'purchaseOrderNo', width: 140 },
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
    if (
      applied.purchaseOrderNo &&
      !String(row.purchaseOrderNo || '').includes(applied.purchaseOrderNo.trim())
    ) {
      return false
    }
    if (applied.status && row.status !== applied.status) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function handleSearch() {
  Object.assign(applied, filters)
  pagination.current = 1
}

function handleReset() {
  filters.settleNo = ''
  filters.purchaseOrderNo = ''
  filters.status = undefined
  handleSearch()
}

function openCreate() {
  createOpen.value = true
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
  padding: 12px 16px;
  margin-bottom: 12px;
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
