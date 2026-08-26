<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑质检模板' : '新增质检模板'"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="qc-template-form-modal"
    @cancel="handleCancel"
  >
    <div class="modal-form-body">
      <div class="form-row">
        <label class="form-label required">模板名称</label>
        <a-input v-model:value="form.name" allow-clear placeholder="请输入模板名称" />
      </div>

      <div class="form-row">
        <label class="form-label required">业务类型</label>
        <a-select
          v-model:value="form.bizScope"
          allow-clear
          placeholder="请选择业务类型"
          style="flex: 1; min-width: 0"
          :options="bizScopeOpts"
        />
      </div>

      <div class="form-row">
        <label class="form-label required">适用范围</label>
        <a-radio-group v-model:value="form.scopeType" class="scope-radio">
          <a-radio v-for="opt in scopeTypeOpts" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </div>

      <div class="fields-section">
        <div class="fields-header">
          <h4>模板字段</h4>
          <a-button type="primary" size="small" @click="openFieldModal(null)">
            <PlusOutlined />
            添加字段
          </a-button>
        </div>

        <a-table
          v-if="form.fields.length"
          :columns="fieldColumns"
          :data-source="form.fields"
          :row-key="(_, idx) => String(idx)"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'type'">
              {{ fieldTypeMap[record.type] || record.type || '—' }}
            </template>
            <template v-else-if="column.key === 'required'">
              {{ record.required ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0">
                <a-button type="link" size="small" @click="openFieldModal(index)">编辑</a-button>
                <a-button type="link" size="small" danger @click="removeField(index)">
                  删除
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  :disabled="index === 0"
                  @click="moveField(index, -1)"
                >
                  ↑
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  :disabled="index >= form.fields.length - 1"
                  @click="moveField(index, 1)"
                >
                  ↓
                </a-button>
              </a-space>
            </template>
            <template v-else>
              {{ record[column.dataIndex] || '—' }}
            </template>
          </template>
        </a-table>
        <p v-else class="empty-hint">暂无字段，请点击“添加字段”</p>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>

    <a-modal
      v-model:open="fieldModalOpen"
      :title="editingFieldIndex != null ? '编辑模板字段' : '新增模板字段'"
      width="560px"
      :mask-closable="false"
      destroy-on-close
      @ok="saveField"
      @cancel="closeFieldModal"
    >
      <a-form layout="vertical">
        <a-form-item label="字段编码" required>
          <a-input v-model:value="fieldForm.code" placeholder="请输入字段编码" />
        </a-form-item>
        <a-form-item label="字段名称" required>
          <a-input v-model:value="fieldForm.name" placeholder="请输入字段名称" />
        </a-form-item>
        <a-form-item label="字段类型" required>
          <a-select
            v-model:value="fieldForm.type"
            placeholder="请选择"
            :options="fieldTypeOpts"
            @change="onFieldTypeChange"
          />
        </a-form-item>
        <a-form-item label="字段格式">
          <a-input v-model:value="fieldForm.format" placeholder="如：yyyy-MM-dd" />
        </a-form-item>
        <a-form-item label="是否必填">
          <a-radio-group v-model:value="fieldForm.required">
            <a-radio :value="true">是</a-radio>
            <a-radio :value="false">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="输入提示">
          <a-input v-model:value="fieldForm.placeholder" placeholder="请输入提示文案" />
        </a-form-item>
        <a-form-item
          v-if="fieldForm.type === 'radio' || fieldForm.type === 'checkbox'"
          label="选项列表"
        >
          <div v-for="(_, i) in fieldForm.options" :key="i" class="option-row">
            <a-input v-model:value="fieldForm.options[i]" placeholder="选项值" />
            <a-button type="text" danger @click="fieldForm.options.splice(i, 1)">删除</a-button>
          </div>
          <a-button type="link" size="small" @click="fieldForm.options.push('')">
            + 添加选项
          </a-button>
        </a-form-item>
        <a-form-item v-if="fieldForm.type && fieldForm.type !== 'date'" label="默认值">
          <a-input
            v-if="['text', 'textarea', 'number'].includes(fieldForm.type)"
            v-model:value="fieldForm.defaultValue"
            placeholder="请输入默认值"
          />
          <a-select
            v-else-if="fieldForm.type === 'radio' || fieldForm.type === 'checkbox'"
            v-model:value="fieldForm.defaultValue"
            allow-clear
            placeholder="请选择"
            :options="
              (fieldForm.options || []).filter(Boolean).map((o) => ({ label: o, value: o }))
            "
          />
        </a-form-item>
        <a-form-item
          v-if="fieldForm.type === 'text' || fieldForm.type === 'textarea'"
          label="字符限制"
        >
          <a-input-number
            v-model:value="fieldForm.charLimit"
            :min="1"
            style="width: 100%"
            placeholder="最大字符数"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-modal>
</template>

<script>
export default { name: 'QcTemplateFormModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  QC_TEMPLATE_SCOPE_TYPE,
  qcTemplateBizScopeOptions,
  qcTemplateScopeTypeOptions,
} from '@/mock/qcTemplates'
import { addQcTemplate, updateQcTemplate } from '@/store/qcTemplateStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const fieldModalOpen = ref(false)
const editingFieldIndex = ref(null)

const fieldTypeMap = {
  text: '文本框',
  textarea: '文本域',
  number: '数字',
  date: '日期',
  radio: '单选',
  checkbox: '多选',
}

const fieldTypeOpts = Object.entries(fieldTypeMap).map(([value, label]) => ({ label, value }))
const scopeTypeOpts = qcTemplateScopeTypeOptions
const bizScopeOpts = qcTemplateBizScopeOptions.map((v) => ({ label: v, value: v }))

const isEdit = computed(() => Boolean(props.editRecord?.id))

const form = reactive({
  name: '',
  bizScope: '成品检',
  scopeType: QC_TEMPLATE_SCOPE_TYPE.SINGLE,
  fields: [],
})

const fieldForm = reactive(emptyFieldForm())

const fieldColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '字段编码', dataIndex: 'code', width: 110 },
  { title: '字段名称', dataIndex: 'name', width: 120 },
  { title: '字段类型', key: 'type', width: 90 },
  { title: '必填', key: 'required', width: 60, align: 'center' },
  { title: '输入提示', dataIndex: 'placeholder', ellipsis: true },
  { title: '操作', key: 'action', width: 180 },
]

function emptyFieldForm() {
  return {
    code: '',
    name: '',
    type: undefined,
    format: '',
    required: false,
    placeholder: '',
    options: [],
    defaultValue: '',
    charLimit: null,
  }
}

function resetForm() {
  form.name = ''
  form.bizScope = '成品检'
  form.scopeType = QC_TEMPLATE_SCOPE_TYPE.SINGLE
  form.fields = []
}

function resolveScopeType(record) {
  if (record?.scopeType) return record.scopeType
  // 兼容旧数据：有对象则偏单产品，否则全局
  if (Array.isArray(record?.objects) && record.objects.length) {
    return QC_TEMPLATE_SCOPE_TYPE.SINGLE
  }
  return QC_TEMPLATE_SCOPE_TYPE.GLOBAL
}

function resolveBizScope(record) {
  const val = String(record?.bizScope || '').trim()
  if (qcTemplateBizScopeOptions.includes(val)) return val
  return '成品检'
}

function loadEdit(record) {
  form.name = record.name || ''
  form.bizScope = resolveBizScope(record)
  form.scopeType = resolveScopeType(record)
  form.fields = (record.fields || []).map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
  }))
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    if (props.editRecord) loadEdit(props.editRecord)
    else resetForm()
  },
)

function handleCancel() {
  emit('update:open', false)
}

function openFieldModal(index) {
  editingFieldIndex.value = index
  if (index != null && form.fields[index]) {
    const f = form.fields[index]
    Object.assign(fieldForm, {
      code: f.code || '',
      name: f.name || '',
      type: f.type || undefined,
      format: f.format || '',
      required: Boolean(f.required),
      placeholder: f.placeholder || '',
      options: f.options ? [...f.options] : [],
      defaultValue: f.defaultValue || '',
      charLimit: f.charLimit ?? null,
    })
  } else {
    Object.assign(fieldForm, emptyFieldForm())
  }
  fieldModalOpen.value = true
}

function closeFieldModal() {
  fieldModalOpen.value = false
  editingFieldIndex.value = null
}

function onFieldTypeChange() {
  fieldForm.options = []
  fieldForm.defaultValue = ''
  fieldForm.charLimit = null
}

function saveField() {
  if (!String(fieldForm.code || '').trim()) {
    message.warning('请输入字段编码')
    return
  }
  if (!String(fieldForm.name || '').trim()) {
    message.warning('请输入字段名称')
    return
  }
  if (!fieldForm.type) {
    message.warning('请选择字段类型')
    return
  }
  const payload = {
    code: String(fieldForm.code).trim(),
    name: String(fieldForm.name).trim(),
    type: fieldForm.type,
    format: fieldForm.format || '',
    required: Boolean(fieldForm.required),
    placeholder: fieldForm.placeholder || '',
    options: [...(fieldForm.options || [])].filter((o) => String(o || '').trim()),
    defaultValue: fieldForm.defaultValue || '',
    charLimit: fieldForm.charLimit,
  }
  if (editingFieldIndex.value != null) {
    form.fields[editingFieldIndex.value] = payload
  } else {
    form.fields.push(payload)
  }
  closeFieldModal()
}

function removeField(index) {
  form.fields.splice(index, 1)
}

function moveField(index, delta) {
  const next = index + delta
  if (next < 0 || next >= form.fields.length) return
  const list = form.fields
  const tmp = list[index]
  list[index] = list[next]
  list[next] = tmp
}

function handleSave() {
  if (!String(form.name || '').trim()) {
    message.warning('请输入模板名称')
    return
  }
  if (!form.bizScope) {
    message.warning('请选择业务类型')
    return
  }
  if (!form.scopeType) {
    message.warning('请选择适用范围')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: String(form.name).trim(),
      bizScope: form.bizScope,
      scopeType: form.scopeType,
      objects: [],
      fields: form.fields.map((f) => ({
        ...f,
        options: f.options ? [...f.options] : [],
      })),
      fieldCount: form.fields.length,
    }
    const res = isEdit.value
      ? updateQcTemplate(props.editRecord.id, payload)
      : addQcTemplate(payload)
    if (!res.ok) {
      message.warning(res.message || '保存失败')
      return
    }
    message.success(isEdit.value ? '模板已更新' : `已创建模板 ${res.template.code}`)
    emit('saved', res.template)
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.modal-form-body {
  padding: 4px 0 8px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 0;
}

.form-label {
  width: 90px;
  flex-shrink: 0;
  padding-top: 5px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
}

.form-label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4px;
}

.form-row > :deep(.ant-input),
.form-row > :deep(.ant-input-affix-wrapper),
.form-row > .scope-radio {
  flex: 1;
  min-width: 0;
}

.scope-radio {
  padding-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 4px;
}

.fields-section {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fafbfc;
}

.fields-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fields-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.empty-hint {
  margin: 28px 0 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.option-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
