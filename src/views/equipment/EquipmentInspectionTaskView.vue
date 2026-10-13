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
                placeholder="任务号/设备"
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
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="计划日期">
              <a-date-picker
                v-model:value="filters.planDate"
                value-format="YYYY-MM-DD"
                size="small"
                style="width: 100%"
                allow-clear
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
      <a-button type="primary" size="small" @click="handleGenerate">
        <PlusOutlined />
        生成今日点检任务
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
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="record.status === INSPECTION_TASK_STATUS.PENDING"
              type="link"
              size="small"
              @click="openExecute(record)"
            >
              执行
            </a-button>
            <a-button v-else type="link" size="small" @click="openDetail(record)">查看</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <InspectionTaskExecuteModal v-model:open="execOpen" :task="current" @saved="tick++" />

    <a-modal v-model:open="detailOpen" title="点检结果" :footer="null" width="640px">
      <template v-if="current">
        <p>任务号：{{ current.taskNo }} · 执行人：{{ current.executor || '—' }}</p>
        <a-table
          size="small"
          bordered
          :pagination="false"
          :data-source="current.results || []"
          row-key="itemId"
          :columns="resultColumns"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ok'">
              <a-tag :color="record.ok ? 'success' : 'error'">
                {{ record.ok ? '正常' : '异常' }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { INSPECTION_TASK_STATUS } from '@/mock/equipmentSeed'
import {
  equipmentState,
  generateInspectionTasksForToday,
  listInspectionTasks,
} from '@/store/equipmentStore'
import InspectionTaskExecuteModal from './components/InspectionTaskExecuteModal.vue'

const filters = reactive({ keyword: '', status: undefined, planDate: undefined })
const applied = ref({ ...filters })
const tick = ref(0)
const execOpen = ref(false)
const detailOpen = ref(false)
const current = ref(null)

const statusOpts = Object.values(INSPECTION_TASK_STATUS).map((v) => ({ label: v, value: v }))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '任务号', dataIndex: 'taskNo', width: 140 },
  { title: '设备编码', dataIndex: 'deviceCode', width: 120 },
  { title: '设备名称', dataIndex: 'deviceName', width: 140 },
  { title: '点检标准', dataIndex: 'standardName', width: 150 },
  { title: '计划日期', dataIndex: 'planDate', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '操作', key: 'action', width: 90 },
]

const resultColumns = [
  { title: '点检项', dataIndex: 'name' },
  { title: '标准', dataIndex: 'standard', width: 140 },
  { title: '结果', key: 'ok', width: 80 },
  { title: '实测', dataIndex: 'value', width: 80 },
  { title: '备注', dataIndex: 'note' },
]

const list = computed(() => {
  void tick.value
  void equipmentState.inspectionTasks.length
  return listInspectionTasks(applied.value)
})

function statusColor(status) {
  if (status === INSPECTION_TASK_STATUS.DONE) return 'success'
  if (status === INSPECTION_TASK_STATUS.ABNORMAL) return 'error'
  return 'processing'
}

function handleSearch() {
  applied.value = { ...filters }
}

function handleReset() {
  filters.keyword = ''
  filters.status = undefined
  filters.planDate = undefined
  handleSearch()
}

function handleGenerate() {
  const res = generateInspectionTasksForToday()
  message.success(`已生成 ${res.created} 条今日点检任务`)
  tick.value += 1
}

function openExecute(record) {
  current.value = record
  execOpen.value = true
}

function openDetail(record) {
  current.value = record
  detailOpen.value = true
}
</script>

<style lang="less" scoped>
@import './equipment-page.less';
</style>
