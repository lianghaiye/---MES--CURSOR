<template>
  <a-drawer
    :open="open"
    title="销售订单信息"
    width="640"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <template v-if="order">
      <div class="section-title">基础信息</div>
      <a-descriptions :column="2" size="small" bordered class="desc-block">
        <a-descriptions-item label="销售订单号">{{ order.orderNo || '—' }}</a-descriptions-item>
        <a-descriptions-item label="客户名称">{{ order.customerName || '—' }}</a-descriptions-item>
        <a-descriptions-item label="合同编号">{{ order.contractNo || '—' }}</a-descriptions-item>
        <a-descriptions-item label="业务员">{{
          order.salesperson || task?.salesperson || '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="初始关联BOM" :span="2">{{
          initialBomLabel
        }}</a-descriptions-item>
      </a-descriptions>

      <div class="section-title section-gap">销售明细</div>
      <template v-if="salesLine">
        <a-descriptions :column="2" size="small" bordered class="desc-block">
          <a-descriptions-item label="产品名称">{{
            salesLine.productName || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="产品编码">{{
            salesLine.productCode || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="规格型号">{{
            salesLine.specModel || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="业务类型">{{ lineBusinessType || '—' }}</a-descriptions-item>
          <a-descriptions-item label="产品属性">{{
            salesLine.productAttr || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="材质">{{ salesLine.material || '—' }}</a-descriptions-item>
          <a-descriptions-item label="交付方式">
            <a-tag :color="salesLine.deliveryMode === '散件' ? 'orange' : 'blue'">
              {{ salesLine.deliveryMode || '整机' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="交付日期">{{
            salesLine.deliveryDate || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="销售数量">{{
            salesLine.salesQty ?? '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="含税价">{{
            formatPrice(salesLine.unitPriceInTax)
          }}</a-descriptions-item>
          <a-descriptions-item label="技术参数" :span="2">{{
            salesLine.techParams || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="配套要求" :span="2">{{
            salesLine.matchingRequirements || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="补充说明" :span="2">{{
            salesLine.supplementDesc || salesLine.lineRemark || '—'
          }}</a-descriptions-item>
        </a-descriptions>

        <div class="section-title section-gap">图片文档信息</div>
        <a-table
          v-if="attachmentRows.length"
          :columns="attachmentColumns"
          :data-source="attachmentRows"
          row-key="key"
          size="small"
          bordered
          :pagination="false"
        />
        <a-empty v-else description="暂无图片或文档" />
      </template>
      <a-empty v-else description="未找到关联销售明细行" />
    </template>
    <a-empty v-else description="未找到关联销售订单" />
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { resolveLineBusinessType } from '@/utils/salesOrderBusiness'

const props = defineProps({
  open: Boolean,
  task: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const order = computed(() => findSalesOrderByOrderNo(props.task?.salesOrderNo))

const salesLine = computed(() => {
  const lineId = props.task?.salesLineId
  const lines = order.value?.lineItems || []
  if (lineId) {
    return lines.find((line) => line.id === lineId) || null
  }
  const code = props.task?.productCode
  return lines.find((line) => line.productCode === code) || lines[0] || null
})

const lineBusinessType = computed(() => {
  if (!salesLine.value || !order.value) return '—'
  return resolveLineBusinessType(salesLine.value, order.value)
})

const initialBomLabel = computed(() => {
  const line = salesLine.value
  if (!line) return '—'
  const label = `${line.bomName || ''}${line.bomVersion || ''}`.trim()
  return label || '—'
})

const attachmentRows = computed(() => {
  const rows = []
  const orderFiles = order.value?.attachments || []
  orderFiles.forEach((file, index) => {
    rows.push({
      key: `order-${file.uid || index}`,
      scope: '订单',
      name: file.name || '—',
      type: file.type || '—',
      uploadedAt: file.uploadedAt || '—',
    })
  })
  const lineFiles = salesLine.value?.lineAttachments?.length
    ? salesLine.value.lineAttachments
    : salesLine.value?.attachment
      ? [{ name: salesLine.value.attachment, type: '明细附件', uploadedAt: '—' }]
      : []
  lineFiles.forEach((file, index) => {
    rows.push({
      key: `line-${file.uid || index}`,
      scope: '明细',
      name: file.name || '—',
      type: file.type || '明细附件',
      uploadedAt: file.uploadedAt || '—',
    })
  })
  return rows
})

const attachmentColumns = [
  { title: '归属', dataIndex: 'scope', width: 72 },
  { title: '文件名', dataIndex: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'type', width: 88 },
  { title: '上传时间', dataIndex: 'uploadedAt', width: 140 },
]

function formatPrice(val) {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (Number.isNaN(num)) return '—'
  return `￥${num.toFixed(2)}`
}
</script>

<style lang="less" scoped>
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.section-gap {
  margin-top: 16px;
  margin-bottom: 8px;
}

.desc-block {
  margin-bottom: 0;
}
</style>
