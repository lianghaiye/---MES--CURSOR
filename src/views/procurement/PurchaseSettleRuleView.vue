<template>
  <div class="settle-rule-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form">
        <a-form-item label="规则名称">
          <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filters.enabled"
            allow-clear
            size="small"
            placeholder="全部"
            style="width: 120px"
            :options="enabledOpts"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
            <a-button size="small" @click="handleReset">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" size="small" @click="openCreate">新建规则</a-button>
          <a-button size="small" @click="logOpen = true">执行日志</a-button>
        </a-space>
      </div>
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="前端模拟调度：启用规则后按执行时刻在浏览器内触发；关闭页面则不会执行。可用「立即试跑」验证。"
      />
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'enabled'">
            <a-switch
              :checked="record.enabled"
              checked-children="启"
              un-checked-children="停"
              @change="(v) => onToggle(record, v)"
            />
          </template>
          <template v-else-if="column.key === 'settleTarget'">
            {{ record.settleTarget === 'purchase_order' ? '按采购单' : '按入库' }}
          </template>
          <template v-else-if="column.key === 'resultMode'">
            {{ record.resultMode === 'auto_confirm' ? '自动确认' : '生成草稿' }}
          </template>
          <template v-else-if="column.key === 'schedule'">
            {{ formatSchedule(record) }}
          </template>
          <template v-else-if="column.key === 'scan'">
            {{ formatScan(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="openEdit(record)">编辑</a>
              <a @click="onRun(record)">立即试跑</a>
              <a @click="openLogs(record)">日志</a>
              <a class="danger" @click="onDelete(record)">删除</a>
            </a-space>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          :show-size-changer="false"
        />
      </div>
    </div>

    <SettleRuleFormModal v-model:open="formOpen" :rule="editing" @saved="onSaved" />
    <SettleRuleLogDrawer v-model:open="logOpen" :rule-id="logRuleId" />
  </div>
</template>

<script>
export default { name: 'PurchaseSettleRuleView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  purchaseSettleRuleState,
  setPurchaseSettleRuleEnabled,
  deletePurchaseSettleRule,
  executePurchaseSettleRule,
} from '@/store/purchaseSettleRuleStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import SettleRuleFormModal from './components/SettleRuleFormModal.vue'
import SettleRuleLogDrawer from './components/SettleRuleLogDrawer.vue'

const filters = reactive({ name: '', enabled: undefined })
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const editing = ref(null)
const logOpen = ref(false)
const logRuleId = ref('')

const enabledOpts = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]

const columns = [
  { title: '规则名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '结算对象', key: 'settleTarget', width: 100 },
  { title: '执行结果', key: 'resultMode', width: 100 },
  { title: '执行计划', key: 'schedule', width: 160 },
  { title: '扫描窗口', key: 'scan', width: 160, ellipsis: true },
  { title: '上次执行', dataIndex: 'lastRunAt', key: 'lastRunAt', width: 160 },
  { title: '下次执行', dataIndex: 'nextRunAt', key: 'nextRunAt', width: 160 },
  { title: '操作', key: 'actions', width: 220 },
]

const filteredList = computed(() => {
  void purchaseSettleRuleState.rules
  return purchaseSettleRuleState.rules.filter((row) => {
    if (applied.name && !String(row.name || '').includes(applied.name.trim())) return false
    if (
      applied.enabled !== undefined &&
      applied.enabled !== null &&
      row.enabled !== applied.enabled
    ) {
      return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function formatSchedule(row) {
  const time = row.executeTime || '—'
  if (row.executeFreq === 'weekly') {
    const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
    return `每周${map[row.executeWeekday] || row.executeWeekday} ${time}`
  }
  if (row.executeFreq === 'monthly') return `每月${row.executeMonthDay || 1}日 ${time}`
  return `每天 ${time}`
}

function formatScan(row) {
  if (row.scanWindowType === SCAN_WINDOW_TYPES.LAST_WEEK) return '上周'
  if (row.scanWindowType === SCAN_WINDOW_TYPES.LAST_N_DAYS) return `近 ${row.scanLastNDays || 7} 天`
  if (row.scanWindowType === SCAN_WINDOW_TYPES.FIXED) {
    return `${row.scanStart || '?'} ~ ${row.scanEnd || '?'}`
  }
  return '上月'
}

function handleSearch() {
  Object.assign(applied, filters)
  pagination.current = 1
}

function handleReset() {
  filters.name = ''
  filters.enabled = undefined
  handleSearch()
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(record) {
  editing.value = { ...record }
  formOpen.value = true
}

function onSaved() {
  pagination.current = 1
}

function openLogs(record) {
  logRuleId.value = record?.id || ''
  logOpen.value = true
}

function onToggle(record, checked) {
  const res = setPurchaseSettleRuleEnabled(record.id, checked)
  if (!res.ok) message.warning(res.message)
  else message.success(res.message)
}

function onRun(record) {
  Modal.confirm({
    title: `立即试跑「${record.name}」？`,
    content:
      '将按规则当前配置的扫描窗口生成结算单（不改变下次计划时间的业务含义，但仍会刷新 nextRunAt）。',
    okText: '试跑',
    onOk() {
      const res = executePurchaseSettleRule(record.id, { trigger: 'manual' })
      if (!res.ok) {
        message.warning(res.message || '试跑失败')
        return
      }
      message.success(res.message || '试跑完成')
    },
  })
}

function onDelete(record) {
  Modal.confirm({
    title: `删除规则「${record.name}」？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettleRule(record.id)
      if (!res.ok) message.warning(res.message)
      else message.success(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.settle-rule-page {
  padding: 0;
}
.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.table-toolbar {
  margin-bottom: 8px;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.danger {
  color: #ff4d4f;
}
</style>
