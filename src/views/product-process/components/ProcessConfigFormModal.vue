<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="inline"
      class="process-form horizontal-form"
    >
      <div class="form-section-box modal-basic-card">
        <div class="section-label">基本信息</div>
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="工序编码" name="code">
              <a-input v-model:value="form.code" placeholder="留空则自动生成 GX+流水" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="工序名称" name="name" required>
              <a-input v-model:value="form.name" placeholder="请输入工序名称" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="工序分类" name="category" required>
              <a-select
                v-model:value="form.category"
                placeholder="请选择工序分类"
                :options="categoryOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="资源类型" name="resourceType" required>
              <a-select
                v-model:value="form.resourceType"
                placeholder="请选择资源类型"
                :options="resourceTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item
              label="默认执行人/工组"
              name="defaultExecutors"
              required
              class="label-wide"
            >
              <ExecutorTagPicker
                :executors="form.defaultExecutors"
                :resource-type="form.resourceType"
                placeholder="请选择默认执行人/工组"
                @update:executors="onDefaultExecutorsChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="岗位" name="position">
              <a-select
                v-model:value="form.position"
                allow-clear
                show-search
                placeholder="请选择岗位（选填）"
                :options="positionOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="报工类型" name="reportMode">
              <a-select
                v-model:value="form.reportMode"
                allow-clear
                placeholder="请选择报工类型（选填）"
                :options="reportModeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="showTaskExecutionMode" :span="6">
            <a-form-item label="任务执行模式" name="taskExecutionMode" class="label-wide">
              <a-select
                v-model:value="form.taskExecutionMode"
                placeholder="请选择任务执行模式"
                :options="taskExecutionModeOpts"
              />
              <div v-if="taskExecutionModeHint" class="field-hint">{{ taskExecutionModeHint }}</div>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="不良品项">
              <a-select
                v-model:value="form.defectItemIds"
                mode="multiple"
                show-search
                allow-clear
                placeholder="请选择不良品项（支持搜索）"
                :options="defectItemOpts"
                :filter-option="filterDefectOption"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="图片">
              <div class="image-upload-mock">
                <div v-if="form.image" class="image-preview">
                  <img :src="form.image" alt="工序图片" />
                  <a-button type="link" size="small" danger @click="form.image = ''">移除</a-button>
                </div>
                <a-button v-else size="small" @click="setMockImage">
                  <PlusOutlined />
                  上传
                </a-button>
                <div class="image-hint">jpg/png/jpeg（演示为 MOCK）</div>
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea v-model:value="form.remark" placeholder="请输入备注" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div class="form-section-box">
        <div class="section-label">报工 / 计薪口径与作业分项</div>
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="报工口径">
              <a-select
                v-model:value="form.reportQtyMode"
                :options="reportQtyModeOpts"
                placeholder="请选择报工口径"
                @change="onWorkItemModeChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计薪口径">
              <a-select
                v-model:value="form.wageQtyMode"
                :options="wageQtyModeOpts"
                placeholder="请选择计薪口径"
                @change="onWorkItemModeChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <div class="field-hint field-hint-block">
              {{ workItemModeHint }}
            </div>
          </a-col>
        </a-row>
        <div class="work-item-block">
          <div class="work-item-head">
            <span class="work-item-title">
              作业分项模板
              <span v-if="workItemTemplatesRequired" class="required-mark">*</span>
            </span>
            <a-button type="dashed" size="small" @click="addWorkItemTemplate">
              <PlusOutlined />
              添加分项
            </a-button>
          </div>
          <div
            v-for="(item, index) in form.workItemTemplates"
            :key="`${item.code}-${index}`"
            class="work-item-row"
          >
            <a-input
              v-model:value="item.code"
              size="small"
              placeholder="编码"
              style="width: 120px"
            />
            <a-input v-model:value="item.name" size="small" placeholder="名称" style="flex: 1" />
            <a-input
              v-model:value="item.unit"
              size="small"
              placeholder="单位"
              style="width: 80px"
            />
            <a-button type="link" size="small" danger @click="removeWorkItemTemplate(index)">
              删除
            </a-button>
          </div>
          <div
            v-if="workItemTemplatesRequired && !form.workItemTemplates.length"
            class="field-hint"
          >
            请添加至少一条作业分项
          </div>
          <div v-else-if="!form.workItemTemplates.length" class="field-hint">
            可选：配置后，排产+报工时可勾选分项（不填数量，仅记录做了什么）
          </div>
        </div>
      </div>

      <div class="form-section-box">
        <div class="section-label">工序操作</div>
        <div v-if="isMinimalMode" class="ops-hint">极简模式仅配置下料、质检、外协、拆解相关项</div>
        <a-row :gutter="[16, 12]" class="ops-grid">
          <a-col :span="6">
            <div class="ops-item">
              <span>下料</span>
              <a-switch v-model:checked="form.isBlanking" size="small" />
            </div>
          </a-col>
          <a-col v-for="item in visibleProcessOperationDefs" :key="item.key" :span="6">
            <div class="ops-item">
              <span>{{ item.label }}</span>
              <a-switch
                v-model:checked="form.operations[item.key]"
                size="small"
                @change="(checked) => onOpSwitchChange(item.key, checked)"
              />
            </div>
          </a-col>
        </a-row>
        <div v-if="form.operations.opQc" class="qc-scopes">
          <div class="qc-scopes-label">质检类型</div>
          <a-checkbox-group v-model:value="qcBizScopes" :options="processQcBizScopeOptions()" />
          <div class="field-hint">可多选；工单下发时按勾选项分别生成质检任务</div>
        </div>
      </div>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          <CloseCircleOutlined />
          取消
        </a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <PlusCircleOutlined />
          保存
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseCircleOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  addProcessConfig,
  updateProcessConfig,
  PROCESS_OPERATION_DEFS,
  REPORT_MODES,
  TASK_EXECUTION_MODES,
  RESOURCE_TYPES,
  MOCK_POSITIONS,
} from '@/store/processConfigStore'
import { DEFAULT_TASK_EXECUTION_MODE } from '@/utils/taskExecutionMode'
import { getProductionMode, isMinimalReportMode } from '@/store/businessRuleStore'

/** 极简模式（极简报工 / 下发即报工）可配置的工序操作 */
const MINIMAL_PROCESS_OPERATION_KEYS = ['opQc', 'opOutsource', 'opDisassembly', 'opDisassemblyQc']
import { getActiveCategoryOptions } from '@/store/processCategoryStore'
import { getDefectItemOptions } from '@/store/defectItemStore'
import {
  createProcessQcConfig,
  defaultQcConfigsFromOperations,
  normalizeProcessQcConfigs,
  processQcBizScopeOptions,
} from '@/utils/qcProcessConfig'
import ExecutorTagPicker from '@/views/production/components/ExecutorTagPicker.vue'
import {
  REPORT_QTY_MODE,
  REPORT_QTY_MODE_OPTIONS,
  WAGE_QTY_MODE,
  WAGE_QTY_MODE_OPTIONS,
  requiresWorkItemQty,
  normalizeProcessWorkItemFields,
  normalizeWorkItemTemplates,
  validateProcessWorkItemConfig,
} from '@/utils/processWorkItem'

const MOCK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#e6f4ff" width="80" height="80" rx="6"/><text x="40" y="44" text-anchor="middle" fill="#1677ff" font-size="12">工序</text></svg>',
  )

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/product-process/process-config',
  getTitle: () => (isEdit.value ? '编辑工序' : '新增工序'),
})

const formRef = ref()
const saving = ref(false)

const defaultOps = () => Object.fromEntries(PROCESS_OPERATION_DEFS.map((d) => [d.key, false]))

const form = reactive({
  code: '',
  name: '',
  category: undefined,
  resourceType: undefined,
  position: undefined,
  image: '',
  remark: '',
  isBlanking: false,
  defaultExecutors: [],
  reportMode: undefined,
  taskExecutionMode: DEFAULT_TASK_EXECUTION_MODE,
  defectItemIds: [],
  operations: defaultOps(),
  qcConfigs: [],
  reportQtyMode: REPORT_QTY_MODE.SCHEDULE,
  wageQtyMode: WAGE_QTY_MODE.REPORTED,
  workItemTemplates: [],
})

const categoryOpts = computed(() => getActiveCategoryOptions())
const resourceTypeOpts = RESOURCE_TYPES.map((v) => ({ label: v, value: v }))
const positionOpts = MOCK_POSITIONS.map((v) => ({ label: v, value: v }))
const reportModeOpts = REPORT_MODES.map((v) => ({ label: v, value: v }))
const reportQtyModeOpts = REPORT_QTY_MODE_OPTIONS
const wageQtyModeOpts = WAGE_QTY_MODE_OPTIONS
const taskExecutionModeOpts = TASK_EXECUTION_MODES.map((item) => ({
  label: item.label,
  value: item.value,
}))
const defectItemOpts = computed(() => getDefectItemOptions())

const workItemTemplatesRequired = computed(() => {
  const report = form.reportQtyMode
  const wage = form.wageQtyMode
  return (
    report === REPORT_QTY_MODE.ITEMIZED ||
    wage === WAGE_QTY_MODE.ITEMIZED ||
    requiresWorkItemQty(report, wage)
  )
})

const workItemModeHint = computed(() => {
  const report = form.reportQtyMode
  const wage = form.wageQtyMode
  if (report === REPORT_QTY_MODE.SCHEDULE && wage === WAGE_QTY_MODE.REPORTED) {
    return '排产+报工：按件数计薪；若配置了分项模板，报工时可勾选分项（不填数量，仅记录作业类型）。'
  }
  if (report === REPORT_QTY_MODE.SCHEDULE && wage === WAGE_QTY_MODE.ITEMIZED) {
    return '排产+分项计薪：报件数且填分项数量；工资按分项数量×分项单价求和（产品工时中维护单价）。'
  }
  if (report === REPORT_QTY_MODE.ITEMIZED && wage === WAGE_QTY_MODE.ITEMIZED) {
    return '分项+分项：以分项数量报工；工资按分项数量×分项单价求和。'
  }
  if (report === REPORT_QTY_MODE.ITEMIZED && wage === WAGE_QTY_MODE.REPORTED) {
    return '分项+报工：勾选分项（不填数量），并另填总报工数（良品数）；工资=总报工数×工序单价。'
  }
  return '报工口径决定工人怎么填数量；计薪口径决定工资怎么算。'
})

const showTaskExecutionMode = computed(
  () =>
    form.reportMode === '时长报工' &&
    (form.resourceType === '工人' || form.resourceType === '工人小组'),
)

const taskExecutionModeHint = computed(() => {
  if (!showTaskExecutionMode.value) return ''
  const resource = form.resourceType
  const mode = form.taskExecutionMode
  if (resource === '工人' && mode === 'single_claim') {
    return '下发多人时进待领取，谁领谁做，一人报工'
  }
  if (resource === '工人' && mode === 'collaborative') {
    return '按下发人数拆成多条任务，各进待报工，各人各报'
  }
  if (resource === '工人小组' && mode === 'single_claim') {
    return '下发多组时进组长待领取，谁领算哪组，一人报工'
  }
  if (resource === '工人小组' && mode === 'collaborative') {
    return '下发多组时进组长待领取，谁领算哪组，组内可多人报工'
  }
  return ''
})

const isMinimalMode = computed(() => {
  const mode = getProductionMode()
  return mode === 'minimal' || mode === 'minimal_salary' || isMinimalReportMode()
})

/** 标准模式展示全部操作；极简模式仅下料+质检/外协/拆解 */
const visibleProcessOperationDefs = computed(() => {
  if (!isMinimalMode.value) return PROCESS_OPERATION_DEFS
  const allow = new Set(MINIMAL_PROCESS_OPERATION_KEYS)
  return PROCESS_OPERATION_DEFS.filter((d) => allow.has(d.key))
})

/** 勾选的质检业务类型 ↔ qcConfigs */
const qcBizScopes = computed({
  get() {
    return form.qcConfigs.map((c) => c.bizScope).filter(Boolean)
  },
  set(scopes) {
    const selected = [...new Set((scopes || []).filter(Boolean))]
    const prevByScope = Object.fromEntries(form.qcConfigs.map((c) => [c.bizScope, c]))
    form.qcConfigs = selected.map(
      (scope) => prevByScope[scope] || createProcessQcConfig({ bizScope: scope }),
    )
  },
})

function onOpSwitchChange(key, checked) {
  if (key !== 'opQc') return
  if (checked && !form.qcConfigs.length) {
    form.qcConfigs = defaultQcConfigsFromOperations({ opQc: true })
  }
  if (!checked) {
    form.qcConfigs = []
  }
}

function onWorkItemModeChange() {
  // 四种组合均支持；模板在「排产+报工」下可选保留，不清空
}

function addWorkItemTemplate() {
  const seq = form.workItemTemplates.length + 1
  form.workItemTemplates.push({
    code: `WI${String(seq).padStart(2, '0')}`,
    name: '',
    unit: '个',
  })
}

function removeWorkItemTemplate(index) {
  form.workItemTemplates.splice(index, 1)
}

const rules = {
  name: [{ required: true, message: '请输入工序名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择工序分类', trigger: 'change' }],
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  defaultExecutors: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: '请选择默认执行人/工组',
      trigger: 'change',
    },
  ],
}

function onDefaultExecutorsChange(v) {
  form.defaultExecutors = v || []
  formRef.value?.validateFields(['defaultExecutors']).catch(() => {})
}

function filterDefectOption(input, option) {
  const kw = input.trim().toLowerCase()
  if (!kw) return true
  const label = String(option?.label || '').toLowerCase()
  const code = String(option?.code || '').toLowerCase()
  return label.includes(kw) || code.includes(kw)
}

watch(
  () => [isActive.value, props.record?.id],
  ([visible]) => {
    if (!visible) return
    const r = props.record
    form.code = r?.code || ''
    form.name = r?.name || ''
    form.category = r?.category
    form.resourceType = r?.resourceType
    form.position = r?.position
    form.image = r?.image || ''
    form.remark = r?.remark || ''
    form.isBlanking = Boolean(r?.isBlanking)
    form.defaultExecutors = [...(r?.defaultExecutors || [])]
    form.reportMode = r?.reportMode || undefined
    form.taskExecutionMode = r?.taskExecutionMode || DEFAULT_TASK_EXECUTION_MODE
    form.defectItemIds = [...(r?.defectItemIds || [])]
    form.operations = { ...defaultOps(), ...(r?.operations || {}) }
    const loadedQcConfigs = normalizeProcessQcConfigs(
      r?.qcConfigs?.length ? r.qcConfigs : defaultQcConfigsFromOperations(r?.operations),
    )
    if (loadedQcConfigs.length) {
      form.operations.opQc = true
    }
    form.qcConfigs = loadedQcConfigs
    const workItem = normalizeProcessWorkItemFields(r || {})
    form.reportQtyMode = workItem.reportQtyMode
    form.wageQtyMode = workItem.wageQtyMode
    form.workItemTemplates = workItem.workItemTemplates.map((t) => ({ ...t }))
  },
  { immediate: true },
)

watch(
  () => [form.reportMode, form.resourceType],
  () => {
    if (!isActive.value) return
    if (!showTaskExecutionMode.value) {
      form.taskExecutionMode = DEFAULT_TASK_EXECUTION_MODE
    }
  },
)

watch(
  () => form.resourceType,
  (val, oldVal) => {
    if (!isActive.value) return
    if (oldVal !== undefined && oldVal !== val) {
      form.defaultExecutors = []
    }
  },
)

function setMockImage() {
  form.image = MOCK_IMAGE
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (form.operations.opQc && !form.qcConfigs.length) {
    message.warning('请至少勾选一种质检类型')
    return
  }
  const workItemCheck = validateProcessWorkItemConfig(form)
  if (!workItemCheck.ok) {
    message.warning(workItemCheck.message)
    return
  }
  saving.value = true
  // 极简模式：只持久化允许配置的操作项，其余保持原值（编辑）或默认 false（新增）
  let baseOps = { ...form.operations }
  if (isMinimalMode.value) {
    const prev = props.record?.operations || defaultOps()
    baseOps = { ...defaultOps(), ...prev }
    MINIMAL_PROCESS_OPERATION_KEYS.forEach((key) => {
      baseOps[key] = Boolean(form.operations[key])
    })
  }
  const workItem = normalizeProcessWorkItemFields({
    ...form,
    workItemTemplates: normalizeWorkItemTemplates(form.workItemTemplates),
  })
  const payload = {
    ...form,
    operations: baseOps,
    qcConfigs: form.operations.opQc ? normalizeProcessQcConfigs(form.qcConfigs) : [],
    ...workItem,
  }
  const res = isEdit.value
    ? updateProcessConfig(props.record.id, payload)
    : addProcessConfig(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已新增')
  emit('saved')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.process-form {
  width: 100%;

  .form-section-box {
    width: 100%;
    margin-bottom: 12px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .section-label {
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .ops-hint {
    margin: -4px 0 10px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .ops-grid .ops-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  .qc-scopes {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed #f0f0f0;
  }

  .qc-scopes-label {
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }

  .image-upload-mock {
    .image-preview {
      display: flex;
      align-items: center;
      gap: 8px;

      img {
        width: 48px;
        height: 48px;
        border-radius: 4px;
        border: 1px solid #f0f0f0;
      }
    }

    .image-hint {
      margin-top: 4px;
      font-size: 12px;
      color: #999;
    }
  }

  .field-hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.4;
  }

  .field-hint-block {
    margin-top: 0;
    margin-bottom: 4px;
  }

  .work-item-block {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #f0f0f0;
  }

  .work-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .work-item-title {
    font-size: 13px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.88);
  }

  .required-mark {
    margin-left: 2px;
    color: #ff4d4f;
  }

  .work-item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-inline-end: 0;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 72px;
    max-width: 72px;
    padding: 0;
  }

  :deep(.ant-form-item-label > label) {
    height: auto;
    min-height: 32px;
    line-height: 32px;
    font-size: 13px;
    white-space: nowrap;
  }

  :deep(
    .ant-form-item-label
      > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before
  ) {
    margin-inline-end: 4px;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .label-wide {
    :deep(.ant-form-item-label) {
      flex: 0 0 120px;
      max-width: 120px;
    }
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 72px;
      max-width: 72px;
    }
  }
}
</style>
