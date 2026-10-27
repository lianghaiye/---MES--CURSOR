<template>
  <div class="contract-change-page list-page">
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
                :options="contractChangeStatusOptions"
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
            <a-form-item label="相对方">
              <a-input
                v-model:value="filters.partyName"
                allow-clear
                placeholder="请输入"
                size="small"
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
        <a-button size="small" danger @click="openToolbarCancel">作废</a-button>
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
        :scroll="{ x: 1600 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="contractChangeStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'changeNo'">
            <a class="link-code" @click="openDetail(record)">{{ record.changeNo }}</a>
          </template>
          <template v-else-if="column.key === 'partyName'">
            {{ changePartyName(record) || '—' }}
          </template>
          <template v-else-if="column.key === 'diffCount'">
            {{ diffCount(record) }}
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
              <a v-if="canEdit(record)" @click="openEdit(record)">编辑</a>
              <a v-if="canSubmit(record)" @click="handleSubmit(record)">提交</a>
              <a v-if="canApprove(record)" @click="openApprove(record)">审核</a>
              <a v-if="canWithdraw(record)" @click="handleWithdraw(record)">撤回</a>
              <a v-if="canCancel(record)" class="danger-link" @click="handleCancel(record)">作废</a>
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
import { Modal, message } from 'ant-design-vue'
import { CheckOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  cancelContractChange,
  diffContractSnapshots,
  salesContractChangeState,
  submitContractChange,
  withdrawContractChange,
} from '@/store/salesContractChangeStore'
import {
  CONTRACT_CHANGE_STATUS,
  contractChangeStatusColor,
  contractChangeStatusOptions,
  contractTypeOptions,
} from '@/constants/salesContract'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  changeNo: '',
  partyName: '',
  contractNo: '',
  contractName: '',
  contractType: undefined,
  creator: '',
  createdRange: null,
})
const appliedFilters = ref({ ...filters, createdRange: null })
const pagination = reactive({ current: 1, pageSize: 10 })
const selectedRowKeys = ref([])
const tick = ref(0)

function changePartyName(item) {
  const snap = item?.afterSnapshot || item?.beforeSnapshot || {}
  return snap.supplierName || item.supplierName || snap.customerName || item.customerName || ''
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function getSelectedChange() {
  if (selectedRowKeys.value.length !== 1) return null
  return salesContractChangeState.changes.find((c) => c.id === selectedRowKeys.value[0]) || null
}

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '变更单号', key: 'changeNo', width: 150, fixed: 'left' },
  { title: '合同编号', dataIndex: 'contractNo', width: 140 },
  { title: '合同类型', dataIndex: 'contractType', width: 100 },
  { title: '相对方', key: 'partyName', width: 160, ellipsis: true },
  { title: '合同名称', dataIndex: 'contractName', width: 160, ellipsis: true },
  { title: '变更项数', key: 'diffCount', width: 90 },
  { title: '发起人', key: 'creator', width: 90 },
  { title: '发起时间', key: 'createdAt', width: 140 },
  { title: '审核人', key: 'approvedBy', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 140 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

function inCreatedRange(createdAt, range) {
  if (!range || !range[0] || !range[1]) return true
  const t = dayjs(createdAt)
  if (!t.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end))
}

const filteredList = computed(() => {
  void salesContractChangeState.changes
  void tick.value
  const f = appliedFilters.value
  const changeNo = String(f.changeNo || '')
    .trim()
    .toLowerCase()
  const party = String(f.partyName || '')
    .trim()
    .toLowerCase()
  const contractNo = String(f.contractNo || '')
    .trim()
    .toLowerCase()
  const contractName = String(f.contractName || '')
    .trim()
    .toLowerCase()
  const creator = String(f.creator || '')
    .trim()
    .toLowerCase()
  return salesContractChangeState.changes.filter((item) => {
    if (f.status && item.status !== f.status) return false
    if (f.contractType && item.contractType !== f.contractType) return false
    if (
      changeNo &&
      !String(item.changeNo || '')
        .toLowerCase()
        .includes(changeNo)
    )
      return false
    if (
      party &&
      !String(changePartyName(item) || '')
        .toLowerCase()
        .includes(party)
    )
      return false
    if (
      contractNo &&
      !String(item.contractNo || '')
        .toLowerCase()
        .includes(contractNo)
    )
      return false
    if (
      contractName &&
      !String(item.contractName || '')
        .toLowerCase()
        .includes(contractName)
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
  appliedFilters.value = {
    ...filters,
    createdRange: filters.createdRange ? [...filters.createdRange] : null,
  }
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.changeNo = ''
  filters.partyName = ''
  filters.contractNo = ''
  filters.contractName = ''
  filters.contractType = undefined
  filters.creator = ''
  filters.createdRange = null
  handleSearch()
}

function refresh() {
  tick.value += 1
}

function diffCount(record) {
  return diffContractSnapshots(record.beforeSnapshot, record.afterSnapshot).length
}

function canEdit(record) {
  return (
    record.status === CONTRACT_CHANGE_STATUS.DRAFT ||
    record.status === CONTRACT_CHANGE_STATUS.REJECTED
  )
}

function canSubmit(record) {
  return canEdit(record)
}

function canApprove(record) {
  return record.status === CONTRACT_CHANGE_STATUS.PENDING
}

function canWithdraw(record) {
  return record.status === CONTRACT_CHANGE_STATUS.PENDING
}

function canCancel(record) {
  return (
    record.status === CONTRACT_CHANGE_STATUS.DRAFT ||
    record.status === CONTRACT_CHANGE_STATUS.REJECTED
  )
}

function openEdit(record) {
  const path = `/contracts/changes/${record.id}/edit`
  openTab(path, `编辑变更 ${record.changeNo || ''}`.trim())
  router.push(path)
}

function openDetail(record) {
  const path = `/contracts/changes/${record.id}`
  openTab(path, `变更单 ${record.changeNo || ''}`.trim())
  router.push(path)
}

function openInitiateChange() {
  openCreateTab(router, openTab, {
    path: '/contracts/changes/new',
    title: '发起合同变更',
  })
}

function openApprove(record) {
  const path = `/contracts/changes/${record.id}/approve`
  openTab(path, `审核变更 ${record.changeNo || ''}`.trim())
  router.push(path)
}

function openToolbarApprove() {
  const row = getSelectedChange()
  if (!row) {
    message.warning('请勾选一条待审变更单')
    return
  }
  if (!canApprove(row)) {
    message.warning('仅「待审」的变更单可审核，请先提交')
    return
  }
  openApprove(row)
}

function openToolbarCancel() {
  const row = getSelectedChange()
  if (!row) {
    message.warning('请勾选一条可作废的变更单')
    return
  }
  if (!canCancel(row)) {
    message.warning('待审变更单请先撤回后再作废')
    return
  }
  handleCancel(row)
}

function handleSubmit(record) {
  const res = submitContractChange(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message || '已提交审核')
  refresh()
}

function handleWithdraw(record) {
  Modal.confirm({
    title: '撤回变更单',
    content: `确认撤回「${record.changeNo}」？撤回后变为草稿，可继续编辑或作废。`,
    onOk: () => {
      const res = withdrawContractChange(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已撤回为草稿')
      refresh()
    },
  })
}

function handleCancel(record) {
  Modal.confirm({
    title: '作废变更单',
    content: `确认作废「${record.changeNo}」？`,
    okType: 'danger',
    onOk: () => {
      const res = cancelContractChange(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已作废')
      selectedRowKeys.value = []
      refresh()
    },
  })
}
</script>

<style lang="less" scoped>
.contract-change-page {
  .danger-link {
    color: #ff4d4f;
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .mb-12 {
    margin-bottom: 12px;
  }

  .field-tip {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
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
