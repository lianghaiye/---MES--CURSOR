<template>
  <div class="report-work-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.workOrderNo }}</span>
            <a-tag color="success">{{ record.displayStatus }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工单号">{{ record.workOrderNo }}</a-descriptions-item>
            <a-descriptions-item label="产品名称">{{ record.productName }}</a-descriptions-item>
            <a-descriptions-item label="产品编号">{{
              record.productCode || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="报工日期">{{ record.reportDate }}</a-descriptions-item>
            <a-descriptions-item label="完工数量">{{ record.finishedQty }} 件</a-descriptions-item>
            <a-descriptions-item label="工艺路线">{{
              record.routeName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="操作人员">
              {{ record.operators?.join('、') || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="报工人">{{ record.reporter || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">工序明细</div>
          <a-table
            :columns="processColumns"
            :data-source="activeProcesses"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该报工记录" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'ReportWorkDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getQuickReportById } from '@/store/quickReportStore'
import { tabStore, useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)

const processColumns = [
  { title: '#', key: 'index', width: 56, align: 'center' },
  { title: '工序名称', dataIndex: 'name', width: 160 },
  { title: '数量', dataIndex: 'qty', width: 100 },
]

const activeProcesses = computed(() => (record.value?.processes || []).filter((p) => !p.deleted))

function loadDetail() {
  loading.value = true
  const row = getQuickReportById(route.params.id)
  record.value = row
  if (row) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = row.workOrderNo || '报工详情'
  }
  loading.value = false
}

watch(() => route.params.id, loadDetail, { immediate: true })

function handleBack() {
  const detailPath = route.path
  const listPath = '/production/report-work'
  const closingActive = tabStore.activePath === detailPath
  closeTab(detailPath)
  router.push(closingActive ? tabStore.activePath || listPath : listPath)
}
</script>

<style lang="less" scoped>
.report-work-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
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
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
}
</style>
