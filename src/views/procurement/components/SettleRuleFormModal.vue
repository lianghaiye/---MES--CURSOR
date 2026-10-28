<template>
  <a-modal
    :open="open"
    :title="rule?.id ? '编辑结算规则' : '新建结算规则'"
    :width="720"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" :model="form">
      <a-row v-if="!rule?.id" :gutter="12">
        <a-col :span="24">
          <a-form-item label="从推荐模板填入">
            <a-select
              v-model:value="selectedTemplate"
              allow-clear
              placeholder="可选：采购/外协 · 工厂默认/供应商覆盖"
              :options="templateOpts"
              @change="applyTemplate"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="16">
          <a-form-item label="规则名称" required>
            <a-input v-model:value="form.name" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="启用">
            <a-switch v-model:checked="form.enabled" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="业务场景" required>
            <a-select v-model:value="form.bizScene" :options="sceneOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="规则层级" required>
            <a-radio-group v-model:value="form.ruleScope" button-style="solid">
              <a-radio-button value="factory">工厂默认（兜底）</a-radio-button>
              <a-radio-button value="supplier">供应商规则（覆盖）</a-radio-button>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-alert
        type="info"
        show-icon
        class="rule-scope-tip"
        :message="
          form.ruleScope === 'supplier'
            ? '供应商规则：仅作用于勾选供应商，并覆盖同场景同生成维度的工厂默认规则。'
            : '工厂默认：兜底全部未覆盖供应商；已被供应商规则覆盖的不会再进本规则。'
        "
      />

      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="生成维度" required>
            <a-select v-model:value="form.settleTarget" :options="targetOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="执行结果" required>
            <a-select v-model:value="form.resultMode" :options="resultOpts" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="执行频率" required>
            <a-select v-model:value="form.executeFreq" :options="freqOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="执行时刻" required>
            <a-time-picker
              v-model:value="form.executeTime"
              format="HH:mm"
              value-format="HH:mm"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="form.executeFreq === 'weekly'" :span="8">
          <a-form-item label="星期">
            <a-select v-model:value="form.executeWeekday" :options="weekdayOpts" />
          </a-form-item>
        </a-col>
        <a-col v-else-if="form.executeFreq === 'monthly'" :span="8">
          <a-form-item label="每月几号">
            <a-input-number
              v-model:value="form.executeMonthDay"
              :min="1"
              :max="28"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="扫描窗口" required>
            <a-select v-model:value="form.scanWindowType" :options="scanOpts" />
          </a-form-item>
        </a-col>
        <a-col v-if="form.scanWindowType === 'last_n_days'" :span="12">
          <a-form-item label="近 N 天">
            <a-input-number
              v-model:value="form.scanLastNDays"
              :min="1"
              :max="366"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row v-if="form.scanWindowType === 'fixed'" :gutter="12">
        <a-col :span="12">
          <a-form-item label="开始日期" required>
            <a-date-picker
              v-model:value="form.scanStart"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="结束日期" required>
            <a-date-picker
              v-model:value="form.scanEnd"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col v-if="form.ruleScope === 'supplier'" :span="12">
          <a-form-item label="覆盖供应商" required>
            <a-select
              v-model:value="form.supplierIds"
              mode="multiple"
              allow-clear
              show-search
              placeholder="必选：本规则覆盖的供应商"
              :options="supplierOpts"
              :filter-option="filterOption"
            />
          </a-form-item>
        </a-col>
        <a-col :span="form.ruleScope === 'supplier' ? 12 : 24">
          <a-form-item label="适用结算周期">
            <a-select
              v-model:value="form.settlementCycles"
              mode="multiple"
              allow-clear
              placeholder="空=不限（窗内有可结算数据的都扫）"
              :options="cycleOpts"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-alert
        v-if="liveGuardMessages.length"
        type="warning"
        show-icon
        class="rule-guard-alert"
        message="配置风险提示"
        :description="liveGuardMessages.join('\n')"
      />

      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="2" allow-clear />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch, computed, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { savePurchaseSettleRule, listPurchaseSettleRules } from '@/store/purchaseSettleRuleStore'
import { supplierState } from '@/store/supplierStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_TEMPLATES,
  collectSettleRuleSaveWarnings,
  findConflictingSettleRules,
  formatSettleRuleGuardMessages,
} from '@/utils/purchaseSettleRuleGuard'
import {
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_FREQ,
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
} from '@/mock/purchaseSettleRules'

const props = defineProps({
  open: { type: Boolean, default: false },
  rule: { type: Object, default: null },
  /** 打开时预填的模板 key */
  templateKey: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const selectedTemplate = ref(undefined)
const form = reactive(emptyForm())

const sceneOpts = [
  { label: '采购', value: SETTLE_RULE_SCENE.PURCHASE },
  { label: '外协', value: SETTLE_RULE_SCENE.OUTSOURCING },
]
const targetOpts = computed(() =>
  form.bizScene === SETTLE_RULE_SCENE.OUTSOURCING
    ? [
        { label: '按回货入库', value: SETTLE_RULE_TARGET.INBOUND },
        { label: '按外协订单（已完成）', value: SETTLE_RULE_TARGET.PURCHASE_ORDER },
      ]
    : [
        { label: '按入库', value: SETTLE_RULE_TARGET.INBOUND },
        { label: '按采购单（已完成）', value: SETTLE_RULE_TARGET.PURCHASE_ORDER },
      ],
)
const resultOpts = [
  { label: '生成草稿', value: SETTLE_RULE_RESULT.DRAFT },
  { label: '自动确认', value: SETTLE_RULE_RESULT.AUTO_CONFIRM },
]
const freqOpts = [
  { label: '每天', value: SETTLE_RULE_FREQ.DAILY },
  { label: '每周', value: SETTLE_RULE_FREQ.WEEKLY },
  { label: '每月', value: SETTLE_RULE_FREQ.MONTHLY },
]
const weekdayOpts = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]
const scanOpts = [
  { label: '上月', value: SCAN_WINDOW_TYPES.LAST_MONTH },
  { label: '上周', value: SCAN_WINDOW_TYPES.LAST_WEEK },
  { label: '近 N 天', value: SCAN_WINDOW_TYPES.LAST_N_DAYS },
  { label: '固定起止', value: SCAN_WINDOW_TYPES.FIXED },
]
const cycleOpts = [
  { label: '月结', value: '月结' },
  { label: '半月结', value: '半月结' },
  { label: '周结', value: '周结' },
  { label: '季结', value: '季结' },
]
const templateOpts = SETTLE_RULE_TEMPLATES.map((t) => ({ label: t.label, value: t.key }))

const supplierOpts = computed(() =>
  supplierState.suppliers
    .filter((s) => s.status !== '停用')
    .map((s) => ({
      label: `${s.name}（${s.settlementCycle || '—'}）`,
      value: s.id,
      searchText: s.name,
    })),
)

const liveGuardMessages = computed(() => {
  const warnings = collectSettleRuleSaveWarnings(form)
  const conflicts = findConflictingSettleRules(form, listPurchaseSettleRules())
  return formatSettleRuleGuardMessages(warnings, conflicts)
})

watch(
  () => props.open,
  (val) => {
    if (!val) return
    selectedTemplate.value = props.templateKey || undefined
    Object.assign(form, emptyForm(), props.rule || {})
    if (!form.executeTime) form.executeTime = '02:00'
    if (!form.bizScene) form.bizScene = SETTLE_RULE_SCENE.PURCHASE
    if (!form.ruleScope) form.ruleScope = SETTLE_RULE_SCOPE.FACTORY
    if (!props.rule?.id && props.templateKey) {
      applyTemplate(props.templateKey)
    }
  },
)

watch(
  () => form.ruleScope,
  (scope) => {
    if (scope === SETTLE_RULE_SCOPE.FACTORY) form.supplierIds = []
  },
)

function emptyForm() {
  return {
    id: '',
    name: '',
    enabled: true,
    bizScene: SETTLE_RULE_SCENE.PURCHASE,
    ruleScope: SETTLE_RULE_SCOPE.FACTORY,
    settleTarget: SETTLE_RULE_TARGET.INBOUND,
    resultMode: SETTLE_RULE_RESULT.DRAFT,
    executeFreq: SETTLE_RULE_FREQ.DAILY,
    executeTime: '02:00',
    executeWeekday: 1,
    executeMonthDay: 1,
    scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
    scanLastNDays: 7,
    scanStart: '',
    scanEnd: '',
    supplierIds: [],
    settlementCycles: [],
    remark: '',
  }
}

function applyTemplate(key) {
  const tpl = SETTLE_RULE_TEMPLATES.find((t) => t.key === key)
  if (!tpl) return
  Object.assign(form, emptyForm(), tpl.partial, { id: form.id || '' })
  selectedTemplate.value = key
}

function filterOption(input, option) {
  return String(option?.searchText || option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function handleCancel() {
  emit('update:open', false)
}

function doSave() {
  saving.value = true
  const res = savePurchaseSettleRule({ ...form })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('saved', res.rule)
  emit('update:open', false)
}

function handleSave() {
  const msgs = liveGuardMessages.value
  if (!msgs.length) {
    doSave()
    return
  }
  Modal.confirm({
    title: '配置存在风险，仍要保存？',
    width: 560,
    content: () =>
      h(
        'div',
        msgs.map((m, i) =>
          h('p', { key: i, style: 'margin: 0 0 8px; line-height: 1.5' }, `${i + 1}. ${m}`),
        ),
      ),
    okText: '仍要保存',
    cancelText: '返回修改',
    onOk: () => doSave(),
  })
}
</script>

<style scoped>
.rule-guard-alert {
  margin-bottom: 12px;
  white-space: pre-line;
}
.rule-scope-tip {
  margin-bottom: 12px;
  padding: 4px 10px;

  :deep(.ant-alert-icon) {
    font-size: 12px;
    margin-inline-end: 6px;
  }

  :deep(.ant-alert-message) {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    color: rgba(0, 0, 0, 0.65);
  }
}
</style>
