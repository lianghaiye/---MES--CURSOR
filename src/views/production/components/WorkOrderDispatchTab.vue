<template>
  <div class="dispatch-tab">
    <a-table
      :columns="columns"
      :data-source="workOrder.processes"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1280 }"
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
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link muted-action">删除</a>
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
import { watch } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import { validateWorkOrderDispatchReady } from '@/utils/workOrderDispatchHelpers'
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

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['save', 'dispatch-and-start', 'cancel'])

watch(
  () => props.workOrder,
  (wo) => {
    if (wo) syncWorkOrderBlankingMaterials(wo)
  },
  { immediate: true },
)

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '工序名称', key: 'process', width: 120 },
  { title: '工序配置', key: 'processConfig', width: 160 },
  { title: '资源类型', key: 'resourceType', width: 90 },
  { title: '任务模式', key: 'executionMode', width: 96 },
  { title: '选择执行人', key: 'executors', width: 220 },
  { title: '下料物料', key: 'blankingMaterials', width: 220 },
  { title: '工序内容', key: 'processContent', width: 180 },
  { title: '操作', key: 'actions', width: 72, fixed: 'right' },
]

function processConfigTags(record) {
  return resolveWorkOrderProcessConfigTags(record)
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
    gap: 4px;
  }

  .config-tag {
    margin-inline-end: 0;
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

  .danger-link {
    color: #ff4d4f;
  }

  .muted-action {
    cursor: default;
    opacity: 0.65;
  }

  .dispatch-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
  }
}
</style>
