<template>
  <a-modal
    :open="open"
    title="模板冲突"
    :width="kind === 'global' ? 520 : 720"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <div class="conflict-head">
      <ExclamationCircleFilled class="warn-icon" />
      <div>
        <div class="conflict-title">检测到模板冲突</div>
        <div v-if="kind === 'global'" class="conflict-desc">
          系统已存在生效的全局模板，是否确认用当前模板替换原有全局模板？
        </div>
        <div v-else class="conflict-desc">{{ listHint }}</div>
      </div>
    </div>

    <a-table
      v-if="kind !== 'global'"
      class="conflict-table"
      size="small"
      bordered
      :pagination="false"
      :columns="columns"
      :data-source="conflicts"
      row-key="key"
    >
      <template #bodyCell="{ column }">
        <template v-if="column.key === 'current'">
          {{ currentTemplateName || '—' }}
        </template>
      </template>
    </a-table>

    <div v-if="kind !== 'global'" class="resolve-block">
      <div class="resolve-label">请选择处理方式：</div>
      <a-radio-group v-model:value="resolveMode" class="resolve-radios">
        <a-radio value="replace" class="resolve-radio">
          <span class="radio-strong">【推荐】自动替换：</span>
          {{ replaceHint }}
        </a-radio>
        <a-radio value="skip" class="resolve-radio">
          {{ skipHint }}
        </a-radio>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'QcTemplateConflictModal' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { ExclamationCircleFilled } from '@ant-design/icons-vue'
import { QC_TEMPLATE_SCOPE_TYPE } from '@/mock/qcTemplates'

const props = defineProps({
  open: { type: Boolean, default: false },
  kind: { type: String, default: 'single' },
  conflicts: { type: Array, default: () => [] },
  currentTemplateName: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const resolveMode = ref('replace')

watch(
  () => props.open,
  (v) => {
    if (v) resolveMode.value = 'replace'
  },
)

const isCategory = computed(() => props.kind === QC_TEMPLATE_SCOPE_TYPE.CATEGORY)

const listHint = computed(() =>
  isCategory.value
    ? '本次模板中，以下产品类别已关联其他生效的类别模板：'
    : '本次模板中，以下产品型号已关联其他生效的单产品模板：',
)

const replaceHint = computed(() =>
  isCategory.value
    ? '以上类别的生效模板将由旧模板替换为当前模板。原模板保留但自动解除对应类别绑定；若绑定清空则停用。'
    : '将以上产品的生效模板替换为本次操作模板，原模板保留但自动停用对应产品的绑定关系。',
)

const skipHint = computed(() =>
  isCategory.value
    ? '跳过冲突类别：仅为无冲突的类别启用当前模板，冲突类别维持原有模板不变。'
    : '跳过冲突产品：仅为无冲突的产品启用模板，冲突产品维持原有模板不变。',
)

const columns = computed(() => {
  if (isCategory.value) {
    return [
      { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
      { title: '产品类别', dataIndex: 'objectLabel', ellipsis: true },
      { title: '当前生效模板', dataIndex: 'currentTemplateName', ellipsis: true },
      { title: '本次操作模板', key: 'current', ellipsis: true },
    ]
  }
  return [
    { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
    { title: '产品信息', dataIndex: 'objectLabel', ellipsis: true },
    { title: '当前生效模板', dataIndex: 'currentTemplateName', ellipsis: true },
    { title: '本次操作模板', key: 'current', ellipsis: true },
  ]
})

function handleCancel() {
  emit('update:open', false)
  emit('cancel')
}

function handleOk() {
  emit('confirm', {
    mode: props.kind === 'global' ? 'replace' : resolveMode.value,
  })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.conflict-head {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.warn-icon {
  color: #faad14;
  font-size: 22px;
  margin-top: 2px;
}

.conflict-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
}

.conflict-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
}

.conflict-table {
  margin-bottom: 16px;
}

.resolve-block {
  margin-top: 4px;
}

.resolve-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.resolve-radios {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resolve-radio {
  align-items: flex-start;
  white-space: normal;
  line-height: 1.5;
  height: auto;
}

.radio-strong {
  font-weight: 600;
}
</style>
