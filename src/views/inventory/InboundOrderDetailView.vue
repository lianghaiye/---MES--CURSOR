<template>
  <div class="inbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.inboundType }}</span>
          </div>
          <a-space>
            <a-button v-if="canEditInbound(record)" type="primary" size="small" @click="openEdit">
              编辑
            </a-button>
            <a-button v-if="canApproveInbound(record)" size="small" @click="handleApprovePass">
              通过
            </a-button>
            <a-button
              v-if="canApproveInbound(record)"
              size="small"
              danger
              @click="handleApproveReject"
            >
              拒绝
            </a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="入库单号">{{ record.docNo }}</a-descriptions-item>
            <a-descriptions-item label="入库类型">{{ record.inboundType }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="入库日期">{{
              record.inboundDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="送货日期">{{
              record.deliveryDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="入库仓库">{{
              record.warehouse || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="仓管员">{{
              record.warehouseKeeper || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="物品类型">{{ record.itemType || '—' }}</a-descriptions-item>
            <a-descriptions-item label="供应商">{{ record.supplier || '—' }}</a-descriptions-item>
            <a-descriptions-item label="源单号">
              <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                record.sourceOrderNo
              }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="来源车间">{{
              record.sourceWorkshop || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="发票号码">{{
              record.invoiceNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="经手人">{{ record.handler || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="确认人">{{ record.confirmer || '—' }}</a-descriptions-item>
            <a-descriptions-item label="确认时间">{{
              record.confirmedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审批人">{{ record.approver || '—' }}</a-descriptions-item>
            <a-descriptions-item label="审批时间">{{
              record.approvedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">入库明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该入库单" />
    </a-spin>

    <InboundOrderFormModal v-model:open="formOpen" :edit-record="record" @saved="reload" />
  </div>
</template>

<script>
export default { name: 'InboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  getInboundOrderById,
  approveInboundOrder,
  rejectInboundOrder,
  canEditInbound,
  canApproveInbound,
} from '@/store/inboundOrderStore'
import { resolveInboundSourceRoute } from '@/utils/inboundSourceLink'
import InboundOrderFormModal from './components/InboundOrderFormModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref(null)
const formOpen = ref(false)

const productCols = [
  { title: '#', key: 'index', width: 48 },
  { title: '物品编码', dataIndex: 'itemCode', width: 110 },
  { title: '物品名称', dataIndex: 'itemName', width: 140 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '入库仓库', dataIndex: 'warehouse', width: 100 },
  { title: '数量', dataIndex: 'qty', width: 80 },
  { title: '重量(kg)', dataIndex: 'weight', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '单价', dataIndex: 'unitPrice', width: 80 },
]

const materialCols = [
  ...productCols.slice(0, 11),
  { title: '条码/批次', dataIndex: 'barcodeBatchNo', width: 120 },
  { title: '生产日期', dataIndex: 'productionDate', width: 110 },
  { title: '过期日期', dataIndex: 'expiryDate', width: 110 },
  { title: '备注', dataIndex: 'lineRemark', width: 100 },
]

const lineColumns = computed(() => (record.value?.itemType === '物料' ? materialCols : productCols))

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已拒绝') return 'error'
  if (status === '待审批') return 'warning'
  return 'processing'
}

function reload() {
  record.value = getInboundOrderById(route.params.id)
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/inventory/inbound')
}

function goSource() {
  const r = resolveInboundSourceRoute(record.value)
  if (r?.path) router.push(r.path)
}

function openEdit() {
  formOpen.value = true
}

function handleApprovePass() {
  Modal.confirm({
    title: `通过审批 ${record.value.docNo}？`,
    onOk: () => {
      const res = approveInboundOrder(record.value.id)
      if (res.ok) {
        message.success('审批已通过')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleApproveReject() {
  Modal.confirm({
    title: `拒绝入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(record.value.id)
      if (res.ok) {
        message.success('已拒绝')
        reload()
      } else message.warning(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.inbound-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .sub-type {
    color: #8c8c8c;
  }

  .section-card {
    background: #fff;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
  }

  .link-code {
    color: #1677ff;
  }
}
</style>
