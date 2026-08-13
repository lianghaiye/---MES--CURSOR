<template>
  <div class="replenish-ledger-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="台账号">
              <a-input
                v-model:value="filters.ledgerNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="物料编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="物料名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="补货动作">
              <a-select
                v-model:value="filters.action"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="actionOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="处理日期">
              <a-range-picker v-model:value="filters.dateRange" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                <a-button size="small" @click="handleReset">重置</a-button>
                <a-button size="small" @click="goReplenishCenter">去库存预警</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="table-card">
      <a-table
        size="small"
        row-key="id"
        bordered
        :columns="columns"
        :data-source="pagedRows"
        :pagination="false"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="replenishLedgerStatusColor(record.status)">
              {{ replenishLedgerStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            {{ actionLabel(record.action) }}
          </template>
          <template v-else-if="column.key === 'source'">
            {{ record.source === 'manual' ? '手工' : '预警触发' }}
          </template>
          <template v-else-if="column.key === 'refs'">
            <div
              v-if="record.planOrderNo || record.purchaseReqNo || record.workOrderNo"
              class="ref-links"
            >
              <a v-if="record.planOrderNo" class="link" @click.prevent="goPlan(record)">
                计划 {{ record.planOrderNo }}
              </a>
              <a v-if="record.purchaseReqNo" class="link" @click.prevent="goPurchase(record)">
                申请 {{ record.purchaseReqNo }}
              </a>
              <a v-if="record.workOrderNo" class="link" @click.prevent="goWorkOrder(record)">
                外协 {{ record.workOrderNo }}
              </a>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </template>
      </a-table>
      <div class="pager">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredRows.length"
          size="small"
          show-size-changer
          :show-total="(t) => `共 ${t} 条`"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ReplenishLedgerView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import {
  replenishLedgerState,
  filterReplenishLedgers,
  REPLENISH_LEDGER_STATUS_OPTIONS,
  replenishLedgerStatusLabel,
  replenishLedgerStatusColor,
} from '@/store/replenishLedgerStore'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  ledgerNo: '',
  itemCode: '',
  itemName: '',
  status: undefined,
  action: undefined,
  dateRange: null,
})
const appliedFilters = ref({ ...filters })

const pagination = reactive({
  current: 1,
  pageSize: 10,
})

const statusOpts = REPLENISH_LEDGER_STATUS_OPTIONS.filter((o) => o.value)
const actionOpts = [
  { value: 'produce', label: '生产' },
  { value: 'purchase', label: '采购' },
  { value: 'outsource', label: '外协' },
]

const columns = [
  { title: '台账号', dataIndex: 'ledgerNo', width: 140, fixed: 'left' },
  { title: '状态', key: 'status', width: 96 },
  { title: '来源', key: 'source', width: 88 },
  { title: '物料编码', dataIndex: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '触发库存', dataIndex: 'triggerStockQty', width: 88, align: 'right' },
  { title: '最低', dataIndex: 'minStockQty', width: 72, align: 'right' },
  { title: '最高', dataIndex: 'maxStockQty', width: 72, align: 'right' },
  { title: '建议数量', dataIndex: 'suggestQty', width: 88, align: 'right' },
  { title: '处理数量', dataIndex: 'handleQty', width: 88, align: 'right' },
  { title: '动作', key: 'action', width: 72 },
  { title: '关联单据', key: 'refs', width: 180 },
  { title: '触发时间', dataIndex: 'triggeredAt', width: 140 },
  { title: '处理时间', dataIndex: 'handledAt', width: 140 },
]

const filteredRows = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.dateRange?.length === 2) {
    f.dateRange = [f.dateRange[0].format('YYYY-MM-DD'), f.dateRange[1].format('YYYY-MM-DD')]
  } else {
    f.dateRange = null
  }
  return filterReplenishLedgers(replenishLedgerState.records, f)
})

const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

function actionLabel(action) {
  if (action === 'produce') return '生产'
  if (action === 'purchase') return '采购'
  if (action === 'outsource') return '外协'
  return '—'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.ledgerNo = ''
  filters.itemCode = ''
  filters.itemName = ''
  filters.status = undefined
  filters.action = undefined
  filters.dateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function goReplenishCenter() {
  openTab('/planning/replenish-center', '库存预警')
  router.push('/planning/replenish-center')
}

function goPlan() {
  openTab('/planning/production-plan', '生产计划')
  router.push('/planning/production-plan')
}

function goPurchase(record) {
  if (record.purchaseReqId) {
    const path = `/procurement/purchase-req/${record.purchaseReqId}`
    openTab(path, '采购申请详情')
    router.push(path)
    return
  }
  openTab('/procurement/purchase-req', '采购申请')
  router.push('/procurement/purchase-req')
}

function goWorkOrder() {
  openTab('/production/work-orders', '生产工单')
  router.push('/production/work-orders')
}
</script>

<style lang="less" scoped>
.replenish-ledger-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  min-height: calc(100vh - 56px - 40px - 24px);
  box-sizing: border-box;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px 16px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.ref-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link {
  color: #1677ff;
  cursor: pointer;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>
