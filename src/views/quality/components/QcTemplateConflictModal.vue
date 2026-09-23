<template>
  <a-modal
    :open="open"
    :title="title"
    :width="kind === 'global' ? 520 : 880"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <div class="conflict-head">
      <ExclamationCircleFilled class="warn-icon" />
      <div>
        <div class="conflict-title">检测到{{ entityLabel }}冲突</div>
        <div v-if="kind === 'global'" class="conflict-desc">
          系统已存在生效的全局{{ entityLabel }}，是否确认用当前{{ entityLabel }}替换原有全局{{
            entityLabel
          }}？
        </div>
        <div v-else class="conflict-desc">
          {{ listHint }}请
          <strong>逐行</strong>
          选择每个{{ objectNoun }}的处理方式后确认。
        </div>
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
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'current'">
          {{ currentTemplateName || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-select
            v-model:value="rowModes[record.key]"
            size="small"
            style="width: 100%"
            :options="actionOptions"
          />
        </template>
      </template>
    </a-table>

    <div v-if="kind !== 'global'" class="action-hint">
      <div>
        <strong>自动替换</strong>
        ：将该{{ objectNoun }}的生效{{ entityLabel }}替换为当前{{ entityLabel }}；原{{
          entityLabel
        }}保留但解除对应绑定，若绑定清空则停用。
      </div>
      <div>
        <strong>跳过冲突</strong>
        ：当前{{ entityLabel }}不绑定该{{ objectNoun }}，维持原有生效{{ entityLabel }}不变。
      </div>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'QcTemplateConflictModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'
import { ExclamationCircleFilled } from '@ant-design/icons-vue'
import { QC_TEMPLATE_SCOPE_TYPE } from '@/mock/qcTemplates'

const props = defineProps({
  open: { type: Boolean, default: false },
  kind: { type: String, default: 'single' },
  conflicts: { type: Array, default: () => [] },
  currentTemplateName: { type: String, default: '' },
  title: { type: String, default: '模板冲突' },
  entityLabel: { type: String, default: '模板' },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

/** @type {Record<string, 'replace'|'skip'>} */
const rowModes = reactive({})

const isCategory = computed(() => props.kind === QC_TEMPLATE_SCOPE_TYPE.CATEGORY)

const objectNoun = computed(() => (isCategory.value ? '类别' : '产品'))

const listHint = computed(() =>
  isCategory.value
    ? `本次${props.entityLabel}中，以下产品类别已关联其他生效的类别${props.entityLabel}。`
    : `本次${props.entityLabel}中，以下产品型号已关联其他生效的单产品${props.entityLabel}。`,
)

const actionOptions = computed(() => [
  { value: 'replace', label: '自动替换' },
  { value: 'skip', label: `跳过冲突（保持原${props.entityLabel}）` },
])

const columns = computed(() => {
  const objectTitle = isCategory.value ? '产品类别' : '产品信息'
  return [
    { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
    { title: objectTitle, dataIndex: 'objectLabel', ellipsis: true, width: 160 },
    { title: `当前生效${props.entityLabel}`, dataIndex: 'currentTemplateName', ellipsis: true },
    { title: `本次操作${props.entityLabel}`, key: 'current', ellipsis: true, width: 140 },
    { title: '处理方式', key: 'action', width: 200 },
  ]
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    Object.keys(rowModes).forEach((k) => delete rowModes[k])
    ;(props.conflicts || []).forEach((c) => {
      rowModes[c.key] = 'replace'
    })
  },
)

function handleCancel() {
  emit('update:open', false)
  emit('cancel')
}

function handleOk() {
  if (props.kind === 'global') {
    emit('confirm', { mode: 'replace' })
    emit('update:open', false)
    return
  }

  const decisions = []
  const replaceConflicts = []
  const skipConflicts = []
  ;(props.conflicts || []).forEach((c) => {
    const mode = rowModes[c.key] || 'replace'
    decisions.push({ key: c.key, mode })
    if (mode === 'skip') skipConflicts.push(c)
    else replaceConflicts.push(c)
  })

  emit('confirm', {
    mode: 'mixed',
    decisions,
    replaceConflicts,
    skipConflicts,
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
  margin-bottom: 12px;
}

.action-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
