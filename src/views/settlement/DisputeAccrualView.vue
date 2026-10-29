<template>
  <div class="dispute-accrual-page">
    <a-alert
      type="warning"
      show-icon
      class="logic-alert"
      message="争议挂账：差额=填对方主张、系统算差，挂起时确认额仍按账面；整笔=该行先整笔不付。可跨账期挂起、确认后核销。"
    />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form" :model="filters">
        <a-row :gutter="[12, 8]" style="width: 100%">
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
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="全部"
                style="width: 100%"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="挂账单号">
              <a-input v-model:value="filters.accrualNo" allow-clear size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="来源对账单">
              <a-input v-model:value="filters.settleNo" allow-clear size="small" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-space style="margin-top: 8px">
          <a-button type="primary" size="small" @click="applyFilters">查询</a-button>
          <a-button size="small" @click="resetFilters">重置</a-button>
        </a-space>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-title">争议挂账列表</div>
      <a-table
        :columns="columns"
        :data-source="rows"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'settleNo'">
            <a v-if="record.settleId" @click="openSettle(record)">{{ record.settleNo }}</a>
            <span v-else>{{ record.settleNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'diffType'">
            <a-tag color="red">{{ record.diffType || '其他' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'disputeScope'">
            <a-tag v-if="record.disputeScope === 'full'" color="red">整笔</a-tag>
            <a-tag v-else color="blue">差额</a-tag>
          </template>
          <template v-else-if="column.key === 'claimAmount'">
            {{
              record.claimAmount != null && record.claimAmount !== ''
                ? `¥ ${formatMoney(record.claimAmount)}`
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'amount'">
            <span class="amt-neg">¥ {{ formatMoney(record.amount) }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a v-if="record.status !== '已核销'" @click="openWriteOff(record)"> 核销处理 </a>
            <span v-else class="muted">{{ record.resolvedAt?.slice(0, 16) || '已核销' }}</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="writeOffOpen"
      title="争议核销处理"
      ok-text="确认闭环"
      destroy-on-close
      @ok="submitWriteOff"
    >
      <div v-if="current" class="modal-meta">
        {{ current.accrualNo }}／{{ current.supplier }}／
        {{ current.disputeScope === 'full' ? '整笔' : '差额' }}／账面 ¥
        {{ formatMoney(current.bookAmount) }}／挂出 ¥ {{ formatMoney(current.amount) }}
        <template v-if="current.claimAmount != null && current.claimAmount !== ''">
          ／主张 ¥ {{ formatMoney(current.claimAmount) }}
        </template>
        <div class="modal-sub">{{ current.diffRemark || '—' }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="处理结论" required>
          <a-radio-group v-model:value="form.result">
            <a-radio value="ours">采纳我方（按本行账面）</a-radio>
            <a-radio value="theirs">采纳对方（按对方主张）</a-radio>
            <a-radio value="split">折中（填谈妥金额）</a-radio>
            <a-radio value="cancelled">取消争议（按本行账面）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="form.result === 'split'" label="折中谈妥金额" required>
          <a-input-number v-model:value="form.agreedAmount" :precision="2" style="width: 100%" />
        </a-form-item>
        <a-form-item label="核销说明" required>
          <a-textarea v-model:value="form.resolutionRemark" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default { name: 'DisputeAccrualView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  listDisputeAccruals,
  writeOffDisputeAccrual,
  purchaseDisputeAccrualState,
  DISPUTE_ACCRUAL_STATUS,
} from '@/store/purchaseDisputeAccrualStore'
import { formatNumber } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  supplier: '',
  status: undefined,
  accrualNo: '',
  settleNo: '',
})
const applied = reactive({ ...filters })

const statusOpts = Object.values(DISPUTE_ACCRUAL_STATUS).map((v) => ({ label: v, value: v }))

const rows = computed(() => {
  void purchaseDisputeAccrualState.accruals
  return listDisputeAccruals(applied)
})

const columns = [
  { title: '挂账单号', dataIndex: 'accrualNo', key: 'accrualNo', width: 140 },
  { title: '来源对账单', key: 'settleNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 160, ellipsis: true },
  { title: '差异类型', key: 'diffType', width: 110 },
  { title: '差异说明', dataIndex: 'diffRemark', key: 'diffRemark', width: 200, ellipsis: true },
  { title: '性质', key: 'disputeScope', width: 70 },
  { title: '对方主张', key: 'claimAmount', width: 110, align: 'right' },
  { title: '挂出金额', key: 'amount', width: 100, align: 'right' },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 2)
}

function statusColor(st) {
  if (st === '已核销') return 'green'
  if (st === '部分核销') return 'blue'
  return 'orange'
}

function applyFilters() {
  Object.assign(applied, filters)
}

function resetFilters() {
  filters.supplier = ''
  filters.status = undefined
  filters.accrualNo = ''
  filters.settleNo = ''
  applyFilters()
}

function openSettle(record) {
  if (!record.settleId) return
  const path = `/settlement/purchase-settles/${record.settleId}`
  openTab(path, `采购对账 ${record.settleNo || ''}`)
  router.push(path)
}

const writeOffOpen = ref(false)
const current = ref(null)
const form = reactive({
  result: 'ours',
  agreedAmount: null,
  resolutionRemark: '',
})

function openWriteOff(record) {
  current.value = record
  form.result = 'ours'
  form.agreedAmount = Number(record.claimAmount) || 0
  form.resolutionRemark = ''
  writeOffOpen.value = true
}

function submitWriteOff() {
  if (!current.value) return
  const res = writeOffDisputeAccrual(current.value.id, {
    result: form.result,
    agreedAmount: form.agreedAmount,
    resolutionRemark: form.resolutionRemark,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  writeOffOpen.value = false
}
</script>

<style lang="less" scoped>
.dispute-accrual-page {
  padding: 0 0 16px;
}

.logic-alert {
  margin-bottom: 10px;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
}

.table-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.amt-neg {
  color: #cf1322;
  font-variant-numeric: tabular-nums;
}

.amt-pos {
  color: #1677ff;
  font-variant-numeric: tabular-nums;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.modal-meta {
  margin-bottom: 12px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  font-size: 13px;
}

.modal-sub {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
