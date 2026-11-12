<template>
  <a-modal
    :open="open"
    title="按供应商合并采购订单"
    :confirm-loading="submitting"
    ok-text="确认合并"
    cancel-text="取消"
    width="820px"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <template v-if="preview?.ok">
      <a-alert
        type="info"
        show-icon
        class="mb-12"
        :message="`供应商：${preview.supplierName}。将保留主单「${preview.primary?.orderNo}」，作废 ${preview.voidOrders?.length || 0} 张并迁入明细。`"
      />
      <div class="section-title">将被作废的订单</div>
      <a-table
        size="small"
        bordered
        :pagination="false"
        row-key="id"
        :columns="voidColumns"
        :data-source="preview.voidOrders || []"
      />
      <div class="section-title">合并后明细预览</div>
      <a-table
        size="small"
        bordered
        :pagination="false"
        row-key="id"
        :scroll="{ y: 280 }"
        :columns="lineColumns"
        :data-source="preview.lineItems || []"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'purchaseQty'">
            {{ formatQty(record.purchaseQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatQty(record.unitPriceInTax) }}
          </template>
        </template>
      </a-table>
    </template>
    <a-alert v-else-if="preview" type="error" show-icon :message="preview.message || '无法合并'" />
  </a-modal>
</template>

<script>
export default { name: 'MergePurchaseOrdersModal' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { previewMergePurchaseOrders, confirmMergePurchaseOrders } from '@/utils/purchaseOrderMerge'
import { formatQty } from '@/utils/numberFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  orderIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:open', 'merged'])

const submitting = ref(false)
const preview = ref(null)

const voidColumns = [
  { title: '采购单号', dataIndex: 'orderNo', width: 140 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 140 },
]

const lineColumns = [
  { title: '物料编码', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '规格', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '含税单价', key: 'unitPriceInTax', width: 100, align: 'right' },
  { title: '收货仓', dataIndex: 'receivingWarehouse', width: 110, ellipsis: true },
]

watch(
  () => [props.open, props.orderIds],
  () => {
    if (!props.open) {
      preview.value = null
      return
    }
    preview.value = previewMergePurchaseOrders(props.orderIds || [])
  },
  { immediate: true, deep: true },
)

const canSubmit = computed(() => Boolean(preview.value?.ok))

function handleOk() {
  if (!canSubmit.value) {
    message.warning(preview.value?.message || '无法合并')
    return
  }
  submitting.value = true
  try {
    const res = confirmMergePurchaseOrders(props.orderIds || [])
    if (!res.ok) {
      message.error(res.message || '合并失败')
      return
    }
    message.success(res.message || '合并成功')
    emit('update:open', false)
    emit('merged', res)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.mb-12 {
  margin-bottom: 12px;
}
.section-title {
  margin: 12px 0 8px;
  font-weight: 600;
}
</style>
