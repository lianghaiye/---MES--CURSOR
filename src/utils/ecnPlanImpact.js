import dayjs from 'dayjs'
import {
  MATERIAL_RELEASE_STATUS,
  RESCHEDULABLE_WORK_ITEM_STATUSES,
  STARTED_WORK_ITEM_STATUSES,
  ECN_RESCHEDULE_STATUS,
  isMaterialReleasable,
} from '@/constants/ecnPlanReschedule'
import { productionPlanState, addProductionPlan } from '@/store/productionPlanStore'
import { getOwnActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { workOrderState, updateWorkOrder } from '@/store/workOrderStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { flattenMaterials } from '@/utils/material'
import { enrichWorkItem } from '@/utils/productionPlanWorkItem'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'

function matchProduct(wi, ecn) {
  if (!wi || !ecn) return false
  if (ecn.productId && wi.productId && String(wi.productId) === String(ecn.productId)) return true
  if (ecn.productCode && wi.productCode && wi.productCode === ecn.productCode) return true
  if (ecn.previousBomId && wi.bomId && String(wi.bomId) === String(ecn.previousBomId)) return true
  return false
}

function collectReleaseStatusMap(materials) {
  const map = new Map()
  flattenMaterials(materials || [], []).forEach((m) => {
    if (m?.code) map.set(m.code, m.releaseStatus || MATERIAL_RELEASE_STATUS.RELEASABLE)
  })
  return map
}

function applyReleaseStatusMap(materials, map) {
  flattenMaterials(materials || [], []).forEach((m) => {
    if (!m) return
    if (m.code && map.has(m.code)) {
      m.releaseStatus = map.get(m.code)
    } else if (!m.releaseStatus) {
      m.releaseStatus = MATERIAL_RELEASE_STATUS.RELEASABLE
    }
  })
}

function classifyWorkItem(wi) {
  const status = wi?.status || ''
  if (RESCHEDULABLE_WORK_ITEM_STATUSES.includes(status)) return 'canReschedule'
  if (STARTED_WORK_ITEM_STATUSES.includes(status)) return 'started'
  if (status === '已完成' || status === '完成') return 'completed'
  return 'other'
}

function classifyWorkOrder(wo) {
  const status = wo?.status || ''
  if (status === '待下发') return 'canCancel'
  if (status === '已完成' || status === '完成' || status === '终止') return 'closed'
  return 'started'
}

/**
 * 分析 ECN 对生产计划 / 工单的影响
 * @param {object} ecn
 */
export function analyzeEcnPlanImpact(ecn) {
  if (!ecn) {
    return {
      summary: {
        planCount: 0,
        workItemCanReschedule: 0,
        workItemStarted: 0,
        workItemCompleted: 0,
        workOrderPending: 0,
        workOrderStarted: 0,
        pendingSpecCount: 0,
      },
      workItemRows: [],
      workOrderRows: [],
      pendingSpecRows: [],
    }
  }

  const workItemRows = []
  const pendingSpecRows = []

  productionPlanState.plans.forEach((plan) => {
    ;(plan.workItems || []).forEach((wi) => {
      if (!matchProduct(wi, ecn)) return

      const action = classifyWorkItem(wi)
      const flat = []
      flattenMaterials(wi.materials || [], flat)
      const pendingCount = flat.filter((m) => !isMaterialReleasable(m)).length
      flat
        .filter((m) => !isMaterialReleasable(m))
        .forEach((m) => {
          pendingSpecRows.push({
            key: `${plan.id}-${wi.id}-${m.id}`,
            planId: plan.id,
            planOrderNo: plan.salesOrderNo || plan.orderNo,
            workItemId: wi.id,
            productName: wi.productName,
            materialCode: m.code,
            materialName: m.name,
            supplyType: m.supplyType,
            planQty: m.planQty,
            releaseStatus: m.releaseStatus,
          })
        })

      workItemRows.push({
        key: `${plan.id}::${wi.id}`,
        planId: plan.id,
        planOrderNo: plan.salesOrderNo || plan.orderNo,
        customerName: plan.customerName || '',
        planStatus: plan.orderStatus,
        workItemId: wi.id,
        productName: wi.productName,
        productCode: wi.productCode,
        productId: wi.productId,
        wiStatus: wi.status,
        bomId: wi.bomId,
        bomVersion: wi.bomVersion,
        planBatch: wi.planBatch || 1,
        action,
        canReschedule: action === 'canReschedule',
        pendingSpecCount: pendingCount,
        lastRescheduleEcnNo: wi.lastRescheduleEcnNo || '',
      })
    })
  })

  const workOrderRows = []
  workOrderState.orders.forEach((wo) => {
    const byProduct =
      (ecn.productId && String(wo.productId) === String(ecn.productId)) ||
      (ecn.productCode && wo.productCode === ecn.productCode)
    if (!byProduct) return

    const action = classifyWorkOrder(wo)
    workOrderRows.push({
      key: wo.id,
      workOrderId: wo.id,
      code: wo.code,
      productName: wo.productName,
      productCode: wo.productCode,
      status: wo.status,
      bomId: wo.bomId,
      sourceOrderNo: wo.sourceOrderNo || wo.salesOrderNo || '',
      action,
      canCancel: action === 'canCancel',
    })
  })

  const summary = {
    planCount: new Set(workItemRows.map((r) => r.planId)).size,
    workItemCanReschedule: workItemRows.filter((r) => r.canReschedule).length,
    workItemStarted: workItemRows.filter((r) => r.action === 'started').length,
    workItemCompleted: workItemRows.filter((r) => r.action === 'completed').length,
    workOrderPending: workOrderRows.filter((r) => r.canCancel).length,
    workOrderStarted: workOrderRows.filter((r) => r.action === 'started').length,
    pendingSpecCount: pendingSpecRows.length,
  }

  return { summary, workItemRows, workOrderRows, pendingSpecRows }
}

/**
 * 按新生效 BOM 刷新工作项物料树（保留可投/待定标记）
 */
export function refreshWorkItemFromActiveBom(workItem, ecn, options = {}) {
  if (!workItem) return { ok: false, message: '工作项不存在' }
  const action = classifyWorkItem(workItem)
  if (action !== 'canReschedule' && !options.force) {
    return { ok: false, message: `工作项状态「${workItem.status}」不可自动重排` }
  }

  const bom =
    (ecn?.bomId ? getProductBomById(ecn.bomId) : null) ||
    getOwnActiveBomForItem('product', workItem.productId || ecn?.productId)

  if (!bom) {
    return { ok: false, message: '未找到生效 BOM' }
  }

  const qty = Number(workItem.planQty ?? workItem.orderQty ?? workItem.salesQty) || 1
  const oldReleaseMap = collectReleaseStatusMap(workItem.materials)
  const snapshot = buildEbomSnapshotFromBom(bom, qty)
  const materials = JSON.parse(JSON.stringify(snapshot.materials || []))
  applyReleaseStatusMap(materials, oldReleaseMap)

  workItem.bomId = bom.id
  workItem.bomName = bom.bomName || bom.name || workItem.bomName
  workItem.bomVersion = bom.version || bom.bomVersion || ''
  workItem.ebomSnapshot = snapshot
  workItem.materials = materials
  workItem.lastRescheduleEcnNo = ecn?.ecnNo || ecn?.ecrNo || ''
  workItem.lastRescheduleAt = dayjs().format('YYYY-MM-DD HH:mm')
  if (!workItem.planBatch) workItem.planBatch = 1

  resolveWorkItemMaterials(workItem)
  return { ok: true, bomId: bom.id, bomVersion: workItem.bomVersion }
}

/**
 * 重排选中的计划工作项，并可选作废待下发工单
 * @param {object} ecn
 * @param {{ workItemKeys?: string[], cancelWorkOrderIds?: string[] }} selection
 */
export function rescheduleEcnImpact(ecn, selection = {}) {
  const impact = analyzeEcnPlanImpact(ecn)
  const keySet = new Set(selection.workItemKeys || [])
  const targets = impact.workItemRows.filter((r) => r.canReschedule && keySet.has(r.key))

  let refreshed = 0
  const errors = []

  targets.forEach((row) => {
    const plan = productionPlanState.plans.find((p) => p.id === row.planId)
    const wi = plan?.workItems?.find((w) => w.id === row.workItemId)
    if (!wi) {
      errors.push(`${row.planOrderNo} / ${row.productName}：工作项不存在`)
      return
    }
    const res = refreshWorkItemFromActiveBom(wi, ecn)
    if (!res.ok) {
      errors.push(`${row.planOrderNo} / ${row.productName}：${res.message}`)
      return
    }
    refreshed += 1
  })

  let cancelledWo = 0
  ;(selection.cancelWorkOrderIds || []).forEach((id) => {
    const wo = workOrderState.orders.find((o) => o.id === id)
    if (!wo || wo.status !== '待下发') return
    updateWorkOrder(id, {
      status: '终止',
      remark: `${wo.remark || ''}`.trim()
        ? `${wo.remark}；ECN ${ecn.ecnNo || ''} 重排作废`
        : `ECN ${ecn.ecnNo || ''} 重排作废`,
      supersededByEcnNo: ecn.ecnNo || '',
    })
    cancelledWo += 1
  })

  if (ecn) {
    const remain = analyzeEcnPlanImpact(ecn)
    if (remain.summary.workItemCanReschedule === 0) {
      ecn.rescheduleStatus = ECN_RESCHEDULE_STATUS.DONE
    } else if (refreshed > 0) {
      ecn.rescheduleStatus = ECN_RESCHEDULE_STATUS.PARTIAL
    } else if (!ecn.rescheduleStatus) {
      ecn.rescheduleStatus = ECN_RESCHEDULE_STATUS.PENDING
    }
    ecn.rescheduleAt = dayjs().format('YYYY-MM-DD HH:mm')
    ecn.rescheduleSummary = {
      refreshed,
      cancelledWo,
      errors: errors.length,
    }
  }

  return { ok: errors.length === 0 || refreshed > 0, refreshed, cancelledWo, errors }
}

/**
 * 将计划中「待定」物料拆出二期生产计划
 */
export function createPhase2PlanFromPending(planId, workItemId, options = {}) {
  const plan = productionPlanState.plans.find((p) => p.id === planId)
  if (!plan) return { ok: false, message: '生产计划不存在' }

  const wi = plan.workItems?.find((w) => w.id === workItemId)
  if (!wi) return { ok: false, message: '工作项不存在' }

  const flat = []
  flattenMaterials(wi.materials || [], flat)
  const pending = flat.filter((m) => !isMaterialReleasable(m) && !m.phase2Deferred)
  if (!pending.length) {
    return { ok: false, message: '没有「待定」物料可拆二期' }
  }

  const phase2Materials = JSON.parse(JSON.stringify(pending)).map((m) => ({
    ...m,
    id: `p2-${m.id}-${Date.now()}`,
    releaseStatus: MATERIAL_RELEASE_STATUS.RELEASABLE,
    status: '待下达',
    children: [],
    phase2FromMaterialId: m.id,
  }))

  pending.forEach((m) => {
    m.phase2Deferred = true
    m.joinPlan = '否'
    m.status = '不转产'
  })

  const newWi = enrichWorkItem(
    {
      id: `wi-p2-${wi.id}-${Date.now()}`,
      salesLineId: wi.salesLineId,
      status: '待下达',
      expanded: true,
      salesQty: wi.salesQty,
      orderQty: wi.orderQty,
      planQty: wi.planQty,
      stockQty: wi.stockQty,
      productName: wi.productName,
      productCode: wi.productCode,
      productId: wi.productId,
      productAttr: wi.productAttr,
      productType: wi.productType,
      model: wi.model,
      spec: wi.spec,
      specModel: wi.specModel,
      deliveryDate: wi.deliveryDate,
      bomId: wi.bomId,
      bomName: wi.bomName,
      bomVersion: wi.bomVersion,
      ebomSnapshot: { materials: phase2Materials },
      materials: phase2Materials,
      planBatch: 2,
      parentWorkItemId: wi.id,
      parentPlanId: plan.id,
      phaseNote: options.phaseNote || '二期：规格确认后投产',
    },
    null,
    0,
  )

  const phase2Plan = {
    id: `pp-p2-${Date.now()}`,
    planSource: plan.planSource || 'sales-order',
    salesOrderNo: plan.salesOrderNo,
    orderNo: `${plan.orderNo || plan.salesOrderNo || 'PLAN'}-P2`,
    customerName: plan.customerName,
    productQty: phase2Materials.reduce((s, m) => s + (Number(m.planQty) || 0), 0),
    salesperson: plan.salesperson || '',
    urgency: plan.urgency || '普通',
    orderStatus: '待下达',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate: plan.deliveryDate,
    region: plan.region || '',
    settlementType: plan.settlementType || '',
    deliveryMethod: plan.deliveryMethod || '',
    remark: `由 ${plan.salesOrderNo || plan.orderNo} 拆分的二期计划（待定规格确认后投产）`,
    tags: ['待下达', '二期'],
    daysToDelivery: plan.daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: plan.deliveryDate,
    deductInventory: plan.deductInventory !== false,
    planBatch: 2,
    parentPlanId: plan.id,
    workItems: [newWi],
  }

  wi.phase2PlanId = phase2Plan.id
  if (!wi.planBatch) wi.planBatch = 1

  addProductionPlan(phase2Plan)
  return { ok: true, plan: phase2Plan, materialCount: phase2Materials.length }
}

export function setMaterialReleaseStatus(material, status) {
  if (!material) return
  material.releaseStatus = status || MATERIAL_RELEASE_STATUS.RELEASABLE
  if (status === MATERIAL_RELEASE_STATUS.PENDING_SPEC) {
    material.joinPlan = '否'
  }
}
