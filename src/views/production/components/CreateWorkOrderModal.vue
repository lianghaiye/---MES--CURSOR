<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑工单' : '新增工单'"
    width="840px"
    :mask-closable="false"
    destroy-on-close
    class="create-work-order-modal"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="inline" class="work-order-form horizontal-form">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :span="12">
          <a-form-item label="工单编号">
            <a-input
              v-model:value="form.code"
              allow-clear
              size="small"
              placeholder="留空则按规则自动生成"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工单名称">
            <a-input
              v-model:value="form.name"
              allow-clear
              size="small"
              placeholder="留空则按规则自动生成"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
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
        <a-col :span="12">
          <a-form-item label="生产品名" required>
            <ProductMaterialSelect
              v-model="form.productName"
              placeholder="请选择 产品"
              @select="onProductSelect"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工艺路线" required>
            <a-select
              v-model:value="form.processRouteName"
              size="small"
              placeholder="请选择工艺路线"
              :options="routeOptions"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计划数量">
            <a-input-number
              v-model:value="form.planQty"
              :min="0"
              size="small"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="排产数量">
            <a-input-number
              v-model:value="form.scheduleQty"
              :min="0"
              size="small"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工作中心">
            <a-select v-model:value="form.workCenter" size="small" :options="workCenterOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="BOM">
            <a-select
              v-model:value="form.bom"
              show-search
              allow-clear
              size="small"
              placeholder="请选择 BOM"
              :options="bomSelectOptions"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="预入仓库">
            <a-select v-model:value="form.warehouse" size="small" :options="warehouseOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="紧急度">
            <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="计划日期">
            <a-range-picker v-model:value="form.planDateRange" size="small" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea
              v-model:value="form.remark"
              :rows="3"
              size="small"
              placeholder="请输入备注"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSubmit">确定</a-button>
    </template>
  </a-modal>

  <SalesOrderSelectModal v-model:open="salesOrderPickerOpen" @confirm="onSalesOrderPicked" />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { workCenterOptions, urgencyOptions } from '@/mock/workOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByProductName } from '@/utils/warehouseResolver'
import { bomOptions } from '@/mock/workOrderMaster'
import { createWorkOrderPayload, workOrderState } from '@/store/workOrderStore'
import { isDuplicateOrderCode, generateProductionWorkOrderName } from '@/utils/workOrderNaming'
import { buildProcessesFromRoute, getActiveRouteOptions } from '@/mock/processRoutes'
import ProductMaterialSelect from './ProductMaterialSelect.vue'
import SalesOrderSelectModal from './SalesOrderSelectModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'created', 'updated'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const salesOrderPickerOpen = ref(false)

const form = reactive({
  code: '',
  name: '',
  salesOrderId: '',
  salesOrderNo: '',
  productName: '',
  processRouteName: undefined,
  planQty: 1,
  scheduleQty: 1,
  workCenter: '默认工厂',
  bom: undefined,
  warehouse: undefined,
  urgency: '普通',
  planDateRange: null,
  remark: '',
})

const routeOptions = computed(() => {
  const names = getActiveRouteOptions({ productName: form.productName })
  return names.map((v) => ({ label: v, value: v }))
})
const bomSelectOptions = computed(() => bomOptions.map((v) => ({ label: v, value: v })))
const workCenterOpts = computed(() => workCenterOptions.map((v) => ({ label: v, value: v })))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const urgencyOpts = computed(() => urgencyOptions.map((v) => ({ label: v, value: v })))

function onProductSelect() {
  if (!form.bom && form.productName) {
    form.bom = form.productName
  }
  const routes = getActiveRouteOptions({ productName: form.productName })
  if (routes.length && !routes.includes(form.processRouteName)) {
    form.processRouteName = routes[0]
  }
}

function onSalesOrderPicked(order) {
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
}

watch(
  () => form.productName,
  (name) => {
    if (!props.open || props.editRecord) return
    form.warehouse = resolveDefaultWarehouseByProductName(name?.trim()) || undefined
  },
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    if (props.editRecord) {
      const wo = props.editRecord
      form.code = wo.code || ''
      form.name = wo.name || ''
      form.salesOrderId = wo.salesOrderId || ''
      form.salesOrderNo = wo.sourceOrderNo || ''
      form.productName = wo.productName
      form.processRouteName = wo.processRouteName
      form.planQty = wo.planQty
      form.scheduleQty = wo.scheduleQty
      form.workCenter = wo.workCenter
      form.bom = wo.bom
      form.warehouse = wo.warehouse
      form.urgency = wo.urgency
      form.remark = wo.remark || ''
      form.planDateRange =
        wo.planDateRange?.length === 2
          ? [dayjs(wo.planDateRange[0]), dayjs(wo.planDateRange[1])]
          : null
      return
    }
    form.code = ''
    form.name = ''
    form.salesOrderId = ''
    form.salesOrderNo = ''
    form.productName = ''
    form.processRouteName = getActiveRouteOptions({})[0]
    form.planQty = 1
    form.scheduleQty = 1
    form.workCenter = '默认工厂'
    form.bom = undefined
    form.warehouse = undefined
    form.urgency = '普通'
    form.planDateRange = [dayjs(), dayjs().add(14, 'day')]
    form.remark = ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleSubmit() {
  if (!form.productName?.trim()) {
    message.warning('请选择生产品名')
    return
  }
  if (!form.processRouteName) {
    message.warning('请选择工艺路线')
    return
  }

  const planDateRange =
    form.planDateRange?.length === 2
      ? [form.planDateRange[0].format('YYYY-MM-DD'), form.planDateRange[1].format('YYYY-MM-DD')]
      : []

  const productName = form.productName.trim()
  const category = props.editRecord?.orderCategory || '生产工单'
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

  if (isEdit.value) {
    const routeChanged = props.editRecord.processRouteName !== form.processRouteName
    emit('updated', {
      id: props.editRecord.id,
      patch: {
        code: customCode || props.editRecord.code,
        productName,
        name: form.name?.trim() || generateProductionWorkOrderName(productName, category),
        processRouteName: form.processRouteName,
        planQty: form.planQty,
        scheduleQty: form.scheduleQty,
        workCenter: form.workCenter,
        bom: form.bom || form.productName.trim(),
        warehouse: form.warehouse,
        urgency: form.urgency,
        planDateRange,
        remark: form.remark,
        salesOrderId: form.salesOrderId,
        sourceOrderNo: form.salesOrderNo,
        ...(routeChanged ? { processes: buildProcessesFromRoute(form.processRouteName) } : {}),
      },
    })
    message.success('工单已更新')
    emit('update:open', false)
    return
  }

  const wo = createWorkOrderPayload({
    code: customCode,
    name: form.name?.trim(),
    productName,
    processRouteName: form.processRouteName,
    planQty: form.planQty,
    scheduleQty: form.scheduleQty,
    workCenter: form.workCenter,
    bom: form.bom || form.productName.trim(),
    warehouse: form.warehouse,
    urgency: form.urgency,
    planDateRange,
    remark: form.remark,
    source: form.salesOrderId ? 'sales-order' : 'manual',
    salesOrderId: form.salesOrderId,
    sourceOrderNo: form.salesOrderNo,
  })

  emit('created', wo)
  message.success('工单创建成功')
  emit('update:open', false)
}
</script>

<script>
export default { name: 'CreateWorkOrderModal' }
</script>

<style lang="less" scoped>
.work-order-form {
  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.ant-form-item-label > label) {
    min-width: 72px;
    justify-content: flex-end;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;

    > label {
      height: auto;
      line-height: 22px;
      padding-top: 4px;
    }
  }
}
</style>
