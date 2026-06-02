<template>
  <a-modal
    :open="open"
    title="新增出厂质检"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-form-item label="销售单号" required>
        <a-select
          v-model:value="selectedSalesOrderId"
          show-search
          placeholder="请选择销售订单"
          :options="salesOrderOpts"
          @change="onSalesOrderChange"
        />
      </a-form-item>
      <a-form-item label="客户名称">
        <a-input :value="customerName" disabled />
      </a-form-item>
    </a-form>
    <p class="hint">保存后将生成待质检任务，可在列表中点击「质检」录入结果。</p>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import { addFactoryQc, findQcBySalesOrderNo, generateFactoryQcNo } from '@/store/factoryQcStore'
import { createQcLineItem } from '@/mock/factoryQcRecords'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const selectedSalesOrderId = ref(undefined)

const salesOrderOpts = computed(() =>
  salesOrderState.orders
    .filter((o) => o.progressStatus === '已审')
    .map((o) => ({ label: `${o.orderNo} · ${o.customerName}`, value: o.id })),
)

const selectedOrder = computed(() =>
  salesOrderState.orders.find((o) => o.id === selectedSalesOrderId.value),
)

const customerName = computed(() => selectedOrder.value?.customerName || '')

watch(
  () => props.open,
  (val) => {
    if (val) selectedSalesOrderId.value = undefined
  },
)

function onSalesOrderChange() {
  /* reactive via computed */
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  const order = selectedOrder.value
  if (!order) {
    message.warning('请选择销售单号')
    return
  }
  if (!order.lineItems?.length) {
    message.warning('该销售订单无明细，无法新增质检任务')
    return
  }
  if (findQcBySalesOrderNo(order.orderNo)) {
    message.warning('该销售单已存在出厂质检任务')
    return
  }

  const record = {
    id: `fqc-${Date.now()}`,
    qcStatus: '待质检',
    qcResult: '',
    qcNo: generateFactoryQcNo(),
    salesOrderNo: order.orderNo,
    sourceOrderNo: order.orderNo,
    customerName: order.customerName,
    source: '销售发货',
    inspector: '',
    inspectedAt: '',
    outboundDocNo: '',
    inspectMethod: '抽检',
    inspectDate: dayjs().format('YYYY-MM-DD'),
    remark: '',
    lineItems: order.lineItems.map((line) =>
      createQcLineItem({
        itemName: line.productName,
        itemCode: line.productCode,
        specModel: line.specModel,
        shipQty: line.salesQty || line.qty,
        shipWarehouse: '成品仓',
        unit: line.unit,
        inspectQty: line.salesQty || line.qty,
      }),
    ),
  }

  addFactoryQc(record)
  message.success('已新增待质检任务')
  emit('saved')
  emit('update:open', false)
}
</script>

<style scoped>
.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}
</style>
