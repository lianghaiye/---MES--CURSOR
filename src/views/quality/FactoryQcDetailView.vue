<template>
  <div class="factory-qc-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.qcNo || '出厂质检详情' }}</span>
            <a-tag :color="statusColor(record.qcStatus)">{{ record.qcStatus }}</a-tag>
          </div>
          <a-button v-if="canInspect(record)" type="primary" size="small" @click="openInspect">
            执行质检
          </a-button>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions :column="3" size="small" bordered class="basic-desc">
            <a-descriptions-item label="质检单号">
              {{ record.qcNo || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检结果">
              <a-tag v-if="record.qcResult" :color="resultColor(record.qcResult)">
                {{ record.qcResult }}
              </a-tag>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="销售单号">
              {{ record.salesOrderNo || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="出库单号">
              {{ record.outboundDocNo || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="客户名称">
              {{ record.customerName || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检方式">
              {{ record.inspectMethod || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检日期">
              {{ record.inspectDate || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检人">
              {{ record.inspector || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="质检时间">
              {{ record.inspectedAt || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">
              {{ record.remark || '—' }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">质检明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(line.shipQty) }}
              </template>
              <template v-else-if="column.key === 'inspectQty'">
                {{
                  line.inspectQty != null && line.inspectQty !== ''
                    ? formatQty(line.inspectQty)
                    : '—'
                }}
              </template>
              <template v-else-if="column.key === 'lineQcResult'">
                <a-tag v-if="line.lineQcResult" :color="lineResultColor(line.lineQcResult)">
                  {{ line.lineQcResult }}
                </a-tag>
                <span v-else>—</span>
              </template>
              <template v-else>
                {{ line[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>

          <div class="summary-row">
            <span class="summary-label">合计</span>
            <span class="summary-item">发货数量：{{ summary.shipQty }}</span>
            <span class="summary-item">检验数量：{{ summary.inspectQty }}</span>
            <span class="summary-item">明细行数：{{ (record.lineItems || []).length }}</span>
          </div>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该出厂质检单" />
    </a-spin>

    <FactoryQcInspectModal
      v-model:open="inspectModalOpen"
      :record="inspectRecord"
      @saved="onInspectSaved"
    />
  </div>
</template>

<script>
export default { name: 'FactoryQcDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getFactoryQcById, canInspect } from '@/store/factoryQcStore'
import { tabStore } from '@/composables/useTabs'
import FactoryQcInspectModal from './components/FactoryQcInspectModal.vue'

const route = useRoute()
const loading = ref(false)
const record = ref(null)
const inspectModalOpen = ref(false)
const inspectRecord = ref(null)

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '物品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '物品编号', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '发货数量', key: 'shipQty', width: 96, align: 'right' },
  { title: '发货仓库', dataIndex: 'shipWarehouse', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 72 },
  { title: '检验数量', key: 'inspectQty', width: 96, align: 'right' },
  { title: '质检结果', key: 'lineQcResult', width: 96 },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 110, ellipsis: true },
]

function loadRecord() {
  const id = route.params.id
  loading.value = true
  record.value = getFactoryQcById(id)
  loading.value = false

  if (record.value?.qcNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.qcNo
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

const summary = computed(() => {
  const lines = record.value?.lineItems || []
  const shipQty = lines.reduce((s, l) => s + Number(l.shipQty || 0), 0)
  const inspectQty = lines.reduce((s, l) => s + Number(l.inspectQty || 0), 0)
  return {
    shipQty: shipQty.toFixed(2),
    inspectQty: inspectQty.toFixed(2),
  }
})

function formatQty(val) {
  return Number(val || 0).toFixed(2)
}

function statusColor(status) {
  const map = { 待质检: 'processing', 已完成: 'success', 已终止: 'default' }
  return map[status] || 'default'
}

function resultColor(result) {
  const map = { 质检通过: 'success', 质检不通过: 'error', 部分通过: 'warning' }
  return map[result] || 'default'
}

function lineResultColor(result) {
  const map = { 合格: 'success', 不合格: 'error' }
  return map[result] || 'default'
}

function openInspect() {
  if (!record.value) return
  inspectRecord.value = record.value
  inspectModalOpen.value = true
}

function onInspectSaved() {
  loadRecord()
}
</script>

<style lang="less" scoped>
.factory-qc-detail-page {
  margin: -12px;
  padding: 12px 16px 24px;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }
}

.section-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 12px 16px 16px;
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.88);
  }
}

.basic-desc {
  :deep(.ant-descriptions-item-label) {
    color: rgba(0, 0, 0, 0.45);
    width: 100px;
  }
}

.summary-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 24px;
  margin-top: 12px;
  padding-top: 8px;
  font-size: 13px;

  .summary-label {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .summary-item {
    color: rgba(0, 0, 0, 0.65);
  }
}
</style>
