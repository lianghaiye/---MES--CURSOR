<template>
  <div class="settle-rule-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form">
        <a-form-item label="规则名称">
          <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="业务场景">
          <a-select
            v-model:value="filters.bizScene"
            allow-clear
            size="small"
            placeholder="全部"
            style="width: 110px"
            :options="sceneOpts"
          />
        </a-form-item>
        <a-form-item label="规则层级">
          <a-select
            v-model:value="filters.ruleScope"
            allow-clear
            size="small"
            placeholder="全部"
            style="width: 130px"
            :options="scopeOpts"
          />
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
          <a-dropdown>
            <a-button type="primary" size="small"> 新建规则 </a-button>
            <template #overlay>
              <a-menu @click="onCreateMenu">
                <a-menu-item key="blank">空白规则</a-menu-item>
                <a-menu-divider />
                <a-menu-item v-for="t in templateMenuItems" :key="t.key">{{ t.label }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button size="small" @click="logOpen = true">执行日志</a-button>
        </a-space>
      </div>
      <a-alert
        type="info"
        show-icon
        class="page-tip"
        message="工厂默认作兜底，供应商规则覆盖同场景同生成维度下的指定供应商。启用后按时刻调度；草稿占量防重复出单。外协与采购规则相互独立。"
      />
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ x: 1480 }"
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
          <template v-else-if="column.key === 'bizScene'">
            <a-tag>{{ sceneLabel(record.bizScene) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'ruleScope'">
            <a-tag :color="record.ruleScope === 'supplier' ? 'orange' : 'blue'">
              {{ scopeLabel(record.ruleScope) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'settleTarget'">
            {{ formatSettleTarget(record) }}
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

    <SettleRuleFormModal
      v-model:open="formOpen"
      :rule="editing"
      :template-key="createTemplateKey"
      @saved="onSaved"
    />
    <SettleRuleLogDrawer v-model:open="logOpen" :rule-id="logRuleId" />
  </div>
</template>

<script>
export default { name: 'PurchaseSettleRuleView' }
</script>

<script setup>
import { computed, h, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  purchaseSettleRuleState,
  listPurchaseSettleRules,
  setPurchaseSettleRuleEnabled,
  deletePurchaseSettleRule,
  executePurchaseSettleRule,
} from '@/store/purchaseSettleRuleStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_TEMPLATES,
  findConflictingSettleRules,
  formatSettleRuleGuardMessages,
} from '@/utils/purchaseSettleRuleGuard'
import {
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
  SETTLE_RULE_SCENE_LABEL,
  SETTLE_RULE_SCOPE_LABEL,
} from '@/mock/purchaseSettleRules'
import SettleRuleFormModal from './components/SettleRuleFormModal.vue'
import SettleRuleLogDrawer from './components/SettleRuleLogDrawer.vue'

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
const createTemplateKey = ref('')
const logOpen = ref(false)
const logRuleId = ref('')
const templateMenuItems = SETTLE_RULE_TEMPLATES

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
  { title: '规则名称', dataIndex: 'name', key: 'name', width: 220, ellipsis: true },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '业务场景', key: 'bizScene', width: 90 },
  { title: '规则层级', key: 'ruleScope', width: 110 },
  { title: '生成维度', key: 'settleTarget', width: 120 },
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
  filters.bizScene = undefined
  filters.ruleScope = undefined
  handleSearch()
}

function openCreate(templateKey = '') {
  editing.value = null
  createTemplateKey.value = templateKey || ''
  formOpen.value = true
}

function onCreateMenu({ key }) {
  if (key === 'blank') openCreate('')
  else openCreate(key)
}

function openEdit(record) {
  editing.value = { ...record }
  createTemplateKey.value = ''
  formOpen.value = true
}

function onSaved() {
  pagination.current = 1
}

function openLogs(record) {
  logRuleId.value = record?.id || ''
  logOpen.value = true
}

function applyToggle(record, checked) {
  const res = setPurchaseSettleRuleEnabled(record.id, checked)
  if (!res.ok) message.warning(res.message)
  else message.success(res.message)
}

function onToggle(record, checked) {
  if (!checked) {
    applyToggle(record, false)
    return
  }
  const probe = { ...record, enabled: true }
  const conflicts = findConflictingSettleRules(probe, listPurchaseSettleRules())
  const msgs = formatSettleRuleGuardMessages([], conflicts)
  if (!msgs.length) {
    applyToggle(record, true)
    return
  }
  Modal.confirm({
    title: `启用「${record.name}」存在冲突风险`,
    width: 560,
    content: () =>
      h(
        'div',
        msgs.map((m, i) =>
          h('p', { key: i, style: 'margin: 0 0 8px; line-height: 1.5' }, `${i + 1}. ${m}`),
        ),
      ),
    okText: '仍要启用',
    cancelText: '取消',
    onOk: () => applyToggle(record, true),
  })
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
  padding: 8px 12px 12px;
  margin-bottom: 8px;
}
.table-toolbar {
  margin-bottom: 8px;
}
.page-tip {
  margin-bottom: 12px;
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
