<template>
  <div class="dispatch-tab">
    <div class="structure-toolbar">
      <div class="structure-toolbar-text">
        <span class="structure-title">本单工序</span>
        <span class="structure-hint">
          {{
            canEditStructure
              ? '派工请在下表操作；增删工序、并行与完成方式请用网格调整（仅本单）'
              : '当前状态不可调整工序结构（需待下发且尚未生成小程序任务）'
          }}
        </span>
      </div>
      <a-button
        v-if="canEditStructure"
        type="primary"
        ghost
        size="small"
        @click="gridModalOpen = true"
      >
        用网格调整本单工序
      </a-button>
    </div>

    <div v-if="anyStepGroups.length" class="any-select-panel">
      <div class="any-select-title">选做工序勾选</div>
      <div class="any-select-hint">
        以下步骤为「选做完成」，请勾选本次要下发的工序（可多选，默认全选，至少选一道）
      </div>
      <div v-for="group in anyStepGroups" :key="group.stepNo" class="any-select-group">
        <div class="any-select-step">第 {{ group.stepNo }} 步</div>
        <a-checkbox-group
          :value="selectedIdsOf(group)"
          class="any-select-checks"
          @change="(ids) => onGroupSelect(group, ids)"
        >
          <a-checkbox v-for="proc in group.processes" :key="proc.id" :value="proc.id">
            {{ proc.name }}
            <span v-if="proc.processCode" class="proc-code">{{ proc.processCode }}</span>
          </a-checkbox>
        </a-checkbox-group>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="workOrder.processes"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1200 }"
      class="process-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">
          {{ index + 1 }}
        </template>
        <template v-else-if="column.key === 'process'">
          <div class="process-cell">
            <span class="process-icon-wrap">
              <SettingOutlined />
            </span>
            <span>{{ record.name }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'stepNo'">
          {{ record.stepNo || '—' }}
        </template>
        <template v-else-if="column.key === 'completionMode'">
          {{ formatCompletionModeLabel(record.completionMode) }}
        </template>
        <template v-else-if="column.key === 'processConfig'">
          <div v-if="processConfigTags(record).length" class="config-tags">
            <template v-for="item in processConfigTags(record)" :key="item.label">
              <a-tag :color="item.color" class="config-tag">
                {{ item.label }}
              </a-tag>
              <template v-if="item.label === '外协' && isOutsourceProcess(record)">
                <a-checkbox
                  v-model:checked="record.skipProcessOutsourceOnDispatch"
                  class="outsource-opt-check"
                  @change="onSkipChange(record)"
                >
                  本次不出
                </a-checkbox>
                <a-checkbox
                  v-model:checked="record.outsourceConfirmBeforeDispatch"
                  class="outsource-opt-check"
                  @change="onConfirmChange(record)"
                >
                  下发前确认
                </a-checkbox>
              </template>
            </template>
          </div>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'resourceType'">
          <a-tag :color="record.resourceType === '工人小组' ? 'blue' : 'default'">
            {{ record.resourceType || '工人' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'executionMode'">
          {{ formatWorkOrderProcessExecutionMode(record) }}
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
        <template v-else-if="column.key === 'processContent'">
          <a-input
            v-model:value="record.processContent"
            size="small"
            allow-clear
            placeholder="请输入工序内容"
          />
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

    <WorkOrderProcessGridEditModal
      v-model:open="gridModalOpen"
      :work-order="workOrder"
      @applied="onGridApplied"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import WorkOrderProcessGridEditModal from './WorkOrderProcessGridEditModal.vue'
import { validateWorkOrderDispatchReady } from '@/utils/workOrderDispatchHelpers'
import { listAnyCompletionSteps, formatCompletionModeLabel } from '@/utils/processRouteGrid'
import { canEditWorkOrderProcessStructure } from '@/utils/workOrderProcessGrid'
import { getProcessByName } from '@/store/processConfigStore'
import { normalizeReportMode } from '@/utils/reportMode'
import {
  estimateTaskCountForProcess,
  resolveProcessExecutionMode,
  shouldSplitCollaborativeTasks,
} from '@/utils/taskExecutionMode'
import { resolveProcessIsBlanking } from '@/utils/workOrderBlanking'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'
import {
  formatWorkOrderProcessExecutionMode,
  resolveWorkOrderProcessConfigTags,
} from '@/utils/workOrderProcessDisplay'
import { resolveProcessOpOutsource } from '@/utils/workOrderProcessOutsource'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['save', 'dispatch-and-start', 'cancel'])

const gridModalOpen = ref(false)

watch(
  () => props.workOrder,
  (wo) => {
    if (wo) syncWorkOrderBlankingMaterials(wo)
  },
  { immediate: true },
)

const canEditStructure = computed(() => canEditWorkOrderProcessStructure(props.workOrder))

const anyStepGroups = computed(() => listAnyCompletionSteps(props.workOrder?.processes || []))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '工序名称', key: 'process', width: 120 },
  { title: '步骤', key: 'stepNo', width: 64, align: 'center' },
  { title: '完成方式', key: 'completionMode', width: 88 },
  { title: '工序配置', key: 'processConfig', width: 360 },
  { title: '资源类型', key: 'resourceType', width: 90 },
  { title: '任务模式', key: 'executionMode', width: 96 },
  { title: '选择执行人', key: 'executors', width: 220 },
  { title: '下料物料', key: 'blankingMaterials', width: 220 },
  { title: '工序内容', key: 'processContent', width: 180 },
]

function onGridApplied() {
  emit('save')
}

function selectedIdsOf(group) {
  return group.processes.filter((p) => p.includeInDispatch !== false).map((p) => p.id)
}

function onGroupSelect(group, ids) {
  const set = new Set(ids || [])
  group.processes.forEach((p) => {
    p.includeInDispatch = set.has(p.id)
  })
}

function processConfigTags(record) {
  return resolveWorkOrderProcessConfigTags(record)
}

function isOutsourceProcess(record) {
  return resolveProcessOpOutsource(record)
}

function onSkipChange(record) {
  record.skipProcessOutsourceOnDispatch = Boolean(record.skipProcessOutsourceOnDispatch)
  if (record.skipProcessOutsourceOnDispatch) {
    record.outsourceConfirmBeforeDispatch = false
  }
}

function onConfirmChange(record) {
  record.outsourceConfirmBeforeDispatch = Boolean(record.outsourceConfirmBeforeDispatch)
  if (record.outsourceConfirmBeforeDispatch) {
    record.skipProcessOutsourceOnDispatch = false
  }
}

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

function collaborativeTaskHint(record) {
  const enriched = enrichProcessRecord(record)
  if (!shouldSplitCollaborativeTasks(enriched)) return ''
  const count = estimateTaskCountForProcess(enriched)
  return `将按 ${count} 名执行人生成 ${count} 条协作任务`
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
.dispatch-tab {
  .structure-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .structure-toolbar-text {
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
  }

  .structure-title {
    font-weight: 600;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }

  .structure-hint {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .any-select-panel {
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 6px;
  }

  .any-select-title {
    font-weight: 600;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }

  .any-select-hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .any-select-group {
    margin-top: 10px;
  }

  .any-select-step {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
    color: rgba(0, 0, 0, 0.65);
  }

  .any-select-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  .proc-code {
    margin-left: 4px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .process-table {
    margin-bottom: 12px;
  }

  .process-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .process-icon-wrap {
    display: inline-flex;
    color: #1677ff;
  }

  .config-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .config-tag {
    margin-inline-end: 0;
  }

  .outsource-opt-check {
    font-size: 12px;
    margin-left: 2px;
    white-space: nowrap;
  }

  .task-hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .blanking-cell {
    .blanking-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      line-height: 1.5;
    }

    .blanking-name {
      color: rgba(0, 0, 0, 0.88);
    }

    .blanking-code,
    .blanking-qty {
      color: rgba(0, 0, 0, 0.45);
      font-size: 12px;
    }
  }

  .muted {
    color: rgba(0, 0, 0, 0.25);
  }

  .dispatch-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
  }
}
</style>
