<template>
  <div class="ecn-approve-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">审批工程变更</span>
            <a-tag :color="ecnStatusColor(record.status)">{{ record.status }}</a-tag>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-top">
            <span class="ecn-no">{{ getDocNo(record, moduleConfig) }}</span>
            <span class="ecn-meta">{{ record.type }} · {{ record.productName }}</span>
          </div>
          <div class="summary-reason">变更原因：{{ changeReasonText }}</div>
          <div class="summary-applicant">
            申请人：{{ record.applicant }} · {{ formatCreatedAt(record.createdAt) }}
          </div>
        </div>

        <div class="section-card content-section">
          <div class="subsection">
            <div class="section-title">变更技术内容</div>
            <EcnChangeItemsReadonlyTable :items="changeItems" />
          </div>

          <a-divider />

          <div v-if="selectedExecConfig" class="subsection exec-config">
            <div class="section-title-row">
              <span class="section-title">执行配置</span>
              <span class="section-sub">审批通过后生效</span>
            </div>
            <div class="exec-label">BOM 执行方式：</div>
            <div class="exec-scope-item">
              <div class="radio-main">{{ selectedExecConfig.label }}</div>
              <div class="radio-sub">{{ selectedExecConfig.sub }}</div>
            </div>
          </div>
        </div>

        <div v-if="canApprove" class="section-card">
          <div class="section-title">您的审批意见</div>
          <a-textarea
            v-model:value="opinion"
            :rows="4"
            placeholder="填写审批意见（可选） 如：同意变更，请注意通知采购部门更新供应商物料"
          />
          <div class="action-row">
            <a-button danger @click="handleReject">驳回</a-button>
            <a-button type="primary" @click="handleApprove">通过</a-button>
          </div>
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
    </a-spin>
  </div>
</template>

<script>
export default { name: 'EcnApproveView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { ECN_STATUS, findExecConfigOption, ecnStatusColor, resolveEcnChangeReason } from '@/constants/ecn'
import { resolveChangeRequestModule, getDocNo } from '@/constants/changeRequestModule'
import EcnChangeItemsReadonlyTable from './components/EcnChangeItemsReadonlyTable.vue'

const route = useRoute()
const router = useRouter()
const moduleConfig = resolveChangeRequestModule(route)
const opinion = ref('')

const record = computed(() => moduleConfig.store.findById(route.params.id))

const changeItems = computed(() => record.value?.changeItems || [])

const selectedExecConfig = computed(() => findExecConfigOption(record.value?.wipHandling))

const changeReasonText = computed(() => {
  const row = record.value
  if (!row) return '—'
  if (row.description) return row.description
  if (row.reason && row.reason !== row.changeReason) return row.reason
  return resolveEcnChangeReason(row)
})

const canApprove = computed(() => record.value?.status === ECN_STATUS.APPROVING)

const historyRecords = computed(() => record.value?.approvalRecords || [])

function formatCreatedAt(value) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('MM-DD HH:mm') : value
}

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回') return 'error'
  return 'default'
}

function goBack() {
  router.push(moduleConfig.listPath)
}

function handleApprove() {
  const res = moduleConfig.store.approve(record.value.id, opinion.value, true)
  if (res.ok) {
    message.success('审批已通过')
    opinion.value = ''
    if (record.value.status === ECN_STATUS.APPROVED) {
      router.push(moduleConfig.listPath)
    }
  } else {
    message.warning(res.message)
  }
}

function handleReject() {
  if (!opinion.value.trim()) {
    message.warning('驳回时请填写审批意见')
    return
  }
  const res = moduleConfig.store.approve(record.value.id, opinion.value, false)
  if (res.ok) {
    message.success('已驳回')
    router.push(moduleConfig.listPath)
  }
}
</script>

<style lang="less" scoped>
.ecn-approve-page {
  margin: -12px;
  padding: 0 12px 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  padding: 12px 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  padding: 0 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.summary-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
}

.summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ecn-no {
  font-size: 15px;
  font-weight: 600;
}

.ecn-meta {
  font-size: 13px;
  color: #595959;
}

.summary-reason,
.summary-applicant {
  font-size: 13px;
  color: #595959;
  line-height: 1.6;
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

.section-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;

  .section-title {
    margin-bottom: 0;
  }
}

.section-sub {
  font-size: 12px;
  color: #8c8c8c;
}

.exec-label {
  font-size: 13px;
  color: #595959;
  margin-bottom: 10px;
}

.exec-scope-item {
  padding: 10px 12px;
  border: 1px solid #91caff;
  border-radius: 6px;
  background: #e6f4ff;
}

.radio-main {
  font-size: 13px;
  color: #262626;
  line-height: 1.5;
}

.radio-sub {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
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
  padding-left: 2px;
}
</style>
