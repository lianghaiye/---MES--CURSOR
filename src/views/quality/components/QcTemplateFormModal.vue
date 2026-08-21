<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑模板' : '新增模板'"
    width="880px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="tpl-form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="模板名称" required>
            <a-input v-model:value="form.name" allow-clear placeholder="请输入模板名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="业务范围" required>
            <a-select v-model:value="form.bizScope" placeholder="请选择" :options="bizScopeOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="适用对象">
            <div class="objects-row">
              <a-select
                v-model:value="form.objects"
                mode="tags"
                style="flex: 1"
                placeholder="输入后回车添加，或从建议中选择"
                :options="objectSuggestOpts"
              />
            </div>
            <div class="form-hint">可填写产品/物料/车间等适用对象，支持多选</div>
          </a-form-item>
        </a-col>
      </a-row>

      <div class="fields-section">
        <div class="fields-header">
          <span class="fields-title">模板字段</span>
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
        <a-empty v-else description="暂无字段，请点击「添加字段」" :image="simpleImage" />
      </div>
    </a-form>

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
          <a-button type="link" size="small" @click="fieldForm.options.push('')"
            >+ 添加选项</a-button
          >
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
import { message, Empty } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { qcTemplateBizScopeOptions } from '@/mock/qcTemplates'
import { addQcTemplate, updateQcTemplate } from '@/store/qcTemplateStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
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
const bizScopeOpts = qcTemplateBizScopeOptions.map((v) => ({ label: v, value: v }))
const objectSuggestOpts = [
  '全部产品',
  '全部物料',
  '清水离心泵',
  '多级泵',
  '轴承套',
  '机加车间',
].map((v) => ({ label: v, value: v }))

const isEdit = computed(() => Boolean(props.editRecord?.id))

const form = reactive({
  name: '',
  bizScope: qcTemplateBizScopeOptions[0],
  objects: [],
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
  form.bizScope = qcTemplateBizScopeOptions[0]
  form.objects = []
  form.fields = []
}

function loadEdit(record) {
  form.name = record.name || ''
  form.bizScope = record.bizScope || qcTemplateBizScopeOptions[0]
  form.objects = [...(record.objects || [])]
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
    message.warning('请选择业务范围')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: String(form.name).trim(),
      bizScope: form.bizScope,
      objects: [...(form.objects || [])],
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
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.objects-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.fields-section {
  margin-top: 8px;
}

.fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.fields-title {
  font-weight: 600;
}

.option-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
