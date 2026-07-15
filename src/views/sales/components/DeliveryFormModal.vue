<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="apply-delivery-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="section-block">
      <div class="section-title">发货信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="源销售订单" required>
              <a-select
                v-if="!salesOrderLocked"
                v-model:value="form.salesOrderId"
                show-search
                placeholder="请选择 销售订单"
                size="small"
                :options="salesOrderOpts"
                @change="onSalesOrderChange"
              />
              <a-input v-else :value="form.salesOrderNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="发货单号">
              <a-input
                v-model:value="form.deliveryCode"
                size="small"
                placeholder="可自定义，未填则按系统规则生成"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户名称" required>
              <a-select
                v-model:value="form.customerName"
                size="small"
                placeholder="请选择 客户名称"
                :options="customerOpts"
                @change="onCustomerChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货方式" required>
              <a-select
                v-model:value="form.shipmentMethod"
                size="small"
                placeholder="请选择 交货方式"
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
        :scroll="{ x: 2400 }"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'shipProgress'">
            <span>
              发货进度
              <a-tooltip :title="SHIP_PROGRESS_TOOLTIP">
                <QuestionCircleOutlined class="th-tip-icon" />
              </a-tooltip>
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'lineShipStatus'">
            <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
              {{ record.lineShipStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            {{
              formatShipProgress(
                record.confirmedOutboundQty ?? record.shippedQty,
                record.appliedShipQty ?? record.shippedQty,
                record.orderQty,
              )
            }}
          </template>
          <template v-else-if="column.key === 'orderQty'">
            {{ formatDeliveryQty(record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatDeliveryPrice(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatDeliveryPrice(record.unitPriceInTax) }}
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
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="onLineCalc(record)"
            />
          </template>
          <template v-else-if="column.key === 'shipWeight'">
            <a-input-number
              v-model:value="record.shipWeight"
              size="small"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
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
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="onLineCalc(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryAmountExTax'">
            {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'lineRemark'">
            <a-input v-model:value="record.lineRemark" size="small" placeholder="请输入" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="form.lineItems.splice(index, 1)">
                删除
              </a-button>
            </a-space>
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
        :scroll="{ x: 2300 }"
        v-model:expanded-row-keys="expandedScatterRowKeys"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'shipProgress'">
            <span>
              发货进度
              <a-tooltip :title="SHIP_PROGRESS_TOOLTIP">
                <QuestionCircleOutlined class="th-tip-icon" />
              </a-tooltip>
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'lineShipStatus'">
            <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
              {{ record.lineShipStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            {{
              formatShipProgress(
                record.confirmedOutboundQty ?? record.shippedQty,
                record.appliedShipQty ?? record.shippedQty,
                record.orderQty,
              )
            }}
          </template>
          <template v-else-if="column.key === 'orderQty'">
            {{ formatDeliveryQty(record.orderQty) }}
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            {{ formatDeliveryPrice(record.unitPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            {{ formatDeliveryPrice(record.unitPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'deliveryMode'">
            <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
              {{ record.deliveryMode || '散件' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'shipWeight'">
            <a-input-number
              v-model:value="record.shipWeight"
              size="small"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="onScatterLinePriceChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryUnitPriceExTax'">
            <a-input-number
              v-model:value="record.deliveryUnitPriceExTax"
              size="small"
              :min="0"
              :precision="4"
              :formatter="deliveryDecimalFormatter"
              :parser="deliveryDecimalParser"
              style="width: 100%"
              @change="onScatterLinePriceChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryAmountExTax'">
            {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
          </template>
          <template v-else-if="column.key === 'lineRemark'">
            <a-input v-model:value="record.lineRemark" size="small" placeholder="请输入" />
          </template>
          <template v-else-if="column.key === 'scatterAction'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openScatterLineEdit(record)"
                >编辑</a-button
              >
              <a-button type="link" size="small" @click="openScatterDrawer(record)">
                选择发运物料
              </a-button>
            </a-space>
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

    <DeliveryLineEditModal
      v-model:open="lineEditOpen"
      :line="lineEditTarget"
      :show-ship-qty="lineEditShowShipQty"
      @saved="onLineEditSaved"
    />

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" :loading="saving" @click="handleOk">确定</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  customerOptions,
  shipmentMethodOptions,
  outboundWarehouseOptions,
} from '@/mock/salesOrderOptions'
import {
  generateDeliveryCode,
  salesOrderState,
  addDeliveryApplication,
} from '@/store/salesOrderStore'
import { getCustomerByName } from '@/store/customerStore'
import { createDeliveryOrder, updateDeliveryOrder } from '@/store/deliveryOrderStore'
import {
  mapSalesLineToDeliveryLine,
  recalcDeliveryLine,
  formatDeliveryQty,
  formatDeliveryPrice,
  formatShipProgress,
  lineShipStatusColor,
  SHIP_PROGRESS_TOOLTIP,
  deliveryDecimalFormatter,
  deliveryDecimalParser,
  roundDeliveryDecimal,
} from '@/utils/deliveryLine'
import {
  getSelectedMaterialPicks,
  initScatterShipment,
  refreshScatterShipmentMeta,
  removeMaterialPickFromShipment,
  sumSelectedShipQty,
} from '@/utils/shipEbom'
import ScatterShipDrawer from './ScatterShipDrawer.vue'
import DeliveryLineEditModal from './DeliveryLineEditModal.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'

const props = defineProps({
  open: Boolean,
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
  /** create=发货管理新增；apply=销售订单申请发货 */
  mode: { type: String, default: 'create' },
  initialSalesOrderId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved', 'confirmed'])

const isApplyMode = computed(() => props.mode === 'apply')
const isEdit = computed(() => Boolean(props.record?.id))
/** 编辑或已从销售订单带入时，锁定源销售订单 */
const salesOrderLocked = computed(
  () => isEdit.value || isApplyMode.value || Boolean(props.initialSalesOrderId),
)
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/sales/delivery',
  getTitle: () => (isEdit.value ? '编辑发货单' : '新增发货单'),
})
const saving = ref(false)
const scatterDrawerOpen = ref(false)
const activeScatterShipment = ref(null)
const expandedScatterRowKeys = ref([])
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditShowShipQty = ref(true)

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '发货状态', key: 'lineShipStatus', width: 88, align: 'center' },
  { title: '发货进度', key: 'shipProgress', width: 160, align: 'right' },
  { title: '编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 88 },
  { title: '材质', dataIndex: 'material', width: 72 },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '订单数量', key: 'orderQty', width: 96, align: 'right' },
  { title: '单价（不含税）', key: 'unitPriceExTax', width: 120, align: 'right' },
  { title: '单价（含税）', key: 'unitPriceInTax', width: 110, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56, align: 'center' },
  { title: '本次发货数量', key: 'shipQty', width: 120, align: 'right' },
  { title: '发货重量', key: 'shipWeight', width: 110, align: 'right' },
  { title: '本次发货单价（不含税）', key: 'deliveryUnitPriceExTax', width: 150, align: 'right' },
  { title: '发货总额', key: 'deliveryAmountExTax', width: 100, align: 'right' },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '备注', key: 'lineRemark', width: 120 },
  { title: '操作', key: 'action', width: 110, fixed: 'right' },
]

const scatterLineColumns = computed(() =>
  lineColumns
    .filter((c) => c.key !== 'shipQty')
    .map((c) =>
      c.key === 'action' ? { title: '操作', key: 'scatterAction', width: 180, fixed: 'right' } : c,
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
  salesOrderId: undefined,
  salesOrderNo: '',
  deliveryCode: '',
  customerName: undefined,
  shipmentMethod: undefined,
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

function normalizeShipmentMethod(value) {
  const map = {
    送货上门: '送货',
    专车配送: '送货',
  }
  const normalized = map[value] || value
  return shipmentMethodOptions.includes(normalized) ? normalized : undefined
}

function resolveDefaultShipmentMethod(customerName, fallback) {
  const customer = getCustomerByName(customerName)
  return (
    normalizeShipmentMethod(customer?.defaultDeliveryMethod) ||
    normalizeShipmentMethod(fallback) ||
    '物流'
  )
}

const salesOrderOpts = computed(() =>
  (salesOrderState.orders || []).map((o) => ({
    label: `${o.orderNo} · ${o.customerName || ''}`,
    value: o.id,
  })),
)

const contactOpts = computed(() => {
  const customer = customerOptions.find((c) => c.value === form.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

watch(
  () => [isActive.value, props.initialSalesOrderId, props.mode, props.record?.id],
  ([active]) => {
    if (!active) return
    if (props.record) {
      loadFromRecord(props.record)
      return
    }
    if (isApplyMode.value) {
      const soId = props.initialSalesOrderId
      // 切回标签时保留用户已填内容；仅在订单变化时重载
      if (form.salesOrderId || form.lineItems.length) {
        if (soId && form.salesOrderId && soId !== form.salesOrderId) {
          resetForm()
          const so = salesOrderState.orders.find((o) => o.id === soId)
          if (so) {
            form.salesOrderId = so.id
            populateFromSalesOrder(so)
          }
        }
        return
      }
      if (!soId) return
      resetForm()
      const so = salesOrderState.orders.find((o) => o.id === soId)
      if (so) {
        form.salesOrderId = so.id
        populateFromSalesOrder(so)
      }
      return
    }
    // 新增发货：已有编辑中内容则不重置（保活切签）
    if (form.salesOrderId || form.lineItems.length || form.deliveryCode) return
    resetForm()
  },
  { immediate: true },
)

function resetForm() {
  form.salesOrderId = undefined
  form.salesOrderNo = ''
  form.deliveryCode = ''
  form.customerName = undefined
  form.shipmentMethod = undefined
  form.logisticsNo = ''
  form.contactPerson = undefined
  form.contactPhone = ''
  form.deliveryDate = null
  form.deliveryAddress = ''
  form.applyOutbound = true
  form.outboundWarehouse = undefined
  form.driverName = ''
  form.driverPhone = ''
  form.plateNo = ''
  form.remark = ''
  form.lineItems = []
  form.scatterShipments = []
  expandedScatterRowKeys.value = []
}

function loadFromRecord(record) {
  form.salesOrderId = record.salesOrderId
  form.salesOrderNo = record.salesOrderNo || record.sourceOrderNo || ''
  form.deliveryCode = record.deliveryCode || ''
  form.customerName = record.customerName
  form.shipmentMethod = resolveDefaultShipmentMethod(record.customerName, record.shipmentMethod)
  form.logisticsNo = record.logisticsNo || ''
  form.contactPerson = record.contactPerson || undefined
  form.contactPhone = record.contactPhone || ''
  form.deliveryDate = record.documentDate ? dayjs(record.documentDate) : null
  form.deliveryAddress = record.deliveryAddress || ''
  form.applyOutbound = Boolean(record.applyOutbound)
  form.outboundWarehouse = record.outboundWarehouse || undefined
  form.driverName = record.driverName || ''
  form.driverPhone = record.driverPhone || ''
  form.plateNo = record.plateNo || ''
  form.remark = record.remark || ''
  form.lineItems = JSON.parse(JSON.stringify(record.lineItems || [])).map((line) => {
    line.shipWeight = roundDeliveryDecimal(line.shipWeight ?? line.itemWeightKg ?? 0, 4)
    line.unitPriceInTax = roundDeliveryDecimal(line.unitPriceInTax ?? 0, 4)
    return line
  })
  form.scatterShipments = JSON.parse(JSON.stringify(record.scatterShipments || []))
  form.scatterShipments.forEach((s) => {
    s.shipWeight = roundDeliveryDecimal(s.shipWeight ?? s.itemWeightKg ?? 0, 4)
    s.unitPriceInTax = roundDeliveryDecimal(s.unitPriceInTax ?? 0, 4)
    refreshScatterShipmentMeta(s)
  })
  syncExpandedScatterRows()
}

function populateFromSalesOrder(so) {
  if (!so) return
  form.salesOrderNo = so.orderNo
  form.customerName = so.customerName
  form.contactPerson = so.contactPerson || undefined
  form.contactPhone = so.contactPhone || ''
  form.deliveryAddress = so.deliveryAddress || ''
  form.shipmentMethod = resolveDefaultShipmentMethod(so.customerName, so.deliveryMethod)
  form.lineItems = (so.lineItems || [])
    .map((line) => mapSalesLineToDeliveryLine(line, so))
    .filter(Boolean)
  form.scatterShipments = (so.lineItems || [])
    .map((line) => initScatterShipment(line, so))
    .filter(Boolean)
  form.scatterShipments.forEach((s) => refreshScatterShipmentMeta(s))
  syncExpandedScatterRows()
}

function onSalesOrderChange(id) {
  const so = salesOrderState.orders.find((o) => o.id === id)
  populateFromSalesOrder(so)
}

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

function openLineEdit(record) {
  lineEditTarget.value = record
  lineEditShowShipQty.value = true
  lineEditOpen.value = true
}

function openScatterLineEdit(record) {
  lineEditTarget.value = record
  lineEditShowShipQty.value = false
  lineEditOpen.value = true
}

function onLineEditSaved(updated) {
  const wholeIdx = form.lineItems.findIndex((line) => line.id === updated.id)
  if (wholeIdx !== -1) {
    Object.assign(form.lineItems[wholeIdx], updated)
    recalcDeliveryLine(form.lineItems[wholeIdx])
    return
  }
  const scatterIdx = form.scatterShipments.findIndex(
    (ship) => ship.salesLineId === updated.salesLineId || ship.id === updated.id,
  )
  if (scatterIdx !== -1) {
    Object.assign(form.scatterShipments[scatterIdx], updated)
    recalcDeliveryLine(form.scatterShipments[scatterIdx])
    refreshScatterShipmentMeta(form.scatterShipments[scatterIdx])
  }
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

function onCustomerChange(name) {
  form.customerName = name
  form.shipmentMethod = resolveDefaultShipmentMethod(name, form.shipmentMethod)
  form.contactPerson = undefined
  form.contactPhone = ''
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
    const maxQty = Number(line.orderQty) - Number(line.appliedShipQty ?? line.shippedQty ?? 0)
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

function handleOk() {
  if (!form.salesOrderId) {
    message.warning('请选择源销售订单')
    return
  }
  if (!form.customerName) {
    message.warning('请选择客户名称')
    return
  }
  if (!form.shipmentMethod) {
    message.warning('请选择交货方式')
    return
  }
  if (form.applyOutbound && !form.outboundWarehouse) {
    message.warning('请选择出库仓库')
    return
  }

  const hasWhole = form.lineItems.length > 0
  const hasScatter = form.scatterShipments.length > 0
  if (!hasWhole && !hasScatter) {
    message.warning('请选择销售订单并确认有可发运明细')
    return
  }

  if (hasWhole && !validateWholeMachineLines()) return
  if (hasScatter && !validateScatterShipments()) return

  form.lineItems.forEach(recalcDeliveryLine)

  const payload = {
    salesOrderId: form.salesOrderId,
    salesOrderNo: form.salesOrderNo,
    deliveryCode: form.deliveryCode?.trim() || generateDeliveryCode(),
    documentDate: form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : '',
    customerName: form.customerName,
    shipmentMethod: form.shipmentMethod,
    logisticsNo: form.logisticsNo,
    contactPerson: form.contactPerson || '',
    contactPhone: form.contactPhone,
    deliveryAddress: form.deliveryAddress,
    applyOutbound: form.applyOutbound,
    outboundWarehouse: form.outboundWarehouse,
    driverName: form.driverName,
    driverPhone: form.driverPhone,
    plateNo: form.plateNo,
    remark: form.remark,
    lineItems: JSON.parse(JSON.stringify(form.lineItems)),
    scatterShipments: JSON.parse(JSON.stringify(form.scatterShipments)),
  }

  saving.value = true
  try {
    if (isEdit.value) {
      updateDeliveryOrder(props.record.id, payload)
      const synced = props.record.deliveryStatus === '待出库' ? '，关联出库单已整单更新' : ''
      message.success(`已保存${synced}`)
      emit('saved')
    } else if (isApplyMode.value) {
      const wholeQty = (payload.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
      const scatterQty = (payload.scatterShipments || []).reduce(
        (s, ship) => s + sumSelectedShipQty(ship),
        0,
      )
      addDeliveryApplication(payload.salesOrderId, {
        ...payload,
        totalShipQty: wholeQty + scatterQty,
      })
      message.success('发货申请已记录')
      emit('confirmed', payload)
      emit('saved')
    } else {
      createDeliveryOrder(payload)
      message.success('发货单已创建')
      emit('saved')
    }
    closeAfterSave()
  } finally {
    saving.value = false
  }
}
</script>

<script>
export default { name: 'DeliveryFormModal' }
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

.th-tip-icon {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  cursor: help;
}
</style>
