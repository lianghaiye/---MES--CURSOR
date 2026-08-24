<template>
  <div class="dispatch-tab">
    <a-table
      :columns="columns"
      :data-source="workOrder.processes"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      class="process-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'process'">
          <div class="process-cell">
            <span class="process-icon-wrap">
              <SettingOutlined />
            </span>
            <span>{{ record.name }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'processCode'">
          {{ record.processCode || '-' }}
        </template>
        <template v-else-if="column.key === 'resourceType'">
          <a-tag :color="record.resourceType === '工人小组' ? 'blue' : 'default'">
            {{ record.resourceType || '工人' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'executors'">
          <ExecutorTagPicker
            :executors="record.executors || []"
            :resource-type="record.resourceType || '工人'"
            @update:executors="(v) => (record.executors = v)"
          />
          <div v-if="collaborativeTaskHint(record)" class="task-hint">
            {{ collaborativeTaskHint(record) }}
          </div>
        </template>
        <template v-else-if="column.key === 'executionMode'">
          {{ executionModeLabel(record) }}
        </template>
        <template v-else-if="column.key === 'processContent'">
          <a-input
            v-model:value="record.processContent"
            size="small"
            allow-clear
            placeholder="请输入工序内容"
          />
        </template>
        <template v-else-if="column.key === 'feeding'">
          <div v-if="record.hasFeeding" class="feeding-cell">
            <div v-for="(item, idx) in record.feedingMaterials" :key="item.id" class="feeding-row">
              <a-select
                v-model:value="item.materialId"
                show-search
                allow-clear
                placeholder="请选择物料"
                style="width: 150px"
                size="small"
                :options="materialOptions"
                @change="(val) => onMaterialChange(item, val)"
              />
              <a-input-number
                v-model:value="item.qty"
                :min="0"
                size="small"
                placeholder="数量"
                style="width: 80px"
              />
              <a-button
                type="link"
                size="small"
                danger
                :disabled="record.feedingMaterials.length <= 1"
                @click="removeFeedingRow(record, idx)"
              >
                删除
              </a-button>
            </div>
            <a-button type="link" size="small" class="add-feed-btn" @click="addFeedingRow(record)">
              + 增加投料
            </a-button>
          </div>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'blankingMaterials'">
          <div v-if="isBlankingProcess(record)" class="blanking-cell">
            <template v-if="(record.blankingMaterials || []).length">
              <div
                v-for="item in record.blankingMaterials"
                :key="item.id || item.materialCode"
                class="blanking-row"
              >
                <span class="blanking-name">{{ item.materialName || item.materialCode }}</span>
                <span v-if="item.materialCode" class="blanking-code">{{ item.materialCode }}</span>
                <span v-if="item.requiredQty != null" class="blanking-qty">
                  {{ item.requiredQty }}{{ item.unit || '' }}
                </span>
              </div>
            </template>
            <span v-else class="muted">本工单 BOM 无「需要下料结算」物料</span>
          </div>
          <span v-else class="muted">—</span>
        </template>
      </template>
    </a-table>

    <div class="dispatch-footer">
      <a-space :size="8">
        <a-button size="small" @click="emitSave">保存</a-button>
        <a-button type="primary" size="small" @click="emitDispatchAndStart">下发并开始</a-button>
        <a-button size="small" @click="emit('cancel')">取消</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import { mockFeedingMaterials } from '@/mock/workOrderMaster'
import { validateWorkOrderDispatchReady } from '@/utils/workOrderDispatchHelpers'
import { businessRuleState } from '@/store/businessRuleStore'
import { getProcessByName } from '@/store/processConfigStore'
import { normalizeReportMode } from '@/utils/reportMode'
import {
  estimateTaskCountForProcess,
  getTaskExecutionModeLabel,
  resolveProcessExecutionMode,
  shouldSplitCollaborativeTasks,
} from '@/utils/taskExecutionMode'
import { resolveProcessIsBlanking } from '@/utils/workOrderBlanking'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['save', 'dispatch-and-start', 'cancel'])

const showFeedingColumn = computed(() => businessRuleState.rules.productionMode === 'standard')

const showBlankingColumn = computed(() =>
  (props.workOrder?.processes || []).some((p) => resolveProcessIsBlanking(p)),
)

watch(
  () => props.workOrder,
  (wo) => {
    if (wo) syncWorkOrderBlankingMaterials(wo)
  },
  { immediate: true },
)

const columns = computed(() => {
  const base = [
    { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
    { title: '工序名称', key: 'process', width: 120 },
    { title: '工序编码', key: 'processCode', width: 100 },
    { title: '资源类型', key: 'resourceType', width: 90 },
    { title: '选择执行人', key: 'executors', width: 220 },
    { title: '任务模式', key: 'executionMode', width: 96 },
    { title: '工序内容', key: 'processContent', width: 180 },
  ]
  if (showFeedingColumn.value) {
    base.push({ title: '投料信息', key: 'feeding' })
  }
  if (showBlankingColumn.value) {
    base.push({ title: '下料物料', key: 'blankingMaterials', width: 220 })
  }
  return base
})

const materialOptions = computed(() =>
  mockFeedingMaterials.map((m) => ({ label: m.name, value: m.id })),
)

function isBlankingProcess(record) {
  return resolveProcessIsBlanking(record)
}

function enrichProcessRecord(record) {
  const procConfig = getProcessByName(record.name)
  return {
    ...record,
    reportMode: normalizeReportMode(record.reportMode || procConfig?.reportMode),
    taskExecutionMode: resolveProcessExecutionMode({
      taskExecutionMode: record.taskExecutionMode ?? procConfig?.taskExecutionMode,
    }),
  }
}

function executionModeLabel(record) {
  const enriched = enrichProcessRecord(record)
  if (enriched.reportMode !== '时长报工' || enriched.resourceType !== '工人') {
    return '—'
  }
  return getTaskExecutionModeLabel(enriched.taskExecutionMode)
}

function collaborativeTaskHint(record) {
  const enriched = enrichProcessRecord(record)
  if (!shouldSplitCollaborativeTasks(enriched)) return ''
  const count = estimateTaskCountForProcess(enriched)
  return `将按 ${count} 名执行人生成 ${count} 条协作任务`
}

function onMaterialChange(item, materialId) {
  const mat = mockFeedingMaterials.find((m) => m.id === materialId)
  item.materialName = mat?.name || ''
}

function addFeedingRow(process) {
  process.feedingMaterials.push({
    id: `feed-${Date.now()}`,
    materialId: undefined,
    materialName: '',
    qty: null,
  })
}

function removeFeedingRow(process, index) {
  process.feedingMaterials.splice(index, 1)
}

function emitSave() {
  // 草稿保存不校验必填项（执行人等）；下发并开始时再校验
  emit('save')
}

function emitDispatchAndStart() {
  if (!validateWorkOrderDispatchReady(props.workOrder)) return
  emit('dispatch-and-start')
}
</script>

<style lang="less" scoped>
.process-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 6px 8px;
    font-size: 12px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

.process-cell {
  display: flex;
  align-items: center;
  gap: 6px;

  .process-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: #e6f4ff;
    color: #1677ff;
    font-size: 12px;
  }
}

.feeding-cell {
  .feeding-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .add-feed-btn {
    padding-left: 0;
    height: 22px;
    font-size: 12px;
  }
}

.blanking-cell {
  .blanking-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    margin-bottom: 2px;
    line-height: 1.4;
  }

  .blanking-name {
    color: rgba(0, 0, 0, 0.88);
  }

  .blanking-code {
    color: rgba(0, 0, 0, 0.45);
    font-size: 11px;
  }

  .blanking-qty {
    color: rgba(0, 0, 0, 0.65);
  }
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.task-hint {
  margin-top: 4px;
  font-size: 11px;
  color: #1677ff;
  line-height: 1.4;
}

.dispatch-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}
</style>
