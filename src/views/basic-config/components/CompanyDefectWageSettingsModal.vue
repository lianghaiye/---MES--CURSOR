<template>
  <a-modal
    :open="open"
    title="公司级不良品折扣率设置"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="settings-intro">
      <div class="intro-head">
        <span class="intro-title">公司级默认设置</span>
        <a-space :size="8">
          <span class="switch-label">启用</span>
          <a-switch v-model:checked="form.enabled" size="small" />
        </a-space>
      </div>
      <div class="intro-hint">
        关闭代表不启用。启用后，不良品项未开启「不良原因影响折扣」时，按责任归属匹配以下默认规则。
      </div>
    </div>

    <div v-if="form.enabled" class="rules-section">
      <a-table
        :columns="tableColumns"
        :data-source="form.rules"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'responsibility'">
            <a-select
              v-model:value="record.responsibility"
              placeholder="请选择"
              style="width: 100%"
              :options="getResponsibilityOptions(record)"
            />
          </template>
          <template v-else-if="column.key === 'wageCalculationMethod'">
            <a-select
              v-model:value="record.wageCalculationMethod"
              placeholder="请选择"
              style="width: 100%"
              :options="wageCalculationOptions"
              @change="(val) => handleMethodChange(record, val)"
            />
          </template>
          <template v-else-if="column.key === 'defaultDiscountRate'">
            <a-input-number
              v-model:value="record.defaultDiscountRate"
              :min="0"
              :max="100"
              :precision="0"
              style="width: 100%"
              addon-after="%"
              placeholder="请输入"
              :disabled="record.wageCalculationMethod !== '打折计工资'"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              type="link"
              size="small"
              danger
              :disabled="form.rules.length <= 1"
              @click="removeRow(record.id)"
            >
              删除
            </a-button>
          </template>
        </template>
      </a-table>
      <div class="rate-hint">
        折扣率越高，工人承担的责任越少；折扣率越低，工人承担的责任越多。
      </div>
      <a-button
        type="dashed"
        block
        class="add-row-btn"
        :disabled="!canAddRow"
        @click="addRow"
      >
        <PlusOutlined />
        新增一行
      </a-button>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  defectItemWageCalculationSelectOptions,
  defectResponsibilityOptions,
  defectResponsibilitySelectOptions,
} from '@/mock/defectItemOptions'
import { defectItemState, updateCompanyWageSettings } from '@/store/defectItemStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const wageCalculationOptions = defectItemWageCalculationSelectOptions

const form = reactive({
  enabled: true,
  rules: [],
})

const tableColumns = [
  { title: '责任归属', key: 'responsibility', width: 150 },
  { title: '不良品工资计算方式', key: 'wageCalculationMethod', width: 160 },
  { title: '默认折扣率', key: 'defaultDiscountRate', width: 140 },
  { title: '操作', key: 'actions', width: 72, align: 'center' },
]

const canAddRow = computed(() => {
  const used = new Set(form.rules.map((r) => r.responsibility).filter(Boolean))
  return form.rules.length < defectResponsibilityOptions.length && used.size < defectResponsibilityOptions.length
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const settings = defectItemState.companyWageSettings
    form.enabled = settings.enabled
    form.rules = settings.rules.map((rule) => ({ ...rule }))
  },
)

function getResponsibilityOptions(record) {
  const used = new Set(
    form.rules.filter((r) => r.id !== record.id).map((r) => r.responsibility).filter(Boolean),
  )
  return defectResponsibilitySelectOptions.map((opt) => ({
    ...opt,
    disabled: used.has(opt.value),
  }))
}

function createEmptyRule() {
  const used = new Set(form.rules.map((r) => r.responsibility).filter(Boolean))
  const nextResponsibility = defectResponsibilityOptions.find((item) => !used.has(item))
  return {
    id: `rule-${Date.now()}`,
    responsibility: nextResponsibility,
    wageCalculationMethod: '打折计工资',
    defaultDiscountRate: 50,
  }
}

function addRow() {
  if (!canAddRow.value) return
  form.rules.push(createEmptyRule())
}

function removeRow(id) {
  if (form.rules.length <= 1) return
  const idx = form.rules.findIndex((r) => r.id === id)
  if (idx !== -1) form.rules.splice(idx, 1)
}

function handleMethodChange(record, method) {
  if (method === '打折计工资' && record.defaultDiscountRate == null) {
    record.defaultDiscountRate = 50
  }
  if (method !== '打折计工资') {
    record.defaultDiscountRate = null
  }
}

function validateRules() {
  if (!form.rules.length) {
    message.warning('请至少配置一条规则')
    return false
  }
  const responsibilities = form.rules.map((r) => r.responsibility)
  if (responsibilities.some((item) => !item)) {
    message.warning('请选择责任归属')
    return false
  }
  if (new Set(responsibilities).size !== responsibilities.length) {
    message.warning('责任归属不能重复')
    return false
  }
  for (const rule of form.rules) {
    if (!rule.wageCalculationMethod) {
      message.warning('请选择不良品工资计算方式')
      return false
    }
    if (rule.wageCalculationMethod === '打折计工资' && rule.defaultDiscountRate == null) {
      message.warning('请输入默认折扣率')
      return false
    }
  }
  return true
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (form.enabled && !validateRules()) return
  saving.value = true
  updateCompanyWageSettings({
    enabled: form.enabled,
    rules: form.rules.map((rule) => ({
      id: rule.id,
      responsibility: rule.responsibility,
      wageCalculationMethod: rule.wageCalculationMethod,
      defaultDiscountRate:
        rule.wageCalculationMethod === '打折计工资' ? rule.defaultDiscountRate : null,
    })),
  })
  saving.value = false
  message.success('公司级设置已保存')
  emit('saved')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.settings-intro {
  margin-bottom: 16px;
}

.intro-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.intro-title {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.switch-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.intro-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
}

.rules-section {
  margin-top: 4px;
}

.rate-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
}

.add-row-btn {
  margin-top: 12px;
}
</style>
