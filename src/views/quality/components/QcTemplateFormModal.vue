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

      <QcFieldLibraryPickModal
        v-model:open="pickLibraryOpen"
        :existing-fields="form.fields"
        @confirm="onPickLibraryFields"
      />

      <div class="fields-section">
        <div class="fields-header">
          <div>
            <h4>模板字段</h4>
            <div class="fields-hint">
              系统字段：质检方式、质检数量、质检结果（类型「系统」，不可删除）。自定义字段可从「检验项库」批量选用，或点「新增检验项」在新标签页创建入库后再选用。全部字段均可拖拽排序；新增字段时方式/数量置顶、结果置底，拖动后以你调整的顺序为准。
            </div>
          </div>
          <a-space size="small">
            <a-button size="small" @click="pickLibraryOpen = true">从检验项库添加</a-button>
            <a-button type="primary" size="small" @click="openCreateField">
              <PlusOutlined />
              新增检验项
            </a-button>
          </a-space>
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
            <template v-else-if="column.key === 'unit'">
              {{ displayFieldUnit(record) }}
            </template>
            <template v-else-if="column.key === 'standard'">
              {{ buildStandardText(record) || '—' }}
            </template>
            <template v-else-if="column.key === 'keyForSheetPass'">
              <a-checkbox
                v-if="!isQcSystemFixedField(record)"
                :checked="Boolean(record.keyForSheetPass)"
                :disabled="form.sheetPassRule !== 'keyFields'"
                @change="(e) => (record.keyForSheetPass = e.target.checked)"
              />
              <span v-else class="muted">—</span>
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

      <div class="sheet-pass-section">
        <div class="fields-header">
          <div>
            <h4>整单合格规则</h4>
            <div class="fields-hint">
              配置本模板判定「质检通过」时，对检验项合格标准的约束（与下方各字段合格标准配合使用）。
            </div>
          </div>
        </div>
        <a-radio-group v-model:value="form.sheetPassRule" class="sheet-pass-radios">
          <div
            v-for="opt in sheetPassRuleOpts"
            :key="opt.value"
            class="sheet-pass-option"
            :class="{ active: form.sheetPassRule === opt.value }"
          >
            <a-radio :value="opt.value">
              <span class="sheet-pass-label">{{ opt.label }}</span>
            </a-radio>
            <div class="sheet-pass-desc">{{ opt.desc }}</div>
          </div>
        </a-radio-group>
        <div v-if="form.sheetPassRule === 'keyFields'" class="sheet-pass-key-tip">
          请在上方字段表「关键项」列勾选需强制达标的检验项（系统字段不可勾选）。
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>

    <a-modal
      v-model:open="fieldModalOpen"
      :title="fieldModalTitle"
      :width="editingConclusion ? 780 : fieldForm.type === 'composite' ? 920 : 780"
      :mask-closable="false"
      destroy-on-close
      @ok="saveField"
      @cancel="closeFieldModal"
    >
      <a-form v-if="editingConclusion" layout="vertical" class="field-form-grid">
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
                关闭后检验录入不展示结论，也不据此回写任务质检结果。若模板配置了「全部达标 /
                关键项达标」规则，判定通过时仍会校验检验项标准。
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
      </a-form>

      <QcFieldEditorForm
        v-else
        :model="fieldForm"
        :show-sync-to-library="editingFieldIndex == null"
        @update:model="onFieldFormUpdate"
      />
    </a-modal>
  </FormCreateShell>
</template>

<script>
export default { name: 'QcTemplateFormModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, TreeSelect } from 'ant-design-vue'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useTabs } from '@/composables/useTabs'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
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
import QcFieldLibraryPickModal from './QcFieldLibraryPickModal.vue'
import QcFieldEditorForm from './QcFieldEditorForm.vue'
import {
  pickLibraryFieldsForTemplate,
  syncTemplateFieldToLibrary,
} from '@/store/qcFieldLibraryStore'
import {
  QC_FIELD_JUDGE_RULE,
  QC_UNIT_POSITION,
  buildStandardText,
  pickFieldStandardProps,
  validateManualOptionItems,
} from '@/utils/qcFieldStandard'
import {
  pickComplexFieldProps,
  validateComplexFieldConfig,
  ensureChildFieldCodes,
} from '@/utils/qcComplexField'
import {
  QC_TEMPLATE_SHEET_PASS_RULE,
  QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS,
  normalizeSheetPassRule,
} from '@/utils/qcTemplateSheetPass'

const SHOW_CHILD = TreeSelect.SHOW_CHILD
const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])
const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const fieldLibraryCreatePage = findCreatePageByListPath('/quality/qc-field-library')

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/quality/qc-template',
  getTitle: () => (isEdit.value ? '编辑质检模板' : '新增质检模板'),
})

const saving = ref(false)
const fieldModalOpen = ref(false)
const pickLibraryOpen = ref(false)
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
  composite: '复合项',
  matrix: '多点网格',
}

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

const form = reactive({
  name: '',
  bizScope: '成品检',
  scopeType: QC_TEMPLATE_SCOPE_TYPE.GLOBAL,
  objects: [],
  fields: [],
  sheetPassRule: QC_TEMPLATE_SHEET_PASS_RULE.MANUAL,
})

const sheetPassRuleOpts = QC_TEMPLATE_SHEET_PASS_RULE_OPTIONS

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

const fieldColumns = computed(() => {
  const cols = [
    { title: '', key: 'drag', width: 36, align: 'center' },
    { title: '序号', key: 'index', width: 56, align: 'center' },
    { title: '字段名称', dataIndex: 'name', width: 120 },
    { title: '字段类型', key: 'type', width: 90 },
    { title: '类型', key: 'fieldKind', width: 80, align: 'center' },
    { title: '启用', key: 'enabled', width: 90, align: 'center' },
    { title: '必填', key: 'required', width: 56, align: 'center' },
    { title: '单位', key: 'unit', width: 88 },
    { title: '合格标准', key: 'standard', width: 140, ellipsis: true },
  ]
  if (form.sheetPassRule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    cols.push({ title: '关键项', key: 'keyForSheetPass', width: 72, align: 'center' })
  }
  cols.push(
    { title: '输入提示', dataIndex: 'placeholder', ellipsis: true },
    { title: '操作', key: 'action', width: 110 },
  )
  return cols
})

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
    indicatorKind: 'basic',
    type: undefined,
    format: '',
    required: false,
    withUnit: false,
    unit: '',
    unitPosition: QC_UNIT_POSITION.SUFFIX,
    allowDecimal: false,
    description: '',
    enabled: true,
    placeholder: '',
    optionRows: [],
    optionItems: [],
    defaultValue: '',
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
    syncToLibrary: true,
    manualOptionItems: [],
  }
}

function onFieldFormUpdate(next) {
  Object.assign(fieldForm, next)
}

function displayFieldUnit(record) {
  if (!record?.withUnit && !record?.unit) return '—'
  const unit = String(record.unit || '').trim() || '—'
  if (!unit || unit === '—') return '—'
  return record.unitPosition === 'prefix' ? `${unit}（前）` : `${unit}（后）`
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
  form.sheetPassRule = QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
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
  form.sheetPassRule = normalizeSheetPassRule(record.sheetPassRule)
  form.fields = ensureFieldsWithSystemFixedItems(record.fields || [], { layout: 'preserve' }).map(
    (f) => ({
      ...f,
      keyForSheetPass: Boolean(f.keyForSheetPass),
    }),
  )
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

function openCreateField() {
  if (!fieldLibraryCreatePage) {
    message.warning('未配置新增页')
    return
  }
  openCreateTab(router, openTab, {
    path: fieldLibraryCreatePage.newPath,
    title: fieldLibraryCreatePage.title,
  })
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
      ...emptyFieldForm(),
      code: f.code || '',
      name: f.name || '',
      indicatorKind: f.type === 'composite' ? 'composite' : 'basic',
      type: f.type === 'matrix' ? undefined : f.type || undefined,
      format: f.format || '',
      required: Boolean(f.required),
      withUnit: Boolean(f.withUnit) || Boolean(unit),
      unit,
      unitPosition: f.unitPosition === 'prefix' ? QC_UNIT_POSITION.PREFIX : QC_UNIT_POSITION.SUFFIX,
      allowDecimal: Boolean(f.allowDecimal),
      description: f.description || '',
      enabled: f.enabled !== false,
      placeholder: f.placeholder || '',
      optionRows: toOptionRows(f.options || [], f.defaultValue),
      optionItems,
      defaultValue: f.defaultValue || '',
      charLimit: f.charLimit ?? null,
      ...pickFieldStandardProps(f),
      ...pickComplexFieldProps(f),
      children: (f.children || []).map((c) => ({
        ...c,
        optionRows: Array.isArray(c.optionRows)
          ? c.optionRows
          : toOptionRows(c.options || [], c.defaultValue),
        unitPosition: c.unitPosition === 'prefix' ? 'prefix' : 'suffix',
      })),
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

function saveField() {
  if (!fieldForm.type) {
    message.warning(fieldForm.indicatorKind === 'composite' ? '请选择复合类型' : '请选择字段类型')
    return
  }
  if (fieldForm.type === 'matrix') {
    message.warning('多点项暂未开放')
    return
  }
  if (!String(fieldForm.name || '').trim()) {
    message.warning(fieldForm.type === 'composite' ? '请输入父项名称' : '请输入字段名称')
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

  const complexCheck = validateComplexFieldConfig(fieldForm)
  if (!complexCheck.ok) {
    message.warning(complexCheck.message)
    return
  }

  if (fieldForm.judgeRule === QC_FIELD_JUDGE_RULE.RANGE) {
    const hasMin = fieldForm.standardMin !== '' && fieldForm.standardMin != null
    const hasMax = fieldForm.standardMax !== '' && fieldForm.standardMax != null
    if (!hasMin && !hasMax) {
      message.warning('请至少填写合格区间的下限或上限')
      return
    }
    if (hasMin && hasMax && Number(fieldForm.standardMin) > Number(fieldForm.standardMax)) {
      message.warning('合格下限不能大于上限')
      return
    }
  }
  if (
    fieldForm.judgeRule === QC_FIELD_JUDGE_RULE.OPTION_PASS &&
    !(fieldForm.passOptions || []).length
  ) {
    message.warning('请选择至少一个合格选项')
    return
  }
  if (fieldForm.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL) {
    const checked = validateManualOptionItems(fieldForm.manualOptionItems)
    if (!checked.ok) {
      message.warning(checked.message)
      return
    }
    fieldForm.manualOptionItems = checked.items.map((item) => ({
      ...item,
      isDefault: Boolean(
        (fieldForm.manualOptionItems || []).find((o) => o.value === item.value && o.isDefault),
      ),
    }))
  }
  if (
    fieldForm.judgeRule === QC_FIELD_JUDGE_RULE.EQUALS &&
    !String(fieldForm.standardValue || '').trim()
  ) {
    message.warning('请填写标准值')
    return
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

  const children =
    fieldForm.type === 'composite'
      ? complexCheck.children || ensureChildFieldCodes(fieldForm.children)
      : []

  const standard = pickFieldStandardProps({
    ...fieldForm,
    options: optionValues,
    passOptions: fieldForm.passOptions || [],
  })
  const complex = pickComplexFieldProps({ ...fieldForm, children })
  const payload = {
    code,
    name: String(fieldForm.name).trim(),
    type: fieldForm.type,
    format:
      fieldForm.type === 'date' || fieldForm.type === 'datetime' ? fieldForm.format || '' : '',
    required: Boolean(fieldForm.required),
    allowDecimal: fieldForm.type === 'number' ? Boolean(fieldForm.allowDecimal) : false,
    description: String(fieldForm.description || '').trim(),
    isConclusion: false,
    placeholder: fieldForm.placeholder || '',
    options: optionValues,
    defaultValue,
    charLimit: fieldForm.charLimit,
    ...standard,
    ...complex,
    children,
    standardText:
      String(fieldForm.standardText || '').trim() ||
      (fieldForm.type === 'composite'
        ? buildStandardText({ ...fieldForm, ...standard }) || '含子项分别判定'
        : buildStandardText({ ...fieldForm, ...standard, options: optionValues })),
  }

  if (editingFieldIndex.value != null) {
    form.fields[editingFieldIndex.value] = payload
    form.fields = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'preserve' })
  } else {
    form.fields = insertFieldBeforeConclusion(form.fields, payload)
    if (fieldForm.syncToLibrary) {
      const syncRes = syncTemplateFieldToLibrary(payload)
      if (syncRes.ok && !syncRes.skipped) {
        message.success(`字段已加入模板，并同步到检验项库（${syncRes.field.code}）`)
      } else if (syncRes.ok && syncRes.skipped) {
        message.success('字段已加入模板（检验项库已有同编码，未重复写入）')
      } else if (!syncRes.ok && !syncRes.skipped) {
        message.warning(syncRes.message || '同步检验项库失败，字段仍已加入模板')
      }
    }
  }
  closeFieldModal()
}

function onPickLibraryFields(ids = []) {
  const { added, skipped } = pickLibraryFieldsForTemplate(ids, form.fields)
  if (!added.length) {
    message.warning(
      skipped.length
        ? `未添加任何字段（${skipped.map((s) => s.reason).join('、')}）`
        : '未选择字段',
    )
    return
  }
  let list = ensureFieldsWithSystemFixedItems(form.fields, { layout: 'default' })
  added.forEach((field) => {
    list = insertFieldBeforeConclusion(list, field)
  })
  form.fields = list
  const skipTip = skipped.length ? `，跳过 ${skipped.length} 项` : ''
  message.success(`已从检验项库添加 ${added.length} 个字段${skipTip}`)
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
    sheetPassRule: normalizeSheetPassRule(form.sheetPassRule),
    fields: fields.map((f) => ({
      ...f,
      keyForSheetPass:
        form.sheetPassRule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS
          ? Boolean(f.keyForSheetPass)
          : false,
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
  if (form.sheetPassRule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    const hasKey = (form.fields || []).some(
      (f) => !isQcSystemFixedField(f) && f.keyForSheetPass === true,
    )
    if (!hasKey) {
      message.warning('规则为「关键项必须达标」时，请至少勾选一个关键项')
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

.sheet-pass-section {
  margin-top: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}

.sheet-pass-radios {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.sheet-pass-option {
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
}

.sheet-pass-option.active {
  border-color: #91caff;
  background: #e6f4ff;
}

.sheet-pass-label {
  font-weight: 600;
}

.sheet-pass-desc {
  margin: 4px 0 0 24px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.sheet-pass-key-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #1677ff;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
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
