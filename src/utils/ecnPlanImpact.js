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
import {
  workOrderState,
  updateWorkOrder,
  addWorkOrdersFromPlanRows,
  addOutsourceWorkOrdersFromPlanRows,
} from '@/store/workOrderStore'
import { buildEbomSnapshotFromBom, createPlanMaterial } from '@/utils/ebomSnapshot'
import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import { flattenMaterials } from '@/utils/material'
import { enrichWorkItem } from '@/utils/productionPlanWorkItem'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'

function matchProduct(wi, ecn) {
  if (!wi || !ecn) return false
  if (ecn.productId && wi.productId && String(wi.productId) === String(ecn.productId)) return true
  if (ecn.productCode && wi.productCode && wi.productCode === ecn.productCode) return true
  return false
}

/** 计划必须落在本张 ECN 选定的销售订单上（有单号时） */
function planInEcnScope(plan, ecn) {
  const so = String(ecn?.salesOrderNo || '').trim()
  if (!so) return true
  return plan?.salesOrderNo === so || plan?.orderNo === so
}

function workOrderInEcnScope(wo, ecn) {
  const so = String(ecn?.salesOrderNo || '').trim()
  if (so) {
    const src = wo?.sourceOrderNo || wo?.salesOrderNo || ''
    if (src && src !== so) return false
  }
  if (ecn?.originType === 'work_order') {
    const code = ecn.workOrderCode || ecn.workOrderNo
    if (code && wo?.code !== code && String(wo?.id) !== String(ecn.workOrderId || '')) return false
  }
  return true
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
    if (!planInEcnScope(plan, ecn)) return
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
    if (!workOrderInEcnScope(wo, ecn)) return
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

function listScopedWorkItems(ecn) {
  const rows = []
  productionPlanState.plans.forEach((plan) => {
    if (!planInEcnScope(plan, ecn)) return
    ;(plan.workItems || []).forEach((wi) => {
      if (!matchProduct(wi, ecn)) return
      rows.push({ plan, wi })
    })
  })
  return rows
}

function findWorkOrdersByCode(ecn, code) {
  const materialCode = String(code || '').trim()
  if (!materialCode) return []
  return workOrderState.orders.filter((wo) => {
    if (!workOrderInEcnScope(wo, ecn)) return false
    if (wo.status === '终止') return false
    return wo.materialCode === materialCode || wo.productCode === materialCode
  })
}

function findPlanMaterialsByCode(pairs, code) {
  const materialCode = String(code || '').trim()
  if (!materialCode) return []
  const hits = []
  pairs.forEach(({ plan, wi }) => {
    const flat = []
    flattenMaterials(wi.materials || [], flat)
    flat.forEach((material) => {
      if (material.code === materialCode) hits.push({ plan, wi, material })
    })
  })
  return hits
}

function materialLabel(code, name, spec, qty) {
  if (!code && !name) return '—'
  const head = [code, name].filter(Boolean).join(' ')
  const tail = [spec, qty != null && qty !== '' ? `用量 ${qty}` : ''].filter(Boolean).join(' · ')
  return tail ? `${head}（${tail}）` : head
}

function isStartedWorkOrder(wo) {
  return wo && !['待下发', '已完成', '完成', '终止'].includes(wo.status)
}

/**
 * 按 ECN 变更项对比旧料执行情况：未下发可取消、待下发可作废、新料可排产
 */
export function buildEcnChangeLineRows(ecn) {
  if (!ecn) return []
  const pairs = listScopedWorkItems(ecn)
  return (ecn.changeItems || []).map((item, index) => {
    const changeType = item.changeType || ECN_CHANGE_ITEM_TYPE.MODIFY
    const beforeCode = item.origMaterialCode || ''
    const afterCode = item.newMaterialCode || ''
    const dropsOld =
      changeType === ECN_CHANGE_ITEM_TYPE.REMOVE || changeType === ECN_CHANGE_ITEM_TYPE.REPLACE
    const bringsNew =
      changeType === ECN_CHANGE_ITEM_TYPE.ADD || changeType === ECN_CHANGE_ITEM_TYPE.REPLACE
    const oldWos = findWorkOrdersByCode(ecn, beforeCode)
    const pendingWo = oldWos.find((wo) => wo.status === '待下发')
    const startedWo = oldWos.find((wo) => isStartedWorkOrder(wo))
    const planHits = findPlanMaterialsByCode(pairs, beforeCode)
    const newHits = findPlanMaterialsByCode(pairs, afterCode)
    const supplyForm =
      item.supplyForm || planHits[0]?.material?.supplyType || newHits[0]?.material?.supplyType || ''

    let oldSituation = '计划中无此料'
    if (changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
      oldSituation = '新增，无旧料'
    } else if (startedWo) {
      oldSituation = `工单 ${startedWo.code} ${startedWo.status}`
    } else if (pendingWo) {
      oldSituation = `工单 ${pendingWo.code} 待下发`
    } else if (planHits.length) {
      oldSituation = '计划未下发'
    }

    const canVoid = Boolean(pendingWo) && (dropsOld || changeType === ECN_CHANGE_ITEM_TYPE.MODIFY)
    const canCancelPlan = dropsOld && planHits.length > 0 && !pendingWo && !startedWo
    const canSchedule =
      bringsNew && Boolean(afterCode) && !findWorkOrdersByCode(ecn, afterCode).length
    const blocked = Boolean(startedWo) && dropsOld

    let suggest = '随计划重排更新'
    if (blocked) suggest = '已开工，需人工处理'
    else if (changeType === ECN_CHANGE_ITEM_TYPE.REMOVE && canVoid) suggest = '作废待下发工单'
    else if (changeType === ECN_CHANGE_ITEM_TYPE.REMOVE && canCancelPlan) suggest = '取消未下发排产'
    else if (changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) suggest = '旧料未开单，随新 BOM 移除'
    else if (changeType === ECN_CHANGE_ITEM_TYPE.REPLACE) {
      const parts = []
      if (canVoid) parts.push('作废旧工单')
      if (canCancelPlan) parts.push('取消旧料排产')
      if (canSchedule) parts.push('新料排产')
      suggest = parts.join('，') || '替换后按新料排产'
    } else if (changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
      suggest = canSchedule ? '新料可排产' : '新料已有工单'
    } else if (canVoid) {
      suggest = '作废待下发后按新 BOM 重排'
    }

    return {
      key: item.id || `ci-${index}`,
      changeType,
      beforeText: materialLabel(
        beforeCode,
        item.origMaterialName,
        item.origSpecModel,
        item.origUnitQty,
      ),
      afterText:
        changeType === ECN_CHANGE_ITEM_TYPE.REMOVE
          ? '—'
          : materialLabel(afterCode, item.newMaterialName, item.newSpecModel, item.newUnitQty),
      oldSituation,
      suggest,
      supplyForm,
      canVoid,
      canCancelPlan,
      canSchedule,
      blocked,
      pendingWoId: pendingWo?.id || '',
      beforeCode,
      afterCode,
      planId: (planHits[0] || newHits[0] || pairs[0])?.plan?.id || '',
      workItemId: (planHits[0] || newHits[0] || pairs[0])?.wi?.id || '',
    }
  })
}

function cancelUnreleasedMaterial(ecn, row) {
  const pairs = listScopedWorkItems(ecn)
  const hits = findPlanMaterialsByCode(pairs, row.beforeCode)
  hits.forEach(({ material }) => {
    material.joinPlan = '否'
    material.status = '不转产'
    material.planQty = 0
    material.cancelledByEcnNo = ecn.ecnNo || ecn.ecrNo || ''
  })
  return hits.length
}

function ensureNewPlanMaterial(ecn, row) {
  const pairs = listScopedWorkItems(ecn)
  const existing = findPlanMaterialsByCode(pairs, row.afterCode)
  if (existing.length) return existing[0]
  const host = pairs[0]
  if (!host) return null
  const item = (ecn.changeItems || []).find((ci) => (ci.id || '') === row.key) || {}
  const qty = Number(host.wi.planQty ?? host.wi.orderQty ?? host.wi.salesQty) || 1
  const unitUsage = Number(item.newUnitQty) || 1
  const supplyType = item.supplyForm || '自制件'
  const material = createPlanMaterial({
    name: item.newMaterialName || row.afterCode,
    code: row.afterCode,
    spec: item.newSpecModel || '',
    material: item.newMaterial || '',
    drawingNo: item.newDrawingNo || '',
    unitUsage,
    supplyType,
    demandQty: unitUsage * qty,
    planQty: unitUsage * qty,
    joinPlan: '是',
    status: '待下达',
    remark: `ECN ${ecn.ecnNo || ''} 新增`,
  })
  if (!Array.isArray(host.wi.materials)) host.wi.materials = []
  host.wi.materials.push(material)
  return { plan: host.plan, wi: host.wi, material }
}

function scheduleNewMaterial(ecn, row) {
  const hit = ensureNewPlanMaterial(ecn, row)
  if (!hit) return { scheduled: false, message: '没有可挂接的生产计划' }
  const { plan, material } = hit
  material.joinPlan = '是'
  material.status = '待下达'
  material.releaseStatus = MATERIAL_RELEASE_STATUS.RELEASABLE
  material.phase2Deferred = false
  const supply = material.supplyType || row.supplyForm || ''
  const sourceOrder = {
    orderNo: plan.salesOrderNo || plan.orderNo,
    planSource: plan.planSource || '',
    salesOrderId: plan.salesOrderId || '',
  }
  const planRow = {
    code: material.code,
    productName: material.name,
    planQty: material.planQty,
    spec: material.spec,
    material: material.material,
    drawingNo: material.drawingNo,
    workCenter: material.workCenter,
    warehouse: material.warehouse,
    urgency: plan.urgency,
    remark: material.remark,
    processRoute: material.processRoute,
    supplier: material.supplier,
    workItemId: hit.wi.id,
    bomId: hit.wi.bomId,
  }
  if (supply === '外协件') {
    addOutsourceWorkOrdersFromPlanRows([planRow], sourceOrder)
  } else if (supply === '外购件' || supply === '外购') {
    return { scheduled: true, purchase: true }
  } else {
    addWorkOrdersFromPlanRows([planRow], sourceOrder)
  }
  return { scheduled: true, purchase: false }
}

/**
 * 重排选中的计划工作项，并按变更行作废 / 取消 / 排产
 * @param {object} ecn
 * @param {{ workItemKeys?: string[], cancelWorkOrderIds?: string[], lineActionKeys?: string[] }} selection
 */
export function rescheduleEcnImpact(ecn, selection = {}) {
  const lineRows = buildEcnChangeLineRows(ecn)
  const actionKeys = new Set(selection.lineActionKeys || [])
  const voidIds = new Set(selection.cancelWorkOrderIds || [])
  lineRows.forEach((row) => {
    if (actionKeys.has(`void:${row.key}`) && row.pendingWoId) voidIds.add(row.pendingWoId)
  })

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
  voidIds.forEach((id) => {
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

  let cancelledPlan = 0
  let scheduled = 0
  lineRows.forEach((row) => {
    if (actionKeys.has(`cancel:${row.key}`)) {
      const n = cancelUnreleasedMaterial(ecn, row)
      cancelledPlan += n > 0 ? 1 : 0
    }
    if (actionKeys.has(`schedule:${row.key}`)) {
      const res = scheduleNewMaterial(ecn, row)
      if (res.scheduled) scheduled += 1
    }
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
      cancelledPlan,
      scheduled,
      errors: errors.length,
    }
  }

  return {
    ok: errors.length === 0 || refreshed > 0 || cancelledWo > 0 || scheduled > 0,
    refreshed,
    cancelledWo,
    cancelledPlan,
    scheduled,
    errors,
  }
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
