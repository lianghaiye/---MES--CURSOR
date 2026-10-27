<template>
  <div class="sales-contract-page list-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="合同状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="contractStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="签署状态">
              <a-select
                v-model:value="filters.signStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="contractSignStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="合同类型">
              <a-select
                v-model:value="filters.contractType"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="contractTypeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="合同编号">
              <a-input
                v-model:value="filters.contractNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="合同名称">
              <a-input
                v-model:value="filters.contractName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item :label="partyFilterLabel">
              <a-input
                v-model:value="filters.partyName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务员">
              <a-select
                v-model:value="filters.salesperson"
                allow-clear
                show-search
                placeholder="请选择"
                size="small"
                :options="salespersonOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="创建人">
              <a-input
                v-model:value="filters.creator"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="创建时间">
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
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增合同
        </a-button>
        <a-button size="small" @click="openToolbarApprove">
          <CheckOutlined />
          审核
        </a-button>
        <a-button size="small" @click="openToolbarChange">合同变更</a-button>
        <a-button size="small" @click="openToolbarComplete">完成</a-button>
        <a-button size="small" danger @click="openToolbarTerminate">终止</a-button>
        <a-button size="small" danger @click="openToolbarDelete">删除</a-button>
        <a-button size="small" @click="presetModalOpen = true">
          <SettingOutlined />
          预设收付款节点
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
          共计 {{ filteredList.length }} 条合同。
        </span>
      </template>
    </a-alert>

    <a-tabs
      v-model:activeKey="directionTab"
      size="small"
      class="list-status-tabs"
      @change="onDirectionTabChange"
    >
      <a-tab-pane key="全部" tab="全部" />
      <a-tab-pane key="收入" tab="收入合同" />
      <a-tab-pane key="支出" tab="支出合同" />
    </a-tabs>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :row-selection="rowSelection"
        :pagination="false"
        :scroll="{ x: 2600 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'contractNo'">
            <a class="link-code" @click="goDetail(record)">{{ record.contractNo }}</a>
          </template>
          <template v-else-if="column.dataIndex === 'cashDirection'">
            {{ record.cashDirection || '收入' }}
          </template>
          <template v-else-if="column.dataIndex === 'contractCategory'">
            {{ record.contractCategory || '—' }}
          </template>
          <template v-else-if="column.key === 'partyName'">
            {{ partyName(record) || '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag :color="contractPaymentStatusColor(paymentInfo(record).paymentStatus)">
              {{ paymentInfo(record).paymentStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'signStatus'">
            <a-tag :color="contractSignStatusColor(displaySignStatus(record))">{{
              displaySignStatus(record)
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'changeStatus'">
            <template v-if="resolveChangeStatus(record) === '-'">-</template>
            <a-tag v-else :color="changeStatusColor(resolveChangeStatus(record))">
              {{ resolveChangeStatus(record) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'signer'">
            {{ record.signedBy || record.signer || '—' }}
          </template>
          <template v-else-if="column.key === 'signedAt'">
            {{ record.signedAt ? String(record.signedAt).slice(0, 10) : '—' }}
          </template>
          <template v-else-if="column.key === 'quota'">
            <span v-if="quotaText(record)">{{ quotaText(record) }}</span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'paymentNodes'">
            {{ paymentInfo(record).nodeProgress || '—' }}
          </template>
          <template v-else-if="column.key === 'unpaidTotal'">
            {{ formatMoney(paymentInfo(record).unpaidTotal) }}
          </template>
          <template v-else-if="column.key === 'paidTotal'">
            {{ formatMoney(paymentInfo(record).paidTotal) }}
          </template>
          <template v-else-if="column.key === 'allowExceedQuota'">
            {{ record.allowExceedQuota !== false ? '允许超额度' : '不允许超额度' }}
          </template>
          <template v-else-if="column.key === 'validRange'">
            {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
          </template>
          <template v-else-if="column.key === 'sourceType'">
            {{ resolveContractSource(record) }}
          </template>
          <template v-else-if="column.key === 'creator'">
            {{ record.creator || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'approvedBy'">
            {{ record.approvedBy || '—' }}
          </template>
          <template v-else-if="column.key === 'approvedAt'">
            {{ record.approvedAt || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8" wrap>
              <a v-if="canEditSalesContract(record)" @click="openEdit(record)">编辑</a>
              <a
                v-if="canSubmitSalesContract(record) || canResubmitSalesContract(record)"
                @click="handleSubmit(record)"
              >
                {{ canResubmitSalesContract(record) ? '重新提交' : '提交审核' }}
              </a>
              <a v-if="canWithdrawSalesContract(record)" @click="handleWithdraw(record)">撤回</a>
              <a v-if="canApproveSalesContract(record)" @click="openApprove(record)">审核</a>
              <a v-if="canMarkContractSigned(record)" @click="openSignModal(record)">确认签署</a>
              <a
                v-if="canDeleteSalesContract(record)"
                class="danger-link"
                @click="handleDelete(record)"
              >
                删除
              </a>
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

    <SalesContractFormModal v-model:open="modalOpen" :record="editRecord" @saved="onSaved" />
    <SalesContractSignModal
      v-model:open="signModalOpen"
      :contract="signRecord"
      @signed="onSigned"
    />
    <ContractPaymentNodePresetModal v-model:open="presetModalOpen" />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Modal, message } from 'ant-design-vue'
import {
  CheckOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { salespersonOptions } from '@/mock/salesOrderOptions'
import {
  canApproveSalesContract,
  canCompleteSalesContract,
  canDeleteSalesContract,
  canEditSalesContract,
  canMarkContractSigned,
  canResubmitSalesContract,
  canSubmitSalesContract,
  canWithdrawSalesContract,
  completeSalesContract,
  deleteSalesContract,
  getContractQuotaSummary,
  resolveContractSignStatus,
  salesContractState,
  submitSalesContract,
  terminateSalesContract,
  withdrawSalesContract,
} from '@/store/salesContractStore'
import { buildContractPaymentSummary, salesPaymentState } from '@/store/salesPaymentStore'
import {
  canCreateContractChange,
  resolveSalesContractChangeStatus,
  salesContractChangeStatusLabelColor,
  salesContractChangeState,
} from '@/store/salesContractChangeStore'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_SIGN_STATUS,
  CONTRACT_STATUS,
  getContractPartyName,
  contractPaymentStatusColor,
  contractSignStatusColor,
  contractSignStatusOptions,
  contractStatusColor,
  contractStatusOptions,
  contractTypeOptions,
  resolveContractSource,
} from '@/constants/salesContract'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import SalesContractFormModal from './components/SalesContractFormModal.vue'
import SalesContractSignModal from './components/SalesContractSignModal.vue'
import ContractPaymentNodePresetModal from './components/ContractPaymentNodePresetModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const modalOpen = ref(false)
const editRecord = ref(null)
const signModalOpen = ref(false)
const signRecord = ref(null)
const presetModalOpen = ref(false)
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const directionTab = ref('全部')

const partyFilterLabel = computed(() => {
  if (directionTab.value === CONTRACT_CASH_DIRECTION.EXPENSE) return '供应商'
  if (directionTab.value === CONTRACT_CASH_DIRECTION.INCOME) return '客户'
  return '相对方'
})

const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const filters = reactive({
  status: undefined,
  signStatus: undefined,
  contractType: undefined,
  contractNo: '',
  contractName: '',
  partyName: '',
  salesperson: undefined,
  creator: '',
  createdRange: null,
})
const appliedFilters = ref({
  ...filters,
  createdRange: null,
})

function applyFiltersFromRouteQuery() {
  const status = String(route.query.status || '').trim()
  if (!status) return
  filters.status = status
  appliedFilters.value = { ...filters, createdRange: filters.createdRange }
  pagination.current = 1
}

watch(
  () => route.query.status,
  () => applyFiltersFromRouteQuery(),
  { immediate: true },
)

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '收付款状态', key: 'paymentStatus', width: 100 },
  { title: '合同编号', key: 'contractNo', width: 150, fixed: 'left' },
  { title: '合同名称', dataIndex: 'contractName', width: 180, ellipsis: true },
  { title: '收支方向', dataIndex: 'cashDirection', width: 90 },
  { title: '类别', dataIndex: 'contractCategory', width: 80 },
  { title: '类型', dataIndex: 'contractType', width: 100 },
  { title: '签署', key: 'signStatus', width: 90 },
  { title: '变更状态', key: 'changeStatus', width: 100 },
  { title: '签署人', key: 'signer', width: 90 },
  { title: '签署日期', key: 'signedAt', width: 110 },
  { title: '相对方', key: 'partyName', width: 160, ellipsis: true },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '额度执行', key: 'quota', width: 200 },
  { title: '收付款节点', key: 'paymentNodes', width: 90 },
  { title: '待收/付款', key: 'unpaidTotal', width: 120, align: 'right' },
  { title: '已收/付款', key: 'paidTotal', width: 120, align: 'right' },
  { title: '超额度', key: 'allowExceedQuota', width: 110 },
  { title: '账期天数', dataIndex: 'paymentTermDays', width: 90 },
  { title: '有效期', key: 'validRange', width: 200 },
  { title: '来源', key: 'sourceType', width: 90 },
  { title: '创建人', key: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 140 },
  { title: '审核人', key: 'approvedBy', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 140 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function inCreatedRange(createdAt, range) {
  if (!range || !range[0] || !range[1]) return true
  const t = dayjs(createdAt)
  if (!t.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end))
}

const filteredList = computed(() => {
  void salesContractState.contracts
  void salesPaymentState.payments
  void salesPaymentState.plans
  const f = appliedFilters.value
  const no = String(f.contractNo || '')
    .trim()
    .toLowerCase()
  const name = String(f.contractName || '')
    .trim()
    .toLowerCase()
  const party = String(f.partyName || '')
    .trim()
    .toLowerCase()
  const creator = String(f.creator || '')
    .trim()
    .toLowerCase()
  const tab = directionTab.value
  return salesContractState.contracts.filter((item) => {
    if (
      tab === CONTRACT_CASH_DIRECTION.INCOME &&
      item.cashDirection !== CONTRACT_CASH_DIRECTION.INCOME
    )
      return false
    if (
      tab === CONTRACT_CASH_DIRECTION.EXPENSE &&
      item.cashDirection !== CONTRACT_CASH_DIRECTION.EXPENSE
    )
      return false
    if (f.contractType && item.contractType !== f.contractType) return false
    if (f.status && item.status !== f.status) return false
    if (f.signStatus && displaySignStatus(item) !== f.signStatus) return false
    if (f.salesperson && item.salesperson !== f.salesperson) return false
    if (
      no &&
      !String(item.contractNo || '')
        .toLowerCase()
        .includes(no)
    )
      return false
    if (
      name &&
      !String(item.contractName || '')
        .toLowerCase()
        .includes(name)
    )
      return false
    if (
      party &&
      !String(partyName(item) || '')
        .toLowerCase()
        .includes(party)
    )
      return false
    if (
      creator &&
      !String(item.creator || '')
        .toLowerCase()
        .includes(creator)
    )
      return false
    if (!inCreatedRange(item.createdAt, f.createdRange)) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.signStatus = undefined
  filters.contractType = undefined
  filters.contractNo = ''
  filters.contractName = ''
  filters.partyName = ''
  filters.salesperson = undefined
  filters.creator = ''
  filters.createdRange = null
  handleSearch()
}

function quotaText(record) {
  const q = getContractQuotaSummary(record)
  if (q.limitAmount == null && q.limitQty == null) return ''
  const parts = []
  if (q.limitAmount != null) {
    parts.push(`金额 ${q.executedAmount}/${q.limitAmount}`)
  }
  if (q.limitQty != null) {
    parts.push(`数量 ${q.executedQty}/${q.limitQty}`)
  }
  return parts.join('，')
}

function paymentInfo(record) {
  void salesPaymentState.payments
  void salesPaymentState.plans
  const s = buildContractPaymentSummary(record)
  return {
    paymentStatus: s?.paymentStatus || '—',
    nodeProgress: s?.nodeProgress || '—',
    unpaidTotal: s?.unpaidTotal ?? 0,
    paidTotal: s?.paidTotal ?? 0,
  }
}

function displaySignStatus(record) {
  return resolveContractSignStatus(record) || CONTRACT_SIGN_STATUS.UNSIGNED
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getSelectedContract() {
  if (selectedRowKeys.value.length !== 1) return null
  return salesContractState.contracts.find((c) => c.id === selectedRowKeys.value[0]) || null
}

function partyName(record) {
  return getContractPartyName(record)
}

function onDirectionTabChange() {
  pagination.current = 1
  selectedRowKeys.value = []
}

function openCreate() {
  const page = findCreatePageByListPath('/contracts')
  if (!page) return
  const dir =
    directionTab.value === CONTRACT_CASH_DIRECTION.EXPENSE
      ? CONTRACT_CASH_DIRECTION.EXPENSE
      : CONTRACT_CASH_DIRECTION.INCOME
  openCreateTab(router, openTab, {
    path: page.newPath,
    query: { direction: dir },
  })
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function goDetail(record) {
  const path = `/contracts/${record.id}`
  openTab(path, `合同 ${record.contractNo || ''}`.trim())
  router.push(path)
}

function openApprove(record) {
  if (!canApproveSalesContract(record)) {
    message.warning('仅「待审」合同可审核')
    return
  }
  const path = `/contracts/${record.id}/approve`
  openTab(path, `审核合同 ${record.contractNo || ''}`.trim())
  router.push({ name: 'sales-contracts-approve', params: { id: record.id } })
}

function openToolbarApprove() {
  const row = getSelectedContract()
  if (!row) {
    message.warning('请勾选一条待审合同')
    return
  }
  openApprove(row)
}

function resolveChangeStatus(record) {
  void salesContractChangeState.changes
  return resolveSalesContractChangeStatus(record?.id)
}

function changeStatusColor(label) {
  return salesContractChangeStatusLabelColor(label)
}

function openContractChangePage(contractId) {
  const query = contractId ? { contractId } : undefined
  openCreateTab(router, openTab, {
    path: '/contracts/changes/new',
    title: '发起合同变更',
    query,
  })
}

function openToolbarChange() {
  const row = getSelectedContract()
  if (!row) {
    openContractChangePage()
    return
  }
  const guard = canCreateContractChange(row)
  if (!guard.ok) {
    message.warning(guard.message)
    return
  }
  openContractChangePage(row.id)
}

function openToolbarComplete() {
  const row = getSelectedContract()
  if (!row || !canCompleteSalesContract(row)) {
    message.warning('请勾选一条可完成的合同')
    return
  }
  handleComplete(row)
}

function openToolbarTerminate() {
  const row = getSelectedContract()
  if (!row || row.status !== CONTRACT_STATUS.ACTIVE) {
    message.warning('请勾选一条生效中的合同')
    return
  }
  handleTerminate(row)
}

function openToolbarDelete() {
  const row = getSelectedContract()
  if (!row) {
    message.warning('请勾选一条可删除的合同')
    return
  }
  handleDelete(row)
}

function onSaved() {
  /* reactive list */
}

function onSigned() {
  /* reactive list */
}

function openSignModal(record) {
  signRecord.value = record
  signModalOpen.value = true
}

function handleSubmit(record) {
  const res = submitSalesContract(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
}

function handleWithdraw(record) {
  Modal.confirm({
    title: '撤回提交',
    content: `确认撤回合同「${record.contractNo}」？撤回后变为草稿。`,
    onOk: () => {
      const res = withdrawSalesContract(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function handleComplete(record) {
  const pay = paymentInfo(record)
  const unpaid = Number(pay.unpaidTotal) || 0
  const tip =
    unpaid > 0
      ? `确认将合同「${record.contractNo}」标记为已完成？\n仍有待回款 ¥${formatMoney(unpaid)}，完成后仍可继续登记回款。`
      : `确认将合同「${record.contractNo}」标记为已完成？`
  Modal.confirm({
    title: '完成合同',
    content: tip,
    onOk: () => {
      const res = completeSalesContract(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已标记为已完成')
    },
  })
}

function handleTerminate(record) {
  Modal.confirm({
    title: '终止合同',
    content: `确认终止合同「${record.contractNo}」？`,
    okType: 'danger',
    onOk: () => {
      const res = terminateSalesContract(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已终止')
    },
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除合同「${record.contractNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteSalesContract(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.sales-contract-page {
  .list-status-tabs {
    margin-bottom: 0;
    background: #fff;
    border: 1px solid var(--divider, #e5e6eb);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    padding: 0 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    :deep(.ant-tabs-nav) {
      margin: 0;
    }

    :deep(.ant-tabs-nav::before) {
      border-bottom-color: #f0f0f0;
    }
  }

  .list-status-tabs + .table-card {
    border-radius: 0 0 6px 6px;
  }

  .danger-link {
    color: #ff4d4f;
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
