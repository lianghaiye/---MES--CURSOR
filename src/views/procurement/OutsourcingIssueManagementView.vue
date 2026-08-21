<template>
  <div class="outsourcing-issue-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form" :model="filters">
        <a-form-item label="发料单号">
          <a-input
            v-model:value="filters.issueOrderNo"
            allow-clear
            placeholder="搜索发料单号"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="出库状态">
          <a-select
            v-model:value="filters.outboundStatus"
            allow-clear
            placeholder="全部"
            :options="statusOptions"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="外协单号">
          <a-input
            v-model:value="filters.outsourcingOrderNo"
            allow-clear
            placeholder="关联外协订单"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="供应商">
          <a-select
            v-model:value="filters.supplier"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="全部"
            :options="supplierOptions"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="申请人">
          <a-input
            v-model:value="filters.creator"
            allow-clear
            placeholder="申请人"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">搜索</a-button>
            <a-button @click="handleReset">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button @click="handleRefresh">刷新</a-button>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="middle"
        :pagination="false"
        :scroll="{ x: 1280 }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'outboundStatus'">
            <a-badge
              :status="outsourcingIssueOutboundBadge(record.outboundStatus)"
              :text="record.outboundStatus"
            />
          </template>
          <template v-else-if="column.key === 'issueOrderNo'">
            <a @click="goDetail(record)">{{ record.issueOrderNo }}</a>
          </template>
          <template v-else-if="column.key === 'outsourcingOrderNo'">
            <a @click="goOutsourcingOrder(record)">{{ record.outsourcingOrderNo || '—' }}</a>
          </template>
          <template v-else-if="column.key === 'material'">
            <span :title="record.materialSummary">{{ truncate(record.materialSummary, 24) }}</span>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ record.lineCount || 0 }} 行 / {{ formatQty(record.totalQty) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="goDetail(record)">详情</a-button>
          </template>
        </template>
      </a-table>

      <div class="table-footer">
        <span class="page-summary">
          共 {{ filteredList.length }} 条
          <template v-if="selectedRowKeys.length">（已选 {{ selectedRowKeys.length }}）</template>
        </span>
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50']"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'OutsourcingIssueManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import {
  OUTSOURCING_ISSUE_OUTBOUND_STATUS_OPTIONS,
  filterOutsourcingIssueApplications,
  listOutsourcingIssueApplications,
  listOutsourcingIssueSuppliers,
  outsourcingIssueOutboundBadge,
} from '@/utils/outsourcingIssueApplications'

const router = useRouter()

const filters = reactive({
  issueOrderNo: '',
  outboundStatus: undefined,
  outsourcingOrderNo: '',
  supplier: undefined,
  creator: '',
})

const applied = reactive({ ...filters })

const pagination = reactive({
  current: 1,
  pageSize: 10,
})

const selectedRowKeys = ref([])
const refreshTick = ref(0)

const statusOptions = OUTSOURCING_ISSUE_OUTBOUND_STATUS_OPTIONS.map((v) => ({
  label: v,
  value: v,
}))

const supplierOptions = computed(() => {
  void outsourcingOrderState.orders.length
  return listOutsourcingIssueSuppliers()
})

const columns = [
  { title: '出库状态', key: 'outboundStatus', width: 110, fixed: 'left' },
  { title: '发料单号', key: 'issueOrderNo', width: 160, fixed: 'left' },
  { title: '关联外协单', key: 'outsourcingOrderNo', width: 150 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '出库仓库', dataIndex: 'shipWarehouse', key: 'shipWarehouse', width: 110 },
  { title: '出货日期', dataIndex: 'shipDate', key: 'shipDate', width: 120 },
  { title: '物料摘要', key: 'material', width: 180, ellipsis: true },
  { title: '数量', key: 'qty', width: 120 },
  { title: '申请人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
]

const allList = computed(() => {
  void outsourcingOrderState.orders.length
  refreshTick.value
  return listOutsourcingIssueApplications()
})

const filteredList = computed(() =>
  filterOutsourcingIssueApplications(allList.value, {
    issueOrderNo: applied.issueOrderNo,
    outboundStatus: applied.outboundStatus,
    outsourcingOrderNo: applied.outsourcingOrderNo,
    supplier: applied.supplier,
    creator: applied.creator,
  }),
)

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

watch(
  () => [
    applied.issueOrderNo,
    applied.outboundStatus,
    applied.outsourcingOrderNo,
    applied.supplier,
    applied.creator,
  ],
  () => {
    pagination.current = 1
    selectedRowKeys.value = []
  },
)

function handleSearch() {
  Object.assign(applied, { ...filters })
}

function handleReset() {
  filters.issueOrderNo = ''
  filters.outboundStatus = undefined
  filters.outsourcingOrderNo = ''
  filters.supplier = undefined
  filters.creator = ''
  Object.assign(applied, { ...filters })
}

function handleRefresh() {
  refreshTick.value += 1
  message.success('已刷新')
}

function goDetail(record) {
  router.push(`/procurement/outsourcing-issue/${record.id}`)
}

function goOutsourcingOrder(record) {
  if (!record.outsourcingOrderId) return
  router.push(`/procurement/outsourcing-orders/${record.outsourcingOrderId}`)
}

function formatQty(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Number(n.toFixed(6)).toString()
}

function truncate(text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}
</script>

<style lang="less" scoped>
.outsourcing-issue-page {
  padding: 0;
}

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 4px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
  border: 1px solid #f0f0f0;
}

.table-toolbar {
  margin-bottom: 12px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 12px;
}

.page-summary {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
