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
          :scroll="{ x: tableScrollX }"
          bordered
        >
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.key === 'index' || column.dataIndex === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'processConfig'">
              <div v-if="processConfigTags(record).length" class="config-tags">
                <a-tag
                  v-for="item in processConfigTags(record)"
                  :key="item.label"
                  :color="item.color"
                  class="config-tag"
                >
                  {{ item.label }}
                </a-tag>
              </div>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'resourceType'">
              {{ record.resourceType || '工人' }}
            </template>
            <template v-else-if="column.key === 'executionMode'">
              {{ formatWorkOrderProcessExecutionMode(record) }}
            </template>
            <template v-else-if="column.key === 'executors'">
              {{ formatProcessExecutors(record) }}
            </template>
            <template v-else-if="column.key === 'blankingMaterials'">
              {{ formatBlankingMaterialsSummary(record) }}
            </template>
            <template v-else-if="column.key === 'outsourceStatus'">
              <a-tag
                v-if="record.outsourceStatus"
                :color="outsourceStatusColor(record.outsourceStatus)"
              >
                {{ record.outsourceStatus }}
              </a-tag>
              <span v-else>—</span>
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
  formatWorkOrderProcessExecutionMode,
  resolveWorkOrderProcessConfigTags,
} from '@/utils/workOrderProcessDisplay'
import { formatBlankingMaterialsSummary } from '@/utils/blankingSettleMaterial'
import WorkOrderProductionSections from './WorkOrderProductionSections.vue'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

defineEmits(['action'])

const collapseKeys = ref(['basic', 'process-config'])

const processConfigList = computed(() => props.workOrder?.processes || [])

const processConfigCols = [
  { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
  { title: '工序名称', dataIndex: 'name', width: 100 },
  { title: '工序配置', key: 'processConfig', width: 160 },
  { title: '资源类型', key: 'resourceType', width: 90 },
  { title: '任务模式', key: 'executionMode', width: 96 },
  { title: '执行人', key: 'executors', width: 120 },
  { title: '下料物料', key: 'blankingMaterials', width: 200, ellipsis: true },
  { title: '外协状态', key: 'outsourceStatus', width: 96 },
  { title: '工序内容', dataIndex: 'processContent', width: 140, ellipsis: true },
]

const tableScrollX = computed(() =>
  processConfigCols.reduce((sum, col) => sum + (col.width || 100), 0),
)

function processConfigTags(record) {
  return resolveWorkOrderProcessConfigTags(record)
}

function displayProcessCell(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

function outsourceStatusColor(status) {
  const map = {
    待外协: 'default',
    外协中: 'processing',
    已回货: 'success',
  }
  return map[status] || 'default'
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

  .config-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .config-tag {
    margin-inline-end: 0;
  }
}
</style>
