<template>
  <div class="framework-contract-page">
    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        新增框架合同
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="frameworkContractState.contracts"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'defaultDiscountRate'">
            {{ formatDiscount(record.defaultDiscountRate) }}
          </template>
          <template v-else-if="column.key === 'validRange'">
            {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <FrameworkContractFormModal v-model:open="modalOpen" :record="editRecord" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { frameworkContractState, deleteFrameworkContract } from '@/store/frameworkContractStore'
import { formatDiscountRatePercent } from '@/utils/salesOrderPricing'
import FrameworkContractFormModal from './components/FrameworkContractFormModal.vue'

const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '合同编号', dataIndex: 'contractNo', width: 150 },
  { title: '合同名称', dataIndex: 'contractName', width: 180 },
  { title: '客户名称', dataIndex: 'customerName', width: 160 },
  { title: '默认折扣', key: 'defaultDiscountRate', width: 90 },
  { title: '有效期', key: 'validRange', width: 200 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', key: 'actions', width: 120 },
]

function formatDiscount(rate) {
  if (!rate || rate >= 1) return '无折扣'
  return formatDiscountRatePercent(rate)
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除框架合同「${record.contractNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteFrameworkContract(record.id)
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
.framework-contract-page {
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
  }
  .toolbar-row {
    margin-bottom: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
}
</style>
