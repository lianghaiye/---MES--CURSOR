<template>
  <div class="qc-task-detail-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ task.qcNo || '质检单详情' }}</span>
            <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
            <a-tag v-if="task.qcResult" :color="resultColor(task.qcResult)">{{
              task.qcResult
            }}</a-tag>
          </div>
          <a-space>
            <a-button v-if="canInspect" type="primary" size="small" @click="openInspect">
              质检
            </a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="质检单号">{{ task.qcNo || '—' }}</a-descriptions-item>
            <a-descriptions-item label="质检类型">{{ task.bizScope || '—' }}</a-descriptions-item>
            <a-descriptions-item label="质检状态">
              <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="质检结果">
              <a-tag v-if="task.qcResult" :color="resultColor(task.qcResult)">{{
                task.qcResult
              }}</a-tag>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="供应商">{{ task.supplier || '—' }}</a-descriptions-item>
            <a-descriptions-item label="来源单号">{{
              task.sourceDocNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="入库单号">{{
              task.inboundOrderNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="质检方式">
              {{ task.multiTemplate ? '按行模板' : task.inspectMethod || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检模板">{{
              task.templateName || task.templateCode || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="质检人">{{ task.inspector || '—' }}</a-descriptions-item>
            <a-descriptions-item label="质检时间">{{
              formatDateTimeMinute(task.inspectedAt) || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="录入端">{{
              channelLabel(task.entryChannel)
            }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ task.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              formatDateTimeMinute(task.createdAt) || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              task.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">质检明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="task.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1100 }"
            v-model:expandedRowKeys="expandedKeys"
          >
            <template #expandIcon="{ expanded, onExpand: onExp, record }">
              <a-button type="link" size="small" @click="(e) => onExp(record, e)">
                {{ expanded ? '收起检验项' : '展开检验项' }}
              </a-button>
            </template>
            <template #expandedRowRender="{ record }">
              <div class="expand-form-wrap">
                <a-alert
                  v-if="canInspect && !hasEnteredValues(record)"
                  type="info"
                  show-icon
                  class="enter-tip"
                  message="尚未录入实测值。点击右上角「质检」进入录入页，可填写普通项 / 复合子项 / 多点测点。"
                />
                <QcLineFieldValuesReadonly
                  :line="record"
                  :task="task"
                  empty-text="该行模板暂无自定义检验项"
                />
              </div>
            </template>
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'receiptQty'">
                {{ formatQty(record.receiptQty) }}
              </template>
              <template v-else-if="column.key === 'inspectQty'">
                {{ formatQty(record.inspectQty) }}
              </template>
              <template v-else-if="column.key === 'lineQcResult'">
                <a-tag v-if="record.lineQcResult" :color="resultColor(record.lineQcResult)">
                  {{ record.lineQcResult }}
                </a-tag>
                <span v-else>—</span>
              </template>
              <template v-else>
                {{ record[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该质检单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'QcTaskDetailView' }
</script>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  QC_TASK_RESULT,
  QC_TASK_STATUS,
  canInspectQcTask,
  getQcTaskById,
  qcTaskState,
} from '@/store/qcTaskStore'
import { ensureQcTemplateDemoSeed } from '@/store/qcTemplateStore'
import { ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { formatQty } from '@/utils/numberFormat'
import QcLineFieldValuesReadonly from './components/QcLineFieldValuesReadonly.vue'

onMounted(() => {
  ensureQcLibraryDemoSeed()
  ensureQcTemplateDemoSeed()
})

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const task = ref(null)
const expandedKeys = ref([])

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center' },
  { title: '产品名称', dataIndex: 'itemName', width: 130, ellipsis: true },
  { title: '产品编号', dataIndex: 'itemCode', width: 110 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', width: 80 },
  { title: '收货数量', key: 'receiptQty', width: 90, align: 'right' },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 100 },
  { title: '质检结果', key: 'lineQcResult', width: 100 },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 100 },
]

const canInspect = computed(() => canInspectQcTask(task.value))

function hasEnteredValues(line) {
  const values = line?.fieldValues || []
  if (!values.length) return false
  return values.some((v) => {
    const code = v.fieldCode || v.code
    if (!code || code === 'QC_INSPECT_METHOD' || code === 'QC_INSPECT_QTY') return false
    const val = v.value ?? v.fieldValue
    if (val === undefined || val === null) return false
    if (typeof val === 'object') return true
    return String(val).trim() !== ''
  })
}

function loadTask() {
  const id = route.params.id
  loading.value = true
  void qcTaskState.tasks
  task.value = getQcTaskById(id)
  loading.value = false
  if (task.value?.qcNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = task.value.qcNo
  }
}

watch(() => [route.params.id, qcTaskState.tasks], loadTask, { immediate: true, deep: true })

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.IN_PROGRESS) return 'processing'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function resultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL) return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function channelLabel(channel) {
  if (channel === 'miniprogram') return '小程序'
  if (channel === 'web') return 'WEB'
  return channel || '—'
}

function openInspect() {
  if (!task.value?.id) return
  const path = `/quality/incoming-qc/${task.value.id}/inspect`
  openTab(path, `质检 ${task.value.qcNo || ''}`.trim())
  router.push({ name: 'quality-incoming-qc-inspect', params: { id: task.value.id } })
}
</script>

<style lang="less" scoped>
.qc-task-detail-page {
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.section-card {
  margin-bottom: 12px;
  padding: 12px 16px 16px;
  background: #fff;
  border-radius: 6px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.expand-form-wrap {
  padding: 8px 12px 4px;
  background: #fafafa;
}

.enter-tip {
  margin-bottom: 10px;
}
</style>
