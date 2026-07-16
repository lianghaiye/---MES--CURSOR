<template>
  <div class="customer-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-form-item label="客户名称">
          <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
            <a-button size="small" @click="handleReset">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">
        <PlusOutlined />
        新增客户
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
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
          <template v-else-if="column.key === 'priceListCount'">
            {{ (record.customerPriceList || []).length }}
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

    <CustomerFormModal v-model:open="modalOpen" :record="editRecord" @saved="handleSearch" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { customerState, deleteCustomer } from '@/store/customerStore'
import { formatDiscountRatePercent } from '@/utils/salesOrderPricing'
import CustomerFormModal from './components/CustomerFormModal.vue'

const filters = reactive({ name: '' })
const applied = reactive({ name: '' })
const modalOpen = ref(false)
const editRecord = ref(null)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '客户编码', dataIndex: 'code', width: 100 },
  { title: '客户名称', dataIndex: 'name', width: 180 },
  { title: '价目等级', dataIndex: 'priceLevel', width: 90 },
  { title: '默认折扣', key: 'defaultDiscountRate', width: 90 },
  { title: '协议价条目', key: 'priceListCount', width: 100, align: 'right' },
  { title: '状态', dataIndex: 'status', width: 80 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'actions', width: 120 },
]

const filteredList = computed(() => {
  const kw = applied.name.trim()
  return customerState.customers.filter((item) => !kw || item.name.includes(kw))
})

function formatDiscount(rate) {
  if (!rate || rate >= 1) return '无折扣'
  return formatDiscountRatePercent(rate)
}

function handleSearch() {
  applied.name = filters.name.trim()
}

function handleReset() {
  filters.name = ''
  applied.name = ''
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
    content: `确定删除客户「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deleteCustomer(record.id)
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
.customer-page {
  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .toolbar-row {
    margin-bottom: 12px;
  }
  .danger-link {
    color: #ff4d4f;
  }
}
</style>
