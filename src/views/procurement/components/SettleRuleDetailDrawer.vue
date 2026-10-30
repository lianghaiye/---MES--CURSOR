<template>
  <a-drawer :open="open" :title="drawerTitle" width="640" destroy-on-close @close="handleClose">
    <template v-if="rule">
      <div class="section-title">基本信息</div>
      <a-descriptions bordered size="small" :column="2" class="detail-desc">
        <a-descriptions-item label="规则编码">{{ rule.code || '—' }}</a-descriptions-item>
        <a-descriptions-item label="规则名称">{{ rule.name || '—' }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="rule.enabled ? 'success' : 'default'">
            {{ rule.enabled ? '启用' : '停用' }}
          </a-tag>
          <a-tag v-if="isBuiltin" color="purple" style="margin-left: 4px">内置</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="业务场景">{{ sceneLabel }}</a-descriptions-item>
        <a-descriptions-item label="规则层级">{{ scopeLabel }}</a-descriptions-item>
        <a-descriptions-item label="生成维度">{{ settleTargetLabel }}</a-descriptions-item>
        <a-descriptions-item label="执行结果">
          {{ rule.resultMode === 'auto_confirm' ? '自动确认' : '生成草稿' }}
        </a-descriptions-item>
        <a-descriptions-item label="追加未结算量">
          {{ rule.allowAppend ? '是（已有同账期单仍可追加）' : '否（已有同账期单则跳过）' }}
        </a-descriptions-item>
        <a-descriptions-item label="适用结算周期">{{ cycleText }}</a-descriptions-item>
        <a-descriptions-item label="执行计划" :span="2">{{ scheduleText }}</a-descriptions-item>
        <a-descriptions-item label="扫描窗口" :span="2">{{ scanText }}</a-descriptions-item>
        <a-descriptions-item label="上次执行">{{ rule.lastRunAt || '—' }}</a-descriptions-item>
        <a-descriptions-item label="下次执行">{{ rule.nextRunAt || '—' }}</a-descriptions-item>
        <a-descriptions-item label="创建人">
          {{ isBuiltin ? '—' : rule.creator || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ isBuiltin ? '—' : rule.createdAt || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="更新人">{{ rule.updater || '—' }}</a-descriptions-item>
        <a-descriptions-item label="更新时间">{{ rule.updatedAt || '—' }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">{{ rule.remark || '—' }}</a-descriptions-item>
      </a-descriptions>

      <template v-if="!isBuiltin">
        <div class="section-title section-title--gap">
          覆盖供应商
          <span class="section-count">共 {{ supplierRows.length }} 家</span>
        </div>
        <a-table
          v-if="supplierRows.length"
          size="small"
          bordered
          row-key="id"
          :pagination="false"
          :columns="supplierColumns"
          :data-source="supplierRows"
        />
        <a-empty v-else description="未指定供应商" :image="simpleImage" />
      </template>
    </template>
    <a-empty v-else description="规则不存在" />
  </a-drawer>
</template>

<script>
export default { name: 'SettleRuleDetailDrawer' }
</script>

<script setup>
import { computed } from 'vue'
import { Empty } from 'ant-design-vue'
import { getPurchaseSettleRuleById } from '@/store/purchaseSettleRuleStore'
import { getSupplierById } from '@/store/supplierStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
  SETTLE_RULE_SCENE_LABEL,
  SETTLE_RULE_SCOPE_LABEL,
  isBuiltinSettleRule,
} from '@/mock/purchaseSettleRules'

const props = defineProps({
  open: { type: Boolean, default: false },
  ruleId: { type: String, default: '' },
})

const emit = defineEmits(['update:open'])

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

const rule = computed(() => (props.ruleId ? getPurchaseSettleRuleById(props.ruleId) : null))

const isBuiltin = computed(() => isBuiltinSettleRule(rule.value))

const drawerTitle = computed(() => {
  if (!rule.value) return '规则详情'
  return `规则详情 ${rule.value.code || ''}`.trim()
})

const sceneLabel = computed(() => {
  const scene = rule.value?.bizScene || SETTLE_RULE_SCENE.PURCHASE
  return SETTLE_RULE_SCENE_LABEL[scene] || scene
})

const scopeLabel = computed(() => {
  const scope = rule.value?.ruleScope || SETTLE_RULE_SCOPE.FACTORY
  return SETTLE_RULE_SCOPE_LABEL[scope] || scope
})

const settleTargetLabel = computed(() => {
  const row = rule.value
  if (!row) return '—'
  const isOut = (row.bizScene || SETTLE_RULE_SCENE.PURCHASE) === SETTLE_RULE_SCENE.OUTSOURCING
  if (row.settleTarget === 'purchase_order') return isOut ? '按外协订单' : '按采购单'
  return isOut ? '按回货入库' : '按入库'
})

const scheduleText = computed(() => {
  const row = rule.value
  if (!row) return '—'
  const time = row.executeTime || '—'
  if (row.scanWindowType === SCAN_WINDOW_TYPES.FIXED) return `一次性 ${time}`
  if (row.executeFreq === 'weekly') {
    const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
    return `每周${map[row.executeWeekday] || row.executeWeekday} ${time}`
  }
  if (row.executeFreq === 'monthly') return `每月${row.executeMonthDay || 1}日 ${time}`
  return `每天 ${time}`
})

const scanText = computed(() => {
  const row = rule.value
  if (!row) return '—'
  if (row.scanWindowType === SCAN_WINDOW_TYPES.LAST_WEEK) return '上周'
  if (row.scanWindowType === SCAN_WINDOW_TYPES.LAST_N_DAYS) return `近 ${row.scanLastNDays || 7} 天`
  if (row.scanWindowType === SCAN_WINDOW_TYPES.FIXED) {
    return `固定 ${row.scanStart || '?'} ~ ${row.scanEnd || '?'}`
  }
  return '上月'
})

const cycleText = computed(() => {
  const cycles = rule.value?.settlementCycles || []
  return cycles.length ? cycles.join('、') : '不限'
})

const supplierColumns = [
  { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
  { title: '供应商编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '供应商名称', dataIndex: 'name', ellipsis: true },
  { title: '结算周期', dataIndex: 'settlementCycle', width: 100 },
]

const supplierRows = computed(() => {
  const ids = rule.value?.supplierIds || []
  return ids.map((id, i) => {
    const s = getSupplierById(id)
    return {
      id,
      index: i + 1,
      code: s?.code || '—',
      name: s?.name || id,
      settlementCycle: s?.settlementCycle || '—',
    }
  })
})

function handleClose() {
  emit('update:open', false)
}
</script>

<style scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 10px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-title--gap {
  margin-top: 20px;
}

.section-count {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.detail-desc {
  margin-bottom: 0;
}
</style>
