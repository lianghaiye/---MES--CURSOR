<template>
  <div class="report-work-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.workOrderNo }}</span>
            <a-tag color="success">{{ record.displayStatus }}</a-tag>
            <a-tag>{{ record.registerMode }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div v-if="isWorkOrderRegistration" class="section-card">
          <div class="section-title">工单信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工单编号">{{ record.workOrderNo }}</a-descriptions-item>
            <a-descriptions-item label="产品">{{ record.productName }}</a-descriptions-item>
            <a-descriptions-item label="登记类型">{{
              record.registrationType
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">
            {{ isWorkOrderRegistration ? '登记数量' : '产品信息' }}
          </div>
          <a-alert
            v-if="!isPerProcessRegister"
            type="warning"
            show-icon
            message="整体登记不支持工时工资的核算"
            class="overall-alert"
          />
          <a-descriptions bordered size="small" :column="3" class="info-desc">
            <a-descriptions-item v-if="!isWorkOrderRegistration" label="产品名称">
              {{ record.productName }}
            </a-descriptions-item>
            <a-descriptions-item label="产品编码">{{
              record.productCode || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="生产日期">
              {{ record.productionDate || record.reportDate || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="登记类型">{{
              record.registrationType
            }}</a-descriptions-item>
            <a-descriptions-item label="登记方式">{{ record.registerMode }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.displayStatus }}</a-descriptions-item>
            <a-descriptions-item label="良品数">
              {{ record.goodQty ?? record.finishedQty }} 件
            </a-descriptions-item>
            <a-descriptions-item label="不良品数"
              >{{ record.defectQty || 0 }} 件</a-descriptions-item
            >
            <a-descriptions-item label="合计完工">{{ record.finishedQty }} 件</a-descriptions-item>
            <a-descriptions-item label="登记人">{{ record.reporter || '—' }}</a-descriptions-item>
            <a-descriptions-item label="登记日期">{{
              record.registeredDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="登记时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item v-if="!isPerProcessRegister" label="操作人员" :span="3">
              {{ record.operators?.length ? record.operators.join('、') : '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="isPerProcessRegister" class="section-card">
          <div class="section-title">生产详情</div>
          <a-descriptions
            v-if="record.routeName"
            bordered
            size="small"
            :column="1"
            class="route-desc"
          >
            <a-descriptions-item label="工艺路线">{{ record.routeName }}</a-descriptions-item>
          </a-descriptions>

          <div class="sub-title">当前工序</div>
          <a-table
            v-if="activeProcesses.length"
            :columns="processColumns"
            :data-source="enrichedProcesses"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record: proc, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'reportType'">
                {{ proc.reportType || '—' }}
              </template>
              <template v-else-if="column.key === 'defectReasons'">
                {{ proc.defectReasonLabel }}
              </template>
              <template v-else-if="column.key === 'operators'">
                {{ proc.operators?.length ? proc.operators.join('、') : '—' }}
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无工序明细" />
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该登记记录" />
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
import { enrichQuickReportProcessForDetail } from '@/utils/quickReportEnrich'
import { tabStore, useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)

const isPerProcessRegister = computed(() => record.value?.perProcessRegister !== false)

const isWorkOrderRegistration = computed(() => record.value?.registrationType === '工单登记')

const activeProcesses = computed(() => (record.value?.processes || []).filter((p) => !p.deleted))

const enrichedProcesses = computed(() =>
  activeProcesses.value.map((proc) => enrichQuickReportProcessForDetail(proc)),
)

const processColumns = [
  { title: '#', key: 'index', width: 56, align: 'center' },
  { title: '工序名称', dataIndex: 'name', width: 120 },
  { title: '报工类型', key: 'reportType', width: 100 },
  { title: '良品数', dataIndex: 'goodQty', width: 88, align: 'right' },
  { title: '不良品数', dataIndex: 'defectQty', width: 88, align: 'right' },
  { title: '合计', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '不良原因', key: 'defectReasons', width: 160, ellipsis: true },
  { title: '操作人员', key: 'operators', width: 140, ellipsis: true },
]

function loadDetail() {
  loading.value = true
  const row = getQuickReportById(route.params.id)
  record.value = row
  if (row) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = row.workOrderNo || '登记详情'
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
    flex-wrap: wrap;
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

  .sub-title {
    font-weight: 500;
    margin: 12px 0 8px;
    color: rgba(0, 0, 0, 0.65);
  }

  .overall-alert {
    margin-bottom: 12px;
  }

  .route-desc {
    margin-bottom: 8px;
  }
}
</style>
