<template>
  <div class="ecn-detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ getDocNo(record, moduleConfig) }}</span>
            <a-tag :color="ecnStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="page-sub">{{ record.type }} · {{ record.productName }}</span>
          </div>
          <a-space>
            <a-button size="small" @click="printModalOpen = true">
              <PrinterOutlined />
              打印
            </a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item :label="moduleConfig.docNoLabel">
              {{ getDocNo(record, moduleConfig) }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="变更类型">{{ record.type || '—' }}</a-descriptions-item>
            <a-descriptions-item label="产品名称">{{ record.productName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="客户名称">{{ record.customerName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="销售单号">{{ record.salesOrderNo || '—' }}</a-descriptions-item>
            <a-descriptions-item label="工单编号">{{ record.workOrderNo || '—' }}</a-descriptions-item>
            <a-descriptions-item label="申请人">{{ record.applicant || '—' }}</a-descriptions-item>
            <a-descriptions-item label="紧急度">{{ record.urgency || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ record.createdAt || '—' }}</a-descriptions-item>
            <a-descriptions-item label="审核人">{{ record.reviewer || '—' }}</a-descriptions-item>
            <a-descriptions-item label="审核时间">{{ record.reviewTime || '—' }}</a-descriptions-item>
            <a-descriptions-item label="变更原因" :span="3">{{ changeReasonText }}</a-descriptions-item>
            <a-descriptions-item label="执行配置" :span="3">
              {{ resolveExecConfigLabel(record.wipHandling) }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">变更技术内容</div>
          <EcnChangeItemsReadonlyTable :items="changeItems" />
        </div>

        <template v-if="showPostApprovalSections">
          <div class="section-card">
            <div class="section-title">BOM版本变更信息</div>
            <EcnBomVersionTimeline
              :items="bomVersionHistory"
              @view-bom="handleViewBom"
              @compare="handleCompare"
            />
          </div>

          <div class="section-card">
            <div class="section-title">审批记录</div>
            <a-divider style="margin: 12px 0" />
            <div v-if="historyRecords.length" class="history-list">
              <div v-for="(item, idx) in historyRecords" :key="idx" class="history-item">
                <div class="history-head">
                  <span class="history-user">{{ item.name }}</span>
                  <span class="history-role">（{{ item.role }}）</span>
                  <a-tag :color="approvalResultColor(item.result)" size="small">
                    {{ item.result }}
                  </a-tag>
                  <span class="history-time">{{ item.time }}</span>
                </div>
                <div v-if="item.opinion" class="history-opinion">{{ item.opinion }}</div>
              </div>
            </div>
            <a-empty v-else description="暂无审批记录" />
          </div>
        </template>
      </template>
    </a-spin>

    <EcnPrintModal v-model:open="printModalOpen" :record="record" :module-config="moduleConfig" />
  </div>
</template>

<script>
export default { name: 'EcnDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import {
  ECN_STATUS,
  ecnStatusColor,
  resolveEcnChangeReason,
  resolveExecConfigLabel,
} from '@/constants/ecn'
import { resolveChangeRequestModule, getDocNo } from '@/constants/changeRequestModule'
import { tabStore, useTabs } from '@/composables/useTabs'
import { buildBomVersionHistory } from '@/utils/ecnBomVersionHistory'
import EcnChangeItemsReadonlyTable from './components/EcnChangeItemsReadonlyTable.vue'
import EcnBomVersionTimeline from './components/EcnBomVersionTimeline.vue'
import EcnPrintModal from './components/EcnPrintModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const moduleConfig = resolveChangeRequestModule(route)
const printModalOpen = ref(false)

const record = computed(() => moduleConfig.store.findById(route.params.id))
const changeItems = computed(() => record.value?.changeItems || [])
const historyRecords = computed(() => record.value?.approvalRecords || [])
const bomVersionHistory = computed(() =>
  record.value?.bomVersionHistory?.length
    ? record.value.bomVersionHistory
    : buildBomVersionHistory(record.value || {}),
)

const showPostApprovalSections = computed(() => {
  const status = record.value?.status
  return status && status !== ECN_STATUS.DRAFT && status !== ECN_STATUS.APPROVING
})

const changeReasonText = computed(() => {
  const row = record.value
  if (!row) return '—'
  if (row.description) return row.description
  return resolveEcnChangeReason(row)
})

watch(
  record,
  (row) => {
    if (!row) return
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `${getDocNo(row, moduleConfig)} 详情`
  },
  { immediate: true },
)

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回') return 'error'
  return 'default'
}

function goBack() {
  router.push(moduleConfig.listPath)
}

function handleViewBom(item) {
  const bomId = item.bomId || record.value?.bomId
  if (!bomId) {
    message.info('暂无关联BOM，请从产品BOM列表查看')
    return
  }
  const path = `/product-process/bom/${bomId}`
  openTab(path, 'BOM详情')
  router.push(path)
}

function handleCompare(item) {
  message.info(`对比 ${item.version} 与 ${item.compareVersion}（演示）`)
}
</script>

<style lang="less" scoped>
.ecn-detail-page {
  margin: -12px;
  padding: 0 12px 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  font-size: 13px;
  color: #595959;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.history-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.history-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-user {
  font-weight: 500;
}

.history-role {
  font-size: 12px;
  color: #8c8c8c;
}

.history-time {
  margin-left: auto;
  font-size: 12px;
  color: #8c8c8c;
}

.history-opinion {
  margin-top: 6px;
  font-size: 13px;
  color: #595959;
  line-height: 1.5;
}
</style>
