<template>
  <div class="contract-detail-page">
    <a-spin :spinning="false">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.contractNo }}</span>
              <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
              <a-tag :color="contractSignStatusColor(record.signStatus)">{{
                record.signStatus || '未签署'
              }}</a-tag>
              <a-tag>{{ record.contractType }}</a-tag>
            </div>
            <a-space :size="8">
              <a-button v-if="canEditSalesContract(record)" size="small" @click="openEdit">
                编辑
              </a-button>
              <a-button
                v-if="canSubmitSalesContract(record) || canResubmitSalesContract(record)"
                type="primary"
                size="small"
                @click="handleSubmit"
              >
                {{ canResubmitSalesContract(record) ? '重新提交' : '提交审核' }}
              </a-button>
              <a-button
                v-if="canWithdrawSalesContract(record)"
                size="small"
                @click="handleWithdraw"
              >
                撤回
              </a-button>
              <a-button
                v-if="canApproveSalesContract(record)"
                type="primary"
                size="small"
                @click="openApprove"
              >
                审核
              </a-button>
              <a-button
                v-if="canMarkContractSigned(record)"
                size="small"
                @click="signModalOpen = true"
              >
                确认签署
              </a-button>
              <a-button
                v-if="canUnmarkContractSigned(record)"
                size="small"
                @click="handleUnmarkSigned"
              >
                取消签署
              </a-button>
              <a-button
                v-if="canCompleteSalesContract(record)"
                size="small"
                @click="handleComplete"
              >
                完成
              </a-button>
              <a-button
                v-if="record.status === CONTRACT_STATUS.ACTIVE"
                size="small"
                @click="handleCreateChange"
              >
                发起变更
              </a-button>
              <a-button
                v-if="record.status === CONTRACT_STATUS.ACTIVE"
                danger
                size="small"
                @click="handleTerminate"
              >
                终止
              </a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="activeTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="overview" tab="概览" />
              <a-tab-pane key="linked-orders" :tab="`关联订单 (${linkedOrders.length})`" />
              <a-tab-pane key="payments" :tab="`回款计划 (${paymentPlan.length})`" />
              <a-tab-pane key="changes" :tab="`变更记录 (${changeList.length})`" />
              <a-tab-pane key="attachments" :tab="`附件 (${(record.attachments || []).length})`" />
              <a-tab-pane key="approval" tab="审批信息" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'overview'">
            <DetailSectionCard title="基本信息">
              <SalesContractBasicInfoSection :contract="record" :quota="quota" />
              <div v-if="record.sourceSalesOrderId" class="source-order-link">
                来源销售订单：
                <a @click="goSourceOrder">{{
                  record.sourceSalesOrderNo || record.sourceSalesOrderId
                }}</a>
              </div>
            </DetailSectionCard>

            <DetailSectionCard title="客户资质与开票信息">
              <SalesContractPartyLegalSection :contract="record" />
            </DetailSectionCard>

            <DetailSectionCard v-if="isFramework" title="产品协议折扣">
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
                  <template v-else-if="column.key === 'productName'">
                    {{ row.productName || '—' }}
                  </template>
                  <template v-else-if="column.key === 'specModel'">
                    {{ row.specModel || '—' }}
                  </template>
                  <template v-else-if="column.key === 'material'">
                    {{ row.material || '—' }}
                  </template>
                  <template v-else-if="column.key === 'unit'">
                    {{ row.unit || '—' }}
                  </template>
                  <template v-else-if="column.key === 'taxRate'">
                    {{ row.taxRate != null && row.taxRate !== '' ? Number(row.taxRate) : '—' }}
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
            </DetailSectionCard>

            <DetailSectionCard v-else title="合同明细">
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1260 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'taxRate'">
                    {{ row.taxRate != null && row.taxRate !== '' ? Number(row.taxRate) : '—' }}
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{
                      formatMoney(
                        record.taxInclusive !== false
                          ? (row.unitPriceInTax ?? row.unitPriceExTax)
                          : (row.unitPriceExTax ?? row.unitPriceInTax),
                      )
                    }}
                  </template>
                  <template v-else-if="column.key === 'lineAmount'">
                    {{
                      formatMoney(
                        record.taxInclusive !== false
                          ? (row.amountInTax ?? row.amountExTax)
                          : (row.amountExTax ?? row.amountInTax),
                      )
                    }}
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
            </DetailSectionCard>

            <DetailSectionCard title="回款节点">
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
                    {{
                      row.ratio != null ? `${Number((Number(row.ratio) * 100).toFixed(2))}%` : '—'
                    }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    {{ formatMoney(row.amount) }}
                  </template>
                  <template v-else-if="column.key === 'planDate'">
                    {{ row.planDate || '—' }}
                  </template>
                  <!-- termStartType 用 dataIndex 直出 -->
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无回款节点" />
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'linked-orders'">
            <DetailSectionCard title="关联销售订单">
              <template #extra>
                <span class="quota-inline">
                  已执行金额 {{ quota.executedAmount
                  }}{{ quota.limitAmount != null ? ` / ${quota.limitAmount}` : '' }} · 已执行数量
                  {{ quota.executedQty }}{{ quota.limitQty != null ? ` / ${quota.limitQty}` : '' }}
                </span>
              </template>
              <a-table
                :columns="linkedOrderColumns"
                :data-source="linkedOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 2200 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'progressStatus'">
                    <a-tag :color="salesOrderStatusColor(row.progressStatus)">{{
                      row.progressStatus || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderNo'">
                    <a class="link-code" @click="goOrder(row)">{{ row.orderNo }}</a>
                  </template>
                  <template v-else-if="column.key === 'deliveryStatus'">
                    <a-tag :color="salesDeliveryStatusColor(row.deliveryStatus)">{{
                      row.deliveryStatus || '未发货'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'totalQty'">
                    {{ formatQty(row.totalQty ?? orderQtyNum(row)) }}
                  </template>
                  <template v-else-if="column.key === 'totalIssuedQty'">
                    {{ formatQty(row.totalIssuedQty) }}
                  </template>
                  <template v-else-if="column.key === 'lineAmountInTax'">
                    {{ formatMoney(resolveOrderAmounts(row).lineAmountInTax) }}
                  </template>
                  <template v-else-if="column.key === 'lineAmountExTax'">
                    {{ formatMoney(resolveOrderAmounts(row).lineAmountExTax) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryMethod'">
                    {{ row.deliveryMethod || '—' }}
                  </template>
                  <template v-else-if="column.key === 'amountInTax'">
                    {{ formatMoney(resolveOrderAmounts(row).amountInTax) }}
                  </template>
                  <template v-else-if="column.key === 'amountExTax'">
                    {{ formatMoney(resolveOrderAmounts(row).amountExTax) }}
                  </template>
                  <template v-else-if="column.key === 'region'">
                    {{ row.region || '—' }}
                  </template>
                  <template v-else-if="column.key === 'creator'">
                    {{ row.creator || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTime(row.createdAt) }}
                  </template>
                  <template v-else-if="column.key === 'approver'">
                    {{ row.approver || '—' }}
                  </template>
                  <template v-else-if="column.key === 'approvedAt'">
                    {{ formatDateTime(row.approvedAt) }}
                  </template>
                  <template v-else-if="column.key === 'updater'">
                    {{ row.updater || row.creator || '—' }}
                  </template>
                  <template v-else-if="column.key === 'updatedAt'">
                    {{ formatDateTime(row.updatedAt || row.createdAt) }}
                  </template>
                </template>
                <template v-if="linkedOrders.length" #summary>
                  <a-table-summary fixed>
                    <a-table-summary-row class="linked-order-summary-row">
                      <a-table-summary-cell
                        v-for="(col, colIndex) in linkedOrderColumns"
                        :key="col.key"
                        :index="colIndex"
                        :align="col.align || 'left'"
                      >
                        <template v-if="col.key === 'index'">合计</template>
                        <template v-else-if="col.key === 'totalQty'">
                          <strong>{{ formatQty(linkedOrderSummary.totalQty) }}</strong>
                        </template>
                        <template v-else-if="col.key === 'totalIssuedQty'">
                          <strong>{{ formatQty(linkedOrderSummary.totalIssuedQty) }}</strong>
                        </template>
                        <template v-else-if="col.key === 'lineAmountInTax'">
                          <strong>{{ formatMoney(linkedOrderSummary.lineAmountInTax) }}</strong>
                        </template>
                        <template v-else-if="col.key === 'lineAmountExTax'">
                          <strong>{{ formatMoney(linkedOrderSummary.lineAmountExTax) }}</strong>
                        </template>
                        <template v-else-if="col.key === 'amountInTax'">
                          <strong>{{ formatMoney(linkedOrderSummary.amountInTax) }}</strong>
                        </template>
                        <template v-else-if="col.key === 'amountExTax'">
                          <strong>{{ formatMoney(linkedOrderSummary.amountExTax) }}</strong>
                        </template>
                        <template v-else></template>
                      </a-table-summary-cell>
                    </a-table-summary-row>
                  </a-table-summary>
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无挂靠本合同的销售订单" />
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'payments'">
            <DetailSectionCard title="回款计划">
              <template #extra>
                <a-space :size="8">
                  <span v-if="isFramework" class="quota-inline">
                    计划基数：{{ record.paymentPlanBase || '额度金额' }}
                    <template v-if="record.paymentPlanBase === '销售订单金额'">
                      （当前订单合计 {{ formatMoney(quota.executedAmount) }}）
                    </template>
                  </span>
                  <a-button
                    v-if="canMaintainPayment"
                    size="small"
                    @click="handleRefreshPlanAmounts"
                  >
                    按基数刷新金额
                  </a-button>
                </a-space>
              </template>
              <a-table
                :columns="planColumns"
                :data-source="paymentPlan"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1100 }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'startDate'">
                    <span :class="{ 'muted-empty': !row.startDate }">
                      {{ row.startDate || '待补写' }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'invoiceAmount'">
                    {{ Number(row.invoiceAmount) > 0 ? row.invoiceAmount : '—' }}
                  </template>
                  <template v-else-if="column.key === 'paymentMethod'">
                    {{ row.paymentMethod || '—' }}
                  </template>
                  <template v-else-if="column.key === 'invoiceNo'">
                    {{ row.invoiceNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'overdue'">
                    <a-tag v-if="row.overdue" color="error">逾期</a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space v-if="canMaintainPayment && (Number(row.unpaid) || 0) > 0" :size="8">
                      <a @click="openMaintainNode(row, 'startDate')">维护起算日</a>
                      <a @click="openMaintainNode(row, 'register')">登记回款</a>
                    </a-space>
                    <span v-else class="muted">—</span>
                  </template>
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无回款节点" />
                </template>
              </a-table>
            </DetailSectionCard>

            <PaymentNodeMaintainModal
              v-model:open="maintainOpen"
              :summary="paymentSummary"
              :node="maintainNode"
              :mode="maintainMode"
              @saved="onPaymentMaintained"
            />
          </template>

          <template v-else-if="activeTab === 'changes'">
            <DetailSectionCard title="变更记录">
              <a-table
                :columns="changeColumns"
                :data-source="changeList"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1200 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="contractChangeStatusColor(row.status)">{{ row.status }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'changeNo'">
                    <a class="link-code" @click="goChangeDetail(row)">{{ row.changeNo }}</a>
                  </template>
                  <template v-else-if="column.key === 'reason'">
                    {{ row.reason || '—' }}
                  </template>
                  <template v-else-if="column.key === 'diffCount'">
                    {{ changeDiffCount(row) }}
                  </template>
                  <template v-else-if="column.key === 'creator'">
                    {{ row.creator || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ row.createdAt || '—' }}
                  </template>
                  <template v-else-if="column.key === 'approvedBy'">
                    {{ row.approvedBy || '—' }}
                  </template>
                  <template v-else-if="column.key === 'approvedAt'">
                    {{ row.approvedAt || '—' }}
                  </template>
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无变更单" />
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'attachments'">
            <DetailSectionCard title="上传附件">
              <div v-if="(record.attachments || []).length" class="attach-list">
                <div
                  v-for="file in record.attachments"
                  :key="file.id || file.name"
                  class="attach-row"
                >
                  {{ file.name }}
                </div>
              </div>
              <a-empty v-else :image="false" description="暂无附件" />
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'approval'">
            <SalesApprovalInfoPanel
              :order="record"
              :change-groups="changeApprovalGroups"
              intro="按时间查看本合同「提交 → 审核」过程。合同审批与合同变更审批分开列出，通过、驳回都能直接对照意见。"
              order-title="合同审批"
              change-title="合同变更审批"
              order-empty="还没有合同审批记录（提交审核后会出现提交和审核节点）"
              change-empty="还没有合同变更审批记录"
            />
          </template>
        </div>

        <SalesContractFormModal v-model:open="editOpen" :record="record" @saved="refresh" />
        <SalesContractSignModal v-model:open="signModalOpen" :contract="record" @signed="refresh" />
      </template>
      <a-empty v-else description="合同不存在" />
    </a-spin>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import {
  canApproveSalesContract,
  canCompleteSalesContract,
  canEditSalesContract,
  canMarkContractSigned,
  canResubmitSalesContract,
  canSubmitSalesContract,
  canUnmarkContractSigned,
  canWithdrawSalesContract,
  completeSalesContract,
  getContractQuotaSummary,
  getOrdersLinkedToContract,
  getSalesContractById,
  submitSalesContract,
  terminateSalesContract,
  unmarkContractSigned,
  withdrawSalesContract,
} from '@/store/salesContractStore'
import {
  buildContractPaymentPlan,
  buildContractPaymentSummary,
  refreshPlanAmountsFromContractBase,
  salesPaymentState,
} from '@/store/salesPaymentStore'
import PaymentNodeMaintainModal from './components/PaymentNodeMaintainModal.vue'
import {
  canCreateContractChange,
  diffContractSnapshots,
  listContractChangesByContract,
  salesContractChangeState,
} from '@/store/salesContractChangeStore'
import { openCreateTab } from '@/utils/openCreateTab'
import {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  contractChangeStatusColor,
  contractSignStatusColor,
  contractStatusColor,
} from '@/constants/salesContract'
import { salesDeliveryStatusColor, salesOrderStatusColor } from '@/utils/salesOrderStatus'
import { calcOrderAmounts } from '@/utils/salesOrderPricing'
import { formatQty } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'
import SalesContractFormModal from './components/SalesContractFormModal.vue'
import SalesContractBasicInfoSection from './components/SalesContractBasicInfoSection.vue'
import SalesContractPartyLegalSection from './components/SalesContractPartyLegalSection.vue'
import SalesContractSignModal from './components/SalesContractSignModal.vue'
import SalesApprovalInfoPanel from './components/SalesApprovalInfoPanel.vue'
import { buildContractChangeApprovalGroups } from '@/utils/salesApprovalDisplay'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const editOpen = ref(false)
const signModalOpen = ref(false)
const activeTab = ref('overview')
const tick = ref(0)
const maintainOpen = ref(false)
const maintainNode = ref(null)
const maintainMode = ref('startDate')

const record = computed(() => {
  void tick.value
  return getSalesContractById(route.params.id)
})

const isFramework = computed(() => record.value?.contractType === CONTRACT_TYPE.FRAMEWORK)
const quota = computed(() => getContractQuotaSummary(record.value || {}))
const paymentPlan = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void tick.value
  return buildContractPaymentPlan(record.value)
})
const paymentSummary = computed(() => {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void tick.value
  return record.value ? buildContractPaymentSummary(record.value) : null
})
const canMaintainPayment = computed(
  () =>
    record.value?.status === CONTRACT_STATUS.ACTIVE ||
    record.value?.status === CONTRACT_STATUS.COMPLETED,
)
const linkedOrders = computed(() => getOrdersLinkedToContract(record.value?.contractNo))
const changeList = computed(() => {
  void salesContractChangeState.changes
  void tick.value
  if (!record.value?.id) return []
  return listContractChangesByContract(record.value.id)
})

const changeApprovalGroups = computed(() => buildContractChangeApprovalGroups(changeList.value))

const priceColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '规格', key: 'specModel', width: 120 },
  { title: '材质', key: 'material', width: 90 },
  { title: '单位', key: 'unit', width: 70 },
  { title: '税率(%)', key: 'taxRate', width: 90 },
  { title: '协议折扣', key: 'discount', width: 100 },
]

const nodeColumns = [
  { title: '节点名称', dataIndex: 'name', width: 110 },
  { title: '比例', key: 'ratio', width: 90 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '账期起算', dataIndex: 'termStartType', width: 110 },
  { title: '计划回款时间', key: 'planDate', width: 120 },
]

const lineColumns = computed(() => {
  const taxInclusive = record.value?.taxInclusive !== false
  return [
    { title: '序号', key: 'index', width: 56, align: 'center' },
    { title: '产品编码', dataIndex: 'productCode', width: 120 },
    { title: '产品名称', dataIndex: 'productName', width: 140 },
    { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
    { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
    { title: '数量', dataIndex: 'qty', width: 90 },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '税率(%)', key: 'taxRate', width: 90 },
    {
      title: taxInclusive ? '单价(含税)' : '单价(不含税)',
      key: 'unitPrice',
      width: 120,
    },
    {
      title: taxInclusive ? '金额(含税)' : '金额(不含税)',
      key: 'lineAmount',
      width: 120,
    },
    { title: '交期', dataIndex: 'deliveryDate', width: 120 },
    { title: '包装方式', dataIndex: 'packagingForm', width: 100, ellipsis: true },
    { title: '补充说明', dataIndex: 'supplementDesc', width: 120, ellipsis: true },
  ]
})

const planColumns = [
  { title: '节点', dataIndex: 'name', width: 90 },
  { title: '计划金额', dataIndex: 'planAmount', width: 100 },
  { title: '起算类型', dataIndex: 'termStartType', width: 90 },
  { title: '起算日', key: 'startDate', width: 100 },
  { title: '到期日', dataIndex: 'dueDate', width: 100 },
  { title: '开票金额', key: 'invoiceAmount', width: 100 },
  { title: '已回', dataIndex: 'paid', width: 90 },
  { title: '未回', dataIndex: 'unpaid', width: 90 },
  { title: '回款方式', key: 'paymentMethod', width: 90 },
  { title: '发票号码', key: 'invoiceNo', width: 120, ellipsis: true },
  { title: '逾期', key: 'overdue', width: 70 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const linkedOrderColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'progressStatus', width: 90, fixed: 'left' },
  { title: '销售单号', key: 'orderNo', width: 140, fixed: 'left' },
  { title: '发货状态', key: 'deliveryStatus', width: 90 },
  { title: '销售数量', key: 'totalQty', width: 90, align: 'right' },
  { title: '发货数量', key: 'totalIssuedQty', width: 90, align: 'right' },
  { title: '销售总额（含税）', key: 'lineAmountInTax', width: 130, align: 'right' },
  { title: '销售总额（不含税）', key: 'lineAmountExTax', width: 140, align: 'right' },
  { title: '交货方式', key: 'deliveryMethod', width: 90 },
  { title: '最终成交额（含税）', key: 'amountInTax', width: 140, align: 'right' },
  { title: '最终成交额（不含税）', key: 'amountExTax', width: 140, align: 'right' },
  { title: '所属区域', key: 'region', width: 90 },
  { title: '创建人', key: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 140 },
  { title: '审核人', key: 'approver', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 140 },
  { title: '更新人', key: 'updater', width: 90 },
  { title: '最近更新时间', key: 'updatedAt', width: 140 },
]

const changeColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '变更单号', key: 'changeNo', width: 150 },
  { title: '变更原因', key: 'reason', ellipsis: true },
  { title: '变更项数', key: 'diffCount', width: 90 },
  { title: '发起人', key: 'creator', width: 90 },
  { title: '发起时间', key: 'createdAt', width: 140 },
  { title: '审核人', key: 'approvedBy', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 140 },
]

const linkedOrderSummary = computed(() => {
  const list = linkedOrders.value || []
  return list.reduce(
    (acc, row) => {
      const amounts = resolveOrderAmounts(row)
      acc.totalQty += Number(row.totalQty ?? orderQtyNum(row)) || 0
      acc.totalIssuedQty += Number(row.totalIssuedQty) || 0
      acc.lineAmountInTax += Number(amounts.lineAmountInTax) || 0
      acc.lineAmountExTax += Number(amounts.lineAmountExTax) || 0
      acc.amountInTax += Number(amounts.amountInTax) || 0
      acc.amountExTax += Number(amounts.amountExTax) || 0
      return acc
    },
    {
      totalQty: 0,
      totalIssuedQty: 0,
      lineAmountInTax: 0,
      lineAmountExTax: 0,
      amountInTax: 0,
      amountExTax: 0,
    },
  )
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDateTime(val) {
  if (!val) return '—'
  return String(val)
}

function resolveOrderAmounts(record) {
  if (!record) return calcOrderAmounts({})
  if (record.lineAmountExTax != null && record.amountExTax != null) {
    return {
      lineAmountInTax: Number(record.lineAmountInTax) || 0,
      lineAmountExTax: Number(record.lineAmountExTax) || 0,
      amountInTax: Number(record.amountInTax) || 0,
      amountExTax: Number(record.amountExTax) || 0,
    }
  }
  return calcOrderAmounts(record)
}

function orderQtyNum(row) {
  const lines = row?.lineItems || []
  return lines.reduce((s, l) => s + (Number(l.salesQty ?? l.qty) || 0), 0)
}

function changeDiffCount(row) {
  return diffContractSnapshots(row?.beforeSnapshot, row?.afterSnapshot).length
}

function refresh() {
  tick.value += 1
}

function openMaintainNode(row, mode = 'startDate') {
  maintainNode.value = row
  maintainMode.value = mode
  maintainOpen.value = true
}

function onPaymentMaintained() {
  refresh()
}

function handleRefreshPlanAmounts() {
  if (!record.value) return
  const res = refreshPlanAmountsFromContractBase(record.value)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已按基数（${formatMoney(res.baseAmount)}）刷新未结清节点计划金额`)
  refresh()
}

watch(
  () => route.params.id,
  () => {
    activeTab.value = 'overview'
    refresh()
  },
)

function goBack() {
  router.push('/sales/contracts')
}

function openEdit() {
  editOpen.value = true
}

function goOrder(row) {
  const path = `/sales/orders/${row.id}`
  openTab(path, `销售订单 ${row.orderNo || ''}`.trim())
  router.push(path)
}

function goSourceOrder() {
  if (!record.value?.sourceSalesOrderId) return
  const path = `/sales/orders/${record.value.sourceSalesOrderId}`
  openTab(path, `销售订单 ${record.value.sourceSalesOrderNo || ''}`.trim())
  router.push(path)
}

function handleSubmit() {
  const res = submitSalesContract(record.value.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  refresh()
}

function handleWithdraw() {
  Modal.confirm({
    title: '撤回提交',
    content: `确认撤回合同「${record.value.contractNo}」？撤回后变为草稿。`,
    onOk: () => {
      const res = withdrawSalesContract(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      refresh()
    },
  })
}

function openApprove() {
  const path = `/sales/contracts/${record.value.id}/approve`
  openTab(path, `审核合同 ${record.value.contractNo || ''}`.trim())
  router.push({ name: 'sales-contracts-approve', params: { id: record.value.id } })
}

function handleTerminate() {
  Modal.confirm({
    title: '终止合同',
    content: `确认终止合同「${record.value.contractNo}」？`,
    okType: 'danger',
    onOk: () => {
      const res = terminateSalesContract(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已终止')
      refresh()
    },
  })
}

function handleComplete() {
  const unpaid = Number(paymentSummary.value?.unpaidTotal) || 0
  const tip =
    unpaid > 0
      ? `确认将合同「${record.value.contractNo}」标记为已完成？仍有待回款，完成后仍可继续登记回款。`
      : `确认将合同「${record.value.contractNo}」标记为已完成？`
  Modal.confirm({
    title: '完成合同',
    content: tip,
    onOk: () => {
      const res = completeSalesContract(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已标记为已完成')
      refresh()
    },
  })
}

function handleUnmarkSigned() {
  Modal.confirm({
    title: '取消签署',
    content: `确认取消合同「${record.value.contractNo}」的签署标记？`,
    onOk: () => {
      const res = unmarkContractSigned(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已取消签署标记')
      refresh()
    },
  })
}

function handleCreateChange() {
  const guard = canCreateContractChange(record.value)
  if (!guard.ok) {
    message.warning(guard.message)
    return
  }
  openCreateTab(router, openTab, {
    path: '/sales/contract-changes/new',
    title: '发起合同变更',
    query: { contractId: record.value.id },
  })
}

function goChangeDetail(row) {
  if (!row?.id) {
    router.push('/sales/contract-changes')
    return
  }
  const path = `/sales/contract-changes/${row.id}`
  openTab(path, `变更单 ${row.changeNo || ''}`.trim())
  router.push(path)
}
</script>

<style lang="less" scoped>
.contract-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.source-order-link {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
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

.quota-inline {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.muted-empty {
  color: #fa8c16;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.linked-order-summary-row {
  :deep(td) {
    background: #fafafa;
    font-size: 13px;
  }
}

.attach-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attach-row {
  font-size: 13px;
}
</style>
