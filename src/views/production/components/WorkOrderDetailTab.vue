<template>
  <div v-if="workOrder" class="work-order-detail-tab">
    <a-collapse v-model:activeKey="collapseKeys" :bordered="false" class="detail-sections">
      <a-collapse-panel key="basic" header="工单基本信息">
        <WorkOrderProductionSections :work-order="workOrder" show-meta-bar />
      </a-collapse-panel>

      <a-collapse-panel key="process-config" header="工序模板">
        <div class="panel-hint">工序模板供各排产批次共用；执行人以排产批次指派为准。</div>
        <a-table
          size="small"
          :columns="processConfigCols"
          :data-source="processConfigList"
          row-key="id"
          :pagination="false"
          :scroll="{ x: showBlankingColumn || showFeedingColumn ? 860 : 520 }"
          bordered
        >
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.key === 'index' || column.dataIndex === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'feeding'">
              {{ formatProcessFeedingSummary(record) }}
            </template>
            <template v-else-if="column.key === 'blankingMaterials'">
              {{ formatBlankingMaterialsSummary(record) }}
            </template>
            <template v-else-if="column.key === 'executors'">
              {{ formatProcessExecutors(record) }}
            </template>
            <template v-else-if="column.dataIndex">
              {{ displayProcessCell(text) }}
            </template>
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  formatProcessExecutors,
  formatProcessFeedingSummary,
} from '@/utils/workOrderProcessDisplay'
import { formatBlankingMaterialsSummary } from '@/utils/blankingSettleMaterial'
import { resolveProcessIsBlanking } from '@/utils/workOrderBlanking'
import { businessRuleState } from '@/store/businessRuleStore'
import WorkOrderProductionSections from './WorkOrderProductionSections.vue'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

defineEmits(['action'])

const collapseKeys = ref(['basic', 'process-config'])

const processConfigList = computed(() => props.workOrder?.processes || [])

const showFeedingColumn = computed(() => businessRuleState.rules.productionMode === 'standard')

const showBlankingColumn = computed(() =>
  (props.workOrder?.processes || []).some((p) => resolveProcessIsBlanking(p)),
)

const processConfigCols = computed(() => {
  const cols = [
    { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
    { title: '工序名称', dataIndex: 'name', width: 100 },
    { title: '工序内容', dataIndex: 'processContent', width: 140, ellipsis: true },
  ]
  if (showFeedingColumn.value) {
    cols.push({ title: '投料', key: 'feeding', width: 160, ellipsis: true })
  }
  if (showBlankingColumn.value) {
    cols.push({ title: '下料物料', key: 'blankingMaterials', width: 200, ellipsis: true })
  }
  cols.push({ title: '执行人', key: 'executors', width: 120 })
  return cols
})

function displayProcessCell(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}
</script>

<style lang="less" scoped>
.work-order-detail-tab {
  .detail-sections {
    :deep(.ant-collapse-item) {
      margin-bottom: 8px;
      background: #fff;
      border: 1px solid #f0f0f0 !important;
      border-radius: 8px;
      overflow: hidden;
    }

    :deep(.ant-collapse-header) {
      font-weight: 600;
      padding: 10px 16px !important;
    }

    :deep(.ant-collapse-content-box) {
      padding: 12px 16px 16px !important;
    }
  }

  .panel-hint {
    margin-bottom: 8px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
