<template>
  <div class="sales-contract-page">
    <div class="toolbar-row">
      <a-space>
        <a-button type="primary" size="small" @click="openCreate(CONTRACT_TYPE.STANDARD)">
          <PlusOutlined />
          新增标准合同
        </a-button>
        <a-button size="small" @click="openCreate(CONTRACT_TYPE.FRAMEWORK)">
          <PlusOutlined />
          新增框架合同
        </a-button>
      </a-space>
      <a-space>
        <a-select
          v-model:value="filters.contractType"
          allow-clear
          size="small"
          placeholder="合同类型"
          style="width: 120px"
          :options="contractTypeOptions"
        />
        <a-select
          v-model:value="filters.status"
          allow-clear
          size="small"
          placeholder="状态"
          style="width: 110px"
          :options="contractStatusOptions"
        />
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          size="small"
          placeholder="合同号/名称/客户"
          style="width: 200px"
        />
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'contractNo'">
            <a @click="goDetail(record)">{{ record.contractNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'quota'">
            <span v-if="quotaText(record)">{{ quotaText(record) }}</span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'allowExceedQuota'">
            {{ record.allowExceedQuota !== false ? '允许超额度' : '不允许超额度' }}
          </template>
          <template v-else-if="column.key === 'validRange'">
            {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="goDetail(record)">详情</a>
              <a v-if="canEdit(record)" @click="openEdit(record)">编辑</a>
              <a v-if="canApprove(record)" @click="handleApprove(record)">审核生效</a>
              <a v-if="canTerminate(record)" class="danger-link" @click="handleTerminate(record)">
                终止
              </a>
              <a v-if="canDelete(record)" class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <SalesContractFormModal v-model:open="modalOpen" :record="editRecord" @saved="onSaved" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  approveSalesContract,
  deleteSalesContract,
  getContractQuotaSummary,
  salesContractState,
  terminateSalesContract,
} from '@/store/salesContractStore'
import {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  contractStatusColor,
  contractStatusOptions,
  contractTypeOptions,
} from '@/constants/salesContract'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import SalesContractFormModal from './components/SalesContractFormModal.vue'

const router = useRouter()
const { openTab } = useTabs()
const modalOpen = ref(false)
const editRecord = ref(null)

const filters = reactive({
  contractType: undefined,
  status: undefined,
  keyword: '',
})

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '合同编号', key: 'contractNo', width: 150, fixed: 'left' },
  { title: '合同名称', dataIndex: 'contractName', width: 180, ellipsis: true },
  { title: '类型', dataIndex: 'contractType', width: 100 },
  { title: '客户', dataIndex: 'customerName', width: 160, ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '额度执行', key: 'quota', width: 200 },
  { title: '超额度', key: 'allowExceedQuota', width: 110 },
  { title: '账期起算', dataIndex: 'paymentTermStart', width: 100 },
  { title: '账期天数', dataIndex: 'paymentTermDays', width: 90 },
  { title: '有效期', key: 'validRange', width: 200 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const filteredList = computed(() => {
  void salesContractState.contracts
  const kw = String(filters.keyword || '')
    .trim()
    .toLowerCase()
  return salesContractState.contracts.filter((item) => {
    if (filters.contractType && item.contractType !== filters.contractType) return false
    if (filters.status && item.status !== filters.status) return false
    if (kw) {
      const text = `${item.contractNo} ${item.contractName} ${item.customerName}`.toLowerCase()
      if (!text.includes(kw)) return false
    }
    return true
  })
})

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

function canEdit(record) {
  return record.status === CONTRACT_STATUS.DRAFT || record.status === CONTRACT_STATUS.PENDING
}

function canApprove(record) {
  return record.status === CONTRACT_STATUS.DRAFT || record.status === CONTRACT_STATUS.PENDING
}

function canTerminate(record) {
  return record.status === CONTRACT_STATUS.ACTIVE
}

function canDelete(record) {
  return record.status === CONTRACT_STATUS.DRAFT || record.status === CONTRACT_STATUS.TERMINATED
}

function openCreate(type) {
  const page = findCreatePageByListPath('/sales/contracts')
  if (!page) return
  const title = type === CONTRACT_TYPE.STANDARD ? '新增标准合同' : '新增框架合同'
  openCreateTab(router, openTab, {
    path: page.newPath,
    title,
    query: { type },
  })
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function goDetail(record) {
  router.push(`/sales/contracts/${record.id}`)
}

function onSaved() {
  /* reactive list */
}

function handleApprove(record) {
  Modal.confirm({
    title: '审核生效',
    content: `确认将合同「${record.contractNo}」审核为生效中？`,
    onOk: () => {
      const res = approveSalesContract(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('合同已生效')
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

<style scoped>
.sales-contract-page {
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
}
</style>
