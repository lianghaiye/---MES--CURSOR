<template>
  <div v-if="record" class="contract-detail-page">
    <div class="page-header">
      <div>
        <div class="title-row">
          <h2>{{ record.contractNo }}</h2>
          <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
          <a-tag>{{ record.contractType }}</a-tag>
        </div>
        <div class="sub">{{ record.contractName || '—' }} · {{ record.customerName }}</div>
      </div>
      <a-space>
        <a-button size="small" @click="goBack">返回</a-button>
        <a-button
          v-if="
            record.status === CONTRACT_STATUS.DRAFT || record.status === CONTRACT_STATUS.PENDING
          "
          size="small"
          @click="openEdit"
        >
          编辑
        </a-button>
        <a-button
          v-if="
            record.status === CONTRACT_STATUS.DRAFT || record.status === CONTRACT_STATUS.PENDING
          "
          type="primary"
          size="small"
          @click="handleApprove"
        >
          审核生效
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
      </a-space>
    </div>

    <a-card size="small" title="基本信息" class="block">
      <a-descriptions bordered size="small" :column="3">
        <a-descriptions-item label="客户">{{ record.customerName }}</a-descriptions-item>
        <a-descriptions-item label="有效期">
          {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="超额度策略">
          {{
            record.allowExceedQuota !== false ? '允许超额度（仅预警）' : '不允许超额度（仅预警）'
          }}
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
          quota.limitAmount != null ? quota.limitAmount : '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="已执行金额">{{ quota.executedAmount }}</a-descriptions-item>
        <a-descriptions-item label="剩余金额">{{
          quota.remainAmount != null ? quota.remainAmount : '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="额度数量">{{
          quota.limitQty != null ? quota.limitQty : '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="已执行数量">{{ quota.executedQty }}</a-descriptions-item>
        <a-descriptions-item label="剩余数量">{{
          quota.remainQty != null ? quota.remainQty : '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="3">{{ record.remark || '—' }}</a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card
      v-if="record.contractType === CONTRACT_TYPE.FRAMEWORK"
      size="small"
      title="产品协议价"
      class="block"
    >
      <a-table
        :columns="priceColumns"
        :data-source="record.priceItems || []"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'discount'">
            {{
              row.agreementDiscountRate != null
                ? `${Number((row.agreementDiscountRate * 100).toFixed(2))}%`
                : '—'
            }}
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="暂无协议价" />
        </template>
      </a-table>
    </a-card>

    <a-card
      v-if="record.contractType === CONTRACT_TYPE.STANDARD"
      size="small"
      title="合同明细"
      class="block"
    >
      <a-table
        :columns="lineColumns"
        :data-source="record.lineItems || []"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      />
    </a-card>

    <a-card size="small" title="回款计划" class="block">
      <a-table
        :columns="planColumns"
        :data-source="paymentPlan"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'overdue'">
            <a-tag v-if="row.overdue" color="error">逾期</a-tag>
            <span v-else>—</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card size="small" title="关联销售订单" class="block">
      <a-table
        :columns="orderColumns"
        :data-source="linkedOrders"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'orderNo'">
            <a @click="goOrder(row)">{{ row.orderNo }}</a>
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="暂无关联订单" />
        </template>
      </a-table>
    </a-card>

    <a-card size="small" title="扫描件" class="block">
      <div v-if="(record.attachments || []).length">
        <div v-for="file in record.attachments" :key="file.id || file.name">{{ file.name }}</div>
      </div>
      <a-empty v-else :image="false" description="暂无附件" />
    </a-card>

    <a-card size="small" title="变更记录" class="block">
      <a-table
        :columns="changeColumns"
        :data-source="changeList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'changeNo'">
            <a @click="goChangeList(row)">{{ row.changeNo }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="contractChangeStatusColor(row.status)">{{ row.status }}</a-tag>
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="暂无变更单" />
        </template>
      </a-table>
    </a-card>

    <SalesContractFormModal v-model:open="editOpen" :record="record" @saved="refresh" />
    <SalesContractChangeFormModal
      v-model:open="changeEditOpen"
      :record="changeEditRecord"
      @saved="onChangeSaved"
    />
  </div>
  <a-empty v-else description="合同不存在" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  approveSalesContract,
  getContractQuotaSummary,
  getOrdersLinkedToContract,
  getSalesContractById,
  terminateSalesContract,
} from '@/store/salesContractStore'
import { buildContractPaymentPlan } from '@/store/salesPaymentStore'
import {
  createContractChangeFromContract,
  listContractChangesByContract,
  salesContractChangeState,
} from '@/store/salesContractChangeStore'
import {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  contractChangeStatusColor,
  contractStatusColor,
} from '@/constants/salesContract'
import SalesContractFormModal from './components/SalesContractFormModal.vue'
import SalesContractChangeFormModal from './components/SalesContractChangeFormModal.vue'

const route = useRoute()
const router = useRouter()
const editOpen = ref(false)
const changeEditOpen = ref(false)
const changeEditRecord = ref(null)
const tick = ref(0)

const record = computed(() => {
  void tick.value
  return getSalesContractById(route.params.id)
})

const quota = computed(() => getContractQuotaSummary(record.value || {}))
const paymentPlan = computed(() => buildContractPaymentPlan(record.value))
const linkedOrders = computed(() => getOrdersLinkedToContract(record.value?.contractNo))
const changeList = computed(() => {
  void salesContractChangeState.changes
  void tick.value
  if (!record.value?.id) return []
  return listContractChangesByContract(record.value.id)
})

const priceColumns = [
  { title: '产品编码', dataIndex: 'productCode' },
  { title: '协议折扣', key: 'discount', width: 120 },
]

const lineColumns = [
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '产品名称', dataIndex: 'productName' },
  { title: '数量', dataIndex: 'qty', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '单价', dataIndex: 'unitPriceExTax', width: 110 },
  { title: '金额', dataIndex: 'amountExTax', width: 110 },
  { title: '交期', dataIndex: 'deliveryDate', width: 120 },
]

const planColumns = [
  { title: '节点', dataIndex: 'name', width: 120 },
  { title: '计划金额', dataIndex: 'planAmount', width: 110 },
  { title: '已回', dataIndex: 'paid', width: 100 },
  { title: '未回', dataIndex: 'unpaid', width: 100 },
  { title: '到期日', dataIndex: 'dueDate', width: 120 },
  { title: '逾期', key: 'overdue', width: 80 },
]

const orderColumns = [
  { title: '销售订单号', key: 'orderNo', width: 160 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '金额', dataIndex: 'totalAmountInTax', width: 120 },
  { title: '下单日期', dataIndex: 'orderDate', width: 120 },
]

const changeColumns = [
  { title: '变更单号', key: 'changeNo', width: 150 },
  { title: '状态', key: 'status', width: 90 },
  { title: '变更原因', dataIndex: 'reason', ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', width: 140 },
  { title: '生效时间', dataIndex: 'approvedAt', width: 140 },
]

function refresh() {
  tick.value += 1
}

watch(
  () => route.params.id,
  () => refresh(),
)

function goBack() {
  router.push('/sales/contracts')
}

function openEdit() {
  editOpen.value = true
}

function goOrder(row) {
  router.push(`/sales/orders/${row.id}`)
}

function handleApprove() {
  Modal.confirm({
    title: '审核生效',
    content: `确认将合同「${record.value.contractNo}」审核为生效中？`,
    onOk: () => {
      const res = approveSalesContract(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('合同已生效')
      refresh()
    },
  })
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

function handleCreateChange() {
  const res = createContractChangeFromContract(record.value.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  changeEditRecord.value = res.data
  changeEditOpen.value = true
  refresh()
}

function onChangeSaved() {
  refresh()
}

function goChangeList() {
  router.push('/sales/contract-changes')
}
</script>

<style scoped>
.contract-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    background: #fff;
    padding: 12px 16px;
    border-radius: 4px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title-row h2 {
    margin: 0;
    font-size: 18px;
  }
  .sub {
    margin-top: 4px;
    color: rgba(0, 0, 0, 0.45);
  }
  .block {
    margin-bottom: 12px;
  }
}
</style>
