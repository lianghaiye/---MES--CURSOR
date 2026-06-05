<template>
  <div class="disassembly-detail-page">
    <a-spin :spinning="loading">
      <template v-if="order">
        <div class="page-header">
          <div class="header-left">
            <a-button size="small" @click="handleBack">
              <ArrowLeftOutlined />
              返回列表
            </a-button>
            <span class="order-name">{{ order.name }}</span>
            <a-tag :color="urgencyColor(order.urgency)">{{ order.urgency || '普通' }}</a-tag>
            <a-tag :color="statusColor(order.status)">{{ order.status }}</a-tag>
            <a-tag v-if="overdue" color="error">已逾期</a-tag>
            <a-tag v-else-if="order.status !== '完成'" color="default">正常</a-tag>
          </div>
          <a-space>
            <a-button v-if="canEditDisassemblyOrder(order)" size="small" @click="openEdit">
              <EditOutlined />
              编辑
            </a-button>
            <a-button
              v-if="canDeleteDisassemblyOrder(order)"
              size="small"
              danger
              @click="confirmDelete"
            >
              <DeleteOutlined />
              删除
            </a-button>
            <a-button
              v-if="canDispatchDisassemblyOrder(order)"
              type="primary"
              size="small"
              @click="handleDispatch"
            >
              下发任务
            </a-button>
          </a-space>
        </div>

        <a-steps :current="timelineCurrent" class="wo-timeline" size="small">
          <a-step v-for="step in detail.timeline" :key="step.key" :status="step.status">
            <template #title>{{ step.title }}</template>
            <template #description>
              <div v-if="step.description" class="step-desc">{{ step.description }}</div>
              <div v-if="step.sub" class="step-sub">{{ step.sub }}</div>
            </template>
          </a-step>
        </a-steps>

        <div class="section-card">
          <div class="section-title">订单基础信息</div>
          <a-descriptions :column="4" size="small" bordered>
            <a-descriptions-item label="工单编号">{{ order.code }}</a-descriptions-item>
            <a-descriptions-item label="工单类型">{{ order.orderType }}</a-descriptions-item>
            <a-descriptions-item label="关联单号">
              <a v-if="order.relatedScrapNo" class="link">{{ order.relatedScrapNo }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="工单来源">{{ order.orderSource }}</a-descriptions-item>
            <a-descriptions-item label="工作中心">{{
              order.workCenter || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{
              order.personInCharge || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="完成时间">{{
              order.completedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="预入仓库">{{ order.warehouse || '—' }}</a-descriptions-item>
            <a-descriptions-item label="计划开始日期">{{
              order.planStartDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="计划完成日期">{{
              order.planEndDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="提醒日期">{{
              order.reminderDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ order.createdAt || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ order.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="操作人">{{ order.operator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="最近更新时间">{{
              order.updatedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="4">{{
              order.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="product" tab="产品明细" />
          <a-tab-pane key="process" tab="工序配置" />
          <a-tab-pane key="process-exec" tab="工序执行详情" />
          <a-tab-pane key="task-exec" tab="任务执行详情" />
          <a-tab-pane key="material" tab="拆解物料明细" />
          <a-tab-pane key="inbound" tab="入库明细" />
          <a-tab-pane key="scrap" tab="报废明细" />
        </a-tabs>

        <div class="tab-body">
          <template v-if="activeTab === 'product'">
            <a-table
              :columns="productColumns"
              :data-source="detail.productLines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1200 }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'ebomName'">
                  <a class="link">{{ line.ebomName || '—' }}</a>
                </template>
                <template v-else>
                  {{ line[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
          </template>

          <template v-else-if="activeTab === 'process'">
            <a-table
              :columns="processColumns"
              :data-source="detail.processes"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'hasFeeding'">
                  {{ row.hasFeeding ? '是' : '否' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
          </template>

          <template v-else-if="activeTab === 'process-exec'">
            <a-table
              :columns="processExecColumns"
              :data-source="detail.processExecutions"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无工序执行记录' }"
            />
          </template>

          <template v-else-if="activeTab === 'task-exec'">
            <a-table
              :columns="taskExecColumns"
              :data-source="detail.processTasks"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无任务执行记录' }"
            />
          </template>

          <template v-else-if="activeTab === 'material'">
            <a-table
              :columns="materialColumns"
              :data-source="detail.disassemblyMaterials"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            />
          </template>

          <template v-else-if="activeTab === 'inbound'">
            <a-table
              :columns="inboundColumns"
              :data-source="detail.inboundDetails"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无入库记录' }"
            />
          </template>

          <template v-else-if="activeTab === 'scrap'">
            <a-table
              :columns="scrapColumns"
              :data-source="detail.scrapDetails"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无报废记录' }"
            />
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到拆解工单" />
    </a-spin>

    <CreateDisassemblyWorkOrderModal
      v-model:open="formOpen"
      :edit-record="order"
      @saved="onSaved"
    />
  </div>
</template>

<script>
export default { name: 'DisassemblyWorkOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { tabStore, useTabs } from '@/composables/useTabs'
import {
  getDisassemblyWorkOrderById,
  deleteDisassemblyWorkOrder,
  dispatchDisassemblyWorkOrder,
} from '@/store/disassemblyWorkOrderStore'
import { buildDisassemblyWorkOrderDetail } from '@/utils/disassemblyWorkOrderDetail'
import {
  statusColor,
  urgencyColor,
  isOverdue,
  canEditDisassemblyOrder,
  canDispatchDisassemblyOrder,
  canDeleteDisassemblyOrder,
} from '@/utils/disassemblyWorkOrder'
import CreateDisassemblyWorkOrderModal from './components/CreateDisassemblyWorkOrderModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const order = ref(null)
const activeTab = ref('product')
const formOpen = ref(false)

const detail = computed(() => buildDisassemblyWorkOrderDetail(order.value))
const overdue = computed(() => isOverdue(order.value))

const timelineCurrent = computed(() => {
  const steps = detail.value?.timeline || []
  const idx = steps.findIndex((s) => s.status === 'process')
  if (idx >= 0) return idx
  const lastFinish = [...steps].reverse().findIndex((s) => s.status === 'finish')
  if (lastFinish >= 0) return steps.length - 1 - lastFinish
  return 0
})

const productColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物品名称', dataIndex: 'itemName', width: 120 },
  { title: '编码', dataIndex: 'itemCode', width: 110 },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '型号', dataIndex: 'specModel', width: 130 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '规格属性', dataIndex: 'specAttr', width: 100 },
  { title: '拆解数量', dataIndex: 'disassemblyQty', width: 90, align: 'right' },
  { title: 'EBOM名称', key: 'ebomName', width: 160 },
  { title: '工艺路线', dataIndex: 'processRouteName', width: 120 },
]

const processColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '工序编码', dataIndex: 'processCode', width: 120 },
  { title: '工序名称', dataIndex: 'name', width: 120 },
  { title: '是否投料', key: 'hasFeeding', width: 90 },
]

const processExecColumns = [
  { title: '序号', dataIndex: 'seq', width: 56 },
  { title: '工序名称', dataIndex: 'processName', width: 120 },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '计划数量', dataIndex: 'planQty', width: 90, align: 'right' },
  { title: '完成数量', dataIndex: 'doneQty', width: 90, align: 'right' },
  { title: '报废数量', dataIndex: 'scrapQty', width: 90, align: 'right' },
  { title: '计划完成日期', dataIndex: 'planFinishDate', width: 110 },
  { title: '进度', dataIndex: 'progress', width: 80 },
]

const taskExecColumns = [
  { title: '序号', dataIndex: 'seq', width: 56 },
  { title: '工序名称', dataIndex: 'processName', width: 120 },
  { title: '任务编号', dataIndex: 'taskNo', width: 140 },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '计划数量', dataIndex: 'planQty', width: 90, align: 'right' },
  { title: '正常数量', dataIndex: 'normalQty', width: 90, align: 'right' },
  { title: '报废数量', dataIndex: 'scrapQty', width: 90, align: 'right' },
  { title: '进度状态', dataIndex: 'progressStatus', width: 90 },
  { title: '任务状态', dataIndex: 'taskStatus', width: 90 },
  { title: '开始时间', dataIndex: 'startDate', width: 150 },
  { title: '完成时间', dataIndex: 'finishDate', width: 150 },
]

const materialColumns = [
  { title: '物料名称', dataIndex: 'materialName', width: 140 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 120 },
  { title: '数量', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 72 },
  { title: '目标仓库', dataIndex: 'warehouse', width: 100 },
]

const inboundColumns = [
  { title: '序号', dataIndex: 'seq', width: 56 },
  { title: '物料名称', dataIndex: 'materialName', width: 140 },
  { title: '入库仓库', dataIndex: 'warehouse', width: 100 },
  { title: '入库数量', dataIndex: 'inboundQty', width: 90, align: 'right' },
  { title: '入库时间', dataIndex: 'inboundAt', width: 150 },
]

const scrapColumns = [
  { title: '序号', dataIndex: 'seq', width: 56 },
  { title: '物料名称', dataIndex: 'materialName', width: 140 },
  { title: '报废数量', dataIndex: 'scrapQty', width: 90, align: 'right' },
  { title: '报废原因', dataIndex: 'scrapReason', width: 120 },
  { title: '处理方式', dataIndex: 'processMethod', width: 90 },
]

function loadOrder() {
  loading.value = true
  order.value = getDisassemblyWorkOrderById(route.params.id)
  loading.value = false

  if (order.value?.name) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = order.value.name
  }
}

watch(() => route.params.id, loadOrder, { immediate: true })

function handleBack() {
  router.push('/production/disassembly-work-orders')
}

function openEdit() {
  formOpen.value = true
}

function onSaved() {
  loadOrder()
}

function handleDispatch() {
  const res = dispatchDisassemblyWorkOrder(order.value.id)
  if (res.ok) {
    message.success('工单已下发')
    loadOrder()
  } else {
    message.warning(res.message)
  }
}

function confirmDelete() {
  Modal.confirm({
    title: '确认删除该拆解工单？',
    content: '仅待下发状态工单可删除，删除后不可恢复。',
    okType: 'danger',
    onOk: () => {
      const ok = deleteDisassemblyWorkOrder(order.value.id)
      if (ok) {
        message.success('已删除')
        openTab('/production/disassembly-work-orders', '拆解工单')
        router.push('/production/disassembly-work-orders')
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}
</script>

<style scoped>
.disassembly-detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  background: #fff;
  padding: 12px;
  border-radius: 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-name {
  font-size: 16px;
  font-weight: 600;
}

.wo-timeline {
  background: #fff;
  padding: 16px 24px;
  border-radius: 4px;
}

.step-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

.step-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.section-card {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
}

.detail-tabs {
  background: #fff;
  padding: 0 12px;
  border-radius: 4px 4px 0 0;
}

.tab-body {
  background: #fff;
  padding: 12px;
  border-radius: 0 0 4px 4px;
  flex: 1;
}

.link {
  color: #1677ff;
  cursor: pointer;
}
</style>
