<template>
  <a-modal
    :open="open"
    title="新增工单"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="产品名称" required>
            <a-input v-model:value="form.productName" placeholder="请输入产品名称" />
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
          <a-form-item label="排产数量">
            <a-input-number v-model:value="form.scheduleQty" :min="0" style="width: 100%" />
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
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSubmit">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  processRouteOptions,
  workCenterOptions,
  warehouseOptions,
  urgencyOptions,
} from '@/mock/workOrderOptions'
import { bomOptions } from '@/mock/workOrderMaster'
import { createWorkOrderPayload } from '@/store/workOrderStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'created'])

const form = reactive({
  productName: '',
  processRouteName: undefined,
  planQty: 1,
  scheduleQty: 1,
  workCenter: '默认工厂',
  bom: undefined,
  warehouse: '半成品仓',
  urgency: '普通',
  planDateRange: null,
  remark: '',
})

const routeOptions = computed(() => processRouteOptions.map((v) => ({ label: v, value: v })))
const bomSelectOptions = computed(() => bomOptions.map((v) => ({ label: v, value: v })))
const workCenterOpts = computed(() => workCenterOptions.map((v) => ({ label: v, value: v })))
const warehouseOpts = computed(() => warehouseOptions.map((v) => ({ label: v, value: v })))
const urgencyOpts = computed(() => urgencyOptions.map((v) => ({ label: v, value: v })))

watch(
  () => props.open,
  (val) => {
    if (val) {
      form.productName = ''
      form.processRouteName = processRouteOptions[0]
      form.planQty = 1
      form.scheduleQty = 1
      form.workCenter = '默认工厂'
      form.bom = undefined
      form.warehouse = '半成品仓'
      form.urgency = '普通'
      form.planDateRange = [dayjs(), dayjs().add(14, 'day')]
      form.remark = ''
    }
  },
)

function handleCancel() {
  emit('update:open', false)
}

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
      : undefined

  const wo = createWorkOrderPayload({
    productName: form.productName.trim(),
    processRouteName: form.processRouteName,
    planQty: form.planQty,
    scheduleQty: form.scheduleQty,
    workCenter: form.workCenter,
    bom: form.bom || form.productName.trim(),
    warehouse: form.warehouse,
    urgency: form.urgency,
    planDateRange,
    remark: form.remark,
    source: 'manual',
  })

  emit('created', wo)
  message.success('工单创建成功')
  emit('update:open', false)
}
</script>
