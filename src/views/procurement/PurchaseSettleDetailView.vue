<template>
  <div class="purchase-settle-detail">
    <div class="page-header">
      <div class="title-row">
        <a-button type="link" @click="goBack">返回</a-button>
        <h2>{{ record?.settleNo || '采购结算详情' }}</h2>
        <a-tag v-if="record" :color="record.status === '已确认' ? 'green' : 'default'">{{
          record.status
        }}</a-tag>
      </div>
      <a-space v-if="record?.status === '草稿'">
        <a-button type="primary" @click="onConfirm">确认结算</a-button>
        <a-button danger @click="onDelete">删除</a-button>
      </a-space>
    </div>

    <a-empty v-if="!record" description="结算单不存在" />
    <template v-else>
      <DetailSectionCard title="基本信息">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="结算单号">{{ record.settleNo }}</a-descriptions-item>
          <a-descriptions-item label="生成方式">{{
            record.generateMode === 'period' ? '账期' : '采购单'
          }}</a-descriptions-item>
          <a-descriptions-item label="供应商">{{ record.supplier || '—' }}</a-descriptions-item>
          <a-descriptions-item label="采购单号">{{ displayPoNos }}</a-descriptions-item>
          <a-descriptions-item label="结算周期">{{
            record.settlementCycle || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="账期">{{ record.periodKey || '—' }}</a-descriptions-item>
          <a-descriptions-item label="账期窗口">
            <template v-if="record.periodStart && record.periodEnd">
              {{ record.periodStart }} ~ {{ record.periodEnd }}
            </template>
            <template v-else>—</template>
          </a-descriptions-item>
          <a-descriptions-item label="结算日期">{{ record.settleDate }}</a-descriptions-item>
          <a-descriptions-item label="结算金额">{{
            formatMoney(record.totalAmount)
          }}</a-descriptions-item>
          <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="3">{{
            record.remark || '—'
          }}</a-descriptions-item>
        </a-descriptions>
      </DetailSectionCard>

      <DetailSectionCard title="结算明细">
        <template v-if="groupedLines.length">
          <div v-for="group in groupedLines" :key="group.poKey" class="po-group">
            <div class="po-group-title">
              采购单 {{ group.purchaseOrderNo || '—' }}
              <span class="po-group-amount">小计 {{ formatMoney(group.amount) }}</span>
            </div>
            <a-table
              :columns="columns"
              :data-source="group.lines"
              row-key="id"
              size="small"
              :pagination="false"
              :scroll="{ x: 900 }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'amount'">
                  {{ formatMoney(row.amount) }}
                </template>
                <template v-else-if="column.key === 'settleQty' || column.key === 'unitPrice'">
                  {{ formatMoney(row[column.dataIndex]) }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
          </div>
        </template>
        <a-empty v-else description="暂无明细" />
      </DetailSectionCard>
    </template>
  </div>
</template>

<script>
export default { name: 'PurchaseSettleDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getPurchaseSettleById,
  confirmPurchaseSettle,
  deletePurchaseSettle,
  purchaseSettleState,
} from '@/store/purchaseSettleStore'
import { formatNumber } from '@/utils/numberFormat'

const route = useRoute()
const router = useRouter()

const record = computed(() => {
  void purchaseSettleState.settles
  return getPurchaseSettleById(String(route.params.id || ''))
})

const displayPoNos = computed(() => {
  const row = record.value
  if (!row) return '—'
  if (row.purchaseOrderNos?.length) return row.purchaseOrderNos.join('、')
  return row.purchaseOrderNo || '—'
})

const groupedLines = computed(() => {
  const lines = record.value?.lineItems || []
  const map = new Map()
  lines.forEach((line) => {
    const poNo = line.purchaseOrderNo || record.value?.purchaseOrderNo || '未关联采购单'
    const poId = line.purchaseOrderId || record.value?.purchaseOrderId || poNo
    const key = poId || poNo
    if (!map.has(key)) {
      map.set(key, {
        poKey: key,
        purchaseOrderId: poId,
        purchaseOrderNo: poNo,
        lines: [],
        amount: 0,
      })
    }
    const g = map.get(key)
    g.lines.push(line)
    g.amount += Number(line.amount) || 0
  })
  return [...map.values()]
})

const columns = [
  { title: '入库单号', dataIndex: 'inboundDocNo', key: 'inboundDocNo', width: 140 },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '结算单位', dataIndex: 'settleUnit', key: 'settleUnit', width: 80 },
  { title: '结算数量', dataIndex: 'settleQty', key: 'settleQty', width: 100, align: 'right' },
  { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', width: 100, align: 'right' },
  { title: '金额', key: 'amount', width: 110, align: 'right' },
]

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 4)
}

function goBack() {
  router.push('/procurement/purchase-settles')
}

function onConfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `确认结算单 ${row.settleNo}？`,
    content: '确认后将占用入库行的结算数量，不可撤销。',
    okText: '确认',
    onOk() {
      const res = confirmPurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function onDelete() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: `删除结算单 ${row.settleNo}？`,
    okText: '删除',
    okType: 'danger',
    onOk() {
      const res = deletePurchaseSettle(row.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      goBack()
    },
  })
}
</script>

<style lang="less" scoped>
.purchase-settle-detail {
  padding: 0;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
}
.po-group {
  margin-bottom: 16px;
}
.po-group-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.po-group-amount {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
</style>
