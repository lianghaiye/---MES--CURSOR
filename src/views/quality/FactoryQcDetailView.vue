<template>
  <div class="qc-task-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="handleBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">{{ record.qcNo || '出厂质检详情' }}</span>
            <a-tag :color="statusColor(record.qcStatus)">{{ record.qcStatus }}</a-tag>
            <a-tag v-if="record.qcResult" :color="resultColor(record.qcResult)">{{
              record.qcResult
            }}</a-tag>
          </div>
          <a-space :size="8">
            <a-button v-if="canInspect(record)" type="primary" size="small" @click="openInspect">
              质检
            </a-button>
            <a-button size="small" @click="openPrint">打印</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <DetailSectionCard title="基本信息">
          <div class="basic-info-panel">
            <div class="meta-bar">
              <a-space :size="32" wrap>
                <span class="meta-item">
                  <span class="meta-label">创建人</span>
                  {{ displayText(record.creator) }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">创建时间</span>
                  {{ formatDateTimeMinute(record.createdAt) || '—' }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">质检人</span>
                  {{ displayText(record.inspector) }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">质检时间</span>
                  {{ formatDateTimeMinute(record.inspectedAt) || '—' }}
                </span>
                <span class="meta-item">
                  <span class="meta-label">录入端</span>
                  {{ channelLabel(record.entryChannel) }}
                </span>
              </a-space>
            </div>

            <a-form layout="inline" class="horizontal-form">
              <a-row :gutter="[8, 4]" style="width: 100%">
                <a-col v-for="field in basicFields" :key="field.key" :span="field.span || 6">
                  <a-form-item :label="field.label" :class="{ 'multiline-item': field.multiline }">
                    <span
                      class="field-text"
                      :class="{ 'field-text-multiline': field.multiline }"
                      :title="fieldText(field)"
                    >
                      <template v-if="field.key === 'qcStatus'">
                        <a-tag :color="statusColor(record.qcStatus)">{{
                          record.qcStatus || '—'
                        }}</a-tag>
                      </template>
                      <template v-else-if="field.key === 'qcResult'">
                        <a-tag v-if="record.qcResult" :color="resultColor(record.qcResult)">{{
                          record.qcResult
                        }}</a-tag>
                        <template v-else>—</template>
                      </template>
                      <template v-else>{{ fieldText(field) }}</template>
                    </span>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>
        </DetailSectionCard>

        <DetailSectionCard title="质检明细">
          <a-table
            class="detail-lines-table"
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1400 }"
            :sticky="tableSticky"
            v-model:expandedRowKeys="expandedKeys"
          >
            <template #expandIcon="{ expanded, onExpand: onExp, record: line }">
              <button
                type="button"
                class="line-expand-btn"
                :aria-label="expanded ? '收起检验项' : '展开检验项'"
                @click="(e) => onExp(line, e)"
              >
                <DownOutlined v-if="expanded" />
                <RightOutlined v-else />
              </button>
            </template>
            <template #expandedRowRender="{ record: line }">
              <div class="expand-panel">
                <a-alert
                  v-if="canInspect(record) && !hasEnteredValues(line)"
                  type="info"
                  show-icon
                  class="enter-tip"
                  message="尚未录入实测值。点击右上角「质检」进入录入页，可填写普通项 / 复合子项 / 多点测点。"
                />
                <QcLineFieldValuesReadonly
                  :line="line"
                  :task="readonlyTask"
                  empty-text="该行模板暂无自定义检验项"
                />
              </div>
            </template>
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'productInfo'">
                <span :title="formatProductInfo(line)">{{ formatProductInfo(line) }}</span>
              </template>
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(line.shipQty) }}
              </template>
              <template v-else-if="column.key === 'inspectQty'">
                {{ formatQty(line.inspectQty) }}
              </template>
              <template v-else-if="column.key === 'lineQcResult'">
                <a-tag v-if="line.lineQcResult" :color="resultColor(line.lineQcResult)">
                  {{ line.lineQcResult }}
                </a-tag>
                <span v-else>—</span>
              </template>
              <template v-else>
                {{ line[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </DetailSectionCard>
      </template>
      <a-empty v-else-if="!loading" description="未找到该出厂质检单" />
    </a-spin>

    <QcTaskPrintModal v-model:open="printModalOpen" :factory-records="printRecords" />
  </div>
</template>

<script>
export default { name: 'FactoryQcDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined, DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import {
  FACTORY_QC_BIZ_SCOPE,
  canInspect,
  factoryQcState,
  getFactoryQcById,
} from '@/store/factoryQcStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { formatQty } from '@/utils/numberFormat'
import { getQcTaskRouteBundle } from '@/utils/qcTaskRoutes'
import QcLineFieldValuesReadonly from './components/QcLineFieldValuesReadonly.vue'
import QcTaskPrintModal from './components/QcTaskPrintModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const expandedKeys = ref([])
const printModalOpen = ref(false)

const routeBundle = computed(() => getQcTaskRouteBundle(FACTORY_QC_BIZ_SCOPE))
const printRecords = computed(() => (record.value ? [record.value] : []))
const readonlyTask = computed(() =>
  record.value ? { ...record.value, bizScope: FACTORY_QC_BIZ_SCOPE } : null,
)

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center' },
  { title: '产品信息', key: 'productInfo', width: 260, ellipsis: true },
  { title: '质检模板', dataIndex: 'templateName', width: 140, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', width: 80 },
  { title: '发货数量', key: 'shipQty', width: 90, align: 'right' },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '发货仓库', dataIndex: 'shipWarehouse', width: 100 },
  { title: '质检结果', key: 'lineQcResult', width: 100 },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 110, ellipsis: true },
]

const basicFields = computed(() => {
  const t = record.value || {}
  return [
    { key: 'qcNo', label: '质检单号', value: t.qcNo },
    { key: 'bizScope', label: '质检类型', value: FACTORY_QC_BIZ_SCOPE },
    { key: 'qcStatus', label: '质检状态' },
    { key: 'qcResult', label: '质检结果' },
    { key: 'salesOrderNo', label: '销售单号', value: t.salesOrderNo },
    { key: 'outboundDocNo', label: '出库单号', value: t.outboundDocNo },
    { key: 'customerName', label: '客户名称', value: t.customerName },
    { key: 'inspectMethod', label: '质检方式', value: t.inspectMethod },
    { key: 'templateName', label: '质检模板', value: t.templateName || t.templateCode },
    { key: 'inspectDate', label: '质检日期', value: t.inspectDate },
    { key: 'remark', label: '备注', value: t.remark, span: 24, multiline: true },
  ]
})

function getPageScrollContainer() {
  return document.querySelector('.page-content') || window
}

const tableSticky = {
  offsetHeader: 56,
  getContainer: getPageScrollContainer,
}

function displayText(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function fieldText(field) {
  return displayText(field.value)
}

function formatProductInfo(line = {}) {
  const parts = [line.itemCode, line.itemName, line.specModel]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join('/') : '—'
}

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

function loadRecord() {
  loading.value = true
  void factoryQcState.records
  record.value = getFactoryQcById(route.params.id)
  loading.value = false
  if (record.value?.qcNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.qcNo
  }
}

watch(() => [route.params.id, factoryQcState.records], loadRecord, { immediate: true, deep: true })

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已终止') return 'default'
  return 'warning'
}

function resultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格' || result === '质检通过') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分通过') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格' || result === '质检不通过')
    return 'error'
  return 'default'
}

function channelLabel(channel) {
  if (channel === 'miniprogram') return '小程序'
  if (channel === 'web') return 'WEB'
  return channel || '—'
}

function handleBack() {
  router.push({ name: routeBundle.value.listName })
}

function openInspect() {
  if (!record.value || !canInspect(record.value)) return
  const path = `${routeBundle.value.listPath}/${record.value.id}/inspect`
  openTab(path, `质检 ${record.value.qcNo || ''}`.trim())
  router.push({ name: routeBundle.value.inspectName, params: { id: record.value.id } })
}

function openPrint() {
  if (!record.value) return
  printModalOpen.value = true
}
</script>

<style lang="less" scoped>
.qc-task-detail-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.back-btn {
  color: #4e5969;
  padding-inline: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: #1f2329;
}

.section-card {
  margin-bottom: 8px;
  padding: 12px 16px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.basic-info-panel {
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.meta-bar {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e8e8e8;

  .meta-item {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .meta-label {
    color: rgba(0, 0, 0, 0.45);
    margin-right: 8px;
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 72px;
    padding-bottom: 0;

    > label {
      height: 24px;
      color: rgba(0, 0, 0, 0.65);
      font-size: 13px;
    }
  }

  :deep(.ant-form-item-control) {
    min-width: 0;
  }

  .multiline-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }
  }

  .field-text {
    display: inline-block;
    max-width: 100%;
    font-size: 13px;
    line-height: 24px;
    color: rgba(0, 0, 0, 0.88);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-text-multiline {
    white-space: pre-wrap;
    word-break: break-word;
    overflow: visible;
    text-overflow: unset;
    line-height: 22px;
  }
}

.detail-lines-table {
  :deep(.ant-table-sticky-holder) {
    z-index: 20;
  }

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
  }
}

.expand-panel {
  padding: 10px 12px;
  background: #f7f8fa;
}

.enter-tip {
  margin-bottom: 10px;
}

.line-expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #86909c;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.line-expand-btn:hover {
  color: #1677ff;
  background: #e6f4ff;
}
</style>
