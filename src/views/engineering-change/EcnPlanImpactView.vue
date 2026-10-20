<template>
  <div class="ecn-impact-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">计划影响与重排</span>
            <a-tag :color="ecnStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="page-sub"
              >{{ getDocNo(record, moduleConfig) }} · {{ record.productName }}</span
            >
          </div>
          <a-space>
            <a-button size="small" @click="goDetail">变更详情</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <p class="scope-line">
          范围仅限本单：销售订单 {{ record.salesOrderNo || '—' }} · 产品
          {{ record.productName || record.productCode || '—' }}
        </p>

        <div class="summary-row">
          <div class="summary-card">
            <div class="n">{{ impact.summary.planCount }}</div>
            <div class="l">关联计划</div>
          </div>
          <div class="summary-card ok">
            <div class="n">{{ impact.summary.workItemCanReschedule }}</div>
            <div class="l">可自动重排工作项</div>
          </div>
          <div class="summary-card warn">
            <div class="n">{{ impact.summary.workItemStarted }}</div>
            <div class="l">已开工需人工</div>
          </div>
          <div class="summary-card">
            <div class="n">{{ impact.summary.workOrderPending }}</div>
            <div class="l">待下发工单可作废</div>
          </div>
          <div class="summary-card warn">
            <div class="n">{{ impact.summary.pendingSpecCount }}</div>
            <div class="l">待定物料</div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-head">
            <div class="section-title">一期：未开工按新 BOM 重排</div>
            <a-space>
              <a-button size="small" @click="selectAllReschedulable">全选可重排</a-button>
              <a-button
                type="primary"
                size="small"
                :loading="rescheduling"
                :disabled="!selectedWiKeys.length"
                @click="handleReschedule"
              >
                按新 BOM 重排选中项
              </a-button>
            </a-space>
          </div>
          <p class="hint">
            仅「待下达 / 设计中 / 待 BOM」工作项可自动刷新为新生效
            BOM；已开工项请人工评估后处理。待下发工单可一并作废。
          </p>
          <a-table
            :columns="wiColumns"
            :data-source="impact.workItemRows"
            :pagination="false"
            row-key="key"
            size="small"
            bordered
            :row-selection="wiRowSelection"
            :scroll="{ x: 1100 }"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'action'">
                <a-tag v-if="row.canReschedule" color="processing">可重排</a-tag>
                <a-tag v-else-if="row.action === 'started'" color="warning">已开工</a-tag>
                <a-tag v-else-if="row.action === 'completed'" color="default">已完成</a-tag>
                <a-tag v-else>其他</a-tag>
              </template>
              <template v-else-if="column.key === 'bomVersion'">
                {{ row.bomVersion || '—' }}
                <span v-if="row.lastRescheduleEcnNo" class="muted">
                  （已重排 {{ row.lastRescheduleEcnNo }}）
                </span>
              </template>
              <template v-else-if="column.key === 'planBatch'">
                <a-tag v-if="row.planBatch === 2" color="purple">二期</a-tag>
                <span v-else>一期</span>
              </template>
            </template>
          </a-table>
        </div>

        <div class="section-card">
          <div class="section-head">
            <div class="section-title">关联工单</div>
            <a-button size="small" @click="selectAllCancellableWo">全选待下发作废</a-button>
          </div>
          <a-table
            :columns="woColumns"
            :data-source="impact.workOrderRows"
            :pagination="false"
            row-key="key"
            size="small"
            bordered
            :row-selection="woRowSelection"
            :locale="{ emptyText: '无关联工单' }"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'action'">
                <a-tag v-if="row.canCancel" color="orange">可作废</a-tag>
                <a-tag v-else-if="row.action === 'started'" color="warning">执行中·人工</a-tag>
                <a-tag v-else color="default">已关闭</a-tag>
              </template>
            </template>
          </a-table>
        </div>

        <div class="section-card">
          <div class="section-head">
            <div class="section-title">二期：规格待定物料 · 分批计划</div>
            <a-button
              type="primary"
              size="small"
              ghost
              :disabled="!impact.pendingSpecRows.length"
              @click="handleCreatePhase2"
            >
              将待定物料生成二期计划
            </a-button>
          </div>
          <p class="hint">
            在 BOM /
            生产计划物料清单将行标为「待定」后，一期下达会跳过这些料；确认规格后可从此处或生产计划页拆出二期计划单独投产。
          </p>
          <a-table
            :columns="pendingColumns"
            :data-source="impact.pendingSpecRows"
            :pagination="false"
            row-key="key"
            size="small"
            bordered
            :locale="{ emptyText: '暂无待定物料，可在生产计划物料清单设置「投产状态」' }"
          />
          <div v-if="phase2Result" class="phase2-result">
            已生成二期计划
            <a @click="goPlan(phase2Result.planId)">{{ phase2Result.orderNo }}</a>
            ，共 {{ phase2Result.materialCount }} 项物料
          </div>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script>
export default { name: 'EcnPlanImpactView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { ecnStatusColor } from '@/constants/ecn'
import { resolveChangeRequestModule, getDocNo } from '@/constants/changeRequestModule'
import {
  analyzeEcnPlanImpact,
  rescheduleEcnImpact,
  createPhase2PlanFromPending,
} from '@/utils/ecnPlanImpact'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const moduleConfig = resolveChangeRequestModule(route)

const record = computed(() => moduleConfig.store.findById(route.params.id))
const impactTick = ref(0)
const impact = computed(() => {
  void impactTick.value
  return analyzeEcnPlanImpact(record.value)
})

const selectedWiKeys = ref([])
const selectedWoKeys = ref([])
const rescheduling = ref(false)
const phase2Result = ref(null)

watch(
  () => record.value?.id,
  () => {
    selectedWiKeys.value = impact.value.workItemRows
      .filter((r) => r.canReschedule)
      .map((r) => r.key)
    selectedWoKeys.value = impact.value.workOrderRows.filter((r) => r.canCancel).map((r) => r.key)
    phase2Result.value = null
  },
  { immediate: true },
)

const wiRowSelection = computed(() => ({
  selectedRowKeys: selectedWiKeys.value,
  onChange: (keys) => {
    selectedWiKeys.value = keys
  },
  getCheckboxProps: (row) => ({ disabled: !row.canReschedule }),
}))

const woRowSelection = computed(() => ({
  selectedRowKeys: selectedWoKeys.value,
  onChange: (keys) => {
    selectedWoKeys.value = keys
  },
  getCheckboxProps: (row) => ({ disabled: !row.canCancel }),
}))

const wiColumns = [
  { title: '销售/计划单号', dataIndex: 'planOrderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 100, ellipsis: true },
  { title: '产品', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '工作项状态', dataIndex: 'wiStatus', width: 90 },
  { title: '计划状态', dataIndex: 'planStatus', width: 90 },
  { title: '批次', key: 'planBatch', width: 72 },
  { title: '当前BOM版本', key: 'bomVersion', width: 160 },
  { title: '待定料', dataIndex: 'pendingSpecCount', width: 72 },
  { title: '处置', key: 'action', width: 90 },
]

const woColumns = [
  { title: '工单编号', dataIndex: 'code', width: 140 },
  { title: '产品', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '来源订单', dataIndex: 'sourceOrderNo', width: 140 },
  { title: '处置', key: 'action', width: 110 },
]

const pendingColumns = [
  { title: '计划单号', dataIndex: 'planOrderNo', width: 140 },
  { title: '产品', dataIndex: 'productName', width: 140 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', width: 140 },
  { title: '供应型态', dataIndex: 'supplyType', width: 90 },
  { title: '计划数', dataIndex: 'planQty', width: 80 },
]

function refreshImpact() {
  impactTick.value += 1
}

function selectAllReschedulable() {
  selectedWiKeys.value = impact.value.workItemRows.filter((r) => r.canReschedule).map((r) => r.key)
}

function selectAllCancellableWo() {
  selectedWoKeys.value = impact.value.workOrderRows.filter((r) => r.canCancel).map((r) => r.key)
}

function handleReschedule() {
  if (!record.value) return
  rescheduling.value = true
  const res = rescheduleEcnImpact(record.value, {
    workItemKeys: selectedWiKeys.value,
    cancelWorkOrderIds: selectedWoKeys.value,
  })
  rescheduling.value = false
  refreshImpact()
  if (res.refreshed || res.cancelledWo) {
    message.success(
      `已重排 ${res.refreshed} 个工作项` +
        (res.cancelledWo ? `，作废 ${res.cancelledWo} 张待下发工单` : ''),
    )
  } else if (res.errors?.length) {
    message.warning(res.errors[0])
  } else {
    message.info('未变更任何项')
  }
}

function handleCreatePhase2() {
  const rows = impact.value.pendingSpecRows
  if (!rows.length) {
    message.info('没有待定物料')
    return
  }
  const first = rows[0]
  const res = createPhase2PlanFromPending(first.planId, first.workItemId)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  phase2Result.value = {
    planId: res.plan.id,
    orderNo: res.plan.orderNo,
    materialCount: res.materialCount,
  }
  refreshImpact()
  message.success(`已生成二期计划 ${res.plan.orderNo}`)
}

function goBack() {
  router.push(moduleConfig.listPath)
}

function goDetail() {
  router.push(moduleConfig.detailPath(route.params.id))
}

function goPlan(planId) {
  const path = `/planning/production-plan?planId=${planId}`
  openTab(path, '生产计划')
  router.push(path)
}
</script>

<style lang="less" scoped>
.ecn-impact-page {
  margin: -12px;
  padding: 12px 12px 48px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 4px 16px;
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
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.scope-line {
  margin: 0 0 12px;
  font-size: 13px;
}

.back-btn {
  padding: 0 4px;
}

.summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 18px;
  min-width: 120px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  .n {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
  }

  .l {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  &.ok .n {
    color: #1677ff;
  }

  &.warn .n {
    color: #fa8c16;
  }
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
}

.hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.phase2-result {
  margin-top: 12px;
  font-size: 13px;
}
</style>
