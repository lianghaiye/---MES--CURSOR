<template>
  <div class="contract-change-page">
    <div class="toolbar-row">
      <a-space>
        <a-select
          v-model:value="filters.status"
          allow-clear
          size="small"
          placeholder="状态"
          style="width: 120px"
          :options="contractChangeStatusOptions"
        />
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          size="small"
          placeholder="变更单号/合同号/客户"
          style="width: 220px"
        />
      </a-space>
      <span class="hint">从合同详情发起变更；此处审核、驳回、编辑草稿</span>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="contractChangeStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'diffCount'">
            {{ diffCount(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openDetail(record)">查看</a>
              <a v-if="canEdit(record)" @click="openEdit(record)">编辑</a>
              <a v-if="canSubmit(record)" @click="handleSubmit(record)">提交</a>
              <a v-if="canApprove(record)" @click="handleApprove(record)">审核生效</a>
              <a v-if="canReject(record)" class="warn-link" @click="handleReject(record)">驳回</a>
              <a v-if="canCancel(record)" class="danger-link" @click="handleCancel(record)">作废</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <SalesContractChangeFormModal v-model:open="editOpen" :record="editRecord" @saved="refresh" />

    <a-modal
      v-model:open="detailOpen"
      :title="`变更单 ${detailRecord?.changeNo || ''}`"
      width="720px"
      :footer="null"
    >
      <template v-if="detailRecord">
        <a-descriptions bordered size="small" :column="2" class="mb-12">
          <a-descriptions-item label="合同">{{ detailRecord.contractNo }}</a-descriptions-item>
          <a-descriptions-item label="客户">{{ detailRecord.customerName }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="contractChangeStatusColor(detailRecord.status)">
              {{ detailRecord.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detailRecord.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="变更原因" :span="2">
            {{ detailRecord.reason || '—' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.rejectReason" label="驳回原因" :span="2">
            {{ detailRecord.rejectReason }}
          </a-descriptions-item>
        </a-descriptions>
        <a-table
          :columns="diffColumns"
          :data-source="detailDiffRows"
          row-key="field"
          size="small"
          bordered
          :pagination="false"
        />
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  approveContractChange,
  cancelContractChange,
  diffContractSnapshots,
  formatContractChangeDiffRows,
  rejectContractChange,
  salesContractChangeState,
  submitContractChange,
} from '@/store/salesContractChangeStore'
import {
  CONTRACT_CHANGE_STATUS,
  contractChangeStatusColor,
  contractChangeStatusOptions,
} from '@/constants/salesContract'
import SalesContractChangeFormModal from './components/SalesContractChangeFormModal.vue'

const filters = reactive({
  status: undefined,
  keyword: '',
})
const editOpen = ref(false)
const editRecord = ref(null)
const detailOpen = ref(false)
const detailRecord = ref(null)
const tick = ref(0)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '变更单号', dataIndex: 'changeNo', width: 150 },
  { title: '合同编号', dataIndex: 'contractNo', width: 140 },
  { title: '合同类型', dataIndex: 'contractType', width: 100 },
  { title: '客户', dataIndex: 'customerName', width: 160, ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '变更项', key: 'diffCount', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', width: 140 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' },
]

const diffColumns = [
  { title: '字段', dataIndex: 'label', width: 120 },
  { title: '变更前', dataIndex: 'beforeText' },
  { title: '变更后', dataIndex: 'afterText' },
]

const filteredList = computed(() => {
  void salesContractChangeState.changes
  void tick.value
  const kw = String(filters.keyword || '')
    .trim()
    .toLowerCase()
  return salesContractChangeState.changes.filter((item) => {
    if (filters.status && item.status !== filters.status) return false
    if (kw) {
      const text = `${item.changeNo} ${item.contractNo} ${item.customerName}`.toLowerCase()
      if (!text.includes(kw)) return false
    }
    return true
  })
})

const detailDiffRows = computed(() => {
  if (!detailRecord.value) return []
  return formatContractChangeDiffRows(
    diffContractSnapshots(detailRecord.value.beforeSnapshot, detailRecord.value.afterSnapshot),
  )
})

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
  return (
    record.status === CONTRACT_CHANGE_STATUS.PENDING ||
    record.status === CONTRACT_CHANGE_STATUS.DRAFT
  )
}

function canReject(record) {
  return record.status === CONTRACT_CHANGE_STATUS.PENDING
}

function canCancel(record) {
  return (
    record.status === CONTRACT_CHANGE_STATUS.DRAFT ||
    record.status === CONTRACT_CHANGE_STATUS.PENDING ||
    record.status === CONTRACT_CHANGE_STATUS.REJECTED
  )
}

function openEdit(record) {
  editRecord.value = record
  editOpen.value = true
}

function openDetail(record) {
  detailRecord.value = record
  detailOpen.value = true
}

function handleSubmit(record) {
  const res = submitContractChange(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已提交审核')
  refresh()
}

function handleApprove(record) {
  Modal.confirm({
    title: '审核变更单',
    content: `确认将变更「${record.changeNo}」应用到合同「${record.contractNo}」？`,
    onOk: () => {
      const res = approveContractChange(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('变更已生效')
      refresh()
    },
  })
}

function handleReject(record) {
  Modal.confirm({
    title: '驳回变更单',
    content: `确认驳回「${record.changeNo}」？`,
    onOk: () => {
      const res = rejectContractChange(record.id, '审核驳回')
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已驳回')
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
      refresh()
    },
  })
}
</script>

<style scoped>
.contract-change-page {
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .hint {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
  .warn-link {
    color: #fa8c16;
  }
  .mb-12 {
    margin-bottom: 12px;
  }
}
</style>
