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
            <a-form-item label="出库仓库">
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

    <div v-if="form.lineItems.length" class="section-block">
      <div class="section-title">整机发货</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1960 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'lineShipStatus'">
            <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
              {{ record.lineShipStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            {{ formatShipProgress(record.shippedQty, record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'orderQty'">
            {{ formatDeliveryQty(record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatDeliveryPrice(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'deliveryMode'">
            <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
              {{ record.deliveryMode || '整机' }}
            </a-tag>
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
            <a-tooltip title="发货单价按申请时订单有效价锁定，改价请走订单价格变更">
              <span class="price-locked-wrap">
                <a-input-number
                  v-model:value="record.deliveryUnitPriceExTax"
                  size="small"
                  :min="0"
                  :precision="4"
                  style="width: 100%"
                  disabled
                  @change="onLineCalc(record)"
                />
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'deliveryAmountExTax'">
            {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
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

    <div v-if="form.scatterShipments.length" class="section-block">
      <div class="section-title">散件发运</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="scatterLineColumns"
        :data-source="form.scatterShipments"
        row-key="salesLineId"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1848 }"
        v-model:expanded-row-keys="expandedScatterRowKeys"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'lineShipStatus'">
            <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
              {{ record.lineShipStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            {{ formatScatterShipProgress(record) }}
          </template>
          <template v-else-if="column.key === 'orderQty'">
            {{ formatDeliveryQty(record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatDeliveryPrice(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'deliveryMode'">
            <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
              {{ record.deliveryMode || '散件' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'deliveryUnitPriceExTax'">
            <a-tooltip title="发货单价按申请时订单有效价锁定，改价请走订单价格变更">
              <span class="price-locked-wrap">
                <a-input-number
                  v-model:value="record.deliveryUnitPriceExTax"
                  size="small"
                  :min="0"
                  :precision="4"
                  style="width: 100%"
                  disabled
                  @change="onScatterLinePriceChange(record)"
                />
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'deliveryAmountExTax'">
            {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'lineRemark'">
            <a-input v-model:value="record.lineRemark" size="small" placeholder="请输入" />
          </template>
          <template v-else-if="column.key === 'scatterAction'">
            <a-button type="link" size="small" @click="openScatterDrawer(record)">
              选择发运物料
            </a-button>
          </template>
          <template v-else>{{ displayCell(record, column) }}</template>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="scatter-picks-panel">
            <div class="scatter-picks-title">已选发运物料</div>
            <a-table
              v-if="selectedMaterialPicks(record).length"
              :columns="scatterPickColumns"
              :data-source="selectedMaterialPicks(record)"
              :row-key="(r) => r.materialId"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: mat }">
                <template v-if="column.key === 'pickAction'">
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click="removeScatterMaterialPick(record, mat)"
                  >
                    删除
                  </a-button>
                </template>
              </template>
            </a-table>
            <a-empty v-else description="请点击「选择发运物料」勾选 EBOM" :image="false" />
            <div v-if="record.remark" class="scatter-line-remark">
              发运备注：{{ record.remark }}
            </div>
          </div>
        </template>
      </a-table>
    </div>

    <ScatterShipDrawer
      v-model:open="scatterDrawerOpen"
      :shipment="activeScatterShipment"
      @save="onScatterDrawerSave"
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  customerOptions,
  shipmentMethodOptions,
  outboundWarehouseOptions,
} from '@/mock/salesOrderOptions'
import { generateDeliveryCode } from '@/store/salesOrderStore'
import { getPendingPriceChangeDeliveryBlock } from '@/store/salesPriceChangeStore'
import {
  mapSalesLineToDeliveryLine,
  recalcDeliveryLine,
  formatDeliveryQty,
  formatDeliveryPrice,
  formatShipProgress,
  lineShipStatusColor,
} from '@/utils/deliveryLine'
import {
  formatScatterShipProgress,
  getSelectedMaterialPicks,
  initScatterShipment,
  refreshScatterShipmentMeta,
  removeMaterialPickFromShipment,
} from '@/utils/shipEbom'
import ScatterShipDrawer from './ScatterShipDrawer.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  salesOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const scatterDrawerOpen = ref(false)
const activeScatterShipment = ref(null)
const expandedScatterRowKeys = ref([])

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '发货状态', key: 'lineShipStatus', width: 88, align: 'center' },
  { title: '发货进度', key: 'shipProgress', width: 110, align: 'right' },
  { title: '编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72 },
  { title: '变体属性', dataIndex: 'specAttr', width: 88 },
  { title: '订单数量', key: 'orderQty', width: 88, align: 'right' },
  { title: '单价', key: 'unitPriceExTax', width: 96, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56, align: 'center' },
  { title: '本次发货数量', key: 'shipQty', width: 112, align: 'right' },
  { title: '发货单价（不含税）', key: 'deliveryUnitPriceExTax', width: 168, align: 'right' },
  { title: '发货总额', key: 'deliveryAmountExTax', width: 100, align: 'right' },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '备注', key: 'lineRemark', width: 120 },
  { title: '操作', key: 'action', width: 64, fixed: 'right' },
]

const scatterLineColumns = computed(() =>
  lineColumns
    .filter((c) => c.key !== 'shipQty')
    .map((c) =>
      c.key === 'action' ? { title: '操作', key: 'scatterAction', width: 108, fixed: 'right' } : c,
    ),
)

const scatterPickColumns = [
  { title: '物料名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 100, ellipsis: true },
  { title: '需求数量', dataIndex: 'demandQty', width: 88, align: 'right' },
  { title: '可用库存', dataIndex: 'availableStock', width: 88, align: 'right' },
  { title: '本次发运', dataIndex: 'shipQty', width: 88, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '供应型态', dataIndex: 'supplyType', width: 88 },
  { title: '操作', key: 'pickAction', width: 64, align: 'center' },
]

const form = reactive({
  deliveryCode: '',
  salesOrderNo: '',
  customerName: undefined,
  shipmentMethod: '送货',
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
  scatterShipments: [],
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
    form.shipmentMethod = so.deliveryMethod || '送货'
    form.deliveryDate = null
    form.applyOutbound = true
    form.outboundWarehouse = undefined
    form.driverName = ''
    form.driverPhone = ''
    form.plateNo = ''
    form.remark = ''
    form.lineItems = (so.lineItems || [])
      .map((line) => mapSalesLineToDeliveryLine(line, so))
      .filter(Boolean)
    form.scatterShipments = (so.lineItems || [])
      .map((line) => initScatterShipment(line, so))
      .filter(Boolean)
    form.scatterShipments.forEach((s) => refreshScatterShipmentMeta(s))
    syncExpandedScatterRows()
  },
)

function selectedMaterialPicks(record) {
  return getSelectedMaterialPicks(record)
}

function syncExpandedScatterRows() {
  expandedScatterRowKeys.value = form.scatterShipments
    .filter((s) => getSelectedMaterialPicks(s).length > 0)
    .map((s) => s.salesLineId)
}

function openScatterDrawer(ship) {
  activeScatterShipment.value = ship
  scatterDrawerOpen.value = true
}

function onScatterLinePriceChange(record) {
  recalcDeliveryLine(record)
}

function onScatterDrawerSave(payload) {
  if (!activeScatterShipment.value) return
  Object.assign(activeScatterShipment.value, payload)
  refreshScatterShipmentMeta(activeScatterShipment.value)
  const id = activeScatterShipment.value.salesLineId
  if (
    getSelectedMaterialPicks(activeScatterShipment.value).length &&
    !expandedScatterRowKeys.value.includes(id)
  ) {
    expandedScatterRowKeys.value = [...expandedScatterRowKeys.value, id]
  }
  syncExpandedScatterRows()
}

function removeScatterMaterialPick(shipment, mat) {
  removeMaterialPickFromShipment(shipment, mat.materialId)
  syncExpandedScatterRows()
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

function validateWholeMachineLines() {
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
      message.warning(
        `「${line.productName}」本次发货数量不能超过可发数量 ${formatDeliveryQty(maxQty)}`,
      )
      return false
    }
  }
  return true
}

function validateScatterShipments() {
  for (const ship of form.scatterShipments) {
    if (!getSelectedMaterialPicks(ship).length) {
      message.warning(`散件行「${ship.productName}」请选择发运物料`)
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
  const block = getPendingPriceChangeDeliveryBlock(props.salesOrder?.id)
  if (block) {
    message.warning(block)
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

  const hasWhole = form.lineItems.length > 0
  const hasScatter = form.scatterShipments.length > 0
  if (!hasWhole && !hasScatter) {
    message.warning('本单无整机或散件可发运明细')
    return
  }

  if (hasWhole && !validateWholeMachineLines()) return
  if (hasScatter && !validateScatterShipments()) return

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

.price-locked-wrap {
  display: block;
  width: 100%;
}

.scatter-picks-panel {
  margin: 4px 0 8px 48px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px dashed #e8e8e8;
  border-radius: 4px;
}

.scatter-picks-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.88);
}

.scatter-line-remark {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

:deep(.ant-table-expanded-row > .ant-table-cell) {
  padding: 8px 12px !important;
  background: #fff;
}

:deep(.ant-table-cell) {
  .ant-input-number {
    width: 100%;
  }
}
</style>
