<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑发货单' : '新增发货单'"
    width="720px"
    :confirm-loading="saving"
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-form :model="form" layout="vertical" class="delivery-form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="源销售订单" required>
            <a-select
              v-model:value="form.salesOrderId"
              show-search
              placeholder="请选择销售订单"
              size="small"
              :disabled="isEdit"
              :options="salesOrderOpts"
              @change="onSalesOrderChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="发货单号" required>
            <a-input v-model:value="form.deliveryCode" size="small" placeholder="自动生成可改" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单据日期">
            <a-date-picker v-model:value="form.documentDate" size="small" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客户名称">
            <a-input v-model:value="form.customerName" size="small" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发货方式">
            <a-select
              v-model:value="form.shipmentMethod"
              size="small"
              :options="shipmentMethodOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="申请出库">
            <a-switch v-model:checked="form.applyOutbound" size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="出库仓库" :required="form.applyOutbound">
            <a-select
              v-model:value="form.outboundWarehouse"
              allow-clear
              size="small"
              :options="warehouseOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="物流单号">
            <a-input v-model:value="form.logisticsNo" size="small" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="交货地址">
            <a-input v-model:value="form.deliveryAddress" size="small" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="联系人">
            <a-input v-model:value="form.contactPerson" size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="联系方式">
            <a-input v-model:value="form.contactPhone" size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="司机姓名">
            <a-input v-model:value="form.driverName" size="small" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="lines-header">
        <span class="lines-title">发货明细</span>
        <a-button type="link" size="small" @click="addLine">添加行</a-button>
      </div>
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'productName'">
            <a-input v-model:value="record.productName" size="small" placeholder="产品名称" />
          </template>
          <template v-else-if="column.key === 'shipQty'">
            <a-input-number
              v-model:value="record.shipQty"
              :min="1"
              size="small"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
          </template>
        </template>
      </a-table>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import { shipmentMethodOptions, outboundWarehouseOptions } from '@/mock/salesOrderOptions'
import { createDeliveryOrder, updateDeliveryOrder } from '@/store/deliveryOrderStore'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))
const saving = ref(false)

const shipmentMethodOpts = shipmentMethodOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = outboundWarehouseOptions.map((v) => ({ label: v, value: v }))

const form = reactive({
  salesOrderId: undefined,
  deliveryCode: '',
  documentDate: dayjs(),
  customerName: '',
  shipmentMethod: '物流',
  applyOutbound: false,
  outboundWarehouse: '成品仓',
  logisticsNo: '',
  deliveryAddress: '',
  contactPerson: '',
  contactPhone: '',
  driverName: '',
  driverPhone: '',
  plateNo: '',
  remark: '',
  lineItems: [],
})

const salesOrderOpts = computed(() =>
  (salesOrderState.orders || []).map((o) => ({
    label: `${o.orderNo} · ${o.customerName || ''}`,
    value: o.id,
  })),
)

const lineColumns = [
  { title: '产品名称', key: 'productName', width: 200 },
  { title: '发货数量', key: 'shipQty', width: 120 },
  { title: '操作', key: 'action', width: 72 },
]

watch(
  () => props.open,
  (v) => {
    if (!v) return
    if (props.record) {
      Object.assign(form, {
        salesOrderId: props.record.salesOrderId,
        deliveryCode: props.record.deliveryCode,
        documentDate: props.record.documentDate ? dayjs(props.record.documentDate) : dayjs(),
        customerName: props.record.customerName,
        shipmentMethod: props.record.shipmentMethod || '物流',
        applyOutbound: Boolean(props.record.applyOutbound),
        outboundWarehouse: props.record.outboundWarehouse || '成品仓',
        logisticsNo: props.record.logisticsNo || '',
        deliveryAddress: props.record.deliveryAddress || '',
        contactPerson: props.record.contactPerson || '',
        contactPhone: props.record.contactPhone || '',
        driverName: props.record.driverName || '',
        driverPhone: props.record.driverPhone || '',
        plateNo: props.record.plateNo || '',
        remark: props.record.remark || '',
        lineItems: JSON.parse(JSON.stringify(props.record.lineItems || [])),
      })
    } else {
      resetForm()
    }
  },
)

function resetForm() {
  form.salesOrderId = undefined
  form.deliveryCode = `SH${dayjs().format('YYYYMMDD')}${String(Date.now()).slice(-3)}`
  form.documentDate = dayjs()
  form.customerName = ''
  form.shipmentMethod = '物流'
  form.applyOutbound = false
  form.outboundWarehouse = '成品仓'
  form.logisticsNo = ''
  form.deliveryAddress = ''
  form.contactPerson = ''
  form.contactPhone = ''
  form.driverName = ''
  form.driverPhone = ''
  form.plateNo = ''
  form.remark = ''
  form.lineItems = []
}

function onSalesOrderChange(id) {
  const so = salesOrderState.orders.find((o) => o.id === id)
  if (!so) return
  form.customerName = so.customerName || ''
  form.contactPerson = so.contactPerson || ''
  form.contactPhone = so.contactPhone || ''
  form.deliveryAddress = so.deliveryAddress || ''
  if (!form.lineItems.length && so.lineItems?.length) {
    form.lineItems = so.lineItems.slice(0, 2).map((l) => ({
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productName: l.productName,
      productCode: l.productCode,
      shipQty: 1,
      deliveryAmountExTax: l.unitPriceExTax || 0,
      itemWeightKg: l.itemWeightKg || 0,
    }))
  }
}

function addLine() {
  form.lineItems.push({
    id: `dl-${Date.now()}`,
    productName: '',
    shipQty: 1,
    deliveryAmountExTax: 0,
    itemWeightKg: 0,
  })
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function handleOk() {
  if (!form.salesOrderId) {
    message.warning('请选择源销售订单')
    return
  }
  if (!form.deliveryCode?.trim()) {
    message.warning('请填写发货单号')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请添加发货明细')
    return
  }
  if (form.applyOutbound && !form.outboundWarehouse) {
    message.warning('请选择出库仓库')
    return
  }

  const payload = {
    ...form,
    documentDate: form.documentDate ? form.documentDate.format('YYYY-MM-DD') : '',
    lineItems: form.lineItems.map((l) => ({
      ...l,
      shipQty: Number(l.shipQty) || 0,
      deliveryAmountExTax: (Number(l.shipQty) || 0) * (Number(l.deliveryUnitPriceExTax) || 0),
    })),
  }

  if (isEdit.value) {
    updateDeliveryOrder(props.record.id, payload)
    const synced = props.record.deliveryStatus === '待出库' ? '，关联出库单已整单更新' : ''
    message.success(`已保存${synced}`)
  } else {
    createDeliveryOrder(payload)
    message.success('发货单已创建')
  }
  emit('saved')
  emit('update:open', false)
}
</script>

<script>
export default { name: 'DeliveryFormModal' }
</script>

<style lang="less" scoped>
.lines-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
}
.lines-title {
  font-weight: 600;
}
</style>
