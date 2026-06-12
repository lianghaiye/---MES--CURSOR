<template>
  <div class="process-report-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button size="small" @click="handleBack">返回</a-button>
            <span class="page-title">{{ record.processName }} · {{ record.productName }}</span>
            <a-badge :status="statusBadge(record.status)" :text="record.status" />
          </div>
          <a-space v-if="record.status === '待审核'">
            <a-button size="small" danger @click="rejectOpen = true">拒绝</a-button>
            <a-button type="primary" size="small" @click="handleApprove">通过</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">报工信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="报工方式">{{ record.reportSourceLabel }}</a-descriptions-item>
            <a-descriptions-item label="报工类型">{{ record.reportType }}</a-descriptions-item>
            <a-descriptions-item label="报工日期">{{ record.reportDate }}</a-descriptions-item>
            <a-descriptions-item label="工单号">{{ record.workOrderNo || '—' }}</a-descriptions-item>
            <a-descriptions-item label="产品名称">{{ record.productName }}</a-descriptions-item>
            <a-descriptions-item label="产品编码">{{ record.productCode || '—' }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ record.specModel }}</a-descriptions-item>
            <a-descriptions-item label="材质">{{ record.material }}</a-descriptions-item>
            <a-descriptions-item label="工序">{{ record.processName }}</a-descriptions-item>
            <a-descriptions-item label="良品数">{{ record.goodQty }} 件</a-descriptions-item>
            <a-descriptions-item label="不良品数">{{ record.defectQty }} 件</a-descriptions-item>
            <a-descriptions-item label="不良项">{{ record.defectItems }}</a-descriptions-item>
            <a-descriptions-item v-if="record.workHours" label="工作时长">
              {{ record.workHours }} 小时
            </a-descriptions-item>
            <a-descriptions-item v-if="record.startTime" label="起止时间">
              {{ record.startTime }} - {{ record.endTime }}
            </a-descriptions-item>
            <a-descriptions-item label="执行人">{{ record.reporter }}</a-descriptions-item>
            <a-descriptions-item label="工作中心">{{ record.workCenter }}</a-descriptions-item>
            <a-descriptions-item label="提交时间">{{ record.createdAt }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{ record.remark || '—' }}</a-descriptions-item>
            <a-descriptions-item v-if="record.status === '已拒绝'" label="拒绝原因" :span="3">
              {{ record.rejectReason }}
            </a-descriptions-item>
            <a-descriptions-item v-if="record.auditor" label="审核人">{{ record.auditor }}</a-descriptions-item>
            <a-descriptions-item v-if="record.auditedAt" label="审核时间">{{ record.auditedAt }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到工序报工记录" />
    </a-spin>

    <ProcessReportRejectModal v-model:open="rejectOpen" @confirm="handleReject" />
  </div>
</template>

<script>
export default { name: 'ProcessReportDetailView' }
</script>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  approveProcessReport,
  getProcessReportById,
  rejectProcessReport,
} from '@/store/processReportStore'
import { useTabs } from '@/composables/useTabs'
import ProcessReportRejectModal from './components/ProcessReportRejectModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const rejectOpen = ref(false)

function statusBadge(status) {
  if (status === '已审核') return 'success'
  if (status === '已拒绝') return 'error'
  return 'processing'
}

function reload() {
  loading.value = true
  record.value = getProcessReportById(route.params.id)
  loading.value = false
}

watch(() => route.params.id, reload, { immediate: true })

function handleBack() {
  closeTab(route.path)
  router.push('/production/process-report')
}

function handleApprove() {
  Modal.confirm({
    title: '审核通过',
    content: '确认通过该工序报工？',
    onOk: () => {
      const res = approveProcessReport(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已通过')
      reload()
    },
  })
}

function handleReject(reason) {
  const res = rejectProcessReport(record.value.id, reason)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已拒绝')
  reload()
}
</script>

<style lang="less" scoped>
.process-report-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
  }

  .section-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 16px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
  }
}
</style>
