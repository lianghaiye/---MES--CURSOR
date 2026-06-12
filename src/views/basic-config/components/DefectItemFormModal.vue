<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑不良品项' : '创建不良品项'"
    width="560px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="不良品项编号" name="code">
        <a-input v-model:value="form.code" placeholder="请输入，忽略将自动生成" />
      </a-form-item>
      <a-form-item label="不良品项名称" name="name" required>
        <a-input v-model:value="form.name" placeholder="请输入" />
      </a-form-item>
      <a-form-item label="责任归属" name="responsibility" required>
        <a-select
          v-model:value="form.responsibility"
          placeholder="请选择责任归属"
          :options="responsibilityOptions"
        />
      </a-form-item>

      <div class="wage-discount-section">
        <div class="section-head">
          <span class="section-title">工资折扣设置</span>
          <a-space :size="8">
            <span class="switch-label">不良原因影响折扣率</span>
            <a-switch v-model:checked="form.affectWageDiscount" size="small" />
          </a-space>
        </div>
        <div class="section-hint">
          开启后，工人在报工选择不良原因时，系统按原因对应的折扣率计算工资。关闭则统一使用公司级折扣率。
        </div>

        <template v-if="form.affectWageDiscount">
          <a-form-item label="工资计算方式" name="wageCalculationMethod" required class="section-field">
            <a-select
              v-model:value="form.wageCalculationMethod"
              placeholder="请选择工资计算方式"
              :options="wageCalculationOptions"
            />
          </a-form-item>
          <a-form-item
            v-if="form.wageCalculationMethod === '打折计工资'"
            label="工资折扣率"
            name="wageDiscountRate"
            required
            class="section-field"
          >
            <a-input-number
              v-model:value="form.wageDiscountRate"
              :min="0"
              :max="100"
              :precision="0"
              style="width: 100%"
              addon-after="%"
              placeholder="请输入折扣率"
            />
            <div class="field-hint">
              折扣率越高，工人承担的责任越少；折扣率越低，工人承担的责任越多。
            </div>
          </a-form-item>
        </template>
      </div>

      <a-form-item label="说明" name="description">
        <a-textarea
          v-model:value="form.description"
          :rows="3"
          :maxlength="200"
          show-count
          placeholder="请输入说明"
        />
      </a-form-item>
    </a-form>
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
import { addDefectItem, updateDefectItem } from '@/store/defectItemStore'
import {
  defectItemWageCalculationSelectOptions,
  defectResponsibilitySelectOptions,
} from '@/mock/defectItemOptions'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)
const responsibilityOptions = defectResponsibilitySelectOptions
const wageCalculationOptions = defectItemWageCalculationSelectOptions

const form = reactive({
  code: '',
  name: '',
  responsibility: undefined,
  affectWageDiscount: false,
  wageCalculationMethod: undefined,
  wageDiscountRate: null,
  description: '',
})

const isEdit = computed(() => Boolean(props.record?.id))

const rules = computed(() => ({
  name: [{ required: true, message: '请输入不良品项名称', trigger: 'blur' }],
  responsibility: [{ required: true, message: '请选择责任归属', trigger: 'change' }],
  wageCalculationMethod: form.affectWageDiscount
    ? [{ required: true, message: '请选择工资计算方式', trigger: 'change' }]
    : [],
  wageDiscountRate:
    form.affectWageDiscount && form.wageCalculationMethod === '打折计工资'
      ? [{ required: true, message: '请输入工资折扣率', trigger: 'change' }]
      : [],
}))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    form.code = props.record?.code || ''
    form.name = props.record?.name || ''
    form.responsibility = props.record?.responsibility || undefined
    form.affectWageDiscount = Boolean(props.record?.affectWageDiscount)
    form.wageCalculationMethod = props.record?.wageCalculationMethod || undefined
    form.wageDiscountRate = props.record?.wageDiscountRate ?? null
    form.description = props.record?.description || ''
  },
)

watch(
  () => form.affectWageDiscount,
  (enabled) => {
    if (!enabled) {
      form.wageCalculationMethod = undefined
      form.wageDiscountRate = null
    }
  },
)

watch(
  () => form.wageCalculationMethod,
  (method) => {
    if (method !== '打折计工资') {
      form.wageDiscountRate = null
    }
  },
)

function handleCancel() {
  emit('update:open', false)
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  const payload = {
    code: form.code,
    name: form.name,
    responsibility: form.responsibility,
    affectWageDiscount: form.affectWageDiscount,
    wageCalculationMethod: form.affectWageDiscount ? form.wageCalculationMethod : '',
    wageDiscountRate:
      form.affectWageDiscount && form.wageCalculationMethod === '打折计工资'
        ? form.wageDiscountRate
        : null,
    description: form.description,
  }
  const res = isEdit.value
    ? updateDefectItem(props.record.id, payload)
    : addDefectItem(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已创建')
  emit('saved')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.wage-discount-section {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.switch-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.section-hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
}

.section-field {
  margin-top: 12px;
  margin-bottom: 0;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
}
</style>
