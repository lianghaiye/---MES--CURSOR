<template>
  <GeneratePurchaseRequisitionModal
    v-model:open="purchaseOpen"
    column-mode="plan"
    :order="modalOrder"
    :materials="modalMaterials"
    @saved="onPurchaseSaved"
  />
  <CreateOutsourcingOrderModal
    v-model:open="outsourceOpen"
    :seed-work-order="seedWorkOrder"
    @saved="onOutsourceSaved"
  />
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import GeneratePurchaseRequisitionModal from '@/views/planning/components/GeneratePurchaseRequisitionModal.vue'
import CreateOutsourcingOrderModal from '@/views/procurement/components/CreateOutsourcingOrderModal.vue'
import { addPurchaseRequisition } from '@/store/purchaseRequisitionStore'
import {
  buildConvertMaterialFromWorkOrder,
  buildConvertSyntheticOrder,
  canConvertWorkOrderToPurchaseOrOutsource,
  completeWorkOrderIfNoRemainSchedule,
  validateWorkOrderConvertPurchaseQty,
} from '@/utils/workOrderConvert'
import { resolveWorkOrderProcurementSource } from '@/constants/procurementDocSource'

const emit = defineEmits(['converted'])

const purchaseOpen = ref(false)
const outsourceOpen = ref(false)
const modalOrder = ref(null)
const modalMaterials = ref([])
const seedWorkOrder = ref(null)
const sourceWorkOrder = ref(null)

function openPurchase(wo) {
  if (!canConvertWorkOrderToPurchaseOrOutsource(wo)) {
    message.warning('仅待下发/已下发/执行中且仍有待排产数量的工单可转采购')
    return
  }
  if (!wo.materialCode && !wo.productCode) {
    message.warning('工单缺少物品编码，无法转采购')
    return
  }
  sourceWorkOrder.value = wo
  modalOrder.value = buildConvertSyntheticOrder(wo, '采购')
  modalMaterials.value = [buildConvertMaterialFromWorkOrder(wo, '外购件')]
  purchaseOpen.value = true
}

function openOutsource(wo) {
  if (!canConvertWorkOrderToPurchaseOrOutsource(wo)) {
    message.warning('仅待下发/已下发/执行中且仍有待排产数量的工单可转外协')
    return
  }
  if (!wo.materialCode && !wo.productCode && !(wo.productName || wo.name)) {
    message.warning('工单缺少产品信息，无法转外协')
    return
  }
  sourceWorkOrder.value = wo
  seedWorkOrder.value = wo
  outsourceOpen.value = true
}

function onPurchaseSaved(requisition) {
  if (!requisition) return
  const wo = sourceWorkOrder.value
  const check = validateWorkOrderConvertPurchaseQty(wo, requisition)
  if (!check.ok) {
    message.error(check.message || '转换数量超出待排产，未生成采购申请')
    return
  }
  const source = resolveWorkOrderProcurementSource(wo)
  requisition.source = source
  if (wo?.code) {
    requisition.sourceOrderNo = wo.code
    requisition.sourceWorkOrderId = wo.id
    requisition.sourceWorkOrderNo = wo.code
    requisition.remark = [requisition.remark, `来源工单 ${wo.code}`].filter(Boolean).join('；')
  }
  addPurchaseRequisition(requisition)
  const completed = completeWorkOrderIfNoRemainSchedule(wo)
  if (completed) {
    message.success('待排产已全部转出且无未完成任务，工单已完成')
  }
  emit('converted', { type: 'purchase', workOrder: wo, requisition, completed })
  sourceWorkOrder.value = null
}

function onOutsourceSaved(order) {
  const wo = sourceWorkOrder.value
  const completed = completeWorkOrderIfNoRemainSchedule(wo)
  if (completed) {
    message.success('待排产已全部转出且无未完成任务，工单已完成')
  }
  emit('converted', { type: 'outsource', workOrder: wo, order, completed })
  sourceWorkOrder.value = null
  seedWorkOrder.value = null
}

defineExpose({ openPurchase, openOutsource })
</script>

<script>
export default { name: 'WorkOrderConvertModals' }
</script>
