<template>
  <a-modal
    :open="open"
    :title="rule?.id ? '编辑结算规则' : '新建结算规则'"
    :width="720"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" :model="form">
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
          <a-form-item label="结算对象" required>
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
        <a-col :span="12">
          <a-form-item label="供应商范围">
            <a-select
              v-model:value="form.supplierIds"
              mode="multiple"
              allow-clear
              show-search
              placeholder="空=全部（有可结算数据的供应商）"
              :options="supplierOpts"
              :filter-option="filterOption"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="结算周期过滤">
            <a-select
              v-model:value="form.settlementCycles"
              mode="multiple"
              allow-clear
              placeholder="空=不限"
              :options="cycleOpts"
            />
          </a-form-item>
        </a-col>
      </a-row>

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
import { reactive, ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { savePurchaseSettleRule } from '@/store/purchaseSettleRuleStore'
import { supplierState } from '@/store/supplierStore'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import {
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_FREQ,
} from '@/mock/purchaseSettleRules'

const props = defineProps({
  open: { type: Boolean, default: false },
  rule: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const form = reactive(emptyForm())

const targetOpts = [
  { label: '按入库', value: SETTLE_RULE_TARGET.INBOUND },
  { label: '按采购单（已完成）', value: SETTLE_RULE_TARGET.PURCHASE_ORDER },
]
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

const supplierOpts = computed(() =>
  supplierState.suppliers
    .filter((s) => s.status !== '停用')
    .map((s) => ({
      label: `${s.name}（${s.settlementCycle || '—'}）`,
      value: s.id,
      searchText: s.name,
    })),
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    Object.assign(form, emptyForm(), props.rule || {})
    if (!form.executeTime) form.executeTime = '02:00'
  },
)

function emptyForm() {
  return {
    id: '',
    name: '',
    enabled: true,
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

function filterOption(input, option) {
  return String(option?.searchText || option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
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
</script>
