<template>
  <div class="scrap-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.scrapNo }}</span>
            <a-tag :color="auditStatusColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
            <a-tag :color="replenishStatusColor(record.replenishStatus)">
              {{ record.replenishStatus }}
            </a-tag>
          </div>
          <a-space>
            <a-button
              v-if="record.auditStatus === '待审核'"
              type="primary"
              size="small"
              @click="auditOpen = true"
            >
              审批
            </a-button>
            <a-button
              v-if="canReplenish(record)"
              type="primary"
              size="small"
              @click="replenishOpen = true"
            >
              补料
            </a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions :column="3" size="small" bordered class="basic-desc">
            <a-descriptions-item label="报废单号">{{ record.scrapNo }}</a-descriptions-item>
            <a-descriptions-item label="来源工单">{{
              record.workOrderNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="车间">{{ record.workshop || '—' }}</a-descriptions-item>
            <a-descriptions-item label="报工人">{{ record.reportedBy || '—' }}</a-descriptions-item>
            <a-descriptions-item label="报工时间">{{
              record.reportedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="报废成本">{{
              formatMoney(record.costAmount)
            }}</a-descriptions-item>
            <a-descriptions-item label="报废原因">{{
              record.scrapReason || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="补料方式">{{
              record.replenishMethod || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="处理方式">{{
              record.processMethod || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="处理结果">{{
              record.processResult || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审核人">{{ record.auditor || '—' }}</a-descriptions-item>
            <a-descriptions-item label="审核时间">{{
              record.auditedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审批意见" :span="3">
              {{ record.auditComment || '—' }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">报废明细</div>
          <a-table
            :columns="scrapLineCols"
            :data-source="scrapLines"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1100 }"
          >
            <template #bodyCell="{ column, record: line }">
              <template v-if="column.key === 'costAmount'">
                {{ formatMoney(line.costAmount) }}
              </template>
              <template v-else>
                {{ line[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="section-card">
          <div class="section-title">补料单明细</div>
          <a-table
            :columns="replenishCols"
            :data-source="replenishRows"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 900 }"
          >
            <template #emptyText>
              <span class="table-empty-text">暂无补料单</span>
            </template>
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'docNo'">
                <a v-if="row.route" class="link-code" @click="goLink(row)">{{ row.docNo }}</a>
                <span v-else>{{ row.docNo || '—' }}</span>
              </template>
              <template v-else>
                {{ row[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="section-card">
          <div class="section-title">处置明细</div>
          <a-table
            :columns="disposalCols"
            :data-source="disposalRows"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 900 }"
          >
            <template #emptyText>
              <span class="table-empty-text">暂无处置记录</span>
            </template>
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'docNo'">
                <a v-if="row.route" class="link-code" @click="goLink(row)">{{ row.docNo }}</a>
                <span v-else>{{ row.docNo || '—' }}</span>
              </template>
              <template v-else>
                {{ row[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该报废单" />
    </a-spin>

    <ScrapAuditModal v-model:open="auditOpen" :record="record" @saved="reload" />
    <ScrapReplenishModal v-model:open="replenishOpen" :record="record" @saved="reload" />
  </div>
</template>

<script>
export default { name: 'ScrapOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getScrapOrderById } from '@/store/scrapOrderStore'
import { auditStatusColor, replenishStatusColor } from '@/utils/scrapOrderUtils'
import ScrapAuditModal from './components/ScrapAuditModal.vue'
import ScrapReplenishModal from './components/ScrapReplenishModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref(null)
const auditOpen = ref(false)
const replenishOpen = ref(false)

const scrapLineCols = [
  { title: '物品名称', dataIndex: 'itemName', width: 120 },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 140 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '数量', dataIndex: 'qty', width: 70, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '单价', dataIndex: 'unitPrice', width: 90, align: 'right' },
  { title: '报废成本', key: 'costAmount', width: 100, align: 'right' },
]

const replenishCols = [
  { title: '单据类型', dataIndex: 'docType', width: 120 },
  { title: '单号', key: 'docNo', dataIndex: 'docNo', width: 160 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const disposalCols = [
  { title: '处置类型', dataIndex: 'docType', width: 120 },
  { title: '单号', key: 'docNo', dataIndex: 'docNo', width: 160 },
  { title: '仓库/说明', dataIndex: 'remark', width: 160 },
  { title: '状态', dataIndex: 'status', width: 100 },
]

const scrapLines = computed(() => {
  if (!record.value) return []
  const r = record.value
  return [
    {
      id: r.id,
      itemName: r.itemName,
      itemCode: r.itemCode,
      specModel: r.specModel,
      material: r.material,
      qty: r.qty,
      unit: r.unit,
      unitPrice: r.unitPrice,
      costAmount: r.costAmount,
    },
  ]
})

const replenishRows = computed(() => {
  if (!record.value?.replenishLinks?.length) return []
  return record.value.replenishLinks.map((link, idx) => ({
    id: `${link.type}-${idx}`,
    docType: link.type === 'purchase_req' ? '采购申请单' : '领料出库单',
    docNo: link.docNo,
    status: '待处理',
    createdAt: record.value.auditedAt || record.value.createdAt,
    route:
      link.type === 'purchase_req' ? `/procurement/purchase-req/${link.id}` : '/inventory/outbound',
  }))
})

const disposalRows = computed(() => {
  if (!record.value?.disposalLinks?.length) return []
  return record.value.disposalLinks.map((link, idx) => ({
    id: `${link.type}-${idx}`,
    docType:
      link.type === 'inbound'
        ? link.inboundType || '入库单'
        : link.type === 'disassembly'
          ? '拆解工单'
          : '处置单',
    docNo: link.docNo,
    remark:
      link.type === 'inbound'
        ? record.value.warehouse || '—'
        : link.type === 'disassembly'
          ? '自动创建拆解工单'
          : '—',
    status: link.type === 'disassembly' ? '待下发' : '待处理',
    route: link.type === 'disassembly' ? `/production/disassembly-work-orders/${link.id}` : null,
  }))
})

function canReplenish(r) {
  return r?.auditStatus === '审核通过' && r?.needReplenish && r?.replenishStatus === '未补料'
}

function formatMoney(v) {
  if (v == null || v === '') return '—'
  return Number(v).toFixed(2)
}

function reload() {
  const id = route.params.id
  record.value = getScrapOrderById(id)
}

function goLink(row) {
  if (row.route) router.push(row.route)
}

watch(
  () => route.params.id,
  (id) => {
    loading.value = true
    record.value = getScrapOrderById(id)
    loading.value = false
  },
  { immediate: true },
)
</script>

<style scoped>
.scrap-detail-page {
  padding: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
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
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}
.link-code {
  color: #1677ff;
  cursor: pointer;
}
.table-empty-text {
  display: block;
  padding: 16px 0;
  color: rgba(0, 0, 0, 0.45);
}
</style>
