<template>
  <div class="contract-approve-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" size="small" class="back-btn" @click="goBack">
              <ArrowLeftOutlined />
            </a-button>
            <span class="page-title">审核合同</span>
            <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag>{{ record.contractType }}</a-tag>
            <span class="sub-no">{{ record.contractNo }}</span>
          </div>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="合同名称">{{
              record.contractName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="客户">{{ record.customerName }}</a-descriptions-item>
            <a-descriptions-item label="有效期">
              {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="结算周期">{{
              record.settlementCycle || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="账期起算">{{
              record.paymentTermStart || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="账期天数">{{
              record.paymentTermDays != null ? `${record.paymentTermDays} 天` : '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="额度金额">{{
              formatMoney(record.limitAmount)
            }}</a-descriptions-item>
            <a-descriptions-item label="额度数量">{{
              record.limitQty != null ? record.limitQty : '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="超额度">
              {{ record.allowExceedQuota !== false ? '允许（仅预警）' : '不允许（仅预警）' }}
            </a-descriptions-item>
            <a-descriptions-item v-if="isFramework" label="默认折扣">
              {{
                record.defaultDiscountRate != null
                  ? `${Number((record.defaultDiscountRate * 100).toFixed(2))}%`
                  : '—'
              }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="isFramework" class="section-card">
          <div class="section-title">产品协议折扣</div>
          <a-table
            :columns="priceColumns"
            :data-source="record.priceItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 900 }"
          >
            <template #bodyCell="{ column, record: row, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.key === 'discount'">
                {{
                  row.agreementDiscountRate != null
                    ? `${Number((row.agreementDiscountRate * 100).toFixed(2))}%`
                    : '—'
                }}
              </template>
            </template>
            <template #emptyText>
              <a-empty :image="false" description="暂无协议折扣" />
            </template>
          </a-table>
          <div class="service-content-block">
            <div class="service-content-label">服务内容</div>
            <div class="service-content-value">{{ record.serviceContent || '—' }}</div>
          </div>
        </div>

        <div v-else class="section-card">
          <div class="section-title">合同明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1260 }"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>
            </template>
            <template #emptyText>
              <a-empty :image="false" description="暂无明细" />
            </template>
          </a-table>
          <div class="service-content-block">
            <div class="service-content-label">服务内容</div>
            <div class="service-content-value">{{ record.serviceContent || '—' }}</div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-title">回款节点</div>
          <a-table
            :columns="nodeColumns"
            :data-source="record.paymentNodes || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'ratio'">
                {{ row.ratio != null ? `${Number((row.ratio * 100).toFixed(2))}%` : '—' }}
              </template>
              <template v-else-if="column.key === 'amount'">
                {{ formatMoney(row.amount) }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="section-card">
          <div class="section-title">扫描件</div>
          <div v-if="(record.attachments || []).length">
            <div v-for="file in record.attachments" :key="file.id || file.name">
              {{ file.name }}
            </div>
          </div>
          <a-empty v-else :image="false" description="暂无附件" />
        </div>

        <div v-if="canApprove" class="section-card">
          <div class="section-title">您的审批意见</div>
          <a-textarea v-model:value="opinion" :rows="4" placeholder="填写审批意见；驳回时必填" />
          <div class="action-row">
            <a-button danger @click="handleReject">驳回</a-button>
            <a-button type="primary" @click="handleApprove">通过</a-button>
          </div>
        </div>
        <div v-else class="section-card">
          <a-alert type="info" show-icon message="当前合同不在待审状态，仅可查看" />
        </div>

        <div class="section-card">
          <div class="section-title">审批记录</div>
          <a-timeline v-if="historyRecords.length" class="appr-timeline">
            <a-timeline-item
              v-for="(item, idx) in historyRecords"
              :key="idx"
              :color="approvalTimelineColor(item.result)"
            >
              <div class="appr-node">
                <div class="history-head">
                  <a-tag :color="approvalResultColor(item.result)" size="small">
                    {{ item.result }}
                  </a-tag>
                  <span class="history-user">{{ item.step || item.role }}</span>
                  <span class="history-role">{{ item.displayName || item.name }}</span>
                  <span class="history-time">{{ item.time }}</span>
                </div>
                <div v-if="item.opinion" class="history-opinion">意见：{{ item.opinion }}</div>
              </div>
            </a-timeline-item>
          </a-timeline>
          <a-empty v-else :image="false" description="暂无审批记录" />
        </div>
      </template>
      <a-empty v-else description="未找到该合同" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'SalesContractApproveView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import {
  approveSalesContract,
  canApproveSalesContract,
  getSalesContractById,
  rejectSalesContract,
} from '@/store/salesContractStore'
import { CONTRACT_TYPE, contractStatusColor } from '@/constants/salesContract'
import {
  approvalResultColor,
  approvalTimelineColor,
  buildSalesOrderApprovalTimeline,
} from '@/utils/salesApprovalDisplay'

const route = useRoute()
const router = useRouter()
const opinion = ref('')
const listPath = '/sales/contracts'

const record = computed(() => getSalesContractById(route.params.id))
const canApprove = computed(() => record.value && canApproveSalesContract(record.value))
const isFramework = computed(() => record.value?.contractType === CONTRACT_TYPE.FRAMEWORK)
const historyRecords = computed(() => buildSalesOrderApprovalTimeline(record.value))

const priceColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '产品名称', dataIndex: 'productName', width: 140 },
  { title: '规格', dataIndex: 'specModel', width: 120 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '税率(%)', dataIndex: 'taxRate', width: 90 },
  { title: '协议折扣', key: 'discount', width: 100 },
]
const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '产品名称', dataIndex: 'productName', width: 140 },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '税率(%)', dataIndex: 'taxRate', width: 90 },
  { title: '单价', dataIndex: 'unitPriceExTax', width: 110 },
  { title: '金额', dataIndex: 'amountExTax', width: 110 },
  { title: '交期', dataIndex: 'deliveryDate', width: 120 },
  { title: '包装方式', dataIndex: 'packagingForm', width: 100, ellipsis: true },
  { title: '补充说明', dataIndex: 'supplementDesc', width: 120, ellipsis: true },
]
const nodeColumns = [
  { title: '节点', dataIndex: 'name', width: 140 },
  { title: '比例', key: 'ratio', width: 100 },
  { title: '金额', key: 'amount', width: 120 },
]

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
  Modal.confirm({
    title: '确认审核通过？',
    content: `通过后合同「${record.value.contractNo}」将变为生效中，可用于下单。`,
    okText: '通过',
    onOk: () => {
      const res = approveSalesContract(record.value.id, opinion.value)
      if (!res.ok) {
        message.warning(res.message)
        return Promise.reject()
      }
      message.success(res.message)
      router.push(listPath)
    },
  })
}

function handleReject() {
  if (!opinion.value.trim()) {
    message.warning('驳回时请填写审批意见')
    return
  }
  const res = rejectSalesContract(record.value.id, opinion.value)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  router.push(listPath)
}
</script>

<style lang="less" scoped>
.contract-approve-page {
  margin: -12px;
  padding: 12px 12px 24px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.page-header {
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);
  border: 1px solid #e8eef8;
  border-radius: 8px;
  margin-bottom: 8px;
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

.sub-no {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.service-content-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;

  .service-content-label {
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
  }

  .service-content-value {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.88);
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.appr-timeline {
  margin: 8px 0 0 8px;
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
}
</style>
