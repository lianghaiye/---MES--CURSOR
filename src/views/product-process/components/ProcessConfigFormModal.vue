<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="process-form">
      <div class="form-section-box modal-basic-card">
        <div class="section-label">基本信息</div>
        <a-row :gutter="[12, 8]">
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
            <a-form-item label="默认执行人/工组">
              <ExecutorTagPicker
                :executors="form.defaultExecutors"
                :resource-type="form.resourceType"
                placeholder="请选择默认执行人/工组"
                @update:executors="(v) => (form.defaultExecutors = v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="岗位" name="position" required>
              <a-select
                v-model:value="form.position"
                show-search
                placeholder="请选择岗位"
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
            <a-form-item label="任务执行模式" name="taskExecutionMode">
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
            <a-form-item label="备注">
              <a-textarea v-model:value="form.remark" placeholder="请输入备注" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
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
})

const categoryOpts = computed(() => getActiveCategoryOptions())
const resourceTypeOpts = RESOURCE_TYPES.map((v) => ({ label: v, value: v }))
const positionOpts = MOCK_POSITIONS.map((v) => ({ label: v, value: v }))
const reportModeOpts = REPORT_MODES.map((v) => ({ label: v, value: v }))
const taskExecutionModeOpts = TASK_EXECUTION_MODES.map((item) => ({
  label: item.label,
  value: item.value,
}))
const defectItemOpts = computed(() => getDefectItemOptions())

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

const rules = {
  name: [{ required: true, message: '请输入工序名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择工序分类', trigger: 'change' }],
  position: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
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
  const payload = {
    ...form,
    operations: baseOps,
    qcConfigs: form.operations.opQc ? normalizeProcessQcConfigs(form.qcConfigs) : [],
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
}
</style>
