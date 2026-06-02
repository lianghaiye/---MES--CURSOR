<template>
  <a-modal
    :open="open"
    title="申请发货"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="apply-delivery-modal"
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">发货信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="发货编码" required>
              <a-input-group compact>
                <a-input
                  v-model:value="form.deliveryCode"
                  size="small"
                  style="width: calc(100% - 80px)"
                />
                <a-button size="small" @click="form.deliveryCode = generateDeliveryCode()">
                  生成编码
                </a-button>
              </a-input-group>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="销售单号">
              <a-input :value="form.salesOrderNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户名称" required>
              <a-select
                v-model:value="form.customerName"
                size="small"
                placeholder="请选择 客户名称"
                :options="customerOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="发货方式" required>
              <a-select
                v-model:value="form.shipmentMethod"
                size="small"
                placeholder="请选择 发货方式"
                :options="shipmentMethodOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="物流单号">
              <a-input
                v-model:value="form.logisticsNo"
                size="small"
                placeholder="请输入 物流单号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户联系人">
              <a-select
                v-model:value="form.contactPerson"
                allow-clear
                size="small"
                placeholder="请选择 客户联系人"
                :options="contactOpts"
                @change="onContactChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户联系方式">
              <a-input v-model:value="form.contactPhone" size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期">
              <a-date-picker
                v-model:value="form.deliveryDate"
                size="small"
                style="width: 100%"
                placeholder="请选择 交货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货地址">
              <a-input
                v-model:value="form.deliveryAddress"
                size="small"
                placeholder="请输入 交货地址"
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
                placeholder="请选择 出库仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="司机姓名">
              <a-input v-model:value="form.driverName" size="small" placeholder="请输入 司机姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="司机联系方式">
              <a-input
                v-model:value="form.driverPhone"
                size="small"
                placeholder="请输入 司机联系方式"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="车牌号">
              <a-input v-model:value="form.plateNo" size="small" placeholder="请输入 车牌号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                size="small"
                placeholder="请输入 备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">发货明细</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 3200 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>

          <template v-else-if="column.key === 'orderQty'">
            {{ formatDeliveryQty(record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'productUnitPrice'">
            {{ formatDeliveryPrice(record.productUnitPrice) }}
          </template>
          <template v-else-if="column.key === 'shippedQty'">
            {{ formatDeliveryQty(record.shippedQty) }}
          </template>

          <template v-else-if="column.key === 'shipQty'">
            <a-input-number
              v-model:value="record.shipQty"
              size="small"
              :min="0"
              :precision="3"
              style="width: 100%"
              @change="onLineCalc(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryUnitPriceExTax'">
            <a-input-number
              v-model:value="record.deliveryUnitPriceExTax"
              size="small"
              :min="0"
              :precision="4"
              style="width: 100%"
              @change="onLineCalc(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryAmountExTax'">
            {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'itemWeightKg'">
            <a-input-number
              v-model:value="record.itemWeightKg"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'plannedDeliveryDate'">
            <a-date-picker
              :value="lineDateValue(record.plannedDeliveryDate)"
              size="small"
              style="width: 100%"
              placeholder="请选择"
              @change="(d) => onLineDateChange(record, d)"
            />
          </template>
          <template v-else-if="column.key === 'lineRemark'">
            <a-input v-model:value="record.lineRemark" size="small" placeholder="请输入" />
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="form.lineItems.splice(index, 1)">
              删除
            </a-button>
          </template>

          <template v-else>{{ displayCell(record, column) }}</template>
        </template>
      </a-table>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  customerOptions,
  shipmentMethodOptions,
  outboundWarehouseOptions,
} from '@/mock/salesOrderOptions'
import { generateDeliveryCode } from '@/store/salesOrderStore'
import {
  mapSalesLineToDeliveryLine,
  recalcDeliveryLine,
  formatDeliveryQty,
  formatDeliveryPrice,
} from '@/utils/deliveryLine'

const props = defineProps({
  open: { type: Boolean, default: false },
  salesOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 130, ellipsis: true, fixed: 'left' },
  { title: '产品编码', dataIndex: 'productCode', width: 130, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 88 },
  { title: '规格型号', dataIndex: 'specModel', width: 88 },
  { title: '材质', dataIndex: 'material', width: 72 },
  { title: '技术参数', dataIndex: 'techParams', width: 90, ellipsis: true },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88 },
  { title: '类别', dataIndex: 'category', width: 88 },
  { title: '订单数量', key: 'orderQty', width: 96, align: 'right' },
  { title: '产品单价', key: 'productUnitPrice', width: 100, align: 'right' },
  { title: '已出库数量', key: 'shippedQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '本次发货数量', key: 'shipQty', width: 120, align: 'right' },
  { title: '发货单价（不含税）', key: 'deliveryUnitPriceExTax', width: 130, align: 'right' },
  { title: '本次发货总额', key: 'deliveryAmountExTax', width: 110, align: 'right' },
  { title: '物品重量(kg)', key: 'itemWeightKg', width: 110, align: 'right' },
  { title: '计划交期', key: 'plannedDeliveryDate', width: 120 },
  { title: '备注', key: 'lineRemark', width: 120 },
  { title: '操作', key: 'action', width: 64, fixed: 'right' },
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
    form.lineItems = (so.lineItems || []).map(mapSalesLineToDeliveryLine)
  },
)

function lineDateValue(str) {
  return str ? dayjs(str) : null
}

function onLineDateChange(record, date) {
  record.plannedDeliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function onLineCalc(record) {
  recalcDeliveryLine(record)
}

function displayCell(record, column) {
  const val = record[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '-'
}

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.contactPhone = contact.phone
}

function handleCancel() {
  emit('update:open', false)
}

function validateLineItems() {
  for (const line of form.lineItems) {
    const shipQty = Number(line.shipQty)
    if (!shipQty && shipQty !== 0) {
      message.warning(`「${line.productName}」请填写本次发货数量`)
      return false
    }
    if (shipQty <= 0) {
      message.warning(`「${line.productName}」本次发货数量须大于 0`)
      return false
    }
    const maxQty = Number(line.orderQty) - Number(line.shippedQty)
    if (shipQty > maxQty + 1e-9) {
      message.warning(`「${line.productName}」本次发货数量不能超过可发数量 ${formatDeliveryQty(maxQty)}`)
      return false
    }
  }
  return true
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
  if (!validateLineItems()) return

  form.lineItems.forEach(recalcDeliveryLine)

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
.section-block {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.section-divider {
  margin: 8px 0 12px;
}

:deep(.ant-table-cell) {
  .ant-input-number,
  .ant-picker {
    width: 100%;
  }
}
</style>
