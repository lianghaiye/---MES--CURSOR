<template>
  <div class="reschedule-section">
    <div class="section-title">本次变更的计划重排</div>
    <div class="scope">
      <span>销售订单：{{ record.salesOrderNo || '—' }}</span>
      <span>产品：{{ record.productName || record.productCode || '—' }}</span>
    </div>
    <p class="hint">
      只处理这张变更单选定的销售订单和产品。上面决定整单计划要不要换成新
      BOM；下面按每一条变更看旧料和新料怎么处置。
    </p>

    <div class="sub-head">
      <span>该订单下的计划工作项</span>
      <a-button v-if="!readonly" type="link" size="small" @click="selectAllReschedulable">
        全选可重排
      </a-button>
    </div>
    <a-table
      :columns="wiColumns"
      :data-source="impact.workItemRows"
      :pagination="false"
      row-key="key"
      size="small"
      bordered
      :row-selection="readonly ? null : wiRowSelection"
      :locale="{ emptyText: '该销售订单下还没有这件产品的生产计划' }"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'action'">
          <a-tag v-if="row.canReschedule" color="processing">可重排</a-tag>
          <a-tag v-else-if="row.action === 'started'" color="warning">已开工·人工</a-tag>
          <a-tag v-else-if="row.action === 'completed'" color="default">已完成</a-tag>
          <a-tag v-else>其他</a-tag>
        </template>
        <template v-else-if="column.key === 'bomVersion'">
          {{ row.bomVersion || '—' }}
        </template>
      </template>
    </a-table>

    <div class="sub-head">
      <span>变更物料对比与处置</span>
    </div>
    <a-table
      :columns="lineColumns"
      :data-source="lineRows"
      :pagination="false"
      row-key="key"
      size="small"
      bordered
      :scroll="{ x: 1100 }"
      :locale="{ emptyText: '这张变更单没有变更物料' }"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'changeType'">
          <a-tag :color="ecnChangeItemTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space direction="vertical" :size="2">
            <span class="suggest">{{ row.suggest }}</span>
            <a-checkbox
              v-if="row.canVoid"
              :checked="hasAction(`void:${row.key}`)"
              :disabled="readonly"
              @change="(e) => toggleAction(`void:${row.key}`, e.target.checked)"
            >
              作废待下发工单
            </a-checkbox>
            <a-checkbox
              v-if="row.canCancelPlan"
              :checked="hasAction(`cancel:${row.key}`)"
              :disabled="readonly"
              @change="(e) => toggleAction(`cancel:${row.key}`, e.target.checked)"
            >
              取消未下发排产
            </a-checkbox>
            <a-checkbox
              v-if="row.canSchedule"
              :checked="hasAction(`schedule:${row.key}`)"
              :disabled="readonly"
              @change="(e) => toggleAction(`schedule:${row.key}`, e.target.checked)"
            >
              {{ scheduleLabel(row) }}
            </a-checkbox>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'EcnExecuteRescheduleSection' }
</script>

<script setup>
import { computed, watch } from 'vue'
import { ecnChangeItemTypeColor } from '@/constants/ecn'
import { analyzeEcnPlanImpact, buildEcnChangeLineRows } from '@/utils/ecnPlanImpact'

const props = defineProps({
  record: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  refreshKey: { type: Number, default: 0 },
})

const selectedWiKeys = defineModel('workItemKeys', { type: Array, default: () => [] })
const lineActionKeys = defineModel('lineActionKeys', { type: Array, default: () => [] })

const impact = computed(() => {
  void props.refreshKey
  return analyzeEcnPlanImpact(props.record)
})

const lineRows = computed(() => {
  void props.refreshKey
  return buildEcnChangeLineRows(props.record)
})

watch(
  () => [props.record?.id, props.refreshKey],
  () => {
    if (props.readonly) return
    selectedWiKeys.value = impact.value.workItemRows
      .filter((r) => r.canReschedule)
      .map((r) => r.key)
    const keys = []
    lineRows.value.forEach((row) => {
      if (row.canVoid) keys.push(`void:${row.key}`)
      if (row.canCancelPlan) keys.push(`cancel:${row.key}`)
      if (row.canSchedule) keys.push(`schedule:${row.key}`)
    })
    lineActionKeys.value = keys
  },
  { immediate: true },
)

const wiRowSelection = computed(() => ({
  selectedRowKeys: selectedWiKeys.value,
  onChange: (keys) => {
    selectedWiKeys.value = keys
  },
  getCheckboxProps: (row) => ({ disabled: !row.canReschedule }),
}))

const wiColumns = [
  { title: '产品', dataIndex: 'productName', ellipsis: true },
  { title: '工作项状态', dataIndex: 'wiStatus', width: 100 },
  { title: '当前BOM版本', key: 'bomVersion', width: 120 },
  { title: '处置', key: 'action', width: 120 },
]

const lineColumns = [
  { title: '变更', key: 'changeType', width: 72 },
  { title: '变更前', dataIndex: 'beforeText', width: 220 },
  { title: '变更后', dataIndex: 'afterText', width: 220 },
  { title: '旧料执行情况', dataIndex: 'oldSituation', width: 180 },
  { title: '处置', key: 'action', width: 220 },
]

function selectAllReschedulable() {
  selectedWiKeys.value = impact.value.workItemRows.filter((r) => r.canReschedule).map((r) => r.key)
}

function hasAction(key) {
  return lineActionKeys.value.includes(key)
}

function toggleAction(key, checked) {
  const next = lineActionKeys.value.filter((item) => item !== key)
  if (checked) next.push(key)
  lineActionKeys.value = next
}

function scheduleLabel(row) {
  if (row.supplyForm === '外购件' || row.supplyForm === '外购') return '纳入采购计划'
  if (row.supplyForm === '外协件') return '生成待下发外协工单'
  return '排产（生成待下发工单）'
}

defineExpose({ impact })
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

.suggest {
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
}
</style>
