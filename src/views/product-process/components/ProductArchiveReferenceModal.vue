<template>
  <a-modal
    :open="open"
    title="归档前处理 BOM 引用"
    :width="1080"
    :mask-closable="false"
    :footer="null"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <a-alert type="info" show-icon class="ref-alert">
      <template #message>
        已下达工单使用的是 EBOM 快照，本次调整
        <strong>不会影响在制</strong>
        。对
        <strong>生效</strong>
        的母件 BOM：系统会
        <strong>自动升版并审核发布</strong>
        ；待发布母件则直接改当前版。替代时可填写用量；若替代件有 BOM，展开下级用量按 原 BOM 用量 ×
        本级用量（例如本级填 2，下级会按 ×2）。
      </template>
    </a-alert>

    <p class="ref-tip">
      即将归档「{{ displayName }}」
      <template v-if="itemCode">（{{ itemCode }}）</template>
      ，当前有
      <strong>{{ refs.length }}</strong>
      个 BOM 直接引用该产品作为子件。请
      <strong>逐行</strong>
      选择处理方式后确认归档。
    </p>

    <a-table
      :columns="refColumns"
      :data-source="refs"
      row-key="parentBomId"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 980 }"
      class="ref-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'bomStatus'">
          <a-tag :color="bomStatusColor(record.parentBomStatus)">
            {{ record.parentBomStatus || '—' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-select
            v-model:value="rowModes[record.parentBomId]"
            size="small"
            style="width: 100%"
            :options="actionOptions"
            @change="() => onModeChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'substitute'">
          <div v-if="rowModes[record.parentBomId] === 'replace'" class="sub-cell">
            <a-button
              type="link"
              size="small"
              class="sub-btn"
              @click="openSubstitutePicker(record)"
            >
              {{ rowSubstitutes[record.parentBomId] ? '重选' : '选择' }}
            </a-button>
            <span
              class="sub-label"
              :class="{ 'is-empty': !rowSubstitutes[record.parentBomId] }"
              :title="substituteLabel(record.parentBomId)"
            >
              {{ substituteLabel(record.parentBomId) || '请选择替代件' }}
            </span>
          </div>
          <span v-else class="sub-empty">—</span>
        </template>
        <template v-else-if="column.key === 'unitQty'">
          <a-input-number
            v-if="rowModes[record.parentBomId] === 'replace'"
            v-model:value="rowQtys[record.parentBomId]"
            size="small"
            :min="0"
            :step="1"
            :precision="4"
            style="width: 100%"
          />
          <span v-else class="sub-empty">—</span>
        </template>
      </template>
    </a-table>

    <div class="action-hint">
      <div>
        <strong>从引用 BOM 中删除此物料及其下级</strong>
        ：删除该子件整行（本级及通过它带出的下级结构）。
      </div>
      <div>
        <strong>替换为替代物料/产品</strong>
        ：写入替代物品并按填写用量更新本级；有生效 BOM 时，展开下级用量按 原 BOM 用量 ×
        本级用量（例如本级填 2，下级会按 ×2）。
      </div>
      <div>
        <strong>不改变引用 BOM</strong>
        ：仅归档产品；选品不再展示，母件结构保持原样。
      </div>
      <div>
        <strong>关于发版</strong>
        ：母件若为生效 BOM，确认后会自动升版并发布，生产结构立即按新版本生效。
      </div>
    </div>

    <div class="modal-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确认归档</a-button>
    </div>
  </a-modal>

  <SelectBomMaterialModal
    v-model:open="pickerOpen"
    :multiple="false"
    title="选择替代物料/产品"
    @selected="onSubstituteSelected"
  />
</template>

<script>
export default { name: 'ProductArchiveReferenceModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { bomStatusColor } from '@/mock/productBomOptions'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  itemName: { type: String, default: '' },
  itemCode: { type: String, default: '' },
  /** 正在归档的产品 id，不可选为替代件 */
  excludeItemId: { type: String, default: '' },
  refs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

/** @type {Record<string, 'removeLine'|'replace'|'none'>} */
const rowModes = reactive({})
/** @type {Record<string, object>} */
const rowSubstitutes = reactive({})
/** @type {Record<string, number>} */
const rowQtys = reactive({})

const pickerOpen = ref(false)
const pickerParentBomId = ref('')

const displayName = computed(() => props.itemName || props.itemCode || '—')

const actionOptions = [
  { value: 'none', label: '不改变引用 BOM' },
  { value: 'replace', label: '替换为替代物料/产品' },
  { value: 'removeLine', label: '从引用 BOM 中删除此物料及其下级' },
]

const refColumns = [
  {
    title: '母件产品',
    dataIndex: 'parentItemLabel',
    key: 'parentItemLabel',
    width: 180,
    ellipsis: true,
  },
  { title: 'BOM 名称', dataIndex: 'parentBomName', width: 140, ellipsis: true },
  { title: '版本', dataIndex: 'parentVersion', width: 88 },
  { title: '状态', key: 'bomStatus', width: 80 },
  { title: '处理方式', key: 'action', width: 220 },
  { title: '替代物料/产品', key: 'substitute', width: 200 },
  { title: '用量', key: 'unitQty', width: 110 },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.keys(rowModes).forEach((k) => delete rowModes[k])
    Object.keys(rowSubstitutes).forEach((k) => delete rowSubstitutes[k])
    Object.keys(rowQtys).forEach((k) => delete rowQtys[k])
    props.refs.forEach((ref) => {
      rowModes[ref.parentBomId] = 'none'
      const q = Number(ref.defaultUnitQty)
      rowQtys[ref.parentBomId] = Number.isFinite(q) && q >= 0 ? q : 1
    })
  },
)

function substituteLabel(parentBomId) {
  const sub = rowSubstitutes[parentBomId]
  if (!sub) return ''
  return [sub.code, sub.name].filter(Boolean).join(' ') || sub.name || sub.code || ''
}

function onModeChange(record) {
  const id = record.parentBomId
  if (rowModes[id] !== 'replace') {
    delete rowSubstitutes[id]
    return
  }
  if (rowQtys[id] == null) {
    const q = Number(record.defaultUnitQty)
    rowQtys[id] = Number.isFinite(q) && q >= 0 ? q : 1
  }
}

function openSubstitutePicker(record) {
  pickerParentBomId.value = record.parentBomId
  pickerOpen.value = true
}

function onSubstituteSelected(items) {
  const item = Array.isArray(items) ? items[0] : items
  const parentBomId = pickerParentBomId.value
  pickerParentBomId.value = ''
  if (!item || !parentBomId) return
  if (props.excludeItemId && String(item.id) === String(props.excludeItemId)) {
    message.warning('不能选择正在归档的产品作为替代件')
    return
  }
  if (props.itemCode && String(item.code || '') === String(props.itemCode)) {
    message.warning('不能选择正在归档的产品作为替代件')
    return
  }
  rowSubstitutes[parentBomId] = item
  rowModes[parentBomId] = 'replace'
}

function handleCancel() {
  emit('update:open', false)
  emit('cancel')
}

function handleConfirm() {
  const removeRefs = []
  const replaceRefs = []
  const missing = []

  props.refs.forEach((ref) => {
    const mode = rowModes[ref.parentBomId] || 'none'
    if (mode === 'removeLine') {
      removeRefs.push(ref)
      return
    }
    if (mode === 'replace') {
      const substitute = rowSubstitutes[ref.parentBomId]
      if (!substitute) {
        missing.push(ref.parentBomName || ref.bomNo || ref.parentBomId)
        return
      }
      const qty = Number(rowQtys[ref.parentBomId])
      replaceRefs.push({
        ...ref,
        substitute,
        unitQty: Number.isFinite(qty) && qty >= 0 ? qty : Number(ref.defaultUnitQty) || 1,
      })
    }
  })

  if (missing.length) {
    message.warning(`请先为以下 BOM 选择替代物料：${missing.slice(0, 3).join('、')}`)
    return
  }

  emit('update:open', false)
  emit('confirm', { removeRefs, replaceRefs })
}
</script>

<style lang="less" scoped>
.ref-alert {
  margin-bottom: 12px;
}

.ref-tip {
  margin: 0 0 12px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);
}

.ref-table {
  margin-bottom: 12px;
}

.sub-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.sub-btn {
  flex-shrink: 0;
  padding-inline: 0;
}

.sub-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.75);

  &.is-empty {
    color: rgba(0, 0, 0, 0.35);
  }
}

.sub-empty {
  color: rgba(0, 0, 0, 0.25);
}

.action-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.7;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}
</style>
