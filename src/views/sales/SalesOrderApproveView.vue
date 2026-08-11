<template>
  <div class="so-approve-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">审核销售订单</span>
            <a-tag :color="salesOrderStatusColor(record.progressStatus)">
              {{ record.progressStatus }}
            </a-tag>
            <a-tag :color="salesDeliveryStatusColor(record.deliveryStatus)">
              {{ record.deliveryStatus || '未发货' }}
            </a-tag>
          </div>
        </div>

        <div class="section-card content-section">
          <div class="subsection">
            <div class="section-title">基本信息</div>
            <SalesOrderBasicInfoSection :order="record" />
          </div>

          <a-divider />

          <div class="subsection">
            <div class="section-title">销售明细</div>
            <a-table
              :columns="lineColumns"
              :data-source="record.lineItems || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: lineTableScrollX }"
              :locale="{ emptyText: '暂无销售明细' }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'salesQty'">
                  {{ formatQty(line.salesQty ?? line.qty) }}
                </template>
                <template v-else-if="column.key === 'businessType'">
                  {{ line.businessType || '—' }}
                </template>
                <template v-else-if="column.key === 'deliveryMode'">
                  {{ line.deliveryMode || '—' }}
                </template>
                <template v-else-if="moneyKeys.has(column.key)">
                  {{ formatMoney(line[column.dataIndex]) }}
                </template>
                <template v-else-if="column.key === 'lineDiscountRate'">
                  {{
                    line.lineDiscountRate == null
                      ? '—'
                      : `${(Number(line.lineDiscountRate) * 100).toFixed(0)}%`
                  }}
                </template>
                <template v-else>
                  {{ displayCell(line, column) }}
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
            placeholder="填写审批意见（可选） 如：客户需求明确，同意按计划交付"
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
      <a-empty v-else description="未找到该销售订单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'SalesOrderApproveView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { formatQty } from '@/utils/numberFormat'
import {
  getSalesOrderById,
  canApproveSalesOrder,
  approveSalesOrder,
  rejectSalesOrder,
} from '@/store/salesOrderStore'
import { salesOrderDetailLineColumns } from '@/utils/salesOrderLineColumns'
import { salesOrderStatusColor, salesDeliveryStatusColor } from '@/utils/salesOrderStatus'
import SalesOrderBasicInfoSection from './components/SalesOrderBasicInfoSection.vue'

const route = useRoute()
const router = useRouter()
const opinion = ref('')
const listPath = '/sales/orders'

const moneyKeys = new Set([
  'unitPriceExTax',
  'unitPriceInTax',
  'totalPriceExTax',
  'totalPriceInTax',
  'lineDiscountAmount',
])

const record = computed(() => getSalesOrderById(route.params.id))
const canApprove = computed(() => record.value && canApproveSalesOrder(record.value))
const historyRecords = computed(() => record.value?.approvalRecords || [])

const lineColumns = salesOrderDetailLineColumns
const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const summary = computed(() => {
  const lines = record.value?.lineItems || []
  return {
    totalQty: lines.reduce((s, l) => s + (Number(l.salesQty ?? l.qty) || 0), 0),
    amountExTax:
      record.value?.amountExTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0),
    amountInTax:
      record.value?.amountInTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0),
  }
})

function displayCell(line, column) {
  const val = line[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '—'
}

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回') return 'error'
  return 'default'
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
  const res = approveSalesOrder(record.value.id, opinion.value)
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
  const res = rejectSalesOrder(record.value.id, opinion.value)
  if (res.ok) {
    message.success(res.message)
    router.push(listPath)
  } else {
    message.warning(res.message)
  }
}
</script>

<style lang="less" scoped>
.so-approve-page {
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
