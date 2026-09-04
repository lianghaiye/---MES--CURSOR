<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    :page-side-padding="pageMode ? 120 : 12"
    :mask-closable="false"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="qc-field-library-form">
      <QcFieldEditorForm
        :model="form"
        show-code
        :code-disabled="isEdit"
        @update:model="onModelUpdate"
      />
    </div>
    <template #footer>
      <a-space>
        <a-button :size="pageMode ? 'small' : 'middle'" @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          :size="pageMode ? 'small' : 'middle'"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script>
export default { name: 'QcFieldLibraryFormModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  addQcLibraryField,
  ensureQcLibraryDemoSeed,
  getQcLibraryFieldById,
  updateQcLibraryField,
} from '@/store/qcFieldLibraryStore'
import {
  QC_FIELD_JUDGE_RULE,
  QC_UNIT_POSITION,
  buildStandardText,
  pickFieldStandardProps,
  validateManualOptionItems,
} from '@/utils/qcFieldStandard'
import {
  ensureChildFieldCodes,
  pickComplexFieldProps,
  validateComplexFieldConfig,
} from '@/utils/qcComplexField'
import QcFieldEditorForm from './QcFieldEditorForm.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])
const route = useRoute()

const saving = ref(false)
const form = reactive(emptyForm())

const editingId = computed(() => {
  if (props.editRecord?.id) return props.editRecord.id
  return String(route.query.id || '').trim() || ''
})
const isEdit = computed(() => Boolean(editingId.value))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/quality/qc-field-library',
  getTitle: () => (isEdit.value ? '编辑检验项' : '新增检验项'),
})

function emptyForm() {
  return {
    code: '',
    name: '',
    indicatorKind: 'basic',
    type: undefined,
    category: '其他',
    required: false,
    withUnit: false,
    unit: '',
    unitPosition: QC_UNIT_POSITION.SUFFIX,
    allowDecimal: true,
    placeholder: '',
    description: '',
    optionRows: [],
    defaultValue: '',
    format: '',
    charLimit: null,
    judgeRule: QC_FIELD_JUDGE_RULE.NONE,
    standardMin: '',
    standardMax: '',
    standardValue: '',
    passOptions: [],
    standardText: '',
    children: [],
    matrixColumns: [],
    matrixRows: [],
    matrixAllowAddRow: true,
    syncToLibrary: false,
    manualOptionItems: [],
  }
}

function toOptionRows(options = [], defaultValue = '') {
  const list = Array.isArray(options) ? options : []
  if (!list.length) return []
  return list.map((v) => ({
    value: String(v || ''),
    isDefault: Boolean(defaultValue && String(v) === String(defaultValue)),
  }))
}

function loadChildrenForEdit(children = []) {
  return (children || []).map((c) => {
    const optionRows = Array.isArray(c.optionRows)
      ? c.optionRows
      : toOptionRows(c.options || [], c.defaultValue)
    return {
      ...c,
      optionRows,
      unitPosition: c.unitPosition === 'prefix' ? 'prefix' : 'suffix',
    }
  })
}

function loadRecord(record) {
  const standard = pickFieldStandardProps(record)
  const complex = pickComplexFieldProps(record)
  Object.assign(form, emptyForm(), {
    code: record.code || '',
    name: record.name || '',
    indicatorKind: record.type === 'composite' ? 'composite' : 'basic',
    type: record.type === 'matrix' ? undefined : record.type || undefined,
    category: record.category || '其他',
    required: Boolean(record.required),
    allowDecimal: record.allowDecimal !== false,
    placeholder: record.placeholder || '',
    description: record.description || '',
    optionRows: toOptionRows(record.options || [], record.defaultValue),
    defaultValue: record.defaultValue || '',
    format: record.format || '',
    charLimit: record.charLimit ?? null,
    ...standard,
    ...complex,
    children: loadChildrenForEdit(complex.children || record.children || []),
    standardText: record.standardText || buildStandardText({ ...record, ...standard }),
  })
}

function resolveActiveRecord() {
  if (props.editRecord?.id) return props.editRecord
  const id = editingId.value
  if (id) return getQcLibraryFieldById(id)
  return null
}

function onModelUpdate(next) {
  Object.assign(form, next)
}

watch(
  () => [isActive.value, props.editRecord?.id, route.query.id],
  ([active]) => {
    if (!active) return
    ensureQcLibraryDemoSeed()
    const record = resolveActiveRecord()
    if (record) loadRecord(record)
    else Object.assign(form, emptyForm())
  },
  { immediate: true },
)

function validateParentStandard() {
  if (form.judgeRule === QC_FIELD_JUDGE_RULE.RANGE) {
    const hasMin = form.standardMin !== '' && form.standardMin != null
    const hasMax = form.standardMax !== '' && form.standardMax != null
    if (!hasMin && !hasMax) {
      message.warning('请至少填写合格区间的下限或上限')
      return false
    }
    if (hasMin && hasMax && Number(form.standardMin) > Number(form.standardMax)) {
      message.warning('合格下限不能大于上限')
      return false
    }
  }
  if (form.judgeRule === QC_FIELD_JUDGE_RULE.OPTION_PASS && !(form.passOptions || []).length) {
    message.warning('请选择至少一个合格选项')
    return false
  }
  if (form.judgeRule === QC_FIELD_JUDGE_RULE.EQUALS && !String(form.standardValue || '').trim()) {
    message.warning('请填写标准值')
    return false
  }
  if (form.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL) {
    const check = validateManualOptionItems(form.manualOptionItems)
    if (!check.ok) {
      message.warning(check.message)
      return false
    }
  }
  return true
}

function handleSave() {
  if (!form.type) {
    message.warning(form.indicatorKind === 'composite' ? '请选择复合类型' : '请选择字段类型')
    return
  }
  if (form.type === 'matrix') {
    message.warning('多点项暂未开放')
    return
  }
  if (!String(form.name || '').trim()) {
    message.warning(form.type === 'composite' ? '请输入父项名称' : '请输入字段名称')
    return
  }
  if (form.withUnit && !String(form.unit || '').trim()) {
    message.warning('请输入单位')
    return
  }
  const complexCheck = validateComplexFieldConfig(form)
  if (!complexCheck.ok) {
    message.warning(complexCheck.message)
    return
  }
  const isChoice = form.type === 'radio' || form.type === 'checkbox'
  const options = isChoice
    ? (form.optionRows || []).map((o) => String(o.value || '').trim()).filter(Boolean)
    : []
  if (isChoice && !options.length) {
    message.warning('请至少添加一个选项')
    return
  }
  if (!validateParentStandard()) return

  const defaultValue = isChoice
    ? String(form.optionRows?.find((o) => o.isDefault)?.value || form.defaultValue || '').trim()
    : form.defaultValue || ''

  const children =
    form.type === 'composite' ? complexCheck.children || ensureChildFieldCodes(form.children) : []

  const standard = pickFieldStandardProps({
    ...form,
    options,
    passOptions: form.passOptions || [],
  })
  const complex = pickComplexFieldProps({ ...form, children })
  const payload = {
    code: String(form.code || '').trim(),
    name: String(form.name).trim(),
    type: form.type,
    category: form.category || '其他',
    required: Boolean(form.required),
    allowDecimal: form.type === 'number' ? Boolean(form.allowDecimal) : false,
    placeholder: form.placeholder || '',
    description: form.description || '',
    options,
    defaultValue,
    format: form.format || '',
    charLimit: form.charLimit,
    ...standard,
    ...complex,
    children,
    standardText:
      String(form.standardText || '').trim() ||
      (form.type === 'composite'
        ? buildStandardText({ ...form, ...standard }) || '含子项分别判定'
        : buildStandardText({ ...form, ...standard, options })),
  }

  saving.value = true
  try {
    const res = isEdit.value
      ? updateQcLibraryField(editingId.value, payload)
      : addQcLibraryField(payload)
    if (!res.ok) {
      message.warning(res.message || '保存失败')
      return
    }
    message.success(isEdit.value ? '检验项已更新' : `已创建 ${res.field.code}`)
    emit('saved', res.field)
    closeAfterSave()
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.qc-field-library-form {
  width: 100%;
}
</style>
