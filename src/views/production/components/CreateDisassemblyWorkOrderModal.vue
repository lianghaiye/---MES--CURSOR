<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑拆解工单' : '新增拆解工单'"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <div class="section-title">基础信息</div>
    <a-form :model="form" layout="vertical">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="工单编号">
            <a-input v-model:value="form.code" size="small" placeholder="自动生成规则" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工单名称">
            <a-input v-model:value="form.name" size="small" placeholder="名称自动生成规则" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工单类型">
            <a-input value="拆解工单" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="物品名称" required>
            <a-select
              v-model:value="form.itemId"
              show-search
              option-filter-prop="label"
              placeholder="请选择"
              size="small"
              :options="itemOpts"
              @change="onItemChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="物品编码">
            <a-input v-model:value="form.itemCode" disabled size="small" placeholder="自动带出" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="规格型号">
            <a-input v-model:value="form.specModel" disabled size="small" placeholder="自动带出" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="材质">
            <a-input v-model:value="form.material" disabled size="small" placeholder="自动带出" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="BOM">
            <a-select
              v-model:value="form.bom"
              size="small"
              placeholder="自动带出当前物料关联的BOM"
              :options="bomOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工艺路线" required>
            <a-select
              v-model:value="form.processRouteName"
              size="small"
              placeholder="请选择工艺路线"
              :options="routeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="关联报废单号">
            <a-input-group compact>
              <a-input
                v-model:value="form.relatedScrapNo"
                readonly
                size="small"
                style="width: calc(100% - 72px)"
                placeholder="请选择"
              />
              <a-button size="small" @click="scrapModalOpen = true">选择</a-button>
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="预入仓库" required>
            <a-select
              v-model:value="form.warehouse"
              size="small"
              placeholder="请选择"
              :options="warehouseOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="标准生产周期">
            <a-input-number
              v-model:value="form.standardCycleDays"
              :min="1"
              size="small"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="工作中心" required>
            <a-select
              v-model:value="form.workCenter"
              size="small"
              placeholder="请选择"
              :options="workCenterOpts"
              @change="onWorkCenterChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="负责人" required>
            <a-select
              v-model:value="form.personInCharge"
              size="small"
              placeholder="自动带出车间负责人"
              :options="personOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="紧急度" required>
            <a-select
              v-model:value="form.urgency"
              size="small"
              placeholder="请选择"
              :options="urgencyOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="计划日期" required>
            <a-range-picker v-model:value="form.planDateRange" size="small" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="提醒日期">
            <a-date-picker v-model:value="form.reminderDate" size="small" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <SelectScrapOrderModal
      v-model:open="scrapModalOpen"
      :selected-id="form.relatedScrapId"
      @confirm="onScrapSelected"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  processRouteOptions,
  workCenterOptions,
  warehouseOptions,
  urgencyOptions,
  personInChargeOptions,
} from '@/mock/workOrderOptions'
import { productInfoState } from '@/store/productInfoStore'
import {
  disassemblyWorkOrderState,
  addDisassemblyWorkOrder,
  updateDisassemblyWorkOrder,
  resolvePersonInCharge,
} from '@/store/disassemblyWorkOrderStore'
import {
  generateDisassemblyOrderCode,
  generateDisassemblyOrderName,
} from '@/utils/disassemblyWorkOrder'
import SelectScrapOrderModal from './SelectScrapOrderModal.vue'

const props = defineProps({
  open: Boolean,
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const scrapModalOpen = ref(false)

const routeOpts = processRouteOptions.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const personOpts = personInChargeOptions.map((v) => ({ label: v, value: v }))

const itemOpts = computed(() =>
  productInfoState.products.map((p) => ({
    label: p.name,
    value: p.id,
    code: p.code,
    specModel: p.specModel,
    material: p.material,
    bom: p.bomName ? `${p.bomName} V${p.bomVersion || '1.0'}` : `${p.name} EBOM V1.0`,
    standardCycleDays: p.production?.standardCycleDays || 3,
  })),
)

const bomOpts = computed(() => {
  const item = itemOpts.value.find((i) => i.value === form.itemId)
  return item ? [{ label: item.bom, value: item.bom }] : []
})

const form = reactive({
  code: '',
  name: '',
  itemId: undefined,
  itemName: '',
  itemCode: '',
  specModel: '',
  material: '',
  bom: undefined,
  ebomName: '',
  processRouteName: undefined,
  relatedScrapId: '',
  relatedScrapNo: '',
  warehouse: '半成品仓',
  standardCycleDays: 3,
  workCenter: undefined,
  personInCharge: undefined,
  urgency: '普通',
  planDateRange: null,
  reminderDate: null,
  remark: '',
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    if (props.editRecord) {
      const wo = props.editRecord
      Object.assign(form, {
        code: wo.code,
        name: wo.name,
        itemId: wo.itemId,
        itemName: wo.itemName,
        itemCode: wo.itemCode,
        specModel: wo.specModel,
        material: wo.material,
        bom: wo.bom,
        ebomName: wo.ebomName,
        processRouteName: wo.processRouteName,
        relatedScrapId: wo.relatedScrapId || '',
        relatedScrapNo: wo.relatedScrapNo || '',
        warehouse: wo.warehouse,
        standardCycleDays: wo.standardCycleDays ?? 3,
        workCenter: wo.workCenter,
        personInCharge: wo.personInCharge,
        urgency: wo.urgency || '普通',
        planDateRange:
          wo.planStartDate && wo.planEndDate
            ? [dayjs(wo.planStartDate), dayjs(wo.planEndDate)]
            : null,
        reminderDate: wo.reminderDate ? dayjs(wo.reminderDate) : null,
        remark: wo.remark || '',
      })
      return
    }
    resetForm()
  },
)

function resetForm() {
  const codes = disassemblyWorkOrderState.orders.map((o) => o.code)
  Object.assign(form, {
    code: generateDisassemblyOrderCode(codes),
    name: '',
    itemId: undefined,
    itemName: '',
    itemCode: '',
    specModel: '',
    material: '',
    bom: undefined,
    ebomName: '',
    processRouteName: undefined,
    relatedScrapId: '',
    relatedScrapNo: '',
    warehouse: '半成品仓',
    standardCycleDays: 3,
    workCenter: undefined,
    personInCharge: undefined,
    urgency: '普通',
    planDateRange: null,
    reminderDate: null,
    remark: '',
  })
}

function onItemChange(itemId) {
  const item = itemOpts.value.find((i) => i.value === itemId)
  if (!item) return
  form.itemName = item.label
  form.itemCode = item.code || ''
  form.specModel = item.specModel || ''
  form.material = item.material || ''
  form.bom = item.bom
  form.ebomName = item.bom
  form.standardCycleDays = item.standardCycleDays || 3
  if (!form.name) {
    form.name = generateDisassemblyOrderName(
      form.itemName,
      disassemblyWorkOrderState.orders.map((o) => o.name),
    )
  }
}

function onWorkCenterChange(center) {
  form.personInCharge = resolvePersonInCharge(center)
}

function onScrapSelected(scrap) {
  form.relatedScrapId = scrap.id
  form.relatedScrapNo = scrap.scrapNo
  if (!form.itemId) {
    const match = itemOpts.value.find(
      (i) => i.code === scrap.itemCode || i.label === scrap.itemName,
    )
    if (match) {
      form.itemId = match.value
      onItemChange(match.value)
    } else {
      form.itemName = scrap.itemName
      form.itemCode = scrap.itemCode
      form.specModel = scrap.specModel
      form.material = scrap.material
      form.bom = `${scrap.itemName} EBOM V1.0`
      form.ebomName = form.bom
      form.name = generateDisassemblyOrderName(
        scrap.itemName,
        disassemblyWorkOrderState.orders.map((o) => o.name),
      )
    }
  }
}

function buildPayload() {
  const [start, end] = form.planDateRange || []
  return {
    code: form.code?.trim(),
    name: form.name?.trim(),
    itemId: form.itemId,
    itemName: form.itemName,
    itemCode: form.itemCode,
    specModel: form.specModel,
    material: form.material,
    bom: form.bom,
    ebomName: form.bom || form.ebomName,
    processRouteName: form.processRouteName,
    relatedScrapId: form.relatedScrapId,
    relatedScrapNo: form.relatedScrapNo,
    warehouse: form.warehouse,
    standardCycleDays: form.standardCycleDays,
    workCenter: form.workCenter,
    personInCharge: form.personInCharge,
    urgency: form.urgency,
    planStartDate: start ? start.format('YYYY-MM-DD') : '',
    planEndDate: end ? end.format('YYYY-MM-DD') : '',
    reminderDate: form.reminderDate ? form.reminderDate.format('YYYY-MM-DD') : '',
    remark: form.remark,
    disassemblyQty: 1,
  }
}

function handleOk() {
  if (!form.itemName) {
    message.warning('请选择物品名称')
    return
  }
  if (!form.processRouteName) {
    message.warning('请选择工艺路线')
    return
  }
  if (!form.warehouse) {
    message.warning('请选择预入仓库')
    return
  }
  if (!form.workCenter) {
    message.warning('请选择工作中心')
    return
  }
  if (!form.personInCharge) {
    message.warning('请选择负责人')
    return
  }
  if (!form.urgency) {
    message.warning('请选择紧急度')
    return
  }
  if (!form.planDateRange?.length) {
    message.warning('请选择计划日期')
    return
  }

  const payload = buildPayload()
  if (isEdit.value) {
    updateDisassemblyWorkOrder(props.editRecord.id, payload)
    message.success('已保存')
  } else {
    addDisassemblyWorkOrder(payload)
    message.success('拆解工单已创建')
  }
  emit('saved')
  emit('update:open', false)
}
</script>

<script>
export default { name: 'CreateDisassemblyWorkOrderModal' }
</script>

<style scoped>
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 14px;
}
</style>
