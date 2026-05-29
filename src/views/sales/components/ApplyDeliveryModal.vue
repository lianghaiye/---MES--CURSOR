<template>
  <a-modal
    :open="open"
    title="申请发货"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-row :gutter="[16, 0]">
        <a-col :span="8">
          <a-form-item label="发货编码" required>
            <a-input-group compact>
              <a-input v-model:value="form.deliveryCode" style="width: calc(100% - 88px)" />
              <a-button @click="form.deliveryCode = generateDeliveryCode()">生成编码</a-button>
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="销售单号">
            <a-input :value="form.salesOrderNo" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="客户名称" required>
            <a-select v-model:value="form.customerName" :options="customerOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发货方式" required>
            <a-select v-model:value="form.shipmentMethod" :options="shipmentMethodOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="物流单号">
            <a-input v-model:value="form.logisticsNo" placeholder="请输入 物流单号" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="客户联系人">
            <a-select v-model:value="form.contactPerson" allow-clear :options="contactOpts" @change="onContactChange" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="客户联系方式">
            <a-input v-model:value="form.contactPhone" placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交货日期">
            <a-date-picker v-model:value="form.deliveryDate" style="width: 100%" placeholder="请选择 交货日期" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交货地址">
            <a-input v-model:value="form.deliveryAddress" placeholder="请输入 交货地址" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="申请出库">
            <a-switch v-model:checked="form.applyOutbound" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="出库仓库" :required="form.applyOutbound">
            <a-select
              v-model:value="form.outboundWarehouse"
              allow-clear
              placeholder="请选择 出库仓库"
              :options="warehouseOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="司机姓名">
            <a-input v-model:value="form.driverName" placeholder="请输入 司机姓名" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="司机联系方式">
            <a-input v-model:value="form.driverPhone" placeholder="请输入 司机联系方式" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="车牌号">
            <a-input v-model:value="form.plateNo" placeholder="请输入 车牌号" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" :rows="2" :maxlength="200" show-count placeholder="请输入 备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="lineColumns"
      :data-source="form.lineItems"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 900 }"
      class="product-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" danger @click="form.lineItems.splice(index, 1)">
            删除
          </a-button>
        </template>
        <template v-else>{{ record[column.dataIndex] || '-' }}</template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  customerOptions,
  shipmentMethodOptions,
  outboundWarehouseOptions,
} from '@/mock/salesOrderOptions'
import { generateDeliveryCode } from '@/store/salesOrderStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  salesOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', width: 130, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '规格型号', dataIndex: 'specModel', width: 90 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '技术参数', dataIndex: 'techParams', width: 90, ellipsis: true },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const form = reactive({
  deliveryCode: '',
  salesOrderNo: '',
  customerName: undefined,
  shipmentMethod: '物流',
  logisticsNo: '',
  contactPerson: undefined,
  contactPhone: '',
  deliveryDate: null,
  deliveryAddress: '',
  applyOutbound: true,
  outboundWarehouse: undefined,
  driverName: '',
  driverPhone: '',
  plateNo: '',
  remark: '',
  lineItems: [],
})

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const shipmentMethodOpts = shipmentMethodOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = outboundWarehouseOptions.map((v) => ({ label: v, value: v }))

const contactOpts = computed(() => {
  const customer = customerOptions.find((c) => c.value === form.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

watch(
  () => props.open,
  (val) => {
    if (!val || !props.salesOrder) return
    const so = props.salesOrder
    form.deliveryCode = generateDeliveryCode()
    form.salesOrderNo = so.orderNo
    form.customerName = so.customerName
    form.contactPerson = so.contactPerson
    form.contactPhone = so.contactPhone || ''
    form.deliveryAddress = so.deliveryAddress || ''
    form.shipmentMethod = so.deliveryMethod || '物流'
    form.deliveryDate = null
    form.applyOutbound = true
    form.outboundWarehouse = undefined
    form.driverName = ''
    form.driverPhone = ''
    form.plateNo = ''
    form.remark = ''
    form.lineItems = JSON.parse(JSON.stringify(so.lineItems || []))
  },
)

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.contactPhone = contact.phone
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.deliveryCode?.trim()) {
    message.warning('请生成发货编码')
    return
  }
  if (!form.customerName) {
    message.warning('请选择客户名称')
    return
  }
  if (!form.shipmentMethod) {
    message.warning('请选择发货方式')
    return
  }
  if (form.applyOutbound && !form.outboundWarehouse) {
    message.warning('请选择出库仓库')
    return
  }
  if (!form.lineItems.length) {
    message.warning('发货明细不能为空')
    return
  }

  emit('confirmed', {
    ...JSON.parse(JSON.stringify(form)),
    deliveryDate: form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : '',
    salesOrderId: props.salesOrder?.id,
  })
  message.success('发货申请已提交')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.product-table {
  margin-top: 12px;
}
</style>
