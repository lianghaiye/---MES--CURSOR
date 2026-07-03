<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="720px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form layout="inline" class="horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :span="12">
          <a-form-item label="销售单号" required>
            <a-select
              v-model:value="selectedSalesOrderId"
              show-search
              size="small"
              placeholder="请选择销售订单"
              :options="salesOrderOpts"
              @change="onSalesOrderChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客户名称">
            <a-input :value="customerName" disabled size="small" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <p class="hint">保存后将生成待质检任务，可在列表中点击「质检」录入结果。</p>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">确定</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { salesOrderState } from '@/store/salesOrderStore'
import { addFactoryQc, findQcBySalesOrderNo, generateFactoryQcNo } from '@/store/factoryQcStore'
import { createQcLineItem } from '@/mock/factoryQcRecords'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/quality/factory-qc',
  getTitle: () => '新增出厂质检',
})

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
  isActive,
  (val) => {
    if (val) selectedSalesOrderId.value = undefined
  },
  { immediate: true },
)

function onSalesOrderChange() {
  /* reactive via computed */
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
  closeAfterSave()
}
</script>

<style scoped>
.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}
</style>
