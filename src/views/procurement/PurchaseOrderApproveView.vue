<template>
  <div class="po-approve-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">审核采购单</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag :color="inboundColor(record.inboundStatus)">{{
              record.inboundStatus || '待入库'
            }}</a-tag>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-top">
            <span class="doc-no">{{ record.orderNo }}</span>
            <span class="doc-meta"
              >{{ record.applyType || '日常采购' }} · {{ record.supplier || '—' }}</span
            >
          </div>
          <div class="summary-reason">
            采购申请：{{ record.reqNo || '—' }} · 订单来源：{{ record.orderSource || '—' }}
          </div>
          <div class="summary-applicant">
            采购员：{{ record.purchaser || '—' }} · 创建人：{{ record.creator || '—' }} ·
            {{ formatCreatedAt(record.createdAt || record.documentDate) }}
          </div>
        </div>

        <div class="section-card content-section">
          <div class="subsection">
            <div class="section-title">基本信息</div>
            <a-descriptions :column="3" size="small" bordered>
              <a-descriptions-item label="采购单号">{{ record.orderNo }}</a-descriptions-item>
              <a-descriptions-item label="供应商">{{ record.supplier || '—' }}</a-descriptions-item>
              <a-descriptions-item label="采购类型">{{
                record.applyType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="采购申请单号">{{
                record.reqNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="销售单号">{{
                record.salesOrderNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="生产工单号">{{
                record.workOrderNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算类型">{{
                record.settlementType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="交货日期">{{
                record.deliveryDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="收货仓库">{{
                record.receivingWarehouse || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="交货方式">{{
                record.deliveryMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="供货期/天">{{
                record.leadTimeDays ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="合同编号">{{
                record.contractNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">{{
                record.remark || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </div>

          <a-divider />

          <div class="subsection">
            <div class="section-title">采购明细</div>
            <a-table
              :columns="lineColumns"
              :data-source="record.lineItems || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1200 }"
              :locale="{ emptyText: '暂无采购明细' }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'productName'">
                  {{ line.productName || line.itemName || '—' }}
                </template>
                <template v-else-if="column.key === 'productCode'">
                  {{ line.productCode || line.itemCode || '—' }}
                </template>
                <template v-else-if="column.key === 'purchaseQty'">
                  {{ formatQty(line.purchaseQty) }}
                </template>
                <template v-else-if="column.key === 'orderSizeText'">
                  {{ line.orderSizeText || line.blankSizeText || '—' }}
                </template>
                <template v-else-if="column.key === 'unitPriceExTax'">
                  {{ formatMoney(line.unitPriceExTax) }}
                </template>
                <template v-else-if="column.key === 'totalPriceInTax'">
                  {{ formatMoney(line.totalPriceInTax) }}
                </template>
                <template v-else>
                  {{ line[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
            <div class="summary-row">
              <span class="summary-label">总计</span>
              <span class="summary-item">数量：{{ formatQty(summary.totalQty) }}</span>
              <span class="summary-item">不含税：{{ formatMoney(summary.amountExTax) }}</span>
              <span class="summary-item">含税：{{ formatMoney(summary.amountInTax) }}</span>
            </div>
          </div>
        </div>

        <div v-if="canApprove" class="section-card">
          <div class="section-title">您的审批意见</div>
          <a-textarea
            v-model:value="opinion"
            :rows="4"
            placeholder="填写审批意见（可选） 如：价格合理，同意按计划采购"
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
      <a-empty v-else description="未找到该采购订单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'PurchaseOrderApproveView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { formatQty } from '@/utils/numberFormat'
import {
  getPurchaseOrderById,
  canApprovePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
} from '@/store/purchaseOrderStore'

const route = useRoute()
const router = useRouter()
const opinion = ref('')
const listPath = '/procurement/purchase-orders'

const record = computed(() => getPurchaseOrderById(route.params.id))

const canApprove = computed(() => record.value && canApprovePurchaseOrder(record.value))

const historyRecords = computed(() => record.value?.approvalRecords || [])

const summary = computed(() => {
  const lines = record.value?.lineItems || []
  return {
    totalQty: lines.reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0),
    amountExTax:
      record.value?.amountExTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0),
    amountInTax:
      record.value?.amountInTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0),
  }
})

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '订货尺寸', key: 'orderSizeText', width: 140, ellipsis: true },
  { title: '不含税单价', key: 'unitPriceExTax', width: 100, align: 'right' },
  { title: '含税总价', key: 'totalPriceInTax', width: 100, align: 'right' },
]

function statusColor(status) {
  const map = {
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function inboundColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回') return 'error'
  return 'default'
}

function formatCreatedAt(value) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('MM-DD HH:mm') : value
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function goBack() {
  router.push(listPath)
}

function handleApprove() {
  const res = approvePurchaseOrder(record.value.id, opinion.value)
  if (res.ok) {
    message.success(res.message)
    opinion.value = ''
    router.push(listPath)
  } else {
    message.warning(res.message)
  }
}

function handleReject() {
  if (!opinion.value.trim()) {
    message.warning('驳回时请填写审批意见')
    return
  }
  const res = rejectPurchaseOrder(record.value.id, opinion.value)
  if (res.ok) {
    message.success(res.message)
    router.push(listPath)
  } else {
    message.warning(res.message)
  }
}
</script>

<style lang="less" scoped>
.po-approve-page {
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
  gap: 12px;
}

.doc-no {
  font-size: 15px;
  font-weight: 600;
}

.doc-meta {
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

.subsection + .subsection {
  margin-top: 4px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
}

.summary-label {
  font-weight: 600;
}

.summary-item {
  color: #595959;
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
