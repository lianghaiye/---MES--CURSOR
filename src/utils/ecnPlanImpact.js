import dayjs from 'dayjs'
import {
  MATERIAL_RELEASE_STATUS,
  RESCHEDULABLE_WORK_ITEM_STATUSES,
  STARTED_WORK_ITEM_STATUSES,
  ECN_RESCHEDULE_STATUS,
  isMaterialReleasable,
} from '@/constants/ecnPlanReschedule'
import { productionPlanState } from '@/store/productionPlanStore'
import { getOwnActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import {
  workOrderState,
  updateWorkOrder,
  addWorkOrder,
  createWorkOrderPayload,
} from '@/store/workOrderStore'
import {
  outsourcingOrderState,
  updateOutsourcingOrder,
  addOutsourcingOrder,
} from '@/store/outsourcingOrderStore'
import {
  addPurchaseRequisition,
  buildRequisitionFromPlanRows,
} from '@/store/purchaseRequisitionStore'
import { createOutsourcingLine } from '@/mock/outsourcingOrders'
import { buildEbomSnapshotFromBom, createPlanMaterial } from '@/utils/ebomSnapshot'
import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import { flattenMaterials } from '@/utils/material'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'
import { appendWorkOrderOperationLog } from '@/utils/workOrderOperationLog'

const VOID_REASON = 'ECN变更执行'
const OUTSOURCE_VOIDABLE = new Set(['待提交', '待审核'])
const OUTSOURCE_APPROVED = new Set(['进行中', '已完成', '已终结'])
const PURCHASE_SUPPLY = new Set(['外购件', '外购'])

export const ECN_SUPPLY_TYPE_OPTIONS = [
  { label: '自制件', value: '自制件' },
  { label: '外协件', value: '外协件' },
  { label: '外购件', value: '外购件' },
]

/** 旧料处置 */
export const ECN_OLD_ACTION = {
  SKIP: 'skip',
  UPDATE_QTY: 'update_qty',
  VOID_PENDING: 'void_pending',
  FORCE_VOID: 'force_void',
}

export const ECN_OLD_ACTION_LABEL = {
  [ECN_OLD_ACTION.SKIP]: '暂不处理',
  [ECN_OLD_ACTION.UPDATE_QTY]: '更新计划/单据数量',
  [ECN_OLD_ACTION.VOID_PENDING]: '作废原单',
  [ECN_OLD_ACTION.FORCE_VOID]: '强制作废',
}

/** 新料处置 */
export const ECN_NEW_ACTION = {
  SKIP: 'skip',
  SCHEDULE: 'schedule',
}

export const ECN_NEW_ACTION_LABEL = {
  [ECN_NEW_ACTION.SKIP]: '暂不处理（稍后生产计划排）',
  [ECN_NEW_ACTION.SCHEDULE]: '生成新单',
}

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
  markWorkItemRescheduled(workItem, ecn)
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
    if (wo.status === '终止' || wo.status === '已作废') return false
    // 按物料编码精确匹配，避免误把成品工单算进来
    return wo.materialCode === materialCode
  })
}

function outsourceOrderMatchesCode(order, code) {
  const materialCode = String(code || '').trim()
  if (!materialCode) return false
  return (order.lineItems || []).some((line) => {
    if (line.cancelled) return false
    return (
      line.itemCode === materialCode ||
      line.productCode === materialCode ||
      line.inventoryCode === materialCode ||
      line.materialCode === materialCode
    )
  })
}

function findOutsourcingOrdersByCode(ecn, code) {
  const so = String(ecn?.salesOrderNo || '').trim()
  return outsourcingOrderState.orders.filter((order) => {
    if (order.status === '已作废') return false
    if (so) {
      const src = order.salesOrderNo || order.sourceOrderNo || ''
      if (src && src !== so) return false
    }
    return outsourceOrderMatchesCode(order, code)
  })
}

function isPurchasedSupply(supply) {
  return PURCHASE_SUPPLY.has(String(supply || '').trim())
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

function subtreeText(children) {
  if (!children?.length) return ''
  return children
    .map((c) => {
      const qty = c.unitQty != null ? `×${c.unitQty}` : ''
      return `${c.code || ''} ${c.name || ''}${qty}`.trim()
    })
    .join('；')
}

function materialLabelWithSubtree(code, name, spec, qty, children) {
  const base = materialLabel(code, name, spec, qty)
  const sub = subtreeText(children)
  if (!sub) return base
  return `${base}\n└ 下级：${sub}`
}

function isStartedWorkOrder(wo) {
  return wo && !['待下发', '已完成', '完成', '终止', '已作废'].includes(wo.status)
}

/**
 * 修改仅两类（规格与编码一一对应，不存在同编码改规格）：
 * - qty_only：编码不变，改用量
 * - swap_material：编码 A→B（换料，处置同替换）
 */
export function classifyModifyKind(item, changeType) {
  if (changeType !== ECN_CHANGE_ITEM_TYPE.MODIFY) return null
  const before = String(item?.origMaterialCode || '').trim()
  const after = String(item?.newMaterialCode || '').trim()
  if (!before || !after) return null
  if (before !== after) return 'swap_material'
  return 'qty_only'
}

function collectDocsForCode(ecn, code) {
  const oldWos = findWorkOrdersByCode(ecn, code)
  const pendingWos = oldWos.filter((wo) => wo.status === '待下发')
  const startedWos = oldWos.filter((wo) => isStartedWorkOrder(wo))
  const outOrders = findOutsourcingOrdersByCode(ecn, code)
  const pendingOut = outOrders.filter((o) => OUTSOURCE_VOIDABLE.has(o.status))
  const approvedOuts = outOrders.filter((o) => OUTSOURCE_APPROVED.has(o.status))
  return { pendingWos, startedWos, pendingOut, approvedOuts }
}

function buildSituationItems({
  changeType,
  purchasedOld,
  planHits,
  pendingWos,
  startedWos,
  pendingOut,
  approvedOuts,
}) {
  const situationItems = []
  if (changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
    situationItems.push({ kind: '说明', code: '', status: '新增，无旧料' })
    return situationItems
  }
  pendingWos.forEach((wo) => {
    const kind = wo.orderCategory === '外协工单' ? '外协工单' : '生产工单'
    situationItems.push({ kind, code: wo.code, status: '待下发' })
  })
  pendingOut.forEach((o) => {
    situationItems.push({ kind: '外协订单', code: o.orderNo, status: o.status })
  })
  startedWos.forEach((wo) => {
    const kind = wo.orderCategory === '外协工单' ? '外协工单' : '生产工单'
    situationItems.push({ kind, code: wo.code, status: wo.status })
  })
  approvedOuts.forEach((o) => {
    situationItems.push({ kind: '外协订单', code: o.orderNo, status: o.status })
  })
  if (purchasedOld && !situationItems.length) {
    situationItems.push({ kind: '说明', code: '', status: '外购件（无关联工单/外协单）' })
  }
  if (!situationItems.length && planHits.length) {
    situationItems.push({ kind: '说明', code: '', status: '计划未开单' })
  }
  if (!situationItems.length) {
    situationItems.push({ kind: '说明', code: '', status: '计划中无此料' })
  }
  return situationItems
}

function buildOneChangeLineRow(ecn, pairs, spec) {
  const {
    key,
    item,
    changeType,
    beforeCode,
    afterCode,
    beforeName,
    beforeSpec,
    beforeQty,
    afterName,
    afterSpec,
    afterQty,
    oldSupplyForm,
    supplyForm,
    modifyKind = null,
    qtyOnly = false,
    swapMaterial = false,
    hasSubtree = false,
    subtreeTag = '',
    parentHint = '',
    hideSubtreeInLabel = false,
  } = spec

  const bringsNew =
    changeType === ECN_CHANGE_ITEM_TYPE.ADD ||
    changeType === ECN_CHANGE_ITEM_TYPE.REPLACE ||
    swapMaterial ||
    (changeType === ECN_CHANGE_ITEM_TYPE.MODIFY && Boolean(afterCode) && beforeCode !== afterCode)

  const planHits = findPlanMaterialsByCode(pairs, beforeCode)
  const newHits = findPlanMaterialsByCode(pairs, afterCode)
  const { pendingWos, startedWos, pendingOut, approvedOuts } = collectDocsForCode(ecn, beforeCode)
  const purchasedOld = isPurchasedSupply(oldSupplyForm)
  const hasPendingDocs = pendingWos.length > 0 || pendingOut.length > 0
  const hasIssuedDocs = startedWos.length > 0 || approvedOuts.length > 0
  // 有实际单据就可作废：不因「外购」标签挡掉；纯外购无单才仅暂不处理
  const canUpdateQty = qtyOnly && (hasPendingDocs || (planHits.length > 0 && !hasIssuedDocs))
  const canVoidPending = changeType !== ECN_CHANGE_ITEM_TYPE.ADD && hasPendingDocs && !qtyOnly
  const canForceVoid = changeType !== ECN_CHANGE_ITEM_TYPE.ADD && hasIssuedDocs && !qtyOnly
  const canVoidPendingQty = qtyOnly && hasPendingDocs
  const canForceVoidQty = qtyOnly && hasIssuedDocs
  const canSchedule =
    bringsNew &&
    Boolean(afterCode) &&
    !findWorkOrdersByCode(ecn, afterCode).some(
      (wo) => wo.status !== '终止' && wo.status !== '已作废',
    )
  const canScheduleAfterVoid =
    qtyOnly &&
    Boolean(afterCode) &&
    (hasPendingDocs || hasIssuedDocs || planHits.length > 0 || newHits.length > 0)

  const situationItems = buildSituationItems({
    changeType,
    purchasedOld,
    planHits,
    pendingWos,
    startedWos,
    pendingOut,
    approvedOuts,
  })
  const situationParts = situationItems.map((it) =>
    it.code ? `${it.kind} ${it.code} ${it.status}` : it.status,
  )

  let defaultOldAction = ECN_OLD_ACTION.SKIP
  if (canUpdateQty) defaultOldAction = ECN_OLD_ACTION.UPDATE_QTY
  else if (canVoidPending || canVoidPendingQty) defaultOldAction = ECN_OLD_ACTION.VOID_PENDING
  else if (canForceVoid || canForceVoidQty) defaultOldAction = ECN_OLD_ACTION.SKIP
  else if (purchasedOld && !hasPendingDocs && !hasIssuedDocs) defaultOldAction = ECN_OLD_ACTION.SKIP

  let defaultNewAction = ECN_NEW_ACTION.SKIP
  if (canSchedule) defaultNewAction = ECN_NEW_ACTION.SCHEDULE
  else if (canScheduleAfterVoid && defaultOldAction !== ECN_OLD_ACTION.UPDATE_QTY) {
    defaultNewAction = ECN_NEW_ACTION.SCHEDULE
  }

  const modifyKindLabel =
    modifyKind === 'qty_only' ? '改用量' : modifyKind === 'swap_material' ? '换料' : ''

  const beforeText = hideSubtreeInLabel
    ? materialLabel(beforeCode, beforeName, beforeSpec, beforeQty)
    : materialLabelWithSubtree(beforeCode, beforeName, beforeSpec, beforeQty, item?.origChildren)
  const afterText =
    changeType === ECN_CHANGE_ITEM_TYPE.REMOVE || !afterCode
      ? '—'
      : hideSubtreeInLabel
        ? materialLabel(afterCode, afterName, afterSpec, afterQty)
        : materialLabelWithSubtree(afterCode, afterName, afterSpec, afterQty, item?.newChildren)

  return {
    key,
    changeType,
    modifyKind,
    modifyKindLabel,
    subtreeTag,
    beforeText,
    afterText,
    oldSituation: situationParts.join('；'),
    oldSituationItems: situationItems,
    supplyForm,
    qtyOnly,
    swapMaterial,
    hasSubtree,
    canUpdateQty,
    canVoidPending: canVoidPending || canVoidPendingQty,
    canForceVoid: canForceVoid || canForceVoidQty,
    canSchedule,
    canScheduleAfterVoid,
    parentHint,
    // 仅「无关联工单/外协单的外购」才提示采购侧人工
    purchased: purchasedOld && !hasPendingDocs && !hasIssuedDocs,
    forceVoidStatusText:
      [
        ...startedWos.map((wo) => `${wo.code}「${wo.status}」`),
        ...approvedOuts.map((o) => `${o.orderNo}「${o.status}」`),
      ].join('、') || '已下发',
    defaultOldAction,
    defaultNewAction,
    canVoid: canVoidPending || canVoidPendingQty,
    needManual:
      (purchasedOld && !hasPendingDocs && !hasIssuedDocs) || canForceVoid || canForceVoidQty,
    pendingWoIds: pendingWos.map((wo) => wo.id),
    pendingOutIds: pendingOut.map((o) => o.id),
    startedWoIds: startedWos.map((wo) => wo.id),
    approvedOutIds: approvedOuts.map((o) => o.id),
    beforeCode,
    afterCode,
    origUnitQty: beforeQty,
    newUnitQty: afterQty,
    newMaterialName: afterName || '',
    newSpecModel: afterSpec || '',
    newMaterial: item?.newMaterial || '',
    planId: (planHits[0] || newHits[0] || pairs[0])?.plan?.id || '',
    workItemId: (planHits[0] || newHits[0] || pairs[0])?.wi?.id || '',
    sourceChangeItemId: item?.id || key,
  }
}

/**
 * 按 ECN 变更项对比；替换含子树时父件与下级分拆多行，各自处置工单/订单
 */
export function buildEcnChangeLineRows(ecn) {
  if (!ecn) return []
  const pairs = listScopedWorkItems(ecn)
  const rows = []

  ;(ecn.changeItems || []).forEach((item, index) => {
    const changeType = item.changeType || ECN_CHANGE_ITEM_TYPE.MODIFY
    const beforeCode = item.origMaterialCode || ''
    const afterCode = item.newMaterialCode || ''
    const modifyKind = classifyModifyKind(item, changeType)
    const qtyOnly = modifyKind === 'qty_only'
    const swapMaterial = modifyKind === 'swap_material'
    const hasSubtree =
      Boolean(item.replaceWithSubtree) ||
      Boolean(item.origChildren?.length) ||
      Boolean(item.newChildren?.length)
    const planHits = findPlanMaterialsByCode(pairs, beforeCode)
    const newHits = findPlanMaterialsByCode(pairs, afterCode)
    const oldSupplyForm =
      item.origSupplyForm || planHits[0]?.material?.supplyType || item.supplyForm || '自制件'
    const supplyForm =
      item.newSupplyForm ||
      item.supplyForm ||
      newHits[0]?.material?.supplyType ||
      oldSupplyForm ||
      '自制件'

    const parentKey = item.id || `ci-${index}`
    rows.push(
      buildOneChangeLineRow(ecn, pairs, {
        key: parentKey,
        item,
        changeType,
        beforeCode,
        afterCode,
        beforeName: item.origMaterialName,
        beforeSpec: item.origSpecModel,
        beforeQty: item.origUnitQty,
        afterName: item.newMaterialName,
        afterSpec: item.newSpecModel,
        afterQty: item.newUnitQty,
        oldSupplyForm,
        supplyForm,
        modifyKind,
        qtyOnly,
        swapMaterial,
        hasSubtree,
        subtreeTag: hasSubtree ? '父件' : '',
        parentHint: '',
        hideSubtreeInLabel: hasSubtree,
      }),
    )

    if (!hasSubtree) return

    const origChildren = item.origChildren || []
    const newChildren = item.newChildren || []
    const childCount = Math.max(origChildren.length, newChildren.length)
    for (let i = 0; i < childCount; i += 1) {
      const oc = origChildren[i]
      const nc = newChildren[i]
      const childBefore = oc?.code || ''
      const childAfter = nc?.code || ''
      let childChangeType = ECN_CHANGE_ITEM_TYPE.REPLACE
      if (oc && !nc) childChangeType = ECN_CHANGE_ITEM_TYPE.REMOVE
      else if (!oc && nc) childChangeType = ECN_CHANGE_ITEM_TYPE.ADD

      const childOldSupply =
        oc?.supplyForm || oc?.supplyType || item.origSupplyForm || oldSupplyForm || '自制件'
      const childNewSupply =
        nc?.supplyForm || nc?.supplyType || item.newSupplyForm || supplyForm || '自制件'

      rows.push(
        buildOneChangeLineRow(ecn, pairs, {
          key: `${parentKey}-sub-${i}-${childBefore || childAfter || i}`,
          item: {
            id: `${parentKey}-sub-${i}`,
            newMaterialName: nc?.name || '',
            newSpecModel: nc?.spec || '',
            newUnitQty: nc?.unitQty,
            newMaterialCode: childAfter,
            supplyForm: childNewSupply,
          },
          changeType: childChangeType,
          beforeCode: childBefore,
          afterCode: childAfter,
          beforeName: oc?.name || '',
          beforeSpec: oc?.spec || '',
          beforeQty: oc?.unitQty,
          afterName: nc?.name || '',
          afterSpec: nc?.spec || '',
          afterQty: nc?.unitQty,
          oldSupplyForm: childOldSupply,
          supplyForm: childNewSupply,
          modifyKind: null,
          qtyOnly: false,
          swapMaterial: Boolean(childBefore && childAfter && childBefore !== childAfter),
          hasSubtree: false,
          subtreeTag: '下级',
          parentHint: '',
          hideSubtreeInLabel: true,
        }),
      )
    }
  })

  return rows
}

function ensureNewPlanMaterial(ecn, row) {
  const pairs = listScopedWorkItems(ecn)
  const existing = findPlanMaterialsByCode(pairs, row.afterCode)
  const item =
    (ecn.changeItems || []).find(
      (ci) => (ci.id || '') === row.key || (ci.id || '') === row.sourceChangeItemId,
    ) || {}
  const newUnit = Number(row.newUnitQty ?? item.newUnitQty)
  if (existing.length) {
    const hit = existing[0]
    const parentQty = Number(hit.wi.planQty ?? hit.wi.orderQty ?? hit.wi.salesQty) || 1
    if (Number.isFinite(newUnit) && newUnit > 0) {
      hit.material.unitUsage = newUnit
      hit.material.demandQty = newUnit * parentQty
      hit.material.planQty = newUnit * parentQty
    }
    hit.material.updatedByEcnNo = ecn.ecnNo || ''
    markWorkItemRescheduled(hit.wi, ecn)
    return hit
  }
  const host = pairs[0]
  if (!host) return null
  const qty = Number(host.wi.planQty ?? host.wi.orderQty ?? host.wi.salesQty) || 1
  const unitUsage = Number.isFinite(newUnit) && newUnit > 0 ? newUnit : 1
  const supplyType = row.supplyForm || item.supplyForm || '自制件'
  const material = createPlanMaterial({
    name: row.newMaterialName || item.newMaterialName || row.afterCode,
    code: row.afterCode,
    spec: row.newSpecModel || item.newSpecModel || '',
    material: row.newMaterial || item.newMaterial || '',
    drawingNo: item.newDrawingNo || '',
    unitUsage,
    supplyType,
    demandQty: unitUsage * qty,
    planQty: unitUsage * qty,
    joinPlan: '是',
    status: '待下达',
    remark: `ECN ${ecn.ecnNo || ''} 新增`,
  })
  material.addedByEcnNo = ecn.ecnNo || ''
  material.updatedByEcnNo = ecn.ecnNo || ''
  if (!Array.isArray(host.wi.materials)) host.wi.materials = []
  host.wi.materials.push(material)
  markWorkItemRescheduled(host.wi, ecn)
  return { plan: host.plan, wi: host.wi, material }
}

function markWorkItemRescheduled(workItem, ecn) {
  if (!workItem) return
  workItem.lastRescheduleEcnNo = ecn?.ecnNo || ecn?.ecrNo || ''
  workItem.lastRescheduleAt = dayjs().format('YYYY-MM-DD HH:mm')
}

/** 改用量：除「更新数量」外，暂不处理/作废均可按新用量生成新单 */
function canRunSchedule(row, oldAction) {
  if (row.canSchedule) return true
  if (!row.canScheduleAfterVoid) return false
  return oldAction !== ECN_OLD_ACTION.UPDATE_QTY
}

function updateQtyForOldMaterial(ecn, row) {
  const pairs = listScopedWorkItems(ecn)
  const hits = findPlanMaterialsByCode(pairs, row.beforeCode)
  const newUnit = Number(row.newUnitQty)
  let updatedPlan = 0
  hits.forEach(({ wi, material }) => {
    const parentQty = Number(wi.planQty ?? wi.orderQty ?? wi.salesQty) || 1
    if (Number.isFinite(newUnit)) {
      material.unitUsage = newUnit
      material.demandQty = newUnit * parentQty
      material.planQty = newUnit * parentQty
    }
    material.updatedByEcnNo = ecn.ecnNo || ''
    markWorkItemRescheduled(wi, ecn)
    updatedPlan += 1
  })

  let updatedWo = 0
  ;(row.pendingWoIds || []).forEach((id) => {
    const wo = workOrderState.orders.find((o) => o.id === id)
    if (!wo || wo.status !== '待下发') return
    const parentQty =
      Number(hits[0]?.wi?.planQty ?? hits[0]?.wi?.orderQty ?? hits[0]?.wi?.salesQty) || 1
    const qty = Number.isFinite(newUnit) ? newUnit * parentQty : Number(wo.planQty) || 0
    updateWorkOrder(id, {
      planQty: qty,
      scheduleQty: Math.min(Number(wo.scheduleQty) || 0, qty),
      remark: `${wo.remark || ''}`.trim()
        ? `${wo.remark}；ECN ${ecn.ecnNo || ''} 更新数量`
        : `ECN ${ecn.ecnNo || ''} 更新数量`,
    })
    updatedWo += 1
  })

  let updatedOut = 0
  ;(row.pendingOutIds || []).forEach((id) => {
    const order = outsourcingOrderState.orders.find((o) => o.id === id)
    if (!order || !OUTSOURCE_VOIDABLE.has(order.status)) return
    const parentQty =
      Number(hits[0]?.wi?.planQty ?? hits[0]?.wi?.orderQty ?? hits[0]?.wi?.salesQty) || 1
    const qty = Number.isFinite(newUnit) ? newUnit * parentQty : 0
    ;(order.lineItems || []).forEach((line) => {
      if (
        line.itemCode === row.beforeCode ||
        line.productCode === row.beforeCode ||
        line.materialCode === row.beforeCode
      ) {
        line.planQty = qty
      }
    })
    updateOutsourcingOrder(id, {
      lineItems: order.lineItems,
      remark: `${order.remark || ''}`.trim()
        ? `${order.remark}；ECN ${ecn.ecnNo || ''} 更新数量`
        : `ECN ${ecn.ecnNo || ''} 更新数量`,
    })
    updatedOut += 1
  })

  return { updatedPlan, updatedWo, updatedOut }
}

function voidWorkOrderById(ecn, id, { force = false } = {}) {
  const wo = workOrderState.orders.find((o) => o.id === id)
  if (!wo) return null
  if (
    wo.status === '终止' ||
    wo.status === '已作废' ||
    wo.status === '已完成' ||
    wo.status === '完成'
  ) {
    return null
  }
  if (!force && wo.status !== '待下发') return null
  if (force && wo.status !== '待下发' && !isStartedWorkOrder(wo)) return null
  const ecnNo = ecn.ecnNo || ''
  const note = force ? `${VOID_REASON}·强制作废（${ecnNo}）` : `${VOID_REASON}（${ecnNo}）`
  updateWorkOrder(id, {
    status: '终止',
    remark: `${wo.remark || ''}`.trim() ? `${wo.remark}；${note}` : note,
    supersededByEcnNo: ecnNo,
    voidReason: note,
  })
  appendWorkOrderOperationLog(wo, {
    action: force ? 'ECN强制终止' : 'ECN终止',
    operator: '系统',
    remark: force ? `ECN强制终止（${ecnNo}）` : `ECN变更终止（${ecnNo}）`,
  })
  return { kind: '生产工单', code: wo.code, id: wo.id }
}

function voidOutOrderById(ecn, id, { force = false } = {}) {
  const order = outsourcingOrderState.orders.find((o) => o.id === id)
  if (!order) return null
  if (!force && !OUTSOURCE_VOIDABLE.has(order.status)) return null
  if (force && !OUTSOURCE_VOIDABLE.has(order.status) && !OUTSOURCE_APPROVED.has(order.status)) {
    return null
  }
  const note = force
    ? `${VOID_REASON}·强制作废（${ecn.ecnNo || ''}）`
    : `${VOID_REASON}（${ecn.ecnNo || ''}）`
  updateOutsourcingOrder(id, {
    status: '已作废',
    voidReason: note,
    remark: `${order.remark || ''}`.trim() ? `${order.remark}；${note}` : note,
  })
  return { kind: '外协订单', code: order.orderNo, id: order.id }
}

function resolveScheduleContext(ecn, row) {
  const hit = ensureNewPlanMaterial(ecn, row)
  const so = String(ecn?.salesOrderNo || '').trim()
  if (hit) {
    const { plan, material, wi } = hit
    const supply = row.supplyForm || material.supplyType || '自制件'
    material.supplyType = supply
    material.joinPlan = '是'
    material.status = isPurchasedSupply(supply) ? '进行中' : '待下达'
    material.releaseStatus = MATERIAL_RELEASE_STATUS.RELEASABLE
    material.phase2Deferred = false
    return {
      ok: true,
      plan,
      material,
      supply,
      sourceOrder: {
        orderNo: plan.salesOrderNo || plan.orderNo || so,
        planSource: plan.planSource || '',
        salesOrderId: plan.salesOrderId || '',
      },
      planRow: {
        code: material.code || row.afterCode,
        productName: material.name || row.newMaterialName || row.afterCode,
        planQty: material.planQty || Number(row.newUnitQty) || 1,
        spec: material.spec || row.newSpecModel || '',
        material: material.material || row.newMaterial || '',
        drawingNo: material.drawingNo || '',
        workCenter: material.workCenter,
        warehouse: material.warehouse,
        urgency: plan.urgency,
        remark: material.remark,
        processRoute: material.processRoute,
        supplier: material.supplier,
        workItemId: wi.id,
        bomId: wi.bomId,
      },
    }
  }
  // 计划中无挂接物料时，仍按变更行直接开单（保证执行结果能出单号）
  const qty = Number(row.newUnitQty) || 1
  return {
    ok: true,
    plan: null,
    material: null,
    supply: row.supplyForm || '自制件',
    sourceOrder: { orderNo: so, planSource: '', salesOrderId: '' },
    planRow: {
      code: row.afterCode,
      productName: row.newMaterialName || row.afterCode,
      planQty: qty,
      spec: row.newSpecModel || '',
      material: row.newMaterial || '',
      drawingNo: '',
      urgency: '',
      remark: `ECN ${ecn.ecnNo || ''} 变更执行生成`,
    },
  }
}

function createEcnProductionWorkOrder(ecn, planRow, sourceOrder) {
  const wo = createWorkOrderPayload({
    productName: planRow.productName || planRow.code,
    orderCategory: '生产工单',
    scheduleQty: 0,
    planQty: Number(planRow.planQty) || 1,
    workCenter: planRow.workCenter || '默认工厂',
    warehouse: planRow.warehouse || '',
    urgency: planRow.urgency || '正常',
    remark: planRow.remark || `ECN ${ecn.ecnNo || ''} 变更执行生成`,
    processRouteName: planRow.processRoute || '',
    source: 'ECN变更执行',
    sourceOrderNo: sourceOrder.orderNo || ecn.salesOrderNo || '',
    materialCode: planRow.code,
    bomId: planRow.bomId || '',
    specModel: planRow.spec || '',
    material: planRow.material || '',
    drawingNo: planRow.drawingNo || '',
  })
  addWorkOrder(wo)
  return wo
}

function scheduleNewMaterial(ecn, row, supplyOverride) {
  if (!row.afterCode) {
    return { scheduled: false, message: '无新料编码，无法生成单据' }
  }
  const ctx = resolveScheduleContext(ecn, row)
  const supply = supplyOverride || ctx.supply || row.supplyForm || '自制件'
  const { planRow, sourceOrder, plan, material } = ctx
  if (material) material.supplyType = supply

  if (supply === '外协件') {
    const order = addOutsourcingOrder({
      status: '待审核',
      approvalResult: '待审核',
      source: 'ECN变更执行',
      sourceOrderNo: sourceOrder.orderNo || '',
      salesOrderNo: sourceOrder.orderNo || '',
      salesOrderId: sourceOrder.salesOrderId || '',
      supplier: planRow.supplier || '',
      remark: `ECN ${ecn.ecnNo || ''} 按新料生成外协订单`,
      lineItems: [
        createOutsourcingLine({
          productName: planRow.productName || planRow.code,
          productCode: planRow.code,
          itemCode: planRow.code,
          itemName: planRow.productName || planRow.code,
          specModel: planRow.spec || '',
          material: planRow.material || '',
          drawingNo: planRow.drawingNo || '',
          planQty: Number(planRow.planQty) || 1,
          unit: '件',
        }),
      ],
    })
    return {
      scheduled: true,
      purchase: false,
      createdDocs: [{ kind: '外协订单', code: order?.orderNo || '', id: order?.id || '' }],
    }
  }
  if (isPurchasedSupply(supply)) {
    if (material) {
      material.joinPlan = '是'
      material.status = '进行中'
    }
    return {
      scheduled: true,
      purchase: true,
      purchaseDraft: {
        plan,
        material,
        sourceOrder,
        rowKey: row.key,
        planRow: {
          ...planRow,
          productName: planRow.productName || row.newMaterialName || row.afterCode,
          demandQty: planRow.planQty,
          planQty: planRow.planQty,
        },
      },
    }
  }

  const wo = createEcnProductionWorkOrder(ecn, planRow, sourceOrder)
  return {
    scheduled: true,
    purchase: false,
    createdDocs: [{ kind: '生产工单', code: wo.code, id: wo.id }],
  }
}

/** 多条外购新料合并生成一张采购申请 */
function flushMergedPurchaseRequisition(ecn, drafts) {
  if (!drafts?.length) return null
  const byCode = new Map()
  drafts.forEach((d) => {
    const code = String(d.planRow.code || '').trim()
    if (!code) return
    const prev = byCode.get(code)
    if (!prev) {
      byCode.set(code, { ...d.planRow })
      return
    }
    prev.planQty = (Number(prev.planQty) || 0) + (Number(d.planRow.planQty) || 0)
    prev.demandQty = (Number(prev.demandQty) || 0) + (Number(d.planRow.demandQty) || 0)
  })
  const rows = [...byCode.values()]
  if (!rows.length) return null
  const host = drafts[0]
  const plan = host.plan
  const sourceOrder = host.sourceOrder
  const requisition = buildRequisitionFromPlanRows(
    rows,
    {
      orderNo: sourceOrder.orderNo,
      urgency: plan?.urgency,
      deliveryDate: plan?.deliveryDate,
      planAssemblyDate: plan?.planAssemblyDate,
      remark: plan?.remark,
    },
    {
      remark: `ECN ${ecn.ecnNo || ''} 变更执行生成（${rows.length} 条明细合并）`,
      urgency: plan?.urgency,
    },
  )
  requisition.source = 'ECN变更执行'
  addPurchaseRequisition(requisition)
  drafts.forEach((d) => {
    if (!d.material) return
    d.material.remark = `${d.material.remark || ''}`.trim()
      ? `${d.material.remark}；已生成采购申请 ${requisition.reqNo}`
      : `已生成采购申请 ${requisition.reqNo}`
  })
  return requisition
}

/**
 * 整单换 BOM，或细项：旧料更新数量/作废/强制作废 + 新料按供应型态生成单据
 */
export function rescheduleEcnImpact(ecn, selection = {}) {
  const wholePlanMode = Boolean(selection.wholePlanMode)
  const lineRows = buildEcnChangeLineRows(ecn)
  const oldActionByKey = selection.oldActionByKey || {}
  const newActionByKey = selection.newActionByKey || {}
  const supplyFormByKey = selection.supplyFormByKey || {}

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
  let cancelledOut = 0
  let scheduled = 0
  let updatedQty = 0
  let purchaseReqNo = ''
  const purchaseDrafts = []
  const dispositionLines = []

  if (!wholePlanMode) {
    lineRows.forEach((row) => {
      const oldAction = oldActionByKey[row.key] || row.defaultOldAction || ECN_OLD_ACTION.SKIP
      const newAction = newActionByKey[row.key] || row.defaultNewAction || ECN_NEW_ACTION.SKIP
      const supply = supplyFormByKey[row.key] || row.supplyForm || ''
      const resultItems = []

      if (oldAction === ECN_OLD_ACTION.UPDATE_QTY) {
        const res = updateQtyForOldMaterial(ecn, row)
        const n = res.updatedPlan + res.updatedWo + res.updatedOut
        updatedQty += n
        if (n > 0) {
          resultItems.push({ action: '更新数量', detail: `已更新 ${n} 处计划/单据数量` })
        }
      } else if (oldAction === ECN_OLD_ACTION.VOID_PENDING) {
        ;(row.pendingWoIds || []).forEach((id) => {
          const doc = voidWorkOrderById(ecn, id, { force: false })
          if (doc) {
            cancelledWo += 1
            resultItems.push({ action: '作废原单', detail: `${doc.kind} ${doc.code}` })
          }
        })
        ;(row.pendingOutIds || []).forEach((id) => {
          const doc = voidOutOrderById(ecn, id, { force: false })
          if (doc) {
            cancelledOut += 1
            resultItems.push({ action: '作废原单', detail: `${doc.kind} ${doc.code}` })
          }
        })
      } else if (oldAction === ECN_OLD_ACTION.FORCE_VOID) {
        ;[...(row.pendingWoIds || []), ...(row.startedWoIds || [])].forEach((id) => {
          const doc = voidWorkOrderById(ecn, id, { force: true })
          if (doc) {
            cancelledWo += 1
            resultItems.push({ action: '强制作废', detail: `${doc.kind} ${doc.code}` })
          }
        })
        ;[...(row.pendingOutIds || []), ...(row.approvedOutIds || [])].forEach((id) => {
          const doc = voidOutOrderById(ecn, id, { force: true })
          if (doc) {
            cancelledOut += 1
            resultItems.push({ action: '强制作废', detail: `${doc.kind} ${doc.code}` })
          }
        })
      }

      if (newAction === ECN_NEW_ACTION.SCHEDULE && canRunSchedule(row, oldAction)) {
        const res = scheduleNewMaterial(ecn, row, supply)
        if (res.purchaseDraft) {
          purchaseDrafts.push(res.purchaseDraft)
        } else if (res.scheduled) {
          scheduled += 1
          const docs = res.createdDocs || []
          if (docs.length) {
            docs.forEach((doc) => {
              resultItems.push({
                action: '生成新单',
                detail: `${doc.kind} ${doc.code}`,
                docKind: doc.kind,
                docCode: doc.code,
                docId: doc.id,
              })
            })
          } else {
            resultItems.push({
              action: '生成新单',
              detail: res.message || '未返回单号',
            })
          }
        } else {
          resultItems.push({
            action: '生成新单',
            detail: res.message || '生成失败',
          })
        }
      }

      dispositionLines.push({
        key: row.key,
        changeType: row.changeType,
        modifyKindLabel: row.modifyKindLabel || '',
        subtreeTag: row.subtreeTag || '',
        beforeText: row.beforeText,
        afterText: row.afterText,
        oldAction,
        oldActionLabel: ECN_OLD_ACTION_LABEL[oldAction] || oldAction,
        newAction,
        newActionLabel:
          newAction === ECN_NEW_ACTION.SCHEDULE
            ? scheduleActionLabel(supply, row)
            : ECN_NEW_ACTION_LABEL[newAction] || newAction,
        supplyForm: supply,
        resultItems,
      })
    })

    const requisition = flushMergedPurchaseRequisition(ecn, purchaseDrafts)
    if (requisition) {
      scheduled += 1
      purchaseReqNo = requisition.reqNo || ''
      const purchaseKeys = new Set(purchaseDrafts.map((d) => d.rowKey).filter(Boolean))
      dispositionLines.forEach((line) => {
        if (!purchaseKeys.has(line.key)) return
        line.resultItems.push({
          action: '生成新单',
          detail: `采购申请 ${purchaseReqNo}`,
          docKind: '采购申请',
          docCode: purchaseReqNo,
          docId: requisition.id || '',
        })
      })
    }
  } else if (refreshed > 0) {
    dispositionLines.push({
      key: 'whole-plan',
      changeType: '整单换BOM',
      modifyKindLabel: '',
      subtreeTag: '',
      beforeText: '—',
      afterText: '按生效 BOM 刷新所选计划工作项',
      oldAction: '',
      oldActionLabel: '—',
      newAction: '',
      newActionLabel: '整单换 BOM',
      supplyForm: '',
      resultItems: [{ action: '整单换BOM', detail: `已刷新 ${refreshed} 个计划工作项` }],
    })
  }

  const dispositionSnapshot = {
    at: dayjs().format('YYYY-MM-DD HH:mm'),
    wholePlanMode,
    lines: dispositionLines,
    summary: {
      refreshed,
      cancelledWo,
      cancelledOut,
      scheduled,
      updatedQty,
      purchaseReqNo,
      purchaseLineCount: purchaseDrafts.length,
      errors: errors.length,
    },
  }

  if (ecn) {
    // 执行页无草稿：点一次「确认执行并重排」即视为重排完成（含全选暂不处理/未勾选）
    ecn.rescheduleStatus = ECN_RESCHEDULE_STATUS.DONE
    ecn.rescheduleAt = dispositionSnapshot.at
    ecn.rescheduleSummary = {
      ...dispositionSnapshot.summary,
      wholePlanMode,
    }
    ecn.rescheduleDisposition = dispositionSnapshot
  }

  return {
    ok:
      errors.length === 0 ||
      refreshed > 0 ||
      cancelledWo > 0 ||
      cancelledOut > 0 ||
      scheduled > 0 ||
      updatedQty > 0,
    refreshed,
    cancelledWo,
    cancelledOut,
    cancelledPlan: 0,
    scheduled,
    updatedQty,
    purchaseReqNo,
    purchaseLineCount: purchaseDrafts.length,
    disposition: dispositionSnapshot,
    errors,
  }
}

function scheduleActionLabel(supply, row) {
  if (supply === '外购件' || supply === '外购') return '生成采购申请单'
  if (supply === '外协件') return '生成待审核的外协订单'
  if (row?.modifyKind === 'qty_only') return '按新用量生成待下发生产工单'
  return '生成待下发生产工单'
}

export function setMaterialReleaseStatus(material, status) {
  if (!material) return
  material.releaseStatus = status || MATERIAL_RELEASE_STATUS.RELEASABLE
  if (status === MATERIAL_RELEASE_STATUS.PENDING_SPEC) {
    material.joinPlan = '否'
  }
}
