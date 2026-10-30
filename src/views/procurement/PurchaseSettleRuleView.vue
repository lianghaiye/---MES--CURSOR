<template>
  <div class="settle-rule-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规则名称">
              <a-input v-model:value="filters.name" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务场景">
              <a-select
                v-model:value="filters.bizScene"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="sceneOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规则层级">
              <a-select
                v-model:value="filters.ruleScope"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="scopeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.enabled"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="enabledOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
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
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新建规则
        </a-button>
        <a-button size="small" @click="logOpen = true">执行日志</a-button>
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
          共计 {{ filteredList.length }} 条规则。内置四条工厂默认（月结/周结 ×
          入库/采购单）；同场景下「按入库」与「按采购单」互斥，启用一侧会自动停用另一侧。供应商有自定义规则时，工厂默认跳过该供应商。内置可改调度与结果、可停用，不可删除。
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
        :pagination="false"
        :scroll="{ x: 2200 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'code'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.code || '—' }}</a>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-switch
              :checked="record.enabled"
              checked-children="启"
              un-checked-children="停"
              @change="(v) => onToggle(record, v)"
            />
          </template>
          <template v-else-if="column.key === 'bizScene'">
            <a-tag>{{ sceneLabel(record.bizScene) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'ruleScope'">
            <a-tag :color="record.ruleScope === 'supplier' ? 'orange' : 'blue'">
              {{ scopeLabel(record.ruleScope) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'creator'">
            {{ isBuiltinRule(record) ? '—' : record.creator || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ isBuiltinRule(record) ? '—' : record.createdAt || '—' }}
          </template>
          <template v-else-if="column.key === 'updater'">
            {{ record.updater || '—' }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ record.updatedAt || '—' }}
          </template>
          <template v-else-if="column.key === 'settleTarget'">
            {{ formatSettleTarget(record) }}
          </template>
          <template v-else-if="column.key === 'resultMode'">
            {{ record.resultMode === 'auto_confirm' ? '自动确认' : '生成草稿' }}
          </template>
          <template v-else-if="column.key === 'allowAppend'">
            {{ record.allowAppend ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'schedule'">
            {{ formatSchedule(record) }}
          </template>
          <template v-else-if="column.key === 'scan'">
            {{ formatScan(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a class="link-code" @click="openEdit(record)">编辑</a>
              <a class="link-code" @click="onRun(record)">立即试跑</a>
              <a class="link-code" @click="openLogs(record)">日志</a>
              <a v-if="!isBuiltinRule(record)" class="danger" @click="onDelete(record)"> 删除 </a>
            </a-space>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
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
    <SettleRuleDetailDrawer v-model:open="detailOpen" :rule-id="detailRuleId" />

    <QcTemplateConflictModal
      v-model:open="conflictOpen"
      kind="supplier"
      title="结算规则冲突"
      entity-label="规则"
      object-noun-override="供应商"
      object-column-title="供应商"
      list-hint-text="启用本规则时，以下供应商已绑定其他已启用的供应商结算规则。"
      replace-hint="将该供应商从原规则解绑，改由当前规则覆盖；原规则若无剩余供应商则自动停用。"
      skip-hint="当前规则不绑定该供应商，维持原有生效规则不变。"
      :conflicts="conflictRows"
      :current-template-name="conflictRuleName"
      @confirm="onEnableConflictConfirm"
      @cancel="onEnableConflictCancel"
    />
  </div>
</template>

<script>
export default { name: 'PurchaseSettleRuleView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  purchaseSettleRuleState,
  setPurchaseSettleRuleEnabled,
  deletePurchaseSettleRule,
  executePurchaseSettleRule,
} from '@/store/purchaseSettleRuleStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
  SETTLE_RULE_SCENE_LABEL,
  SETTLE_RULE_SCOPE_LABEL,
  isBuiltinSettleRule,
} from '@/mock/purchaseSettleRules'
import SettleRuleFormModal from './components/SettleRuleFormModal.vue'
import SettleRuleLogDrawer from './components/SettleRuleLogDrawer.vue'
import SettleRuleDetailDrawer from './components/SettleRuleDetailDrawer.vue'
import QcTemplateConflictModal from '@/views/quality/components/QcTemplateConflictModal.vue'

const filters = reactive({
  name: '',
  enabled: undefined,
  bizScene: undefined,
  ruleScope: undefined,
})
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })
const formOpen = ref(false)
const editing = ref(null)
const logOpen = ref(false)
const logRuleId = ref('')
const detailOpen = ref(false)
const detailRuleId = ref('')

const conflictOpen = ref(false)
const conflictRows = ref([])
const pendingEnableId = ref('')
const conflictRuleName = ref('')

const enabledOpts = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]
const sceneOpts = [
  { label: '采购', value: SETTLE_RULE_SCENE.PURCHASE },
  { label: '外协', value: SETTLE_RULE_SCENE.OUTSOURCING },
]
const scopeOpts = [
  { label: '工厂默认', value: SETTLE_RULE_SCOPE.FACTORY },
  { label: '供应商规则', value: SETTLE_RULE_SCOPE.SUPPLIER },
]

const columns = [
  { title: '序号', key: 'index', width: 60, align: 'center', fixed: 'left' },
  { title: '规则编码', key: 'code', width: 140, fixed: 'left' },
  { title: '规则名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '业务场景', key: 'bizScene', width: 90 },
  { title: '规则层级', key: 'ruleScope', width: 110 },
  { title: '生成维度', key: 'settleTarget', width: 120 },
  { title: '执行结果', key: 'resultMode', width: 100 },
  { title: '追加未结算', key: 'allowAppend', width: 100 },
  { title: '执行计划', key: 'schedule', width: 160 },
  { title: '扫描窗口', key: 'scan', width: 160, ellipsis: true },
  { title: '上次执行', dataIndex: 'lastRunAt', key: 'lastRunAt', width: 160 },
  { title: '下次执行', dataIndex: 'nextRunAt', key: 'nextRunAt', width: 160 },
  { title: '创建人', key: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 160 },
  { title: '更新人', key: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', width: 160 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
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
    if (applied.bizScene && (row.bizScene || SETTLE_RULE_SCENE.PURCHASE) !== applied.bizScene) {
      return false
    }
    if (applied.ruleScope && (row.ruleScope || SETTLE_RULE_SCOPE.FACTORY) !== applied.ruleScope) {
      return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function sceneLabel(scene) {
  return SETTLE_RULE_SCENE_LABEL[scene] || SETTLE_RULE_SCENE_LABEL[SETTLE_RULE_SCENE.PURCHASE]
}

function scopeLabel(scope) {
  return SETTLE_RULE_SCOPE_LABEL[scope] || SETTLE_RULE_SCOPE_LABEL[SETTLE_RULE_SCOPE.FACTORY]
}

function formatSettleTarget(row) {
  const isOut = (row.bizScene || SETTLE_RULE_SCENE.PURCHASE) === SETTLE_RULE_SCENE.OUTSOURCING
  if (row.settleTarget === 'purchase_order') return isOut ? '按外协订单' : '按采购单'
  return isOut ? '按回货入库' : '按入库'
}

function formatSchedule(row) {
  const time = row.executeTime || '—'
  if (row.scanWindowType === SCAN_WINDOW_TYPES.FIXED) {
    return `一次性 ${time}`
  }
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
    return `固定 ${row.scanStart || '?'} ~ ${row.scanEnd || '?'}`
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
  filters.bizScene = undefined
  filters.ruleScope = undefined
  handleSearch()
}

function isBuiltinRule(record) {
  return isBuiltinSettleRule(record)
}

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(record) {
  editing.value = { ...record }
  formOpen.value = true
}

function openDetail(record) {
  detailRuleId.value = record?.id || ''
  detailOpen.value = true
}

function onSaved() {
  pagination.current = 1
}

function openLogs(record) {
  logRuleId.value = record?.id || ''
  logOpen.value = true
}

function applyToggle(record, checked, conflictResolution) {
  const res = setPurchaseSettleRuleEnabled(record.id, checked, {
    conflictResolution,
  })
  if (res.needConflict) {
    pendingEnableId.value = record.id
    conflictRuleName.value = record.name || ''
    conflictRows.value = res.conflict.conflicts || []
    conflictOpen.value = true
    return
  }
  if (!res.ok) message.warning(res.message)
  else message.success(res.message)
}

function onToggle(record, checked) {
  if (!checked) {
    applyToggle(record, false)
    return
  }
  applyToggle(record, true)
}

function onEnableConflictConfirm(resolution) {
  const id = pendingEnableId.value
  pendingEnableId.value = ''
  if (!id) return
  const record = purchaseSettleRuleState.rules.find((r) => r.id === id)
  if (!record) return
  applyToggle(record, true, resolution)
}

function onEnableConflictCancel() {
  pendingEnableId.value = ''
}

function onRun(record) {
  Modal.confirm({
    title: `立即试跑「${record.name}」？`,
    content:
      record.scanWindowType === SCAN_WINDOW_TYPES.FIXED
        ? '将按固定起止窗口生成结算单。固定窗口自动调度只跑一次；手动试跑可重复，不占用自动排期名额。'
        : '将按规则当前配置的扫描窗口生成结算单，并刷新下次计划时间。',
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
  if (isBuiltinRule(record)) {
    message.warning('内置规则不可删除，可停用')
    return
  }
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
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
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

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.danger {
  color: #ff4d4f;
}
</style>
