<template>
  <GeneratePurchaseRequisitionModal
    v-model:open="purchaseOpen"
    column-mode="plan"
    :order="modalOrder"
    :materials="modalMaterials"
    @saved="onPurchaseSaved"
  />
  <CreateOutsourcingOrderModal
    :open="outsourceOpen"
    :seed-work-order="seedWorkOrder"
    :seed-process="seedProcess"
    :seed-plan-qty="seedPlanQty"
    @update:open="onOutsourceOpenUpdate"
    @saved="onOutsourceSaved"
  />
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import GeneratePurchaseRequisitionModal from '@/views/planning/components/GeneratePurchaseRequisitionModal.vue'
import CreateOutsourcingOrderModal from '@/views/procurement/components/CreateOutsourcingOrderModal.vue'
import { addPurchaseRequisition } from '@/store/purchaseRequisitionStore'
import { updateOutsourcingOrder } from '@/store/outsourcingOrderStore'
import {
  buildConvertMaterialFromWorkOrder,
  buildConvertSyntheticOrder,
  canConvertWorkOrderToPurchaseOrOutsource,
  completeWorkOrderIfNoRemainSchedule,
  validateWorkOrderConvertPurchaseQty,
} from '@/utils/workOrderConvert'
import { resolveWorkOrderProcurementSource } from '@/constants/procurementDocSource'
import { isProcessOutsourceOrder } from '@/utils/outsourcingMode'
import {
  canCreateProcessOutsource,
  calcProcessOutsourceRemainQty,
} from '@/utils/workOrderProcessOutsource'

const emit = defineEmits(['converted'])

const purchaseOpen = ref(false)
const outsourceOpen = ref(false)
const modalOrder = ref(null)
const modalMaterials = ref([])
const seedWorkOrder = ref(null)
const seedProcess = ref(null)
const seedPlanQty = ref(null)
const seedScheduleBatchId = ref('')
const sourceWorkOrder = ref(null)

/** @type {{ resolve: Function, settled: boolean } | null} */
let pendingDispatchConfirm = null

function settleDispatchConfirm(payload) {
  if (!pendingDispatchConfirm || pendingDispatchConfirm.settled) return
  pendingDispatchConfirm.settled = true
  pendingDispatchConfirm.resolve(payload)
  pendingDispatchConfirm = null
}

function clearOutsourceSeed() {
  seedWorkOrder.value = null
  seedProcess.value = null
  seedPlanQty.value = null
  seedScheduleBatchId.value = ''
}

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
  seedProcess.value = null
  seedPlanQty.value = null
  seedScheduleBatchId.value = ''
  outsourceOpen.value = true
}

/**
 * @param {object} wo
 * @param {object} process
 * @param {{ planQty?: number, scheduleBatchId?: string }} [opts]
 */
function openProcessOutsource(wo, process, opts = {}) {
  if (!canCreateProcessOutsource(wo, process)) {
    message.warning('当前工序不可转工序外协（需工序可外协，且工单为待下发/已下发/执行中）')
    return
  }
  const remain = calcProcessOutsourceRemainQty(wo, process)
  if (!(remain > 0)) {
    message.warning('该工序可外协数量已用完')
    return
  }
  if (!wo.materialCode && !wo.productCode && !(wo.productName || wo.name)) {
    message.warning('工单缺少产品信息，无法转工序外协')
    return
  }
  sourceWorkOrder.value = wo
  seedWorkOrder.value = wo
  seedProcess.value = process
  const planQty = Number(opts.planQty)
  seedPlanQty.value = planQty > 0 ? planQty : null
  seedScheduleBatchId.value = opts.scheduleBatchId || ''
  outsourceOpen.value = true
}

/**
 * 下发前确认：打开「新增工序外协订单」弹窗，等待保存或取消
 * @returns {Promise<{ saved: boolean, order?: object }>}
 */
function openProcessOutsourceForDispatch(wo, process, batchQty, scheduleBatchId = '') {
  return new Promise((resolve) => {
    if (!wo || !process) {
      resolve({ saved: false })
      return
    }
    if (!wo.materialCode && !wo.productCode && !(wo.productName || wo.name)) {
      message.warning('工单缺少产品信息，无法转工序外协')
      resolve({ saved: false })
      return
    }
    pendingDispatchConfirm = { resolve, settled: false }
    sourceWorkOrder.value = wo
    seedWorkOrder.value = wo
    seedProcess.value = process
    seedPlanQty.value = Number(batchQty) > 0 ? Number(batchQty) : null
    seedScheduleBatchId.value = scheduleBatchId || ''
    outsourceOpen.value = true
  })
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
  const processMode = isProcessOutsourceOrder(order)
  if (processMode && seedScheduleBatchId.value && order?.id) {
    updateOutsourcingOrder(order.id, { sourceScheduleBatchId: seedScheduleBatchId.value })
  }
  let completed = false
  if (!processMode) {
    completed = completeWorkOrderIfNoRemainSchedule(wo)
    if (completed) {
      message.success('待排产已全部转出且无未完成任务，工单已完成')
    }
  }
  emit('converted', {
    type: processMode ? 'process-outsource' : 'outsource',
    workOrder: wo,
    process: seedProcess.value,
    order,
    completed,
  })
  settleDispatchConfirm({ saved: true, order })
  sourceWorkOrder.value = null
  clearOutsourceSeed()
}

function onOutsourceOpenUpdate(open) {
  outsourceOpen.value = open
  if (!open) {
    settleDispatchConfirm({ saved: false })
    clearOutsourceSeed()
  }
}

defineExpose({
  openPurchase,
  openOutsource,
  openProcessOutsource,
  openProcessOutsourceForDispatch,
})
</script>

<script>
export default { name: 'WorkOrderConvertModals' }
</script>
