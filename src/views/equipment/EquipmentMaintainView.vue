<template>
  <div class="eq-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="关键字">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="单号/设备"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="保养类型">
              <a-select
                v-model:value="filters.maintainType"
                allow-clear
                size="small"
                placeholder="全部"
                :options="MAINTAIN_TYPE_OPTIONS"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="全部"
                :options="statusOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-space>
              <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
              <a-button size="small" @click="handleReset">清空</a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="createOpen = true">
        <PlusOutlined />
        新建保养工单
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="list"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showTotal: (t) => `共 ${t} 条` }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === MAINTAIN_ORDER_STATUS.DONE ? 'success' : 'processing'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'maintainType'">
            <a-tag>{{ record.maintainType }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="record.status !== MAINTAIN_ORDER_STATUS.DONE"
              type="link"
              size="small"
              @click="openExecute(record)"
            >
              执行
            </a-button>
            <span v-else class="muted">已完成</span>
          </template>
        </template>
      </a-table>
    </div>

    <MaintainOrderFormModal v-model:open="createOpen" @saved="tick++" />
    <MaintainOrderExecuteModal v-model:open="execOpen" :order="current" @saved="tick++" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { MAINTAIN_ORDER_STATUS, MAINTAIN_TYPE_OPTIONS } from '@/mock/equipmentSeed'
import { equipmentState, listMaintainOrders } from '@/store/equipmentStore'
import MaintainOrderFormModal from './components/MaintainOrderFormModal.vue'
import MaintainOrderExecuteModal from './components/MaintainOrderExecuteModal.vue'

const filters = reactive({ keyword: '', maintainType: undefined, status: undefined })
const applied = ref({ ...filters })
const tick = ref(0)
const createOpen = ref(false)
const execOpen = ref(false)
const current = ref(null)

const statusOpts = Object.values(MAINTAIN_ORDER_STATUS).map((v) => ({ label: v, value: v }))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '保养单号', dataIndex: 'orderNo', width: 140 },
  { title: '设备编码', dataIndex: 'deviceCode', width: 120 },
  { title: '设备名称', dataIndex: 'deviceName', width: 140 },
  { title: '保养类型', key: 'maintainType', width: 110 },
  { title: '计划日期', dataIndex: 'planDate', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '操作', key: 'action', width: 90 },
]

const list = computed(() => {
  void tick.value
  void equipmentState.maintainOrders.length
  return listMaintainOrders(applied.value)
})

function handleSearch() {
  applied.value = { ...filters }
}

function handleReset() {
  filters.keyword = ''
  filters.maintainType = undefined
  filters.status = undefined
  handleSearch()
}

function openExecute(record) {
  current.value = record
  execOpen.value = true
}
</script>

<style lang="less" scoped>
@import './equipment-page.less';
.muted {
  color: rgba(0, 0, 0, 0.25);
  font-size: 13px;
}
</style>
