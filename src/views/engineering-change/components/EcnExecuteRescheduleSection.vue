<template>
  <div class="reschedule-section">
    <div class="section-title">本次变更的计划重排</div>
    <div class="scope">
      <span>销售订单：{{ record.salesOrderNo || '—' }}</span>
      <span>产品：{{ record.productName || record.productCode || '—' }}</span>
    </div>

    <template v-if="wholePlanMode">
      <p class="hint">
        该订单下这件产品仍有未开工计划，只做整单换新
        BOM。下面列出变更项供核对（含替换时的上下级一并变更），不能对细项单独操作。
      </p>
      <div class="sub-head">
        <span>可整单换 BOM 的计划工作项</span>
        <a-button v-if="!readonly" type="link" size="small" @click="selectAllReschedulable">
          全选
        </a-button>
      </div>
      <a-table
        :columns="wiColumns"
        :data-source="reschedulableRows"
        :pagination="false"
        row-key="key"
        size="small"
        bordered
        :row-selection="readonly ? null : wiRowSelection"
        :locale="{ emptyText: '没有可整单重排的工作项' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'bomVersion'">{{ row.bomVersion || '—' }}</template>
          <template v-else-if="column.key === 'action'">
            <a-tag color="processing">整单换 BOM</a-tag>
          </template>
        </template>
      </a-table>

      <div class="sub-head"><span>变更项（只读）</span></div>
      <a-table
        :columns="readonlyLineColumns"
        :data-source="lineRows"
        :pagination="false"
        row-key="key"
        size="small"
        bordered
        :scroll="{ x: 1000 }"
        :locale="{ emptyText: '这张变更单没有变更物料' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'index'">
            {{ lineRowIndex(row) }}
          </template>
          <template v-else-if="column.key === 'changeType'">
            <a-tag :color="ecnChangeItemTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
            <a-tag v-if="row.modifyKindLabel" :color="modifyKindColor(row)" class="sub-tag">
              {{ row.modifyKindLabel }}
            </a-tag>
            <a-tag v-if="row.subtreeTag" color="purple" class="sub-tag">{{ row.subtreeTag }}</a-tag>
            <a-tag v-else-if="row.hasSubtree" color="purple" class="sub-tag">含子树</a-tag>
          </template>
          <template v-else-if="column.key === 'beforeText' || column.key === 'afterText'">
            <pre class="cell-pre">{{ row[column.key] }}</pre>
          </template>
          <template v-else-if="column.key === 'supplyForm'">
            {{ row.changeType === '取消' ? '—' : row.supplyForm || '—' }}
          </template>
        </template>
      </a-table>
      <p class="foot-tip">
        执行变更后，本单产品的订单 EBOM 将更新为最新版本，工单领料按最新 BOM
        定额。若此前已领料：领多了现场走退料，领少了再补领差额即可。
      </p>
    </template>

    <template v-else>
      <p class="hint">
        无可整单换 BOM 的计划。旧料可在此处置（更新数量 / 作废 / 强制作废 /
        暂不处理）；新料可改供应型态后直接下单，也可选暂不处理稍后再去生产计划排产。
      </p>
      <div class="sub-head"><span>变更物料对比与处置</span></div>
      <a-table
        :columns="actionLineColumns"
        :data-source="lineRows"
        :pagination="false"
        row-key="key"
        size="small"
        bordered
        :scroll="{ x: 1480 }"
        :custom-row="lineCustomRow"
        :row-class-name="lineRowClassName"
        :locale="{ emptyText: '这张变更单没有变更物料' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'changeType'">
            <div :class="['change-cell', isSubtreeChild(row) && 'change-cell--child']">
              <span v-if="isSubtreeChild(row)" class="tree-branch" aria-hidden="true">└</span>
              <div class="change-tags">
                <a-tag :color="ecnChangeItemTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
                <a-tag v-if="row.modifyKindLabel" :color="modifyKindColor(row)" class="sub-tag">
                  {{ row.modifyKindLabel }}
                </a-tag>
                <a-tag v-if="row.subtreeTag === '父件'" color="purple" class="sub-tag">父件</a-tag>
                <a-tag v-else-if="isSubtreeChild(row)" color="geekblue" class="sub-tag">子件</a-tag>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'beforeText' || column.key === 'afterText'">
            <div :class="['mat-cell', isSubtreeChild(row) && 'mat-cell--child']">
              <pre class="cell-pre">{{ row[column.key] }}</pre>
            </div>
          </template>
          <template v-else-if="column.key === 'oldSituation'">
            <div class="situation-list">
              <div
                v-for="(it, idx) in row.oldSituationItems || []"
                :key="`${it.code || it.status}-${idx}`"
                class="situation-item"
              >
                <template v-if="it.code">
                  <span class="situation-doc">{{ it.kind }} {{ it.code }}</span>
                  <a-tag :color="situationStatusColor(it.status)" class="situation-status">
                    {{ it.status }}
                  </a-tag>
                </template>
                <span v-else class="muted">{{ it.status }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'index'">
            {{ lineRowIndex(row) }}
          </template>
          <template v-else-if="column.key === 'supplyForm'">
            <template v-if="row.changeType === '取消'">—</template>
            <a-select
              v-else-if="canEditNew(row) && !readonly"
              :value="supplyFormByKey[row.key] || row.supplyForm || '自制件'"
              size="small"
              style="width: 100%"
              :options="supplyOptions"
              @change="(v) => setSupply(row.key, v)"
            />
            <span v-else>
              {{ savedLine(row)?.supplyForm || supplyFormByKey[row.key] || row.supplyForm || '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'oldAction'">
            <template v-if="readonly">
              <span>{{ savedLine(row)?.oldActionLabel || oldActionLabel(row) }}</span>
            </template>
            <template v-else>
              <a-radio-group
                :value="oldActionByKey[row.key] || row.defaultOldAction"
                size="small"
                :disabled="row.changeType === '新增'"
                @change="(e) => setOldAction(row.key, e.target.value)"
              >
                <a-radio
                  v-if="row.canUpdateQty"
                  :value="ECN_OLD_ACTION.UPDATE_QTY"
                  style="display: block; margin: 2px 0"
                >
                  更新计划/单据数量
                </a-radio>
                <a-radio
                  v-if="row.canVoidPending"
                  :value="ECN_OLD_ACTION.VOID_PENDING"
                  style="display: block; margin: 2px 0"
                >
                  作废原单
                </a-radio>
                <a-radio
                  v-if="row.canForceVoid"
                  :value="ECN_OLD_ACTION.FORCE_VOID"
                  style="display: block; margin: 2px 0"
                >
                  强制作废
                </a-radio>
                <a-radio :value="ECN_OLD_ACTION.SKIP" style="display: block; margin: 2px 0">
                  暂不处理
                </a-radio>
              </a-radio-group>
              <div
                v-if="
                  (oldActionByKey[row.key] || row.defaultOldAction) === ECN_OLD_ACTION.FORCE_VOID
                "
                class="force-warn"
              >
                <ExclamationCircleFilled class="force-icon" />
                <span>
                  当前工单/订单状态为「{{
                    row.forceVoidStatusText
                  }}」，强制作废前，建议与现场核对实际执行情况后再执行。
                </span>
              </div>
              <div
                v-else-if="
                  row.canForceVoid &&
                  (oldActionByKey[row.key] || row.defaultOldAction) === ECN_OLD_ACTION.UPDATE_QTY
                "
                class="force-warn"
              >
                <ExclamationCircleFilled class="force-icon" />
                <span
                  >「更新数量」只改计划与待下发单据；执行中工单不会自动改量，需强制作废或人工处理。</span
                >
              </div>
            </template>
          </template>
          <template v-else-if="column.key === 'newAction'">
            <template v-if="readonly">
              <span>{{ savedLine(row)?.newActionLabel || newActionLabel(row) }}</span>
            </template>
            <template v-else-if="showNewSchedule(row)">
              <a-radio-group
                :value="newActionByKey[row.key] || row.defaultNewAction"
                size="small"
                @change="(e) => setNewAction(row.key, e.target.value)"
              >
                <a-radio :value="ECN_NEW_ACTION.SCHEDULE" style="display: block; margin: 2px 0">
                  {{ scheduleLabel(row) }}
                </a-radio>
                <a-radio :value="ECN_NEW_ACTION.SKIP" style="display: block; margin: 2px 0">
                  暂不处理（稍后生产计划排）
                </a-radio>
              </a-radio-group>
            </template>
            <span v-else class="muted">{{ newActionPlaceholder(row) }}</span>
          </template>
        </template>
      </a-table>
      <p class="foot-tip">
        执行变更后，本单产品的订单 EBOM 将更新为最新版本，工单领料按最新 BOM
        定额。若此前已领料：领多了现场走退料，领少了再补领差额即可。
      </p>
    </template>
  </div>
</template>

<script>
export default { name: 'EcnExecuteRescheduleSection' }
</script>

<script setup>
import { computed, watch } from 'vue'
import { ExclamationCircleFilled } from '@ant-design/icons-vue'
import { ecnChangeItemTypeColor } from '@/constants/ecn'
import {
  analyzeEcnPlanImpact,
  buildEcnChangeLineRows,
  ECN_SUPPLY_TYPE_OPTIONS,
  ECN_OLD_ACTION,
  ECN_NEW_ACTION,
  ECN_OLD_ACTION_LABEL,
  ECN_NEW_ACTION_LABEL,
} from '@/utils/ecnPlanImpact'

const props = defineProps({
  record: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  refreshKey: { type: Number, default: 0 },
})

const selectedWiKeys = defineModel('workItemKeys', { type: Array, default: () => [] })
const oldActionByKey = defineModel('oldActionByKey', { type: Object, default: () => ({}) })
const newActionByKey = defineModel('newActionByKey', { type: Object, default: () => ({}) })
const supplyFormByKey = defineModel('supplyFormByKey', { type: Object, default: () => ({}) })
const wholePlanModeModel = defineModel('wholePlanMode', { type: Boolean, default: false })

const supplyOptions = ECN_SUPPLY_TYPE_OPTIONS

const impact = computed(() => {
  void props.refreshKey
  return analyzeEcnPlanImpact(props.record)
})

const lineRows = computed(() => {
  void props.refreshKey
  return buildEcnChangeLineRows(props.record)
})

const savedDispositionMap = computed(() => {
  const map = new Map()
  ;(props.record?.rescheduleDisposition?.lines || []).forEach((line) => {
    if (line?.key) map.set(line.key, line)
  })
  return map
})

function savedLine(row) {
  return savedDispositionMap.value.get(row.key) || null
}

function oldActionLabel(row) {
  const action = oldActionByKey.value[row.key] || row.defaultOldAction
  return ECN_OLD_ACTION_LABEL[action] || action || '—'
}

function newActionLabel(row) {
  const action = newActionByKey.value[row.key] || row.defaultNewAction
  if (action === ECN_NEW_ACTION.SCHEDULE) return scheduleLabel(row)
  return ECN_NEW_ACTION_LABEL[action] || action || '—'
}

const reschedulableRows = computed(() => impact.value.workItemRows.filter((r) => r.canReschedule))
const wholePlanMode = computed(() => reschedulableRows.value.length > 0 && !props.readonly)

watch(
  wholePlanMode,
  (v) => {
    wholePlanModeModel.value = v
  },
  { immediate: true },
)

watch(
  () => [props.record?.id, props.refreshKey, wholePlanMode.value, props.readonly],
  () => {
    // 已执行：从落库快照回填当时选择，避免按实时状态重算后选项消失
    if (props.readonly) {
      const oldMap = {}
      const newMap = {}
      const supply = {}
      savedDispositionMap.value.forEach((line, key) => {
        if (line.oldAction) oldMap[key] = line.oldAction
        if (line.newAction) newMap[key] = line.newAction
        if (line.supplyForm) supply[key] = line.supplyForm
      })
      if (Object.keys(oldMap).length) oldActionByKey.value = oldMap
      if (Object.keys(newMap).length) newActionByKey.value = newMap
      if (Object.keys(supply).length) supplyFormByKey.value = supply
      return
    }
    // 未执行：优先回填「保存」草稿
    const draft = props.record?.executionDraft
    if (draft) {
      if (Array.isArray(draft.workItemKeys)) selectedWiKeys.value = [...draft.workItemKeys]
      oldActionByKey.value = { ...(draft.oldActionByKey || {}) }
      newActionByKey.value = { ...(draft.newActionByKey || {}) }
      supplyFormByKey.value = { ...(draft.supplyFormByKey || {}) }
      if (wholePlanMode.value && draft.wholePlanMode !== false) {
        selectedWiKeys.value = reschedulableRows.value.map((r) => r.key)
      }
      return
    }
    if (wholePlanMode.value) {
      selectedWiKeys.value = reschedulableRows.value.map((r) => r.key)
      oldActionByKey.value = {}
      newActionByKey.value = {}
      return
    }
    selectedWiKeys.value = []
    const oldMap = { ...oldActionByKey.value }
    const newMap = { ...newActionByKey.value }
    const supply = { ...supplyFormByKey.value }
    lineRows.value.forEach((row) => {
      if (!oldMap[row.key]) oldMap[row.key] = row.defaultOldAction
      if (!newMap[row.key]) newMap[row.key] = row.defaultNewAction
      if (!supply[row.key]) supply[row.key] = row.supplyForm || '自制件'
    })
    oldActionByKey.value = oldMap
    newActionByKey.value = newMap
    supplyFormByKey.value = supply
  },
  { immediate: true },
)

const wiRowSelection = computed(() => ({
  selectedRowKeys: selectedWiKeys.value,
  onChange: (keys) => {
    selectedWiKeys.value = keys
  },
}))

const wiColumns = [
  { title: '产品', dataIndex: 'productName', ellipsis: true },
  { title: '工作项状态', dataIndex: 'wiStatus', width: 100 },
  { title: '当前BOM版本', key: 'bomVersion', width: 120 },
  { title: '处置', key: 'action', width: 110 },
]

const readonlyLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '变更', key: 'changeType', width: 100 },
  { title: '变更前', key: 'beforeText', width: 280 },
  { title: '变更后', key: 'afterText', width: 280 },
  { title: '供应型态', key: 'supplyForm', width: 90 },
]

const actionLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '变更', key: 'changeType', width: 128 },
  { title: '变更前', key: 'beforeText', width: 220 },
  { title: '变更后', key: 'afterText', width: 220 },
  { title: '旧料执行情况', key: 'oldSituation', width: 200 },
  { title: '供应型态', key: 'supplyForm', width: 110 },
  { title: '旧料处置', key: 'oldAction', width: 200 },
  { title: '新料处置', key: 'newAction', width: 220 },
]

function lineRowIndex(row) {
  const idx = lineRows.value.findIndex((r) => r.key === row.key)
  return idx >= 0 ? idx + 1 : '—'
}

function isSubtreeChild(row) {
  return row?.subtreeTag === '下级' || row?.subtreeTag === '子件'
}

function isSubtreeParent(row) {
  return row?.subtreeTag === '父件' || row?.hasSubtree
}

function lineRowClassName(row) {
  if (isSubtreeParent(row)) return 'line-row-parent'
  if (isSubtreeChild(row)) return 'line-row-child'
  return ''
}

function lineCustomRow(row) {
  return { class: lineRowClassName(row) }
}

function selectAllReschedulable() {
  selectedWiKeys.value = reschedulableRows.value.map((r) => r.key)
}

function setOldAction(key, value) {
  oldActionByKey.value = { ...oldActionByKey.value, [key]: value }
  const row = lineRows.value.find((r) => r.key === key)
  if (!row?.canScheduleAfterVoid) return
  // 改用量：更新数量 → 无需新单；暂不处理/作废原单 → 默认可按供应型态生成新单
  if (value === ECN_OLD_ACTION.UPDATE_QTY) {
    newActionByKey.value = { ...newActionByKey.value, [key]: ECN_NEW_ACTION.SKIP }
  } else {
    newActionByKey.value = { ...newActionByKey.value, [key]: ECN_NEW_ACTION.SCHEDULE }
  }
}

function setNewAction(key, value) {
  newActionByKey.value = { ...newActionByKey.value, [key]: value }
}

function setSupply(key, value) {
  supplyFormByKey.value = { ...supplyFormByKey.value, [key]: value }
}

function currentOldAction(row) {
  return oldActionByKey.value[row.key] || row.defaultOldAction
}

function showNewSchedule(row) {
  if (row.canSchedule) return true
  if (!row.canScheduleAfterVoid) return false
  // 「更新数量」走旧单改量；暂不处理/作废都不影响新料下发
  return currentOldAction(row) !== ECN_OLD_ACTION.UPDATE_QTY
}

function newActionPlaceholder(row) {
  if (row.changeType === '取消') return '—'
  if (row.modifyKind === 'qty_only') return '同料改量，无需新单'
  if (row.newAlreadyScheduled) {
    const codes = (row.existingNewWoCodes || []).filter(Boolean).join('、')
    return codes ? `新料已有工单 ${codes}，无需再排` : '新料已有工单，无需再排'
  }
  return '—'
}

function canEditNew(row) {
  const action = newActionByKey.value[row.key] || row.defaultNewAction
  return showNewSchedule(row) && action === ECN_NEW_ACTION.SCHEDULE
}

function scheduleLabel(row) {
  const supply = supplyFormByKey.value[row.key] || row.supplyForm || '自制件'
  if (supply === '外购件' || supply === '外购') return '生成采购申请单'
  if (supply === '外协件') return '生成待审核的外协订单'
  if (row.modifyKind === 'qty_only') return '按新用量生成待下发生产工单'
  return '生成待下发生产工单'
}

function modifyKindColor(row) {
  if (row.modifyKind === 'qty_only') return 'cyan'
  if (row.modifyKind === 'swap_material') return 'orange'
  return 'default'
}

function situationStatusColor(status) {
  const s = String(status || '')
  if (s === '执行中' || s === '进行中') return 'processing'
  if (s === '待下发' || s === '待提交') return 'default'
  if (s === '待审核') return 'warning'
  if (s === '已完成' || s === '完成' || s === '审核通过') return 'success'
  if (s === '已作废' || s === '终止' || s === '已拒绝') return 'error'
  return 'default'
}

defineExpose({ impact, wholePlanMode })
</script>

<style lang="less" scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.scope {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  margin-bottom: 6px;
}

.hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 500;
}

.cell-pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
}

.sub-tag {
  margin-left: 4px;
}

.force-warn {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 8px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #cf1322;
  font-size: 12px;
  line-height: 1.4;
}

.force-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.foot-tip {
  margin: 10px 0 0;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(0, 0, 0, 0.65);
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.change-cell {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.change-cell--child {
  padding-left: 4px;
}

.change-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.tree-branch {
  flex-shrink: 0;
  margin-top: 1px;
  color: #722ed1;
  font-weight: 600;
  line-height: 22px;
}

.mat-cell--child {
  padding-left: 16px;
  border-left: 2px solid #d3adf7;
}

:deep(.line-row-parent) > td {
  background: #f9f0ff !important;
}

:deep(.line-row-child) > td {
  background: #fcfaff !important;
}

:deep(.line-row-child) > td:first-child {
  box-shadow: inset 3px 0 0 #b37feb;
}

.situation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.situation-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  line-height: 1.4;
}

.situation-doc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
}

.situation-status {
  margin: 0;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
