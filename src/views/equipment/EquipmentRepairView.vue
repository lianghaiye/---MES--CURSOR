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
                placeholder="单号/设备/故障"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="来源">
              <a-select
                v-model:value="filters.source"
                allow-clear
                size="small"
                placeholder="全部"
                :options="REPAIR_SOURCE_OPTIONS"
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
        报修
      </a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="list"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1200 }"
        :pagination="{ pageSize: 10, size: 'small', showTotal: (t) => `共 ${t} 条` }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'source'">
            <a-tag>{{ record.source }}</a-tag>
          </template>
          <template v-else-if="column.key === 'faultDesc'">
            <span :title="record.faultDesc">{{ record.faultDesc || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button
                v-if="record.status === REPAIR_STATUS.PENDING"
                type="link"
                size="small"
                @click="openHandle(record, 'dispatch')"
              >
                派工
              </a-button>
              <a-button
                v-if="record.status === REPAIR_STATUS.DOING"
                type="link"
                size="small"
                @click="openHandle(record, 'finish')"
              >
                完工
              </a-button>
              <a-button
                v-if="record.status === REPAIR_STATUS.ACCEPT"
                type="link"
                size="small"
                @click="openHandle(record, 'accept')"
              >
                验收
              </a-button>
              <span v-if="record.status === REPAIR_STATUS.CLOSED" class="muted">已关闭</span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <RepairFormModal v-model:open="createOpen" @saved="tick++" />
    <RepairHandleModal
      v-model:open="handleOpen"
      :order="current"
      :mode="handleMode"
      @saved="tick++"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { REPAIR_SOURCE_OPTIONS, REPAIR_STATUS } from '@/mock/equipmentSeed'
import { equipmentState, listRepairOrders } from '@/store/equipmentStore'
import RepairFormModal from './components/RepairFormModal.vue'
import RepairHandleModal from './components/RepairHandleModal.vue'

const filters = reactive({ keyword: '', source: undefined, status: undefined })
const applied = ref({ ...filters })
const tick = ref(0)
const createOpen = ref(false)
const handleOpen = ref(false)
const handleMode = ref('dispatch')
const current = ref(null)

const statusOpts = Object.values(REPAIR_STATUS).map((v) => ({ label: v, value: v }))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '维修单号', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '设备编码', dataIndex: 'deviceCode', width: 120 },
  { title: '设备名称', dataIndex: 'deviceName', width: 130 },
  { title: '来源', key: 'source', width: 100 },
  { title: '故障描述', key: 'faultDesc', width: 220, ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '报修人', dataIndex: 'reporter', width: 90 },
  { title: '维修人', dataIndex: 'handler', width: 90 },
  { title: '报修时间', dataIndex: 'reportedAt', width: 160 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

const list = computed(() => {
  void tick.value
  void equipmentState.repairOrders.length
  return listRepairOrders(applied.value)
})

function statusColor(status) {
  if (status === REPAIR_STATUS.CLOSED) return 'success'
  if (status === REPAIR_STATUS.PENDING) return 'warning'
  if (status === REPAIR_STATUS.DOING) return 'processing'
  if (status === REPAIR_STATUS.ACCEPT) return 'blue'
  return 'default'
}

function handleSearch() {
  applied.value = { ...filters }
}

function handleReset() {
  filters.keyword = ''
  filters.source = undefined
  filters.status = undefined
  handleSearch()
}

function openHandle(record, mode) {
  current.value = record
  handleMode.value = mode
  handleOpen.value = true
}
</script>

<style lang="less" scoped>
@import './equipment-page.less';
.muted {
  color: rgba(0, 0, 0, 0.25);
  font-size: 13px;
}
</style>
