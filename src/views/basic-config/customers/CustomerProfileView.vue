<template>
  <div class="customer-profile-page">
    <div class="filter-card">
      <a-form layout="inline" :model="filters" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="客户编码">
              <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="客户名称">
              <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="客户类型">
              <a-select
                v-model:value="filters.customerTypeId"
                allow-clear
                size="small"
                placeholder="全部"
                :options="customerTypeOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="goCreate">
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
        :scroll="{ x: 1300 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'name'">
            <a class="link-name" @click.prevent="goDetail(record)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'customerTypeId'">
            {{ resolveTypeName(record.customerTypeId) }}
          </template>
          <template v-else-if="column.key === 'customerGrade'">
            <a-tag :color="customerGradeColor(record.customerGrade)">{{ record.customerGrade || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'defaultDiscountRate'">
            {{ formatDiscount(record.defaultDiscountRate) }}
          </template>
          <template v-else-if="column.key === 'priceListCount'">
            {{ (record.customerPriceList || []).length }}
          </template>
          <template v-else-if="column.key === 'dataStatus'">
            <a-tag :color="customerDataStatusColor(record.dataStatus)">{{ record.dataStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="goEdit(record)">编辑</a>
              <a class="danger-link" @click="handleDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { customerState, deleteCustomer } from '@/store/customerStore'
import { getCustomerTypeById, getCustomerTypeOptions } from '@/store/customerTypeStore'
import { customerGradeColor, customerDataStatusColor } from '@/constants/customerMaster'
import { formatDiscountRatePercent } from '@/utils/salesOrderPricing'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({ code: '', name: '', customerTypeId: undefined })
const applied = reactive({ code: '', name: '', customerTypeId: undefined })

const customerTypeOpts = computed(() => getCustomerTypeOptions())

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '客户编码', dataIndex: 'code', width: 120 },
  { title: '客户名称', key: 'name', width: 180 },
  { title: '客户简称', dataIndex: 'shortName', width: 120, ellipsis: true },
  { title: '客户类型', key: 'customerTypeId', width: 100 },
  { title: '客户分级', key: 'customerGrade', width: 90 },
  { title: '价目等级', dataIndex: 'priceLevel', width: 90 },
  { title: '默认折扣', key: 'defaultDiscountRate', width: 90 },
  { title: '协议价条目', key: 'priceListCount', width: 100, align: 'right' },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '数据状态', key: 'dataStatus', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const filteredList = computed(() => {
  void customerState.customers
  return customerState.customers.filter((item) => {
    if (applied.code && !String(item.code || '').includes(applied.code)) return false
    if (applied.name && !String(item.name || '').includes(applied.name)) return false
    if (applied.customerTypeId && item.customerTypeId !== applied.customerTypeId) return false
    return true
  })
})

function resolveTypeName(typeId) {
  return getCustomerTypeById(typeId)?.name || '—'
}

function formatDiscount(rate) {
  if (!rate || rate >= 1) return '无折扣'
  return formatDiscountRatePercent(rate)
}

function handleSearch() {
  applied.code = filters.code.trim()
  applied.name = filters.name.trim()
  applied.customerTypeId = filters.customerTypeId
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.customerTypeId = undefined
  handleSearch()
}

function goCreate() {
  const path = '/basic-config/customers/new'
  openTab(path, '新增客户')
  router.push(path)
}

function goEdit(record) {
  const path = `/basic-config/customers/${record.id}/edit`
  openTab(path, '编辑客户')
  router.push(path)
}

function goDetail(record) {
  const path = `/basic-config/customers/${record.id}`
  openTab(path, record.name || '客户详情')
  router.push(path)
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
.customer-profile-page {
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
  .link-name {
    color: #1677ff;
  }
  .danger-link {
    color: #ff4d4f;
  }
}
</style>
