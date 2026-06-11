<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑工序' : '新增工序'"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="process-form">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="工序编码" name="code">
            <a-input v-model:value="form.code" placeholder="留空则自动生成 GX+流水" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工序名称" name="name" required>
            <a-input v-model:value="form.name" placeholder="请输入 工序名称" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工序分类" name="category" required>
            <a-select
              v-model:value="form.category"
              placeholder="请选择 工序分类"
              :options="categoryOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="资源类型" name="resourceType" required>
            <a-select
              v-model:value="form.resourceType"
              placeholder="请选择 资源类型"
              :options="resourceTypeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="默认执行人/工组">
            <ExecutorTagPicker
              :executors="form.defaultExecutors"
              :resource-type="form.resourceType"
              placeholder="请选择默认执行人/工组"
              @update:executors="(v) => (form.defaultExecutors = v)"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="岗位" name="position" required>
            <a-select
              v-model:value="form.position"
              show-search
              placeholder="请选择 岗位"
              :options="positionOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="报工方式" name="reportMode" required>
            <a-select
              v-model:value="form.reportMode"
              placeholder="请选择报工方式"
              :options="reportModeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
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
        <a-col :span="8">
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
              <div class="image-hint">只能上传 jpg/png/jpeg 图片（演示为 MOCK）</div>
            </div>
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" placeholder="请输入备注" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="ops-title">工序操作</div>
      <a-row :gutter="[16, 12]" class="ops-grid">
        <a-col v-for="item in PROCESS_OPERATION_DEFS" :key="item.key" :span="6">
          <div class="ops-item">
            <span>{{ item.label }}</span>
            <a-switch v-model:checked="form.operations[item.key]" size="small" />
          </div>
        </a-col>
      </a-row>
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
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseCircleOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  addProcessConfig,
  updateProcessConfig,
  PROCESS_OPERATION_DEFS,
  REPORT_MODES,
  RESOURCE_TYPES,
  MOCK_POSITIONS,
} from '@/store/processConfigStore'
import { getActiveCategoryOptions } from '@/store/processCategoryStore'
import { getDefectItemOptions } from '@/store/defectItemStore'
import ExecutorTagPicker from '@/views/production/components/ExecutorTagPicker.vue'

const MOCK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#e6f4ff" width="80" height="80" rx="6"/><text x="40" y="44" text-anchor="middle" fill="#1677ff" font-size="12">工序</text></svg>',
  )

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

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
  defaultExecutors: [],
  reportMode: '按件数',
  defectItemIds: [],
  operations: defaultOps(),
})

const isEdit = computed(() => Boolean(props.record?.id))
const categoryOpts = computed(() => getActiveCategoryOptions())
const resourceTypeOpts = RESOURCE_TYPES.map((v) => ({ label: v, value: v }))
const positionOpts = MOCK_POSITIONS.map((v) => ({ label: v, value: v }))
const reportModeOpts = REPORT_MODES.map((v) => ({ label: v, value: v }))
const defectItemOpts = computed(() => getDefectItemOptions())

const rules = {
  name: [{ required: true, message: '请输入工序名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择工序分类', trigger: 'change' }],
  position: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  reportMode: [{ required: true, message: '请选择报工方式', trigger: 'change' }],
}

function filterDefectOption(input, option) {
  const kw = input.trim().toLowerCase()
  if (!kw) return true
  const label = String(option?.label || '').toLowerCase()
  const code = String(option?.code || '').toLowerCase()
  return label.includes(kw) || code.includes(kw)
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const r = props.record
    form.code = r?.code || ''
    form.name = r?.name || ''
    form.category = r?.category
    form.resourceType = r?.resourceType
    form.position = r?.position
    form.image = r?.image || ''
    form.remark = r?.remark || ''
    form.defaultExecutors = [...(r?.defaultExecutors || [])]
    form.reportMode = r?.reportMode || '按件数'
    form.defectItemIds = [...(r?.defectItemIds || [])]
    form.operations = { ...defaultOps(), ...(r?.operations || {}) }
  },
)

watch(
  () => form.resourceType,
  (val, oldVal) => {
    if (!props.open) return
    if (oldVal !== undefined && oldVal !== val) {
      form.defaultExecutors = []
    }
  },
)

function setMockImage() {
  form.image = MOCK_IMAGE
}

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
  const payload = { ...form, operations: { ...form.operations } }
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
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.process-form {
  .ops-title {
    font-weight: 500;
    margin: 8px 0 12px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }

  .ops-grid .ops-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: #fafafa;
    border-radius: 4px;
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
}
</style>
