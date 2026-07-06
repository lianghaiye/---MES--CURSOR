<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form :model="form" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="工单编号">
            <a-input v-model:value="form.code" allow-clear placeholder="留空则按规则自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工单名称">
            <a-input v-model:value="form.name" allow-clear placeholder="留空则按规则自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="产品名称" required>
            <a-input v-model:value="form.productName" placeholder="请输入产品名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="销售订单号">
            <a-input v-model:value="form.sourceOrderNo" placeholder="请输入销售订单号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工艺路线" required>
            <a-select
              v-model:value="form.processRouteName"
              placeholder="请选择工艺路线"
              :options="routeOptions"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计划数量">
            <a-input-number v-model:value="form.planQty" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工作中心">
            <a-select v-model:value="form.workCenter" :options="workCenterOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="BOM">
            <a-select
              v-model:value="form.bom"
              show-search
              allow-clear
              placeholder="请选择 BOM"
              :options="bomSelectOptions"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="预入仓库">
            <a-select v-model:value="form.warehouse" :options="warehouseOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="紧急度">
            <a-select v-model:value="form.urgency" :options="urgencyOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="计划日期">
            <a-range-picker v-model:value="form.planDateRange" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" :rows="3" placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button size="small" @click="onShellCancel">取消</a-button>
      <a-button type="primary" size="small" @click="handleSubmit">确定</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { workCenterOptions, urgencyOptions } from '@/mock/workOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByProductName } from '@/utils/warehouseResolver'
import { bomOptions } from '@/mock/workOrderMaster'
import { createQcWorkOrderPayload, qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { isDuplicateOrderCode, generateQcWorkOrderName } from '@/utils/workOrderNaming'
import { buildProcessesFromRoute, getActiveRouteOptions } from '@/mock/processRoutes'
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

const {
  isActive,
  shellTitle,
  handleCancel: onShellCancel,
  goBack,
} = useFormCreateModal(props, emit, {
  listPath: '/production/qc-work-orders',
  getTitle: () => (isEdit.value ? '编辑质检工单' : '新增质检工单'),
})

function finishSave() {
  if (props.pageMode) {
    goBack()
    return
  }
  emit('update:open', false)
}

const form = reactive({
  code: '',
  name: '',
  productName: '',
  sourceOrderNo: '',
  processRouteName: undefined,
  planQty: 1,
  workCenter: '质检中心',
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

watch(
  () => form.productName,
  (name) => {
    if (!isActive.value || props.editRecord) return
    form.warehouse = resolveDefaultWarehouseByProductName(name?.trim()) || undefined
  },
)

watch(
  () => isActive.value,
  (val) => {
    if (!val) return
    if (props.editRecord) {
      const wo = props.editRecord
      form.code = wo.code || ''
      form.name = wo.name || ''
      form.productName = wo.productName
      form.sourceOrderNo = wo.sourceOrderNo || ''
      form.processRouteName = wo.processRouteName
      form.planQty = wo.planQty
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
    form.productName = ''
    form.sourceOrderNo = ''
    form.processRouteName = getActiveRouteOptions({})[0]
    form.planQty = 1
    form.workCenter = '质检中心'
    form.bom = undefined
    form.warehouse = undefined
    form.urgency = '普通'
    form.planDateRange = [dayjs(), dayjs().add(14, 'day')]
    form.remark = ''
  },
  { immediate: true },
)

function handleSubmit() {
  if (!form.productName?.trim()) {
    message.warning('请输入产品名称')
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
  const customCode = form.code?.trim()
  if (
    customCode &&
    isDuplicateOrderCode(
      customCode,
      qcWorkOrderState.orders.map((o) => o.code),
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
        name: form.name?.trim() || generateQcWorkOrderName(productName),
        sourceOrderNo: form.sourceOrderNo?.trim() || '',
        processRouteName: form.processRouteName,
        planQty: form.planQty,
        scheduleQty: form.planQty,
        workCenter: form.workCenter,
        bom: form.bom || productName,
        warehouse: form.warehouse,
        urgency: form.urgency,
        planDateRange,
        remark: form.remark,
        ...(routeChanged ? { processes: buildProcessesFromRoute(form.processRouteName) } : {}),
      },
    })
    message.success('质检工单已更新')
    finishSave()
    return
  }

  const wo = createQcWorkOrderPayload({
    code: customCode,
    name: form.name?.trim(),
    productName,
    sourceOrderNo: form.sourceOrderNo?.trim() || '',
    processRouteName: form.processRouteName,
    planQty: form.planQty,
    scheduleQty: form.planQty,
    workCenter: form.workCenter,
    bom: form.bom || form.productName.trim(),
    warehouse: form.warehouse,
    urgency: form.urgency,
    planDateRange,
    remark: form.remark,
    source: 'manual',
  })

  emit('created', wo)
  message.success('质检工单创建成功')
  finishSave()
}
</script>
