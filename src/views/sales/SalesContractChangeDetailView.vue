<template>
  <div class="contract-change-detail-page">
    <a-spin :spinning="false">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.changeNo }}</span>
              <a-tag :color="contractChangeStatusColor(record.status)">{{ record.status }}</a-tag>
              <a-tag>{{ record.contractType }}</a-tag>
            </div>
            <a-space :size="8">
              <a-button v-if="canEdit" size="small" @click="openEdit">编辑</a-button>
              <a-button v-if="canSubmit" type="primary" size="small" @click="handleSubmit">
                提交审核
              </a-button>
              <a-button v-if="canApprove" type="primary" size="small" @click="openApprove">
                审核
              </a-button>
              <a-button v-if="canWithdraw" size="small" @click="handleWithdraw">撤回</a-button>
              <a-button v-if="canCancel" danger size="small" @click="handleCancel">作废</a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="activeTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="overview" tab="概览" />
              <a-tab-pane key="diff" :tab="`变更对比 (${diffRows.length})`" />
              <a-tab-pane key="approval" tab="审批信息" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'overview'">
            <DetailSectionCard title="变更单信息">
              <div class="change-info-section">
                <div class="meta-bar">
                  <div v-for="item in changeMetaItems" :key="item.key" class="meta-item">
                    <span class="field-label">{{ item.label }}</span>
                    <span class="field-value" :title="item.value">{{ item.value }}</span>
                  </div>
                </div>
                <div class="info-grid">
                  <div class="info-item info-item-full">
                    <span class="field-label">变更原因</span>
                    <span class="field-value reason-value">{{ record.reason || '—' }}</span>
                  </div>
                </div>
              </div>
            </DetailSectionCard>

            <DetailSectionCard title="变更后 · 基本信息">
              <SalesContractBasicInfoSection :contract="displayContract" :quota="quota" />
            </DetailSectionCard>

            <DetailSectionCard title="变更后 · 相对方法人与开票信息">
              <SalesContractPartyLegalSection :contract="displayContract" />
            </DetailSectionCard>

            <DetailSectionCard v-if="isFramework" title="变更后 · 产品协议价目">
              <a-table
                :columns="priceColumns"
                :data-source="afterSnapshot.priceItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1140 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'taxRate'">
                    {{ row.taxRate != null && row.taxRate !== '' ? Number(row.taxRate) : '—' }}
                  </template>
                  <template v-else-if="column.key === 'agreementUnitPriceExTax'">
                    {{
                      row.agreementUnitPriceExTax != null && row.agreementUnitPriceExTax !== ''
                        ? Number(row.agreementUnitPriceExTax)
                        : '—'
                    }}
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
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无协议价目" />
                </template>
              </a-table>
              <div class="service-content-block">
                <div class="service-content-label">服务内容</div>
                <div class="service-content-value">{{ afterSnapshot.serviceContent || '—' }}</div>
              </div>
            </DetailSectionCard>

            <DetailSectionCard v-else title="变更后 · 合同明细">
              <a-table
                :columns="lineColumns"
                :data-source="afterSnapshot.lineItems || []"
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
                        afterSnapshot.taxInclusive !== false
                          ? (row.unitPriceInTax ?? row.unitPriceExTax)
                          : (row.unitPriceExTax ?? row.unitPriceInTax),
                      )
                    }}
                  </template>
                  <template v-else-if="column.key === 'lineAmount'">
                    {{
                      formatMoney(
                        afterSnapshot.taxInclusive !== false
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
                <div class="service-content-value">{{ afterSnapshot.serviceContent || '—' }}</div>
              </div>
            </DetailSectionCard>

            <DetailSectionCard title="变更后 · 回款节点">
              <a-table
                :columns="nodeColumns"
                :data-source="afterSnapshot.paymentNodes || []"
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
                </template>
                <template #emptyText>
                  <a-empty :image="false" description="暂无回款节点" />
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'diff'">
            <DetailSectionCard title="变更对比">
              <a-table
                :columns="diffColumns"
                :data-source="diffRows"
                row-key="field"
                size="small"
                bordered
                :pagination="false"
              />
              <a-empty
                v-if="!diffRows.length"
                :image="false"
                description="变更前后无差异"
                style="margin-top: 16px"
              />
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'approval'">
            <SalesApprovalInfoPanel
              :order="null"
              :change-groups="changeApprovalGroups"
              :show-order="false"
              intro="按时间查看本变更单「提交 → 审核」过程。通过、驳回都能直接对照意见。"
              change-title="合同变更审批"
              change-empty="还没有合同变更审批记录（提交审核后会出现提交和审核节点）"
            />
          </template>
        </div>
      </template>
      <a-empty v-else description="变更单不存在" />
    </a-spin>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import {
  cancelContractChange,
  diffContractSnapshots,
  formatContractChangeDiffRows,
  getContractChangeById,
  salesContractChangeState,
  submitContractChange,
  withdrawContractChange,
} from '@/store/salesContractChangeStore'
import { getContractQuotaSummary, getSalesContractById } from '@/store/salesContractStore'
import {
  CONTRACT_CHANGE_STATUS,
  CONTRACT_TYPE,
  contractChangeStatusColor,
} from '@/constants/salesContract'
import { useTabs } from '@/composables/useTabs'
import SalesContractBasicInfoSection from './components/SalesContractBasicInfoSection.vue'
import SalesContractPartyLegalSection from './components/SalesContractPartyLegalSection.vue'
import SalesApprovalInfoPanel from './components/SalesApprovalInfoPanel.vue'
import { buildContractChangeApprovalGroups } from '@/utils/salesApprovalDisplay'

defineOptions({ name: 'SalesContractChangeDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const activeTab = ref('overview')
const tick = ref(0)

const record = computed(() => {
  void tick.value
  void salesContractChangeState.changes
  return getContractChangeById(route.params.id)
})

const afterSnapshot = computed(() => record.value?.afterSnapshot || {})

const displayContract = computed(() => {
  const r = record.value
  const after = afterSnapshot.value
  return {
    ...after,
    contractNo: r?.contractNo || after.contractNo,
    contractType: r?.contractType || after.contractType,
    customerName: r?.customerName || after.customerName,
    supplierName: r?.supplierName || after.supplierName,
    cashDirection: after.cashDirection || r?.beforeSnapshot?.cashDirection,
    contractCategory: after.contractCategory || r?.beforeSnapshot?.contractCategory,
    status: r?.status,
  }
})

const isFramework = computed(
  () =>
    (record.value?.contractType || afterSnapshot.value.contractType) === CONTRACT_TYPE.FRAMEWORK,
)

const changeMetaItems = computed(() => {
  const r = record.value || {}
  const display = (val) =>
    val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
  return [
    { key: 'status', label: '变更单状态', value: display(r.status) },
    { key: 'creator', label: '发起人', value: display(r.creator) },
    { key: 'createdAt', label: '发起时间', value: display(r.createdAt) },
    { key: 'approvedBy', label: '审核人', value: display(r.approvedBy) },
    { key: 'approvedAt', label: '审核时间', value: display(r.approvedAt) },
  ]
})

const quota = computed(() => {
  const base = record.value?.contractId ? getSalesContractById(record.value.contractId) : null
  return getContractQuotaSummary(base || displayContract.value)
})

const canEdit = computed(
  () =>
    record.value &&
    (record.value.status === CONTRACT_CHANGE_STATUS.DRAFT ||
      record.value.status === CONTRACT_CHANGE_STATUS.REJECTED),
)
const canSubmit = computed(() => canEdit.value)
const canApprove = computed(
  () => record.value && record.value.status === CONTRACT_CHANGE_STATUS.PENDING,
)
const canWithdraw = computed(
  () => record.value && record.value.status === CONTRACT_CHANGE_STATUS.PENDING,
)
const canCancel = computed(
  () =>
    record.value &&
    (record.value.status === CONTRACT_CHANGE_STATUS.DRAFT ||
      record.value.status === CONTRACT_CHANGE_STATUS.REJECTED),
)

const changeApprovalGroups = computed(() =>
  record.value ? buildContractChangeApprovalGroups([record.value]) : [],
)

const priceColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '规格', key: 'specModel', width: 120 },
  { title: '材质', key: 'material', width: 90 },
  { title: '单位', key: 'unit', width: 70 },
  { title: '税率(%)', key: 'taxRate', width: 90 },
  { title: '协议单价(未税)', key: 'agreementUnitPriceExTax', width: 130 },
  { title: '协议折扣', key: 'discount', width: 100 },
]

const nodeColumns = [
  { title: '节点名称', dataIndex: 'name', width: 140 },
  { title: '比例', key: 'ratio', width: 110 },
  { title: '金额', key: 'amount', width: 120 },
]

const lineColumns = computed(() => {
  const taxInclusive = afterSnapshot.value?.taxInclusive !== false
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

const diffColumns = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '变更前', dataIndex: 'beforeText' },
  { title: '变更后', dataIndex: 'afterText' },
]

const diffRows = computed(() => {
  if (!record.value) return []
  return formatContractChangeDiffRows(
    diffContractSnapshots(record.value.beforeSnapshot, record.value.afterSnapshot),
  )
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function refresh() {
  tick.value += 1
}

watch(
  () => route.params.id,
  () => {
    activeTab.value = 'overview'
    refresh()
  },
)

function goBack() {
  router.push('/contracts/changes')
}

function openEdit() {
  const path = `/contracts/changes/${record.value.id}/edit`
  openTab(path, `编辑变更 ${record.value.changeNo || ''}`.trim())
  router.push(path)
}

function openApprove() {
  const path = `/contracts/changes/${record.value.id}/approve`
  openTab(path, `审核变更 ${record.value.changeNo || ''}`.trim())
  router.push(path)
}

function handleSubmit() {
  const res = submitContractChange(record.value.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message || '已提交审核')
  refresh()
}

function handleWithdraw() {
  Modal.confirm({
    title: '撤回变更单',
    content: `确认撤回「${record.value.changeNo}」？撤回后变为草稿，可继续编辑或作废。`,
    onOk: () => {
      const res = withdrawContractChange(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已撤回为草稿')
      refresh()
    },
  })
}

function handleCancel() {
  Modal.confirm({
    title: '作废变更单',
    content: `确认作废变更「${record.value.changeNo}」？`,
    okType: 'danger',
    onOk: () => {
      const res = cancelContractChange(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已作废')
      refresh()
    },
  })
}
</script>

<style lang="less" scoped>
.contract-change-detail-page {
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

.change-info-section {
  padding: 4px 0;
}

@label-width: 96px;

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-full {
  grid-column: 1 / -1;

  .field-value.reason-value {
    white-space: pre-wrap;
    word-break: break-word;
    overflow: visible;
    text-overflow: unset;
  }
}
</style>
