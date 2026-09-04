<template>
  <a-drawer
    :open="open"
    title="质检任务详情"
    v-bind="drawerBind"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <template v-if="task">
      <div class="section-title">基本信息</div>
      <div class="drawer-basic-card">
        <a-row :gutter="[24, 8]" class="drawer-basic-info">
          <a-col :span="24">
            <span class="info-label">质检单号：</span>
            <span class="info-value">{{ task.qcNo }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">业务类型：</span>
            <span class="info-value">{{ task.bizScope }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">质检状态：</span>
            <span class="info-value">
              <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
            </span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">质检结果：</span>
            <span class="info-value">
              <a-tag v-if="task.qcResult" :color="resultColor(task.qcResult)">{{
                task.qcResult
              }}</a-tag>
              <template v-else>—</template>
            </span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">检验方式：</span>
            <span class="info-value">{{ task.inspectMethod || '—' }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">质检模板：</span>
            <span class="info-value">{{ task.templateName || task.templateCode || '—' }}</span>
          </a-col>
          <a-col v-if="isInboundScope" :span="24">
            <span class="info-label">来源单号：</span>
            <span class="info-value">{{ task.sourceDocNo || '—' }}</span>
          </a-col>
          <a-col v-if="isProductionScope" :span="12">
            <span class="info-label">工单号：</span>
            <span class="info-value">{{ task.workOrderNo || '—' }}</span>
          </a-col>
          <a-col v-if="isProductionScope" :span="12">
            <span class="info-label">工序：</span>
            <span class="info-value">{{ task.processName || task.processCode || '—' }}</span>
          </a-col>
          <a-col v-if="isProductionScope" :span="12">
            <span class="info-label">排产批次：</span>
            <span class="info-value">{{
              task.scheduleBatchNo != null ? `批次${task.scheduleBatchNo}` : '—'
            }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">物料编码：</span>
            <span class="info-value">{{ task.itemCode || '—' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">物料名称：</span>
            <span class="info-value">{{ task.itemName || '—' }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">规格型号：</span>
            <span class="info-value">{{ task.specModel || '—' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">检验员：</span>
            <span class="info-value">{{ task.inspector || '—' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">检验时间：</span>
            <span class="info-value">{{ task.inspectedAt || '—' }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">创建时间：</span>
            <span class="info-value">{{ task.createdAt || '—' }}</span>
          </a-col>
          <a-col v-if="task.remark" :span="24">
            <span class="info-label">备注：</span>
            <span class="info-value">{{ task.remark }}</span>
          </a-col>
        </a-row>
      </div>

      <div class="section-title">检验明细</div>
      <a-table
        :columns="lineColumns"
        :data-source="task.lineItems || []"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        v-model:expandedRowKeys="expandedKeys"
      >
        <template #expandIcon="{ expanded, onExpand: onExp, record }">
          <a-button type="link" size="small" @click="(e) => onExp(record, e)">
            {{ expanded ? '收起检验项' : '展开检验项' }}
          </a-button>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="expand-form-wrap">
            <QcLineFieldValuesReadonly :line="record" :task="task" />
          </div>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else>{{ record[column.dataIndex] ?? '—' }}</template>
        </template>
      </a-table>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { QC_TASK_STATUS, QC_TASK_RESULT } from '@/store/qcTaskStore'
import { useDrawerWidth } from '@/composables/useDrawerWidth'
import QcLineFieldValuesReadonly from './QcLineFieldValuesReadonly.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const { drawerBind } = useDrawerWidth('l')
const expandedKeys = ref([])

const INBOUND_SCOPES = new Set(['来料质检', '外协回货检'])
const PRODUCTION_SCOPES = new Set(['生产过程检', '成品检'])

const isInboundScope = computed(() => INBOUND_SCOPES.has(props.task?.bizScope))
const isProductionScope = computed(() => PRODUCTION_SCOPES.has(props.task?.bizScope))

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物料编码', dataIndex: 'itemCode', width: 110 },
  { title: '物料名称', dataIndex: 'itemName', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '检验数量', dataIndex: 'inspectQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
]

watch(
  () => props.open,
  (val) => {
    if (!val) expandedKeys.value = []
  },
)

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.IN_PROGRESS) return 'processing'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function resultColor(result) {
  if (result === QC_TASK_RESULT.PASS) return 'success'
  if (result === QC_TASK_RESULT.PARTIAL) return 'processing'
  if (result === QC_TASK_RESULT.FAIL) return 'error'
  return 'default'
}
</script>

<style lang="less" scoped>
.section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.drawer-basic-card {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.drawer-basic-info {
  .info-label {
    color: #4e5969;
    font-size: 14px;
    line-height: 22px;
    white-space: nowrap;
  }

  .info-value {
    color: #1f2329;
    font-size: 14px;
    line-height: 22px;
    word-break: break-all;
  }
}

.expand-form-wrap {
  padding: 8px 4px;
  background: #fafafa;
}
</style>
