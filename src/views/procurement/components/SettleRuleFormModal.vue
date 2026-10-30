<template>
  <a-modal :open="open" :title="modalTitle" :width="960" destroy-on-close @cancel="handleCancel">
    <a-alert
      v-if="isBuiltin"
      type="info"
      show-icon
      class="rule-scope-tip"
      message="内置工厂默认规则：可改执行结果、追加未结算量、执行频率/时刻、扫描窗口与备注；可停用。场景、生成维度、结算周期不可改，且不可删除。"
    />
    <a-alert
      v-else
      type="info"
      show-icon
      class="rule-scope-tip"
      message="供应商自定义规则：可多选供应商；仅作用于勾选供应商，并覆盖同场景、同生成维度的工厂默认规则。"
    />

    <a-form layout="vertical" :model="form" class="rule-form">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="规则名称" required>
            <a-input
              v-model:value="form.name"
              allow-clear
              placeholder="请输入"
              :disabled="isBuiltin"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="业务场景" required>
            <a-select v-model:value="form.bizScene" :options="sceneOpts" :disabled="isBuiltin" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="启用">
            <a-switch v-model:checked="form.enabled" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="生成维度" required>
            <a-select
              v-model:value="form.settleTarget"
              :options="targetOpts"
              :disabled="isBuiltin"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="执行结果" required>
            <a-select v-model:value="form.resultMode" :options="resultOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="追加未结算量">
            <a-checkbox
              v-model:checked="form.allowAppend"
              title="勾选后：同供应商同账期已有对账单时，仍扫描剩余可结量并新开一张"
            >
              已有同账期单仍可追加
            </a-checkbox>
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
        <a-col :span="8">
          <a-form-item label="扫描窗口" required>
            <a-select v-model:value="form.scanWindowType" :options="scanOpts" />
          </a-form-item>
        </a-col>
        <a-col v-if="form.executeFreq !== 'weekly' && form.executeFreq !== 'monthly'" :span="8">
          <a-form-item label="适用结算周期">
            <a-select
              v-model:value="form.settlementCycles"
              mode="multiple"
              allow-clear
              placeholder="空=不限"
              :options="cycleOpts"
              :disabled="isBuiltin"
              :max-tag-count="1"
              class="cycle-select"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row
        v-if="
          form.scanWindowType === 'last_n_days' ||
          form.scanWindowType === 'fixed' ||
          form.executeFreq === 'weekly' ||
          form.executeFreq === 'monthly'
        "
        :gutter="12"
      >
        <a-col v-if="form.scanWindowType === 'last_n_days'" :span="8">
          <a-form-item label="近 N 天">
            <a-input-number
              v-model:value="form.scanLastNDays"
              :min="1"
              :max="366"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="form.scanWindowType === 'fixed'" :span="8">
          <a-form-item label="开始日期" required>
            <a-date-picker
              v-model:value="form.scanStart"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="form.scanWindowType === 'fixed'" :span="8">
          <a-form-item label="结束日期" required>
            <a-date-picker
              v-model:value="form.scanEnd"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="form.executeFreq === 'weekly' || form.executeFreq === 'monthly'" :span="8">
          <a-form-item label="适用结算周期">
            <a-select
              v-model:value="form.settlementCycles"
              mode="multiple"
              allow-clear
              placeholder="空=不限"
              :options="cycleOpts"
              :disabled="isBuiltin"
              :max-tag-count="1"
              class="cycle-select"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-alert
        v-if="form.scanWindowType === 'fixed'"
        type="info"
        show-icon
        class="rule-scope-tip"
        message="固定起止为一次性补扫：按执行频率只自动调度一次；手动试跑可重复。修改起止日期后可重新自动排一次。"
      />

      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="4" allow-clear class="remark-textarea" />
      </a-form-item>

      <a-form-item v-if="!isBuiltin" label="覆盖供应商" required>
        <SettleSupplierMultiSelect v-model="form.supplierIds" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave()">保存</a-button>
    </template>
  </a-modal>

  <QcTemplateConflictModal
    v-model:open="conflictOpen"
    kind="supplier"
    title="结算规则冲突"
    entity-label="规则"
    object-noun-override="供应商"
    object-column-title="供应商"
    list-hint-text="本次规则中，以下供应商已绑定其他已启用的供应商结算规则。"
    replace-hint="将该供应商从原规则解绑，改由当前规则覆盖；原规则若无剩余供应商则自动停用。"
    skip-hint="当前规则不绑定该供应商，维持原有生效规则不变。"
    :conflicts="conflictRows"
    :current-template-name="form.name"
    @confirm="onConflictConfirm"
  />
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { savePurchaseSettleRule } from '@/store/purchaseSettleRuleStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_FREQ,
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
  isBuiltinSettleRule,
} from '@/mock/purchaseSettleRules'
import QcTemplateConflictModal from '@/views/quality/components/QcTemplateConflictModal.vue'
import SettleSupplierMultiSelect from './SettleSupplierMultiSelect.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  rule: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const form = reactive(emptyForm())
const conflictOpen = ref(false)
const conflictRows = ref([])
const pendingConflictResolution = ref(null)

const isBuiltin = computed(() => isBuiltinSettleRule(form) || isBuiltinSettleRule(props.rule))

const modalTitle = computed(() => {
  if (isBuiltin.value) return '编辑内置规则'
  if (form.id || props.rule?.id) return '编辑供应商规则'
  return '新建供应商规则'
})

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
  { label: '固定起止（一次性）', value: SCAN_WINDOW_TYPES.FIXED },
]
const cycleOpts = [
  { label: '月结', value: '月结' },
  { label: '半月结', value: '半月结' },
  { label: '周结', value: '周结' },
  { label: '季结', value: '季结' },
]

watch(
  () => props.open,
  (val) => {
    if (!val) return
    Object.assign(form, emptyForm(), props.rule || {})
    if (!form.executeTime) form.executeTime = '02:00'
    if (!form.bizScene) form.bizScene = SETTLE_RULE_SCENE.PURCHASE
    if (props.rule?.id && props.rule.allowAppend == null) {
      form.allowAppend = false
    }
    if (!props.rule?.id) {
      form.ruleScope = SETTLE_RULE_SCOPE.SUPPLIER
      form.builtin = false
      form.allowAppend = true
    }
    pendingConflictResolution.value = null
    conflictRows.value = []
  },
)

function emptyForm() {
  return {
    id: '',
    name: '',
    enabled: true,
    builtin: false,
    bizScene: SETTLE_RULE_SCENE.PURCHASE,
    ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
    settleTarget: SETTLE_RULE_TARGET.INBOUND,
    resultMode: SETTLE_RULE_RESULT.DRAFT,
    /** 新建默认勾选，与手工按账期生成一致；历史规则无字段仍按 false */
    allowAppend: true,
    executeFreq: SETTLE_RULE_FREQ.WEEKLY,
    executeTime: '02:00',
    executeWeekday: 1,
    executeMonthDay: 1,
    scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
    scanLastNDays: 7,
    scanStart: '',
    scanEnd: '',
    supplierIds: [],
    settlementCycles: [],
    remark: '',
  }
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave(conflictResolution) {
  saving.value = true
  try {
    const res = savePurchaseSettleRule(
      { ...form },
      { conflictResolution: conflictResolution || pendingConflictResolution.value || undefined },
    )
    if (res.needConflict) {
      conflictRows.value = res.conflict.conflicts || []
      conflictOpen.value = true
      return
    }
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success(res.message)
    emit('saved', res.rule)
    emit('update:open', false)
  } finally {
    saving.value = false
    pendingConflictResolution.value = null
  }
}

function onConflictConfirm(resolution) {
  pendingConflictResolution.value = resolution
  handleSave(resolution)
}
</script>

<style scoped>
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

.rule-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }

  /* 多选结算周期保持与普通选择框同高 */
  .cycle-select {
    width: 100%;

    :deep(.ant-select-selector) {
      min-height: 32px !important;
      height: 32px !important;
      align-items: center;
      overflow: hidden;
    }

    :deep(.ant-select-selection-overflow) {
      flex-wrap: nowrap;
    }
  }

  .remark-textarea {
    min-height: 96px;
  }
}
</style>
