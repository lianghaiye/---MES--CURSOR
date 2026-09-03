<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="880px"
    class="qc-template-form-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="modal-form-body">
      <div class="basic-info-box">
        <div class="form-row-pair">
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
        </div>

        <div class="form-row form-row-last">
          <label class="form-label required">适用范围</label>
          <a-radio-group v-model:value="form.scopeType" class="scope-radio">
            <a-radio v-for="opt in scopeTypeOpts" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </div>

        <div
          v-if="form.scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY"
          class="form-row form-row-last"
        >
          <label class="form-label required">适用对象</label>
          <a-tree-select
            v-model:value="categoryObjectKeys"
            tree-checkable
            allow-clear
            show-search
            tree-node-filter-prop="title"
            placeholder="请选择产品类别 / 物料类别"
            style="flex: 1; min-width: 0"
            :tree-data="categoryTreeData"
            :show-checked-strategy="SHOW_CHILD"
            :max-tag-count="4"
          />
        </div>

        <div
          v-else-if="form.scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE"
          class="form-row form-row-last objects-item-row"
        >
          <label class="form-label required">适用对象</label>
          <div class="item-objects-wrap">
            <a-select
              v-model:value="itemObjectCodes"
              mode="multiple"
              show-search
              allow-clear
              placeholder="输入编码/名称搜索"
              style="flex: 1; min-width: 0"
              :filter-option="false"
              :options="itemSearchOptions"
              @search="onItemSearch"
            />
            <a-button type="link" @click="itemPickerOpen = true">查看更多</a-button>
          </div>
        </div>
      </div>

      <SelectBomMaterialModal
        v-model:open="itemPickerOpen"
        title="选择产品"
        :multiple="true"
        hide-add-material
        :include-spu-templates="true"
        :spu-can-sell-only="false"
        :initial-selected-ids="itemPickerInitialIds"
        @selected="onItemsPicked"
      />

      <QcTemplateConflictModal
        v-model:open="conflictOpen"
        :kind="conflictKind"
        :conflicts="conflictRows"
        :current-template-name="form.name"
        @confirm="onConflictConfirm"
        @cancel="pendingSavePayload = null"
      />

      <div class="fields-section">
        <div class="fields-header">
          <div>
            <h4>模板字段</h4>
            <div class="fields-hint">
              系统字段：质检方式、质检数量、质检结果（类型「系统」，不可删除）。用户添加的字段类型为「自定义」。全部字段均可拖拽排序；添加字段时会将方式/数量置顶、结果置底，拖动后以你调整的顺序为准。
            </div>
          </div>
          <a-button type="primary" size="small" @click="openFieldModal(null)">
            <PlusOutlined />
            添加字段
          </a-button>
        </div>

        <a-table
          v-if="form.fields.length"
          :columns="fieldColumns"
          :data-source="form.fields"
          :row-key="fieldRowKey"
          size="small"
          bordered
          :pagination="false"
          :custom-row="customFieldRow"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'drag'">
              <span class="drag-handle" title="拖拽排序" @mousedown.stop>
                <HolderOutlined />
              </span>
            </template>
            <template v-else-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'type'">
              {{ fieldTypeMap[record.type] || record.type || '—' }}
            </template>
            <template v-else-if="column.key === 'required'">
              {{ record.required ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'fieldKind'">
              <a-tag v-if="isQcSystemFixedField(record)" color="blue">系统</a-tag>
              <a-tag v-else color="default">自定义</a-tag>
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-switch
                v-if="isQcConclusionField(record)"
                :checked="record.enabled !== false"
                size="small"
                checked-children="启用"
                un-checked-children="关闭"
                @change="(v) => (record.enabled = v)"
              />
              <span v-else class="muted">—</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0">
                <a-button type="link" size="small" @click="openFieldModal(index)">编辑</a-button>
                <a-button
                  v-if="!isQcSystemFixedField(record)"
                  type="link"
                  size="small"
                  danger
                  @click="removeField(index)"
                >
                  删除
                </a-button>
              </a-space>
            </template>
            <template v-else>
              {{ record[column.dataIndex] || '—' }}
            </template>
          </template>
        </a-table>
        <p v-else class="empty-hint">暂无字段</p>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>

    <a-modal
      v-model:open="fieldModalOpen"
      :title="fieldModalTitle"
      width="780px"
      :mask-closable="false"
      destroy-on-close
      @ok="saveField"
      @cancel="closeFieldModal"
    >
      <a-form layout="vertical" class="field-form-grid">
        <template v-if="editingConclusion">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="字段名称" required>
                <a-input v-model:value="fieldForm.name" placeholder="请输入字段名称" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="启用结论字段">
                <a-switch
                  v-model:checked="fieldForm.enabled"
                  checked-children="启用"
                  un-checked-children="关闭"
                />
                <div class="option-map-hint">
                  关闭后检验录入不展示结论，也不据此回写任务质检结果。
                </div>
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="输入提示">
            <a-input v-model:value="fieldForm.placeholder" placeholder="请输入提示文案" />
          </a-form-item>
          <a-form-item label="结论选项（含结果映射）">
            <div
              v-for="(item, i) in fieldForm.optionItems"
              :key="i"
              class="option-row conclusion-opt"
            >
              <a-input
                v-model:value="item.value"
                placeholder="选项文案"
                :disabled="isLockedConclusionOption(item)"
              />
              <a-select
                v-model:value="item.result"
                placeholder="对应质检结果"
                style="width: 132px; flex-shrink: 0"
                :options="conclusionResultOpts"
              />
              <a-checkbox
                :checked="Boolean(item.isDefault)"
                @change="(e) => setConclusionDefault(i, e.target.checked)"
              >
                设为默认值
              </a-checkbox>
              <a-button
                type="text"
                danger
                :disabled="isLockedConclusionOption(item)"
                @click="removeConclusionOption(i)"
              >
                删除
              </a-button>
            </div>
            <a-button type="link" size="small" @click="addConclusionOption">+ 添加选项</a-button>
            <div class="option-map-hint">
              预设「合格 / 不合格 /
              让步合格」不可删除。映射仅支持质检通过、质检不通过。可勾选「设为默认值」。
            </div>
          </a-form-item>
        </template>

        <template v-else>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="字段名称" required>
                <a-input v-model:value="fieldForm.name" placeholder="请输入字段名称" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="字段类型" required>
                <a-select
                  v-model:value="fieldForm.type"
                  placeholder="请选择"
                  :options="fieldTypeOpts"
                  @change="onFieldTypeChange"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="是否必填">
                <a-radio-group v-model:value="fieldForm.required">
                  <a-radio :value="true">是</a-radio>
                  <a-radio :value="false">否</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="是否带单位">
                <div class="unit-inline-row">
                  <a-checkbox v-model:checked="fieldForm.withUnit">带单位</a-checkbox>
                  <a-input
                    v-if="fieldForm.withUnit"
                    v-model:value="fieldForm.unit"
                    placeholder="请输入单位"
                    allow-clear
                  />
                </div>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row v-if="showFormatField || fieldForm.type === 'number'" :gutter="16">
            <a-col v-if="showFormatField" :span="12">
              <a-form-item label="字段格式">
                <a-input
                  v-model:value="fieldForm.format"
                  :placeholder="formatPlaceholder"
                  allow-clear
                />
                <div class="option-map-hint">
                  用于日期/日期时间的展示与录入格式（如 yyyy-MM-dd、yyyy-MM-dd HH:mm:ss）。
                </div>
              </a-form-item>
            </a-col>
            <a-col v-if="fieldForm.type === 'number'" :span="12">
              <a-form-item label="数字设置">
                <a-checkbox v-model:checked="fieldForm.allowDecimal">允许小数</a-checkbox>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="输入提示">
                <a-input v-model:value="fieldForm.placeholder" placeholder="请输入提示文案" />
              </a-form-item>
            </a-col>
            <a-col v-if="['text', 'textarea', 'number'].includes(fieldForm.type)" :span="12">
              <a-form-item label="默认值">
                <a-input v-model:value="fieldForm.defaultValue" placeholder="请输入默认值" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row v-if="fieldForm.type === 'text' || fieldForm.type === 'textarea'" :gutter="16">
            <a-col :span="12">
              <a-form-item label="字符限制">
                <a-input-number
                  v-model:value="fieldForm.charLimit"
                  :min="1"
                  style="width: 100%"
                  placeholder="最大字符数"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item
            v-if="fieldForm.type === 'radio' || fieldForm.type === 'checkbox'"
            label="选项列表"
          >
            <div
              v-for="(opt, i) in fieldForm.optionRows"
              :key="i"
              class="option-row conclusion-opt"
            >
              <a-input v-model:value="opt.value" placeholder="选项值" />
              <a-checkbox
                :checked="Boolean(opt.isDefault)"
                @change="(e) => setOptionDefault(i, e.target.checked)"
              >
                设为默认值
              </a-checkbox>
              <a-button type="text" danger @click="fieldForm.optionRows.splice(i, 1)">
                删除
              </a-button>
            </div>
            <a-button type="link" size="small" @click="addOptionRow">+ 添加选项</a-button>
          </a-form-item>

          <a-form-item label="字段描述">
            <a-input
              v-model:value="fieldForm.description"
              allow-clear
              placeholder="请输入字段描述（选填）"
            />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </FormCreateShell>
</template>

<script>
export default { name: 'QcTemplateFormModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, TreeSelect } from 'ant-design-vue'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  QC_TEMPLATE_SCOPE_TYPE,
  qcTemplateBizScopeOptions,
  qcTemplateScopeTypeOptions,
} from '@/mock/qcTemplates'
import { productCategoryTree } from '@/mock/productCategories'
import { materialCategoryTree } from '@/mock/materialCategories'
import { addQcTemplate, getQcTemplateById, updateQcTemplate } from '@/store/qcTemplateStore'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import {
  QC_CONCLUSION_RESULT_OPTIONS,
  createPresetConclusionField,
  ensureFieldsWithSystemFixedItems,
  insertFieldBeforeConclusion,
  isLockedConclusionOption,
  isQcConclusionField,
  isQcSystemFixedField,
  normalizeConclusionOptionItems,
  validateConclusionOptionItems,
} from '@/utils/qcConclusionField'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import QcTemplateConflictModal from './QcTemplateConflictModal.vue'

const SHOW_CHILD = TreeSelect.SHOW_CHILD
const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])
const route = useRoute()

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/quality/qc-template',
  getTitle: () => (isEdit.value ? '编辑质检模板' : '新增质检模板'),
})

const saving = ref(false)
const fieldModalOpen = ref(false)
const editingFieldIndex = ref(null)
const editingId = ref('')
const templateStatus = ref('停用')
const itemPickerOpen = ref(false)
const itemSearchKeyword = ref('')
const conflictOpen = ref(false)
const conflictKind = ref('single')
const conflictRows = ref([])
const pendingSavePayload = ref(null)
const pendingConflictResolution = ref(null)

const fieldTypeMap = {
  text: '文本框',
  textarea: '文本域',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  radio: '单选',
  checkbox: '多选',
}

const fieldTypeOpts = Object.entries(fieldTypeMap).map(([value, label]) => ({ label, value }))
const scopeTypeOpts = qcTemplateScopeTypeOptions
const bizScopeOpts = qcTemplateBizScopeOptions.map((v) => ({ label: v, value: v }))
const conclusionResultOpts = QC_CONCLUSION_RESULT_OPTIONS

const isEdit = computed(() => Boolean(editingId.value))
const editingConclusion = computed(() => {
  if (editingFieldIndex.value == null) return false
  return isQcConclusionField(form.fields[editingFieldIndex.value])
})
const fieldModalTitle = computed(() => {
  if (editingFieldIndex.value == null) return '新增模板字段'
  return editingConclusion.value ? '编辑质检结果' : '编辑模板字段'
})
const showFormatField = computed(() => fieldForm.type === 'date' || fieldForm.type === 'datetime')
const formatPlaceholder = computed(() =>
  fieldForm.type === 'datetime' ? '如：yyyy-MM-dd HH:mm:ss' : '如：yyyy-MM-dd',
)

const form = reactive({
  name: '',
  bizScope: '成品检',
  scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
  objects: [],
  fields: [],
})

const fieldForm = reactive(emptyFieldForm())

function mapCategoryTree(nodes, type) {
  return (nodes || []).map((n) => ({
    title: n.title,
    value: `${type}:${n.key}`,
    key: `${type}:${n.key}`,
    code: n.code,
    rawKey: n.key,
    objectType: type,
    children: n.children?.length ? mapCategoryTree(n.children, type) : undefined,
  }))
}

const categoryTreeData = [
  {
    title: '产品类别',
    value: '__group_product__',
    key: '__group_product__',
    selectable: false,
    disableCheckbox: true,
    children: mapCategoryTree(productCategoryTree, 'productCategory'),
  },
  {
    title: '物料类别',
    value: '__group_material__',
    key: '__group_material__',
    selectable: false,
    disableCheckbox: true,
    children: mapCategoryTree(materialCategoryTree, 'materialCategory'),
  },
]

const categoryObjectKeys = computed({
  get() {
    return (form.objects || [])
      .filter((o) => o.type === 'productCategory' || o.type === 'materialCategory')
      .map((o) => `${o.type}:${o.value}`)
  },
  set(keys) {
    const list = Array.isArray(keys) ? keys : []
    const flat = []
    const walk = (nodes) => {
      nodes.forEach((n) => {
        if (n.objectType && n.rawKey) flat.push(n)
        if (n.children) walk(n.children)
      })
    }
    walk(categoryTreeData)
    form.objects = list
      .map((k) => flat.find((n) => n.value === k))
      .filter(Boolean)
      .map((n) => ({
        type: n.objectType,
        value: n.rawKey,
        code: n.code || '',
        label: n.title,
      }))
  },
})

const allItemRows = computed(() =>
  buildBomSubItemPickerRows({
    skipSubItemCount: true,
    includeSpuTemplates: true,
    spuCanSellOnly: false,
  }),
)

const itemObjectCodes = computed({
  get() {
    return (form.objects || []).filter((o) => o.type === 'item').map((o) => o.value)
  },
  set(codes) {
    const selected = Array.isArray(codes) ? codes : []
    const prevMap = new Map(
      (form.objects || []).filter((o) => o.type === 'item').map((o) => [o.value, o]),
    )
    form.objects = selected.map((code) => {
      if (prevMap.has(code)) return prevMap.get(code)
      const row = allItemRows.value.find((r) => r.code === code)
      return {
        type: 'item',
        value: code,
        label: row?.name || code,
        specModel: row?.specModel || '',
        itemId: row?.id || '',
        categoryKey: row?.categoryKey || '',
        categoryName: row?.categoryName || '',
      }
    })
  },
})

const itemSearchOptions = computed(() => {
  const kw = itemSearchKeyword.value.trim()
  const filtered = filterBomSubItemPickerRows(allItemRows.value, kw)
  const sliced = kw ? filtered.slice(0, 50) : filtered.slice(0, 8)
  const options = sliced.map((row) => ({
    label: `[${row.code}] ${row.name}`,
    value: row.code,
  }))
  ;(form.objects || [])
    .filter((o) => o.type === 'item')
    .forEach((o) => {
      if (!options.some((opt) => opt.value === o.value)) {
        options.unshift({
          label: o.specModel ? `[${o.value}] ${o.label} ${o.specModel}` : `[${o.value}] ${o.label}`,
          value: o.value,
        })
      }
    })
  return options
})

const itemPickerInitialIds = computed(() =>
  (form.objects || []).filter((o) => o.type === 'item' && o.itemId).map((o) => String(o.itemId)),
)

function onItemSearch(kw) {
  itemSearchKeyword.value = kw || ''
}

function onItemsPicked(payload) {
  const rows = Array.isArray(payload) ? payload : []
  const map = new Map(
    (form.objects || []).filter((o) => o.type === 'item').map((o) => [o.value, o]),
  )
  rows.forEach((row) => {
    const code = row.code || row.materialCode || ''
    if (!code) return
    map.set(code, {
      type: 'item',
      value: code,
      label: row.name || row.itemName || code,
      specModel: row.specModel || '',
      itemId: row.id || '',
      categoryKey: row.categoryKey || '',
      categoryName: row.categoryName || '',
    })
  })
  form.objects = [...map.values()]
}

watch(
  () => form.scopeType,
  (val, prev) => {
    if (val === prev) return
    if (val === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) form.objects = []
  },
)

const fieldColumns = [
  { title: '', key: 'drag', width: 36, align: 'center' },
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '字段名称', dataIndex: 'name', width: 120 },
  { title: '字段类型', key: 'type', width: 90 },
  { title: '类型', key: 'fieldKind', width: 80, align: 'center' },
  { title: '启用', key: 'enabled', width: 90, align: 'center' },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '输入提示', dataIndex: 'placeholder', ellipsis: true },
  { title: '操作', key: 'action', width: 110 },
]

const dragFieldIndex = ref(null)
const dragOverFieldIndex = ref(null)

function fieldRowKey(record, index) {
  return String(record?.code || `field-${index}`)
}

function customFieldRow(record, index) {
  return {
    draggable: true,
    class: {
      'field-row-dragging': dragFieldIndex.value === index,
      'field-row-drag-over': dragOverFieldIndex.value === index && dragFieldIndex.value !== index,
    },
    onDragstart: (e) => onFieldDragStart(index, e),
    onDragover: (e) => onFieldDragOver(index, e),
    onDragleave: () => onFieldDragLeave(index),
    onDrop: (e) => onFieldDrop(index, e),
    onDragend: onFieldDragEnd,
  }
}

function onFieldDragStart(index, e) {
  dragFieldIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index))
}

function onFieldDragOver(index, e) {
  if (dragFieldIndex.value == null) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverFieldIndex.value = index
}

function onFieldDragLeave(index) {
  if (dragOverFieldIndex.value === index) dragOverFieldIndex.value = null
}

function onFieldDrop(index, e) {
  e.preventDefault()
  const from = dragFieldIndex.value
  dragOverFieldIndex.value = null
  dragFieldIndex.value = null
  if (from == null || from === index) return
  const list = form.fields.map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
    optionResults: f.optionResults ? { ...f.optionResults } : undefined,
  }))
  const [item] = list.splice(from, 1)
  list.splice(index, 0, item)
  // 保留用户拖拽顺序，仅规范化系统项标记
  form.fields = ensureFieldsWithSystemFixedItems(list, { layout: 'preserve' })
}

function onFieldDragEnd() {
  dragFieldIndex.value = null
  dragOverFieldIndex.value = null
}

function emptyFieldForm() {
  return {
    code: '',
    name: '',
    type: undefined,
    format: '',
    required: false,
    withUnit: false,
    unit: '',
    allowDecimal: false,
    description: '',
    enabled: true,
    placeholder: '',
    optionRows: [],
    optionItems: [],
    defaultValue: '',
    charLimit: null,
  }
}

function generateFieldCode(existingFields = []) {
  const used = new Set(
    (existingFields || []).map((f) => String(f.code || '').trim()).filter(Boolean),
  )
  let seq = (existingFields || []).filter((f) => !isQcConclusionField(f)).length + 1
  let code = `FLD_${String(seq).padStart(3, '0')}`
  while (used.has(code)) {
    seq += 1
    code = `FLD_${String(seq).padStart(3, '0')}`
  }
  return code
}

function toOptionRows(options = [], defaultValue = '') {
  const list = Array.isArray(options) ? options : []
  const def = String(defaultValue || '').trim()
  return list.map((o) => {
    if (typeof o === 'string') {
      const value = String(o || '').trim()
      return { value, isDefault: Boolean(value && value === def) }
    }
    const value = String(o?.value ?? '').trim()
    return {
      value,
      isDefault: Boolean(o?.isDefault) || Boolean(value && value === def),
    }
  })
}

function resolveDefaultFromOptionRows(rows = []) {
  const hit = (rows || []).find((o) => o.isDefault && String(o.value || '').trim())
  return hit ? String(hit.value).trim() : ''
}

function addOptionRow() {
  fieldForm.optionRows.push({ value: '', isDefault: false })
}

function setOptionDefault(index, checked) {
  fieldForm.optionRows.forEach((row, i) => {
    row.isDefault = checked && i === index
  })
}

function addConclusionOption() {
  fieldForm.optionItems.push({
    value: '',
    result: QC_TASK_RESULT.PASS,
    locked: false,
    isDefault: false,
  })
}

function setConclusionDefault(index, checked) {
  fieldForm.optionItems.forEach((row, i) => {
    row.isDefault = checked && i === index
  })
}

function removeConclusionOption(index) {
  const item = fieldForm.optionItems[index]
  if (isLockedConclusionOption(item)) {
    message.warning('系统预设选项不可删除')
    return
  }
  fieldForm.optionItems.splice(index, 1)
}

function resetForm() {
  editingId.value = ''
  templateStatus.value = '停用'
  form.name = ''
  form.bizScope = '成品检'
  form.scopeType = QC_TEMPLATE_SCOPE_TYPE.GLOBAL
  form.objects = []
  form.fields = ensureFieldsWithSystemFixedItems([], { layout: 'default' })
}

function resolveScopeType(record) {
  if (record?.scopeType) return record.scopeType
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
  if (!record) {
    resetForm()
    return
  }
  editingId.value = record.id || ''
  templateStatus.value = record.status || '停用'
  form.name = record.name || ''
  form.bizScope = resolveBizScope(record)
  form.scopeType = resolveScopeType(record)
  form.objects = Array.isArray(record.objects) ? record.objects.map((o) => ({ ...o })) : []
  form.fields = ensureFieldsWithSystemFixedItems(record.fields || [], { layout: 'preserve' })
}

function resolveActiveRecord() {
  if (props.editRecord?.id) return props.editRecord
  const id = String(route.query.id || '').trim()
  if (id) return getQcTemplateById(id)
  return null
}

watch(
  () => [isActive.value, props.editRecord?.id, route.query.id],
  ([active]) => {
    if (!active) return
    const record = resolveActiveRecord()
    if (record) loadEdit(record)
    else resetForm()
  },
  { immediate: true },
)

function removeField(index) {
  if (isQcSystemFixedField(form.fields[index])) {
    message.warning('系统固定项不可删除')
    return
  }
  form.fields.splice(index, 1)
  form.fields = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'preserve' })
}

function openFieldModal(index) {
  editingFieldIndex.value = index
  if (index != null && form.fields[index]) {
    const f = form.fields[index]
    const isConclusion = isQcConclusionField(f)
    const unit = String(f.unit || '').trim()
    const optionItems = isConclusion
      ? normalizeConclusionOptionItems(f).map((o) => ({
          ...o,
          isDefault: Boolean(o.value && o.value === f.defaultValue),
        }))
      : []
    Object.assign(fieldForm, {
      code: f.code || '',
      name: f.name || '',
      type: f.type || undefined,
      format: f.format || '',
      required: Boolean(f.required),
      withUnit: Boolean(f.withUnit) || Boolean(unit),
      unit,
      allowDecimal: Boolean(f.allowDecimal),
      description: f.description || '',
      enabled: f.enabled !== false,
      placeholder: f.placeholder || '',
      optionRows: toOptionRows(f.options || [], f.defaultValue),
      optionItems,
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
  if (editingConclusion.value) return
  fieldForm.optionRows = []
  fieldForm.defaultValue = ''
  fieldForm.charLimit = null
  fieldForm.allowDecimal = false
  if (fieldForm.type === 'date') {
    fieldForm.format = fieldForm.format || 'yyyy-MM-dd'
  } else if (fieldForm.type === 'datetime') {
    fieldForm.format = fieldForm.format || 'yyyy-MM-dd HH:mm:ss'
  } else {
    fieldForm.format = ''
  }
}

function saveField() {
  if (!String(fieldForm.name || '').trim()) {
    message.warning('请输入字段名称')
    return
  }
  if (!fieldForm.type) {
    message.warning('请选择字段类型')
    return
  }
  if (fieldForm.withUnit && !String(fieldForm.unit || '').trim()) {
    message.warning('请输入单位')
    return
  }

  if (editingConclusion.value) {
    const checked = validateConclusionOptionItems(fieldForm.optionItems)
    if (!checked.ok) {
      message.warning(checked.message)
      return
    }
    const defaultValue = resolveDefaultFromOptionRows(fieldForm.optionItems)
    const idx = editingFieldIndex.value
    form.fields[idx] = createPresetConclusionField({
      name: String(fieldForm.name).trim(),
      enabled: fieldForm.enabled !== false,
      placeholder: fieldForm.placeholder || '请选择质检结果',
      defaultValue,
      optionItems: checked.items.map((item) => ({
        ...item,
        isDefault: Boolean(item.value && item.value === defaultValue),
      })),
    })
    form.fields = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'preserve' })
    closeFieldModal()
    return
  }

  if (fieldForm.type === 'radio' || fieldForm.type === 'checkbox') {
    const rows = (fieldForm.optionRows || [])
      .map((o) => ({
        value: String(o.value || '').trim(),
        isDefault: Boolean(o.isDefault),
      }))
      .filter((o) => o.value)
    if (rows.length < 1) {
      message.warning('请至少添加一个选项')
      return
    }
  }

  const existingCode =
    editingFieldIndex.value != null ? form.fields[editingFieldIndex.value]?.code : ''
  const code = String(existingCode || fieldForm.code || '').trim() || generateFieldCode(form.fields)

  const isChoice = fieldForm.type === 'radio' || fieldForm.type === 'checkbox'
  const optionValues = isChoice
    ? (fieldForm.optionRows || []).map((o) => String(o.value || '').trim()).filter(Boolean)
    : []
  const defaultValue = isChoice
    ? resolveDefaultFromOptionRows(fieldForm.optionRows)
    : fieldForm.defaultValue || ''

  const payload = {
    code,
    name: String(fieldForm.name).trim(),
    type: fieldForm.type,
    format: showFormatField.value ? fieldForm.format || '' : '',
    required: Boolean(fieldForm.required),
    withUnit: Boolean(fieldForm.withUnit),
    unit: fieldForm.withUnit ? String(fieldForm.unit || '').trim() : '',
    allowDecimal: fieldForm.type === 'number' ? Boolean(fieldForm.allowDecimal) : false,
    description: String(fieldForm.description || '').trim(),
    isConclusion: false,
    placeholder: fieldForm.placeholder || '',
    options: optionValues,
    defaultValue,
    charLimit: fieldForm.charLimit,
  }

  if (editingFieldIndex.value != null) {
    form.fields[editingFieldIndex.value] = payload
    form.fields = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'preserve' })
  } else {
    form.fields = insertFieldBeforeConclusion(form.fields, payload)
  }
  closeFieldModal()
}

function buildSavePayload() {
  const fields = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'preserve' })
  let objects = []
  if (form.scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) {
    objects = []
  } else {
    objects = (form.objects || []).map((o) => ({ ...o }))
  }
  return {
    name: String(form.name).trim(),
    bizScope: form.bizScope,
    scopeType: form.scopeType,
    objects,
    status: templateStatus.value || '停用',
    fields: fields.map((f) => ({
      ...f,
      options: f.options ? [...f.options] : [],
    })),
    fieldCount: fields.length,
  }
}

function handleSave(conflictResolution = null) {
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
  if (
    form.scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY ||
    form.scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE
  ) {
    if (!(form.objects || []).length) {
      message.warning('请选择适用对象')
      return
    }
  }

  const payload = buildSavePayload()
  saving.value = true
  try {
    if (!isEdit.value) {
      const res = addQcTemplate(payload)
      if (!res.ok) {
        message.warning(res.message || '保存失败')
        return
      }
      message.success(`已创建模板 ${res.template.code}（默认停用）`)
      emit('saved', res.template)
      closeAfterSave()
      return
    }

    const res = updateQcTemplate(editingId.value, payload, {
      conflictResolution: conflictResolution || pendingConflictResolution.value || undefined,
    })
    if (res.needConflict) {
      pendingSavePayload.value = payload
      conflictKind.value = res.conflict.kind
      conflictRows.value = res.conflict.conflicts || []
      conflictOpen.value = true
      return
    }
    if (!res.ok) {
      message.warning(res.message || '保存失败')
      return
    }
    message.success('模板已更新')
    emit('saved', res.template)
    closeAfterSave()
  } finally {
    saving.value = false
    pendingConflictResolution.value = null
  }
}

function onConflictConfirm({ mode }) {
  pendingConflictResolution.value = { mode }
  handleSave({ mode })
}
</script>

<style lang="less" scoped>
.modal-form-body {
  padding: 4px 0 8px;
}

.basic-info-box {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px 16px 0;
  margin-bottom: 16px;
  background: #fff;
}

.form-row-pair {
  display: flex;
  gap: 16px;
  margin-bottom: 0;
}

.form-row-pair > .form-row {
  flex: 1;
  min-width: 0;
}

.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 0;
}

.form-row-last {
  margin-bottom: 16px;
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
.form-row > :deep(.ant-select),
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

.item-objects-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.objects-item-row {
  align-items: center;
}

.unit-inline-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
}

.unit-inline-row > :deep(.ant-input),
.unit-inline-row > :deep(.ant-input-affix-wrapper) {
  flex: 1;
  min-width: 0;
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
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.fields-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.fields-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.empty-hint {
  margin: 28px 0 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.45);
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

:deep(.field-row-dragging) {
  opacity: 0.55;
}

:deep(.field-row-drag-over) > td {
  background: #e6f4ff !important;
}

:deep(tr[draggable='true']) {
  cursor: grab;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.option-row.conclusion-opt > :deep(.ant-input) {
  flex: 1;
  min-width: 0;
}

.option-row :deep(.ant-checkbox-wrapper) {
  flex-shrink: 0;
  white-space: nowrap;
}

.option-map-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
