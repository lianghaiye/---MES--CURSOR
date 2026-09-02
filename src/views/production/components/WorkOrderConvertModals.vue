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
    message.warning('仅待下发/执行中且仍有计划数量的工单可转采购')
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
    message.warning('仅待下发/执行中且仍有计划数量的工单可转外协')
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
  const source = resolveWorkOrderProcurementSource(wo)
  requisition.source = source
  if (wo?.code) {
    requisition.sourceOrderNo = wo.code
    requisition.sourceWorkOrderId = wo.id
    requisition.sourceWorkOrderNo = wo.code
    requisition.remark = [requisition.remark, `来源工单 ${wo.code}`].filter(Boolean).join('；')
  }
  addPurchaseRequisition(requisition)
  emit('converted', { type: 'purchase', workOrder: wo, requisition })
  sourceWorkOrder.value = null
}

function onOutsourceSaved() {
  const wo = sourceWorkOrder.value
  emit('converted', { type: 'outsource', workOrder: wo })
  sourceWorkOrder.value = null
  seedWorkOrder.value = null
}

defineExpose({ openPurchase, openOutsource })
</script>

<script>
export default { name: 'WorkOrderConvertModals' }
</script>
