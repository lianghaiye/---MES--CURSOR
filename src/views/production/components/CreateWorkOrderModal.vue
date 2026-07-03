<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1280px"
    :mask-closable="false"
    destroy-on-close
    class="create-work-order-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form :model="form" class="work-order-form" :required-mark="true">
      <div class="header-fields">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="工单编号">
              <a-input
                v-model:value="form.code"
                allow-clear
                size="small"
                placeholder="留空则按规则自动生成"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="工单名称">
              <a-input
                v-model:value="form.name"
                allow-clear
                size="small"
                placeholder="留空则按规则自动生成"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="工单类型">
              <a-select
                v-model:value="form.orderCategory"
                size="small"
                :options="orderCategoryOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="销售订单">
              <a-input-group compact>
                <a-input
                  :value="form.salesOrderNo"
                  readonly
                  size="small"
                  style="width: calc(100% - 72px)"
                  placeholder="请选择销售订单"
                />
                <a-button size="small" @click="salesOrderPickerOpen = true">选择</a-button>
              </a-input-group>
            </a-form-item>
          </a-col>
        </a-row>
        <div v-if="form.salesOrderNo" class="sales-order-summary">
          {{ form.salesOrderNo }} / {{ form.customerName || '-' }} / {{ form.salesperson || '-' }}
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">生产明细</div>

        <a-row :gutter="[12, 12]" class="section-form-row production-detail-row">
          <a-col :span="12">
            <a-form-item
              label="产品名称"
              name="productName"
              :rules="[{ required: true, message: '请选择产品' }]"
            >
              <ProductMaterialSelect
                v-model="form.productName"
                placeholder="请选择产品"
                @select="onProductSelect"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item
              label="工艺路线"
              name="processRouteName"
              :rules="[{ required: true, message: '请选择工艺路线' }]"
            >
              <a-select
                v-model:value="form.processRouteName"
                size="small"
                placeholder="请选择工艺路线"
                :options="routeOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="物料清单">
              <WorkOrderBomSelect
                v-model:bom-id="form.bomId"
                :product-id="form.productId"
                placeholder="请选择物料清单"
                @select="onBomSelect"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12" class="qty-col">
            <div class="qty-inline-row">
              <a-form-item label="计划数量" class="qty-field">
                <a-input-number v-model:value="form.planQty" :min="0" size="small" />
              </a-form-item>
              <a-form-item
                label="排产数量"
                name="scheduleQty"
                class="qty-field"
                :rules="[{ required: true, message: '请填写排产数量' }]"
              >
                <a-input-number v-model:value="form.scheduleQty" :min="0" size="small" />
              </a-form-item>
            </div>
          </a-col>

          <a-col v-if="showProductInfoBox" :span="24">
            <div class="product-info-box">
              <div class="info-grid-row">
                <div v-for="item in productCompactItems" :key="item.key" class="info-grid-cell">
                  <span class="info-label">{{ item.label }}</span>
                  <span class="info-value">{{ item.value }}</span>
                </div>
              </div>
              <div class="info-row">
                <span class="info-label">技术参数</span>
                <span class="info-value">{{ displayAutoField(form.techParams) }}</span>
              </div>
              <div class="info-row multiline-row">
                <span class="info-label">配套要求</span>
                <span class="info-value">{{ displayAutoField(form.matchingRequirements) }}</span>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <div class="section-block">
        <div class="section-title">生产安排</div>
        <a-row :gutter="[12, 12]" class="section-form-row arrangement-form-row">
          <a-col :span="6">
            <a-form-item
              label="工作中心"
              name="workCenter"
              :rules="[{ required: true, message: '请选择工作中心' }]"
            >
              <a-select
                v-model:value="form.workCenter"
                size="small"
                :options="workCenterOpts"
                style="width: 100%"
                @change="onWorkCenterChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="负责人">
              <WorkOrderOwnerSelect v-model="form.owner" placeholder="请选择负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="预入仓库">
              <a-select
                v-model:value="form.warehouse"
                size="small"
                :options="warehouseOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="紧急度">
              <a-select
                v-model:value="form.urgency"
                size="small"
                :options="urgencyOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item
              label="计划日期"
              name="planDateRange"
              :rules="[{ required: true, message: '请选择计划日期' }]"
            >
              <a-range-picker v-model:value="form.planDateRange" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="工单备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="3"
                size="small"
                placeholder="请输入工单备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </a-form>

    <a-tabs v-model:active-key="activeTab" class="detail-tabs">
      <a-tab-pane key="components" tab="组件">
        <a-table
          :columns="componentColumns"
          :data-source="componentLines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 'max-content' }"
          class="component-table"
        >
          <template #bodyCell="{ column, record, index, text }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'requiredQty'">
              {{ formatQty(record.requiredQty) }}
            </template>
            <template v-else-if="column.key === 'unitQty'">
              {{ formatQty(record.unitQty) }}
            </template>
            <template v-else-if="column.key === 'stockQty'">
              {{ formatQty(record.stockQty) }}
            </template>
            <template v-else-if="column.dataIndex">
              {{ displayCell(text) }}
            </template>
          </template>
          <template #emptyText>
            <span class="empty-hint">请选择产品后自动带出物料清单</span>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="operations" tab="作业">
        <a-empty description="作业内容后续补充" />
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" @click="handleSubmit">确定</a-button>
    </template>
  </FormCreateShell>

  <SalesOrderSelectModal v-model:open="salesOrderPickerOpen" @confirm="onSalesOrderPicked" />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { workCenterOptions, urgencyOptions, resolveWorkCenterOwner } from '@/mock/workOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByProductName } from '@/utils/warehouseResolver'
import { createWorkOrderPayload, workOrderState } from '@/store/workOrderStore'
import { isDuplicateOrderCode, generateProductionWorkOrderName } from '@/utils/workOrderNaming'
import { buildProcessesFromRoute, getActiveRouteOptions } from '@/mock/processRoutes'
import {
  applyBomSelectionToForm,
  applyPickerItemToForm,
  applyProductMasterToForm,
  buildWorkOrderComponentLines,
  findProductMasterByName,
  resolveProductActiveBom,
} from '@/utils/workOrderFormHelpers'
import { buildWorkOrderCreateExtras } from '@/utils/workOrderBasicFields'
import { findSalesOrderByOrderNo, getSalesOrderById } from '@/store/salesOrderStore'
import { getProductBomById } from '@/store/productBomStore'
import ProductMaterialSelect from './ProductMaterialSelect.vue'
import WorkOrderBomSelect from './WorkOrderBomSelect.vue'
import WorkOrderOwnerSelect from './WorkOrderOwnerSelect.vue'
import SalesOrderSelectModal from './SalesOrderSelectModal.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'created', 'updated'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/production/work-orders',
  getTitle: () => (isEdit.value ? '编辑工单' : '新增工单'),
})

const salesOrderPickerOpen = ref(false)
const activeTab = ref('components')
const componentLines = ref([])
const lastPlanQty = ref(1)
const productSelected = ref(false)
const syncingProductBom = ref(false)

const form = reactive({
  code: '',
  name: '',
  orderCategory: '生产工单',
  salesOrderId: '',
  salesOrderNo: '',
  customerName: '',
  salesperson: '',
  productName: '',
  productId: '',
  materialCode: '',
  specModel: '',
  material: '',
  drawingNo: '',
  techParams: '',
  matchingRequirements: '',
  bomLabel: '',
  bomId: '',
  processRouteName: undefined,
  planQty: 1,
  scheduleQty: 1,
  workCenter: '默认工厂',
  owner: resolveWorkCenterOwner('默认工厂'),
  warehouse: undefined,
  urgency: '普通',
  planDateRange: null,
  remark: '',
})

const componentColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'itemName', width: 160 },
  { title: '编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 120 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '图号', dataIndex: 'drawingNo', width: 100 },
  { title: '供应型态', dataIndex: 'supplyForm', width: 96 },
  { title: '单位', dataIndex: 'unit', width: 72, align: 'center' },
  { title: '单位用量', key: 'unitQty', width: 96, align: 'right' },
  { title: '库存数', key: 'stockQty', width: 88, align: 'right' },
  { title: '需求数', key: 'requiredQty', width: 88, align: 'right' },
  { title: '备注', dataIndex: 'remark', width: 120 },
]

const routeOptions = computed(() => {
  const names = getActiveRouteOptions({ productName: form.productName })
  return names.map((v) => ({ label: v, value: v }))
})
const orderCategoryOpts = [
  { label: '生产工单', value: '生产工单' },
  { label: '外协工单', value: '外协工单' },
]
const productCompactItems = computed(() => [
  { key: 'specModel', label: '规格型号', value: displayAutoField(form.specModel) },
  { key: 'material', label: '材质', value: displayAutoField(form.material) },
  { key: 'drawingNo', label: '图号', value: displayAutoField(form.drawingNo) },
])
const showProductInfoBox = computed(() =>
  Boolean(String(form.productName || '').trim() || form.bomId),
)
const workCenterOpts = computed(() => workCenterOptions.map((v) => ({ label: v, value: v })))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const urgencyOpts = computed(() => urgencyOptions.map((v) => ({ label: v, value: v })))

function formatQty(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '-'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function displayAutoField(value) {
  if (!showProductInfoBox.value) return ''
  const text = String(value ?? '').trim()
  return text || '-'
}

function displayCell(value) {
  const text = String(value ?? '').trim()
  return text || '-'
}

function syncSalesOrderMeta(orderNo, orderId) {
  const order = (orderId && getSalesOrderById(orderId)) || findSalesOrderByOrderNo(orderNo) || null
  form.customerName = order?.customerName || ''
  form.salesperson = order?.salesperson || ''
}

function refreshComponentLines() {
  if (!form.bomId) {
    componentLines.value = []
    return
  }
  const bom = getProductBomById(form.bomId)
  componentLines.value = buildWorkOrderComponentLines(bom, form.scheduleQty)
}

function clearProductRelatedFields() {
  form.productId = ''
  form.materialCode = ''
  form.specModel = ''
  form.material = ''
  form.drawingNo = ''
  form.techParams = ''
  form.matchingRequirements = ''
  form.bomId = ''
  form.bomLabel = ''
  componentLines.value = []
}

function onProductSelect(item) {
  if (syncingProductBom.value) return
  if (!item) {
    productSelected.value = false
    clearProductRelatedFields()
    return
  }
  productSelected.value = true
  const result = applyPickerItemToForm(form, item)
  if (!result) {
    componentLines.value = []
    return
  }
  form.scheduleQty = form.planQty
  lastPlanQty.value = form.planQty
  form.warehouse = resolveDefaultWarehouseByProductName(result.master.name) || form.warehouse
  refreshComponentLines()
}

function onBomSelect(bom) {
  if (syncingProductBom.value) return
  syncingProductBom.value = true
  if (!bom?.id) {
    form.bomId = ''
    form.bomLabel = ''
    componentLines.value = []
    if (!form.productName?.trim()) {
      productSelected.value = false
    }
    syncingProductBom.value = false
    return
  }
  const result = applyBomSelectionToForm(form, bom.id)
  if (result?.master) {
    productSelected.value = true
    form.warehouse = resolveDefaultWarehouseByProductName(result.master.name) || form.warehouse
  }
  refreshComponentLines()
  syncingProductBom.value = false
}

function onSalesOrderPicked(order) {
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
  form.customerName = order.customerName || ''
  form.salesperson = order.salesperson || ''
}

function onWorkCenterChange(center) {
  form.owner = resolveWorkCenterOwner(center)
}

function resetForm() {
  productSelected.value = false
  form.code = ''
  form.name = ''
  form.orderCategory = '生产工单'
  form.salesOrderId = ''
  form.salesOrderNo = ''
  form.customerName = ''
  form.salesperson = ''
  form.productName = ''
  form.productId = ''
  form.materialCode = ''
  form.specModel = ''
  form.material = ''
  form.drawingNo = ''
  form.techParams = ''
  form.matchingRequirements = ''
  form.bomLabel = ''
  form.bomId = ''
  form.processRouteName = getActiveRouteOptions({})[0]
  form.planQty = 1
  form.scheduleQty = 1
  lastPlanQty.value = 1
  form.workCenter = '默认工厂'
  form.owner = resolveWorkCenterOwner('默认工厂')
  form.warehouse = undefined
  form.urgency = '普通'
  form.planDateRange = [dayjs(), dayjs().add(14, 'day')]
  form.remark = ''
  componentLines.value = []
  activeTab.value = 'components'
}

function loadEditRecord(wo) {
  form.code = wo.code || ''
  form.name = wo.name || ''
  form.orderCategory = wo.orderCategory || '生产工单'
  form.salesOrderId = wo.salesOrderId || ''
  form.salesOrderNo = wo.sourceOrderNo || ''
  if (form.salesOrderNo) {
    syncSalesOrderMeta(form.salesOrderNo, form.salesOrderId)
  } else {
    form.customerName = ''
    form.salesperson = ''
  }
  form.productName = wo.productName
  productSelected.value = Boolean(wo.productName)
  form.materialCode = wo.materialCode || ''
  form.processRouteName = wo.processRouteName
  form.planQty = wo.planQty
  form.scheduleQty = wo.scheduleQty
  lastPlanQty.value = wo.planQty
  form.workCenter = wo.workCenter
  form.owner = wo.owner || resolveWorkCenterOwner(wo.workCenter)
  form.warehouse = wo.warehouse
  form.urgency = wo.urgency
  form.remark = wo.remark || ''
  form.planDateRange =
    wo.planDateRange?.length === 2 ? [dayjs(wo.planDateRange[0]), dayjs(wo.planDateRange[1])] : null
  form.bomId = wo.bomId || ''
  form.specModel = wo.specModel || ''
  form.material = wo.material || ''
  form.drawingNo = wo.drawingNo || ''
  form.techParams = wo.techParams || ''
  form.matchingRequirements = wo.matchingRequirements || ''
  form.bomLabel = wo.bomLabel || wo.bom || ''
  form.customerName = wo.customerName || ''
  form.salesperson = wo.salesperson || ''
  if (form.salesOrderNo && !form.customerName) {
    syncSalesOrderMeta(form.salesOrderNo, form.salesOrderId)
  }

  if (wo.componentLines?.length) {
    componentLines.value = JSON.parse(JSON.stringify(wo.componentLines))
  } else {
    const product = findProductMasterByName(wo.productName)
    if (product) {
      applyProductMasterToForm(
        form,
        product,
        getProductBomById(form.bomId) || resolveProductActiveBom(product),
      )
      form.productName = wo.productName
      form.materialCode = wo.materialCode || product.code || ''
      productSelected.value = true
      refreshComponentLines()
    } else {
      productSelected.value = Boolean(wo.productName)
      refreshComponentLines()
    }
  }
}

watch(
  () => form.productName,
  (name) => {
    if (syncingProductBom.value) return
    if (!name?.trim()) {
      productSelected.value = false
      clearProductRelatedFields()
    }
  },
)

watch(
  () => form.planQty,
  (val, oldVal) => {
    if (form.scheduleQty === oldVal || form.scheduleQty === lastPlanQty.value) {
      form.scheduleQty = val
    }
    lastPlanQty.value = val
    refreshComponentLines()
  },
)

watch(
  () => form.scheduleQty,
  () => {
    refreshComponentLines()
  },
)

watch(
  () => isActive.value,
  (val) => {
    if (!val) return
    if (props.editRecord) {
      loadEditRecord(props.editRecord)
      return
    }
    resetForm()
  },
  { immediate: true },
)

function handleSubmit() {
  if (!form.productName?.trim()) {
    message.warning('请选择产品名称')
    return
  }
  if (!form.processRouteName) {
    message.warning('请选择工艺路线')
    return
  }
  if (form.scheduleQty == null || form.scheduleQty <= 0) {
    message.warning('请填写排产数量')
    return
  }
  if (!form.workCenter) {
    message.warning('请选择工作中心')
    return
  }
  if (form.planDateRange?.length !== 2) {
    message.warning('请选择计划日期')
    return
  }

  const planDateRange =
    form.planDateRange?.length === 2
      ? [form.planDateRange[0].format('YYYY-MM-DD'), form.planDateRange[1].format('YYYY-MM-DD')]
      : []

  const productName = form.productName.trim()
  const category = form.orderCategory || '生产工单'
  const customCode = form.code?.trim()
  if (
    customCode &&
    isDuplicateOrderCode(
      customCode,
      workOrderState.orders.map((o) => o.code),
      isEdit.value ? props.editRecord.code : '',
    )
  ) {
    message.warning('工单编号已存在，请更换')
    return
  }

  const bomValue = productName
  const createExtras = buildWorkOrderCreateExtras(form, componentLines.value)

  if (isEdit.value) {
    const routeChanged = props.editRecord.processRouteName !== form.processRouteName
    emit('updated', {
      id: props.editRecord.id,
      patch: {
        code: customCode || props.editRecord.code,
        productName,
        name: form.name?.trim() || generateProductionWorkOrderName(productName, category),
        orderCategory: category,
        skipEbom: category === '外协工单',
        processRouteName: form.processRouteName,
        planQty: form.planQty,
        scheduleQty: form.scheduleQty,
        workCenter: form.workCenter,
        owner: form.owner,
        bom: bomValue,
        warehouse: form.warehouse,
        urgency: form.urgency,
        planDateRange,
        remark: form.remark,
        salesOrderId: form.salesOrderId,
        sourceOrderNo: form.salesOrderNo,
        ...createExtras,
        ...(routeChanged ? { processes: buildProcessesFromRoute(form.processRouteName) } : {}),
      },
    })
    message.success('工单已更新')
    closeAfterSave()
    return
  }

  const wo = createWorkOrderPayload({
    code: customCode,
    name: form.name?.trim(),
    productName,
    orderCategory: category,
    processRouteName: form.processRouteName,
    planQty: form.planQty,
    scheduleQty: form.scheduleQty,
    workCenter: form.workCenter,
    owner: form.owner,
    bom: bomValue,
    warehouse: form.warehouse,
    urgency: form.urgency,
    planDateRange,
    remark: form.remark,
    source: form.salesOrderId ? 'sales-order' : 'manual',
    salesOrderId: form.salesOrderId,
    sourceOrderNo: form.salesOrderNo,
    ...createExtras,
  })

  emit('created', wo)
  message.success('工单创建成功')
  closeAfterSave()
}
</script>

<script>
export default { name: 'CreateWorkOrderModal' }
</script>

<style lang="less" scoped>
:global(.create-work-order-modal .ant-modal-body) {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.work-order-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 80px;
    max-width: 80px;
    padding-bottom: 0;
    overflow: visible;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
      justify-content: flex-end;

      &::before {
        margin-inline-end: 2px !important;
      }
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
    max-width: calc(100% - 80px);
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 80px;
      align-self: flex-start;

      > label {
        height: auto;
        line-height: 22px;
        padding-top: 4px;
      }
    }
  }
}

.section-form-row {
  width: 100%;

  :deep(.ant-col) {
    align-self: flex-start;
  }
}

.stacked-field {
  margin-top: 8px;
}

.header-fields {
  margin-bottom: 12px;

  :deep(.ant-form-item-label) {
    flex: 0 0 80px;
  }
}

.sales-order-summary {
  margin-top: 8px;
  margin-bottom: 4px;
  padding: 6px 10px;
  font-size: 13px;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 6px;
  line-height: 20px;
}

.section-block {
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.88);
    margin-bottom: 10px;
    padding-left: 2px;
  }
}

.production-detail-row {
  :deep(.ant-col) {
    align-self: flex-start;
  }
}

.qty-col {
  display: flex;
  justify-content: flex-start;
}

.qty-inline-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: flex-start;

  .qty-field {
    flex: 0 0 auto;
    width: auto;

    :deep(.ant-form-item) {
      width: auto;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 auto;
      max-width: none;
      padding-right: 6px;

      > label {
        width: auto;
      }
    }

    :deep(.ant-form-item-control) {
      flex: 0 0 auto;
      max-width: none;
    }

    :deep(.ant-input-number) {
      width: 88px;
    }
  }
}

.product-info-box {
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  box-sizing: border-box;

  &.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 72px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
  }

  .info-grid-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 12px;
    margin-bottom: 8px;
  }

  .info-grid-cell {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    line-height: 22px;
    font-size: 13px;

    .info-label {
      flex: 0 0 auto;
      color: rgba(0, 0, 0, 0.45);
      white-space: nowrap;
    }

    .info-value {
      flex: 1;
      min-width: 0;
      color: rgba(0, 0, 0, 0.88);
      word-break: break-all;
    }
  }

  .info-row {
    display: flex;
    gap: 8px;
    line-height: 22px;
    font-size: 13px;

    & + .info-row {
      margin-top: 8px;
    }

    &.multiline-row {
      align-items: flex-start;

      .info-value {
        max-height: 120px;
        overflow-y: auto;
        white-space: pre-wrap;
      }
    }
  }

  .info-label {
    flex: 0 0 64px;
    color: rgba(0, 0, 0, 0.45);
    white-space: nowrap;
  }

  .info-value {
    flex: 1;
    min-width: 0;
    color: rgba(0, 0, 0, 0.88);
    word-break: break-all;
  }
}

.detail-tabs {
  margin-top: 4px;

  :deep(.ant-tabs-nav) {
    margin-bottom: 8px;
  }
}

.component-table {
  :deep(.ant-table) {
    font-size: 13px;
  }

  :deep(.ant-table-cell) {
    white-space: nowrap;
  }
}

.empty-hint {
  color: rgba(0, 0, 0, 0.45);
}
</style>
