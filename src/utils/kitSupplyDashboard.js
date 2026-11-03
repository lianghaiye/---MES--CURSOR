/**
 * 齐套与供应进度：计划侧 / 车间投屏共用只读聚合层
 */
import dayjs from 'dayjs'
import { productionPlanState } from '@/store/productionPlanStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { materialRequisitionState } from '@/store/materialRequisitionStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { calcGapQty } from '@/utils/material'
import {
  applyKitPriorityAllocationToRows,
  compareKitDemandPriority,
} from '@/utils/kitStockAllocate'
import {
  buildDisplayMaterialTree,
  resolvePlanAssemblyDate,
  isPurchasedOrOutsourced,
} from '@/utils/productionPlanMaterial'
import { hydratePurchaseSuppliers } from '@/utils/purchaseSuppliers'
import { listMobileTasksForWorkOrder } from '@/utils/workOrderStatus'
import { normalizeOutsourceMode, OUTSOURCE_MODE } from '@/utils/outsourcingMode'
import { formatQty } from '@/utils/numberFormat'

export const KIT_SUPPLY_TABS = [
  { key: 'kitting', label: '齐套进度' },
  { key: 'part-process', label: '零件工序进度' },
  { key: 'outsourcing', label: '外协进度准时率' },
  { key: 'long-lead', label: '长周期件预警' },
  { key: 'material-util', label: '材料利用率' },
]

export const KIT_VIEW_MODE = {
  PLAN: 'plan',
  PRODUCTION_WORK_ORDER: 'productionWorkOrder',
  ASSEMBLY_WORK_ORDER: 'assemblyWorkOrder',
  /** @deprecated 兼容旧链接，等同生产工单 */
  WORK_ORDER: 'workOrder',
}

export function normalizeKitView(kitView) {
  if (kitView === KIT_VIEW_MODE.PLAN) return KIT_VIEW_MODE.PLAN
  if (kitView === KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER) return KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER
  if (kitView === KIT_VIEW_MODE.PRODUCTION_WORK_ORDER || kitView === KIT_VIEW_MODE.WORK_ORDER) {
    return KIT_VIEW_MODE.PRODUCTION_WORK_ORDER
  }
  // 未指定或未知值：默认按生产工单
  return KIT_VIEW_MODE.PRODUCTION_WORK_ORDER
}

export function isWorkOrderKitView(kitView) {
  const v = normalizeKitView(kitView)
  return v === KIT_VIEW_MODE.PRODUCTION_WORK_ORDER || v === KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER
}

/** 与产品 BOM 一致：根 0；一级 1、2…；二级 1.1、1.2… */
function nextBomLevelNo(parentLevelNo, siblingIndex) {
  if (!parentLevelNo || parentLevelNo === '0') return String(siblingIndex + 1)
  return `${parentLevelNo}.${siblingIndex + 1}`
}

const KIT_READY = 1
const KIT_BASIC = 0.8

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function matchKeyword(hay, keyword) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  return String(hay || '')
    .toLowerCase()
    .includes(kw)
}

function resolveLeadTimeDays(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return 0
  const master =
    materialInfoState.materials?.find((m) => m.code === code) ||
    productInfoState.products?.find((p) => p.code === code) ||
    null
  if (!master) return 0
  const suppliers = hydratePurchaseSuppliers(master)
  const withLead = suppliers.find((s) => num(s.leadTimeDays) > 0)
  return withLead ? num(withLead.leadTimeDays) : num(suppliers[0]?.leadTimeDays)
}

function shortageTone(gapQty, inTransitQty) {
  const gap = num(gapQty)
  if (gap <= 0) return 'ok'
  if (num(inTransitQty) > 0) return 'warn'
  return 'danger'
}

/** 缺件状态：已齐套 → 待到货 → 部分缺口 → 严重缺料 */
function shortageStatus(gapQty, inTransitQty) {
  const gap = num(gapQty)
  const transit = num(inTransitQty)
  if (gap <= 0) return { key: 'ok', label: '已齐套', color: 'success' }
  if (transit >= gap) return { key: 'pending', label: '待到货', color: 'warning' }
  if (transit > 0) return { key: 'partial', label: '部分缺口', color: 'warning' }
  return { key: 'severe', label: '严重缺料', color: 'error' }
}

function kitStatus(rate, readyLabel = '可装配') {
  if (rate >= KIT_READY) return { key: 'ready', label: readyLabel }
  if (rate >= KIT_BASIC) return { key: 'basic', label: '基本齐套' }
  return { key: 'shortage', label: '缺料' }
}

/** 工单计划完成日：取 planDateRange 结束日 */
function resolveWorkOrderPlanFinishDate(wo) {
  const range = wo?.planDateRange
  if (Array.isArray(range) && range.length >= 2 && range[1]) return range[1]
  return wo?.planEndDate || wo?.planFinishDate || wo?.dueDate || ''
}

function formatQtyWithUnit(qty, unit) {
  const q = formatQty(qty)
  const u = String(unit || '').trim()
  if (q === '—' || q === '') return u ? `— ${u}` : '—'
  return u ? `${q} ${u}` : q
}

function resolveExternalWorkNo(wi) {
  return (
    wi?.externalWorkNo ||
    wi?.outWorkNo ||
    wi?.customerJobNo ||
    wi?.externalJobNo ||
    wi?.customerWorkNo ||
    ''
  )
}

function resolveWorkItemUnit(wi) {
  return wi?.unit || wi?.inventoryUnit || '件'
}

function resolveEtaText(m, gap, inTransit) {
  const raw = m.expectedDate || m.etaDate || m.eta || m.arriveDate || ''
  if (raw) {
    const d = dayjs(raw)
    return d.isValid() ? d.format('MM-DD') : String(raw)
  }
  if (num(gap) > 0 && num(inTransit) > 0) {
    const lead = resolveLeadTimeDays(m.code || m.itemCode) || 7
    return dayjs().add(lead, 'day').format('MM-DD')
  }
  return '—'
}

function pushPartLine(lines, plan, wi, m, levelNo) {
  const demand = num(m.demandQty ?? m.planQty)
  if (demand <= 0) return
  const physical = num(m.stockQty ?? m.onHandQty)
  const available = num(m.availableStock ?? m.stockQty)
  const gap = m.gapQty != null ? num(m.gapQty) : calcGapQty(demand, available)
  const inTransit =
    m.kitDemoInTransit != null
      ? num(m.kitDemoInTransit)
      : num(m.inTransitQty ?? m.inTransitStockQty)
  const st = shortageStatus(gap, inTransit)
  const spec = m.spec || m.specModel || ''
  const material = m.material || ''
  lines.push({
    id: `${plan.id}-${wi.id}-${m.id || m.code}`,
    planId: plan.id,
    planNo: plan.orderNo || plan.salesOrderNo || plan.id,
    salesOrderNo: plan.salesOrderNo || plan.orderNo || '',
    salesOrderId: plan.salesOrderId || '',
    customerName: plan.customerName || '',
    workItemId: wi.id,
    productName: wi.productName || plan.productName || '',
    productCode: wi.productCode || '',
    itemCode: m.code || m.itemCode || m.materialCode || '',
    itemName: m.name || m.itemName || m.materialName || '',
    specModel: spec,
    material,
    drawingNo: m.drawingNo || m.drawingNumber || '',
    specMaterialText: [spec, material].filter(Boolean).join(' ') || '—',
    supplyType: m.supplyType || '',
    demandQty: demand,
    physicalQty: physical > 0 ? physical : available,
    stockQty: physical > 0 ? physical : available,
    availableQty: available,
    gapQty: gap,
    inTransitQty: inTransit,
    inTransitText: m.inTransitText || '',
    etaText: resolveEtaText(m, gap, inTransit),
    tone: shortageTone(gap, inTransit),
    statusKey: st.key,
    statusLabel: st.label,
    statusColor: st.color,
    unit: m.unit || m.inventoryUnit || '',
    sourceDocNo: m.sourceDocNo || m.poNo || m.prNo || '',
    levelNo: levelNo || '',
  })
}

function collectWorkItemPartLines(plan, wi) {
  const lines = []
  if (!plan || !wi) return lines
  const tree = buildDisplayMaterialTree(wi, plan)

  function walk(nodes, parentLevelNo = '') {
    if (!nodes?.length) return
    nodes.forEach((m, idx) => {
      const isRootTop = String(m.id || '').startsWith('top-')
      const levelNo = isRootTop ? '0' : nextBomLevelNo(parentLevelNo, idx)
      const skipRootRow = isRootTop && m.children?.length
      if (!skipRootRow) pushPartLine(lines, plan, wi, m, levelNo)
      if (m.children?.length) walk(m.children, isRootTop ? '0' : levelNo)
    })
  }

  walk(Array.isArray(tree) ? tree : tree ? [tree] : [])
  return lines
}

function collectPlanPartLines(plan) {
  const lines = []
  ;(plan?.workItems || []).forEach((wi) => {
    lines.push(...collectWorkItemPartLines(plan, wi))
  })
  return lines
}

function summarizeKitGroup({
  id,
  docNo,
  docNoLabel,
  customerName,
  productName,
  productCode,
  specModel,
  material,
  drawingNo,
  externalWorkNo,
  qty,
  unit,
  qtyText,
  planAssemblyDate,
  lines,
  planIds,
  salesOrderNo,
  workItemId,
  workOrderId,
  workOrderNo,
  productCount,
  readyStatusLabel,
  urgency,
  createdAt,
}) {
  const total = lines.length
  const missingLines = lines.filter((l) => num(l.gapQty) > 0)
  const missing = missingLines.length
  const complete = Math.max(0, total - missing)
  const rate = total > 0 ? complete / total : 1
  const readyLabel = readyStatusLabel || '可装配'
  const status = kitStatus(rate, readyLabel)
  return {
    id,
    docNo,
    docNoLabel: docNoLabel || '',
    customerName: customerName || '—',
    productName: productName || '—',
    productCode: productCode || '',
    specModel: specModel || '',
    material: material || '',
    drawingNo: drawingNo || '',
    externalWorkNo: externalWorkNo || '',
    qty: num(qty),
    unit: unit || '',
    qtyText: qtyText || formatQtyWithUnit(qty, unit),
    planAssemblyDate: planAssemblyDate || '',
    urgency: urgency || '正常',
    createdAt: createdAt || '',
    kitRate: rate,
    kitRatePct: Math.round(rate * 1000) / 10,
    missingCount: missing,
    statusKey: status.key,
    statusLabel: status.label,
    readyStatusLabel: readyLabel,
    planIds: planIds || [],
    salesOrderNo: salesOrderNo || '',
    workItemId: workItemId || '',
    workOrderId: workOrderId || '',
    workOrderNo: workOrderNo || '',
    productCount: productCount || 1,
    shortageLines: missingLines,
    allLines: lines,
    crumbLabel: `${customerName || '—'} · ${docNo || ''}`,
  }
}

/**
 * 按生产计划：一个计划多产品时，每个产品（工作项）一行；
 * 单号取计划 orderNo（销售来源计划通常等于销售订单号；补货来源为补货单号）。
 */
/** 计划关联销售单号：仅取 salesOrderNo，无关联则为空（列表展示为 -） */
function resolvePlanSalesOrderNo(plan) {
  return String(plan?.salesOrderNo || '').trim()
}

function buildKittingByPlan(plans) {
  const rows = []
  plans.forEach((plan) => {
    const planNo = plan.orderNo || plan.id
    const salesOrderNo = resolvePlanSalesOrderNo(plan)
    const workItems = plan.workItems || []
    if (!workItems.length) {
      rows.push(
        summarizeKitGroup({
          id: `plan-${plan.id}`,
          docNo: planNo,
          docNoLabel: '计划单号',
          customerName: plan.customerName,
          productName: '—',
          qty: num(plan.productQty),
          unit: '件',
          planAssemblyDate: resolvePlanAssemblyDate(plan) || plan.planAssemblyDate || '',
          lines: [],
          planIds: [plan.id],
          salesOrderNo,
          productCount: 0,
          readyStatusLabel: '可装配',
        }),
      )
      return
    }
    workItems.forEach((wi) => {
      const lines = collectWorkItemPartLines(plan, wi)
      const qty = num(wi.planQty ?? wi.orderQty ?? wi.salesQty)
      const unit = resolveWorkItemUnit(wi)
      const urgencyMeta = resolvePlanRowUrgencyMeta(plan)
      rows.push(
        summarizeKitGroup({
          id: `plan-${plan.id}-wi-${wi.id}`,
          docNo: planNo,
          docNoLabel: '计划单号',
          customerName: plan.customerName,
          productName: wi.productName || '',
          productCode: wi.productCode || '',
          specModel: wi.specModel || wi.model || '',
          material: wi.material || '',
          drawingNo: wi.drawingNo || '',
          externalWorkNo: resolveExternalWorkNo(wi),
          qty,
          unit,
          qtyText: formatQtyWithUnit(qty, unit),
          // 生产计划维度：取计划总装日期
          planAssemblyDate: resolvePlanAssemblyDate(plan) || plan.planAssemblyDate || '',
          lines,
          planIds: [plan.id],
          salesOrderNo,
          workItemId: wi.id,
          productCount: workItems.length,
          readyStatusLabel: '可装配',
          urgency: urgencyMeta.urgency,
          createdAt: urgencyMeta.createdAt,
        }),
      )
    })
  })
  return rows
}

function resolveWorkOrderNo(wo) {
  return String(wo?.code || wo?.orderNo || wo?.workOrderNo || '').trim()
}

/**
 * 生产计划维度紧急度：取计划自身 urgency（由销售订单紧急度映射而来），
 * 创建时间取计划创建时间。与「按工单」维度用工单紧急度区分开。
 */
function resolvePlanRowUrgencyMeta(plan) {
  return {
    urgency: plan?.urgency || '正常',
    createdAt: plan?.createdAt || plan?.createTime || '',
  }
}

function findPlanForWorkOrder(plans, wo) {
  const so = String(wo?.sourceOrderNo || wo?.salesOrderNo || '').trim()
  if (!so) return null
  return (
    plans.find(
      (p) =>
        String(p.orderNo || '') === so ||
        String(p.salesOrderNo || '') === so ||
        String(p.id || '') === so,
    ) ||
    plans.find((p) => {
      const a = String(p.orderNo || '')
      const b = String(p.salesOrderNo || '')
      return (a && (a.includes(so) || so.includes(a))) || (b && (b.includes(so) || so.includes(b)))
    }) ||
    null
  )
}

function findWorkItemForWorkOrder(plan, wo) {
  const items = plan?.workItems || []
  if (!items.length) return null
  const woCode = String(wo.materialCode || wo.productCode || wo.itemCode || '').trim()
  const woName = String(wo.productName || '').trim()
  return (
    items.find((wi) => woCode && String(wi.productCode || '').trim() === woCode) ||
    items.find((wi) => woName && String(wi.productName || '').trim() === woName) ||
    items.find(
      (wi) =>
        woName &&
        (String(wi.productName || '').includes(woName) ||
          woName.includes(String(wi.productName || ''))),
    ) ||
    null
  )
}

/**
 * 按生产工单 / 按总装工单：各自主表；能关联到生产计划工作项时带齐套明细
 * @param {'production'|'assembly'} source
 */
function buildKittingByWorkOrder(plans, source = 'production') {
  const isAssembly = source === 'assembly'
  const woList = isAssembly
    ? [...(assemblyWorkOrderState.orders || [])]
    : [...(workOrderState.orders || [])]
  const idPrefix = isAssembly ? 'awo' : 'wo'
  const pendingPrefix = isAssembly ? 'awo-pending' : 'wo-pending'
  const docNoLabel = isAssembly ? '总装工单号' : '生产工单号'
  const readyStatusLabel = isAssembly ? '可装配' : '可生产'
  const rows = []
  const linkedWiKeys = new Set()

  woList.forEach((wo) => {
    const woNo = resolveWorkOrderNo(wo)
    if (!woNo) return
    const plan = findPlanForWorkOrder(plans, wo)
    const wi = plan ? findWorkItemForWorkOrder(plan, wo) : null
    const lines = plan && wi ? collectWorkItemPartLines(plan, wi) : []
    if (plan && wi) linkedWiKeys.add(`${plan.id}::${wi.id}`)
    const qty = num(wo.scheduleQty ?? wo.planQty ?? wi?.planQty ?? wi?.orderQty ?? wi?.salesQty)
    const unit = resolveWorkItemUnit(wi || { unit: wo.unit })
    rows.push(
      summarizeKitGroup({
        id: `${idPrefix}-${wo.id}`,
        docNo: woNo,
        docNoLabel,
        customerName: wo.customerName || plan?.customerName || '',
        productName: wo.productName || wi?.productName || '',
        productCode: wo.materialCode || wo.productCode || wi?.productCode || '',
        specModel: wo.specModel || wi?.specModel || wi?.model || '',
        material: wo.material || wi?.material || '',
        drawingNo: wo.drawingNo || wi?.drawingNo || '',
        externalWorkNo: resolveExternalWorkNo(wi || wo),
        qty,
        unit,
        qtyText: formatQtyWithUnit(qty, unit),
        // 工单维度：取工单计划完成日期（planDateRange 结束日）
        planAssemblyDate: resolveWorkOrderPlanFinishDate(wo),
        lines,
        planIds: plan?.id ? [plan.id] : [],
        salesOrderNo: resolvePlanSalesOrderNo(plan) || String(wo.sourceOrderNo || '').trim(),
        workItemId: wi?.id || '',
        workOrderId: wo.id,
        workOrderNo: woNo,
        productCount: 1,
        readyStatusLabel,
        urgency: wo.urgency || '正常',
        createdAt: wo.createdAt || wo.createTime || '',
      }),
    )
  })

  // 尚未派工的计划产品：工单号显示「待派工」（仅在当前维度未关联时展示）
  plans.forEach((plan) => {
    ;(plan.workItems || []).forEach((wi) => {
      if (linkedWiKeys.has(`${plan.id}::${wi.id}`)) return
      const lines = collectWorkItemPartLines(plan, wi)
      const qty = num(wi.planQty ?? wi.orderQty ?? wi.salesQty)
      const unit = resolveWorkItemUnit(wi)
      rows.push(
        summarizeKitGroup({
          id: `${pendingPrefix}-${plan.id}-${wi.id}`,
          docNo: '待派工',
          docNoLabel,
          customerName: plan.customerName,
          productName: wi.productName || '',
          productCode: wi.productCode || '',
          specModel: wi.specModel || wi.model || '',
          material: wi.material || '',
          drawingNo: wi.drawingNo || '',
          externalWorkNo: resolveExternalWorkNo(wi),
          qty,
          unit,
          qtyText: formatQtyWithUnit(qty, unit),
          planAssemblyDate: resolvePlanAssemblyDate(plan) || plan.planAssemblyDate || '',
          lines,
          planIds: [plan.id],
          salesOrderNo: resolvePlanSalesOrderNo(plan),
          workItemId: wi.id,
          productCount: 1,
          readyStatusLabel,
          // 待派工：紧急度仍取生产计划（源自销售订单）
          urgency: plan.urgency || '正常',
          createdAt: plan.createdAt || plan.createTime || '',
        }),
      )
    })
  })

  return rows
}

function filterKitRows(rows, filters = {}) {
  const f = filters || {}
  const keyword = f.keyword
  return rows.filter((r) => {
    if (
      f.docNo &&
      !matchKeyword(r.docNo, f.docNo) &&
      !matchKeyword(r.salesOrderNo, f.docNo) &&
      !matchKeyword(r.workOrderNo, f.docNo)
    ) {
      return false
    }
    if (f.customerName && !matchKeyword(r.customerName, f.customerName)) return false
    if (f.productName && !matchKeyword(r.productName, f.productName)) return false
    if (f.productCode && !matchKeyword(r.productCode, f.productCode)) return false
    if (f.specModel && !matchKeyword(r.specModel, f.specModel)) return false
    if (f.material && !matchKeyword(r.material, f.material)) return false
    if (f.drawingNo && !matchKeyword(r.drawingNo, f.drawingNo)) return false
    if (f.externalWorkNo && !matchKeyword(r.externalWorkNo, f.externalWorkNo)) return false
    if (f.salesOrderNo && !matchKeyword(r.salesOrderNo || r.docNo, f.salesOrderNo)) return false
    if (f.workOrderNo && !matchKeyword(r.workOrderNo || r.docNo, f.workOrderNo)) return false
    if (
      keyword &&
      !matchKeyword(
        [
          r.docNo,
          r.customerName,
          r.productName,
          r.productCode,
          r.salesOrderNo,
          r.workOrderNo,
          r.specModel,
          r.material,
          r.drawingNo,
          r.externalWorkNo,
        ].join(' '),
        keyword,
      )
    ) {
      return false
    }
    return true
  })
}

function resolveOutsourceDueDate(order) {
  return order.planEndDate || order.planDate || order.planStartDate || ''
}

function resolveOutsourceReturnDate(order) {
  return order.actualReturnDate || order.returnDate || order.completedAt || order.finishDate || ''
}

function isOutsourceClosed(order) {
  const st = String(order.status || '')
  return st === '已完成' || st === '已终结' || st === '已作废'
}

function isOutsourceReturned(order) {
  return order.returnStatus === '已入库' || isOutsourceClosed(order)
}

function buildOutsourcingDashboard(filters = {}) {
  const f = filters || {}
  const keyword = f.keyword || ''
  const orders = [...(outsourcingOrderState.orders || [])]
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthEnd = now.endOf('month')
  const lookback = now.subtract(90, 'day')

  const active = orders.filter((o) => !isOutsourceClosed(o) && o.returnStatus !== '已入库')
  const overdueActive = active.filter((o) => {
    const due = resolveOutsourceDueDate(o)
    if (!due) return false
    return dayjs(due).isBefore(now, 'day') && !isOutsourceReturned(o)
  })

  const monthDone = orders.filter((o) => {
    const ret = resolveOutsourceReturnDate(o)
    if (!ret) return isOutsourceReturned(o) && o.planEndDate
    const d = dayjs(ret)
    return d.isValid() && !d.isBefore(monthStart, 'day') && !d.isAfter(monthEnd, 'day')
  })

  let monthOnTime = 0
  monthDone.forEach((o) => {
    const due = resolveOutsourceDueDate(o)
    const ret = resolveOutsourceReturnDate(o) || due
    if (!due) {
      monthOnTime += 1
      return
    }
    if (!dayjs(ret).isAfter(dayjs(due), 'day')) monthOnTime += 1
  })

  const overdueDaysList = overdueActive.map((o) => {
    const due = resolveOutsourceDueDate(o)
    return Math.max(0, now.diff(dayjs(due), 'day'))
  })
  const avgOverdue =
    overdueDaysList.length > 0
      ? Math.round((overdueDaysList.reduce((a, b) => a + b, 0) / overdueDaysList.length) * 10) / 10
      : 0

  const onTimeRate = monthDone.length ? monthOnTime / monthDone.length : 1

  const vendorMap = new Map()
  orders.forEach((o) => {
    const vendor = String(o.supplier || '未指定厂商').trim() || '未指定厂商'
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, {
        vendor,
        collabType: '—',
        activeCount: 0,
        done90: 0,
        onTime90: 0,
        overdueDaysSum: 0,
        overdueCount: 0,
        orderIds: [],
      })
    }
    const row = vendorMap.get(vendor)
    row.orderIds.push(o.id)
    const mode = normalizeOutsourceMode(o.outsourceMode)
    if (o.sourceProcessName) row.collabType = o.sourceProcessName
    else if (mode === OUTSOURCE_MODE.PROCESS) row.collabType = '工序外协'
    else if (mode === OUTSOURCE_MODE.WHOLE) row.collabType = '整件外协'

    if (!isOutsourceClosed(o) && o.returnStatus !== '已入库') row.activeCount += 1

    const due = resolveOutsourceDueDate(o)
    const ret = resolveOutsourceReturnDate(o)
    const refDate = ret || due
    if (refDate && !dayjs(refDate).isBefore(lookback, 'day') && isOutsourceReturned(o)) {
      row.done90 += 1
      if (!due || !dayjs(ret || due).isAfter(dayjs(due), 'day')) row.onTime90 += 1
    }
    if (due && dayjs(due).isBefore(now, 'day') && !isOutsourceReturned(o)) {
      row.overdueCount += 1
      row.overdueDaysSum += Math.max(0, now.diff(dayjs(due), 'day'))
    }
  })

  let vendors = [...vendorMap.values()].map((v) => {
    const rate = v.done90 > 0 ? v.onTime90 / v.done90 : v.activeCount === 0 ? 1 : 0.85
    return {
      id: v.vendor,
      vendor: v.vendor,
      collabType: v.collabType,
      activeCount: v.activeCount,
      onTimeRate: rate,
      onTimeRatePct: Math.round(rate * 1000) / 10,
      avgOverdueDays:
        v.overdueCount > 0 ? Math.round((v.overdueDaysSum / v.overdueCount) * 10) / 10 : 0,
      orderIds: v.orderIds,
    }
  })
  vendors.sort((a, b) => b.onTimeRate - a.onTimeRate || a.vendor.localeCompare(b.vendor, 'zh'))
  vendors = vendors.filter((v) => {
    if (f.vendor && !matchKeyword(v.vendor, f.vendor)) return false
    if (f.collabType && !matchKeyword(v.collabType, f.collabType)) return false
    if (keyword && !matchKeyword([v.vendor, v.collabType].join(' '), keyword)) return false
    return true
  })

  const orderRows = orders
    .map((o) => {
      const due = resolveOutsourceDueDate(o)
      const ret = resolveOutsourceReturnDate(o)
      const overdue =
        due && dayjs(due).isBefore(now, 'day') && !isOutsourceReturned(o)
          ? Math.max(0, now.diff(dayjs(due), 'day'))
          : 0
      return {
        id: o.id,
        orderNo: o.orderNo || o.id,
        vendor: o.supplier || '—',
        salesOrderNo: o.salesOrderNo || '',
        processName: o.sourceProcessName || o.workOrderName || '—',
        planEndDate: due,
        returnDate: ret,
        returnStatus: o.returnStatus || '—',
        status: o.status || '—',
        overdueDays: overdue,
      }
    })
    .filter((r) => {
      if (f.vendor && !matchKeyword(r.vendor, f.vendor)) return false
      if (f.orderNo && !matchKeyword(r.orderNo, f.orderNo)) return false
      if (f.salesOrderNo && !matchKeyword(r.salesOrderNo, f.salesOrderNo)) return false
      if (
        keyword &&
        !matchKeyword([r.orderNo, r.vendor, r.salesOrderNo, r.processName].join(' '), keyword)
      )
        return false
      return true
    })

  return {
    kpis: {
      monthOnTimeRate: onTimeRate,
      monthOnTimeRatePct: Math.round(onTimeRate * 1000) / 10,
      monthOnTimeTarget: 92,
      activeOrderCount: active.length,
      overdueCount: overdueActive.length,
      avgOverdueDays: avgOverdue,
    },
    vendors,
    orders: orderRows,
  }
}

function buildPartProcessRows(plans, filters = {}) {
  const f = filters || {}
  const woList = [...(workOrderState.orders || []), ...(assemblyWorkOrderState.orders || [])]
  const rows = []
  plans.forEach((plan) => {
    const lines = collectPlanPartLines(plan).filter(
      (l) => l.supplyType === '自制件' || l.supplyType === '自制' || l.supplyType === '组装',
    )
    lines.forEach((line) => {
      const related = woList.filter(
        (wo) =>
          (line.itemCode && (wo.productCode === line.itemCode || wo.itemCode === line.itemCode)) ||
          (plan.salesOrderNo && wo.salesOrderNo === plan.salesOrderNo),
      )
      const wo = related[0]
      const tasks = wo ? listMobileTasksForWorkOrder(wo) || [] : []
      const total = tasks.length
      const done = tasks.filter(
        (t) =>
          t.taskStatus === '已完成' || num(t.reportedFinishedQty) > 0 || num(t.reportedGoodQty) > 0,
      ).length
      const rate = total > 0 ? done / total : wo?.status === '已完成' ? 1 : 0
      const current =
        tasks.find((t) => ['待报工', '待开始', '执行中'].includes(t.taskStatus))?.processName ||
        (wo?.status === '已完成' ? '已完成' : '未开工')
      rows.push({
        id: `${line.id}-pp`,
        itemCode: line.itemCode,
        itemName: line.itemName,
        salesOrderNo: line.salesOrderNo,
        planNo: line.planNo,
        customerName: line.customerName,
        workOrderNo: wo?.code || wo?.orderNo || wo?.workOrderNo || '—',
        workOrderId: wo?.id || '',
        processTotal: total,
        processDone: done,
        processRate: rate,
        processRatePct: Math.round(rate * 1000) / 10,
        currentProcess: current,
        status: wo?.status || '无工单',
      })
    })
  })
  return rows.filter((r) => {
    if (f.itemCode && !matchKeyword(r.itemCode, f.itemCode)) return false
    if (f.itemName && !matchKeyword(r.itemName, f.itemName)) return false
    if (f.workOrderNo && !matchKeyword(r.workOrderNo, f.workOrderNo)) return false
    if (f.currentProcess && !matchKeyword(r.currentProcess, f.currentProcess)) return false
    if (
      f.keyword &&
      !matchKeyword([r.itemCode, r.itemName, r.workOrderNo, r.currentProcess].join(' '), f.keyword)
    )
      return false
    return true
  })
}

function buildLongLeadRows(plans, filters = {}) {
  const f = filters || {}
  const now = dayjs()
  const rows = []
  plans.forEach((plan) => {
    const assembly = resolvePlanAssemblyDate(plan) || plan.planAssemblyDate || plan.deliveryDate
    const needDate = assembly ? dayjs(assembly) : null
    collectPlanPartLines(plan).forEach((line) => {
      if (num(line.gapQty) <= 0) return
      if (!isPurchasedOrOutsourced(line.supplyType) && line.supplyType !== '外协件') {
        // 自制长周期也看 leadTime；无供货期则跳过非外购
        const lead = resolveLeadTimeDays(line.itemCode)
        if (lead <= 0 && !isPurchasedOrOutsourced(line.supplyType)) return
      }
      const leadTimeDays = resolveLeadTimeDays(line.itemCode) || 14
      if (!needDate || !needDate.isValid()) return
      const readyBy = now.add(leadTimeDays, 'day')
      if (!readyBy.isAfter(needDate, 'day') && num(line.inTransitQty) > 0) return
      if (!readyBy.isAfter(needDate, 'day') && num(line.gapQty) <= 0) return
      const risk =
        num(line.inTransitQty) <= 0 && readyBy.isAfter(needDate, 'day')
          ? 'high'
          : readyBy.isAfter(needDate, 'day')
            ? 'medium'
            : 'low'
      if (risk === 'low') return
      rows.push({
        id: `ll-${line.id}`,
        itemCode: line.itemCode,
        itemName: line.itemName,
        supplyType: line.supplyType,
        salesOrderNo: line.salesOrderNo,
        planNo: line.planNo,
        customerName: line.customerName,
        planId: line.planId,
        needDate: needDate.format('YYYY-MM-DD'),
        leadTimeDays,
        gapQty: line.gapQty,
        inTransitQty: line.inTransitQty,
        tone: line.tone,
        risk,
        riskLabel: risk === 'high' ? '高风险' : '关注',
      })
    })
  })
  rows.sort((a, b) => (a.risk === 'high' ? -1 : 1) - (b.risk === 'high' ? -1 : 1))
  return rows.filter((r) => {
    if (f.itemCode && !matchKeyword(r.itemCode, f.itemCode)) return false
    if (f.itemName && !matchKeyword(r.itemName, f.itemName)) return false
    if (f.supplyType && !matchKeyword(r.supplyType, f.supplyType)) return false
    if (f.keyword && !matchKeyword([r.itemCode, r.itemName, r.supplyType].join(' '), f.keyword))
      return false
    return true
  })
}

function buildMaterialUtilRows(filters = {}) {
  const f = filters || {}
  const keyword = f.keyword || ''
  const reqs = materialRequisitionState.records || materialRequisitionState.orders || []
  const byWo = new Map()

  const ensure = (woNo, patch = {}) => {
    const key = woNo || '未关联工单'
    if (!byWo.has(key)) {
      byWo.set(key, {
        id: key,
        workOrderNo: key,
        salesOrderNo: '',
        theoryQty: 0,
        actualQty: 0,
        lines: 0,
      })
    }
    Object.assign(byWo.get(key), patch)
    return byWo.get(key)
  }

  ;(workOrderState.orders || []).forEach((wo) => {
    const no = wo.orderNo || wo.workOrderNo || wo.id
    const theory = num(wo.planQty ?? wo.qty)
    ensure(no, {
      salesOrderNo: wo.salesOrderNo || '',
      theoryQty: theory || 1,
    })
  })

  reqs.forEach((req) => {
    const woNo = req.workOrderNo || req.sourceWorkOrderNo || '未关联工单'
    const row = ensure(woNo, { salesOrderNo: req.salesOrderNo || '' })
    ;(req.lineItems || req.lines || []).forEach((line) => {
      row.actualQty += num(line.issuedQty ?? line.actualQty ?? line.qty)
      row.theoryQty += num(line.planQty ?? line.demandQty ?? line.qty)
      row.lines += 1
    })
  })

  // 无领料时用演示比例，避免空表
  let rows = [...byWo.values()].map((r) => {
    let theory = r.theoryQty
    let actual = r.actualQty
    if (theory <= 0 && actual <= 0) {
      theory = 100
      actual = 92
    } else if (theory <= 0) {
      theory = actual
    }
    const util = theory > 0 ? Math.min(actual / theory, 1.5) : 0
    return {
      ...r,
      theoryQty: Math.round(theory * 1000) / 1000,
      actualQty: Math.round(actual * 1000) / 1000,
      utilRate: util,
      utilRatePct: Math.round(util * 1000) / 10,
      theoryText: formatQty(theory),
      actualText: formatQty(actual),
    }
  })

  if (!rows.length) {
    rows = [
      {
        id: 'demo-util-1',
        workOrderNo: '演示-无领料数据',
        salesOrderNo: '—',
        theoryQty: 100,
        actualQty: 92,
        utilRate: 0.92,
        utilRatePct: 92,
        theoryText: '100',
        actualText: '92',
        lines: 0,
      },
    ]
  }

  return rows.filter((r) => {
    if (f.workOrderNo && !matchKeyword(r.workOrderNo, f.workOrderNo)) return false
    if (keyword && !matchKeyword([r.workOrderNo].join(' '), keyword)) return false
    return true
  })
}

/**
 * @param {{ kitView?: string, docNo?: string, customerName?: string, productName?: string, productCode?: string, specModel?: string, material?: string, drawingNo?: string, externalWorkNo?: string, workOrderNo?: string, itemCode?: string, itemName?: string, vendor?: string, currentProcess?: string, supplyType?: string, keyword?: string }} filters
 */
export function buildKitSupplyDashboard(filters = {}) {
  const f = filters || {}
  const kitView = normalizeKitView(f.kitView)
  const plans = [...(productionPlanState.plans || [])]

  let kittingAll
  if (kitView === KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER) {
    kittingAll = buildKittingByWorkOrder(plans, 'assembly')
  } else if (kitView === KIT_VIEW_MODE.PRODUCTION_WORK_ORDER) {
    kittingAll = buildKittingByWorkOrder(plans, 'production')
  } else {
    kittingAll = buildKittingByPlan(plans)
  }
  // 全量行上做优先级占用，再筛选（避免过滤后重分摊失真）
  const { snapshot: kitAllocSnapshot } = applyKitPriorityAllocationToRows(kittingAll)
  // 列表展示与占用分摊同一优先级：紧急度高 → 计划日期早 → 创建时间早 → 单号
  const kitting = filterKitRows(kittingAll, f).sort((a, b) =>
    compareKitDemandPriority(
      {
        urgency: a.urgency,
        planDate: a.planAssemblyDate,
        createdAt: a.createdAt,
        docNo: a.docNo,
      },
      {
        urgency: b.urgency,
        planDate: b.planAssemblyDate,
        createdAt: b.createdAt,
        docNo: b.docNo,
      },
    ),
  )

  return {
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    kitView,
    kitting,
    kitAllocSnapshot,
    outsourcing: buildOutsourcingDashboard(f),
    partProcess: buildPartProcessRows(plans, f),
    longLead: buildLongLeadRows(plans, f),
    materialUtil: buildMaterialUtilRows(f),
  }
}

export function getKitShortageDetail(dashboard, rowId) {
  const row = (dashboard?.kitting || []).find((r) => r.id === rowId)
  return row?.shortageLines || []
}

/** 按维度重建看板并查找齐套行（下钻详情页用） */
export function findKittingRowById(rowId, kitView = KIT_VIEW_MODE.PRODUCTION_WORK_ORDER) {
  const id = String(rowId || '').trim()
  if (!id) return null
  const preferred = normalizeKitView(kitView)
  const tryViews = [preferred]
  if (preferred === KIT_VIEW_MODE.PLAN) {
    tryViews.push(KIT_VIEW_MODE.PRODUCTION_WORK_ORDER, KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER)
  } else if (id.startsWith('awo-')) {
    tryViews.push(KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER)
  } else if (id.startsWith('wo-')) {
    tryViews.push(KIT_VIEW_MODE.PRODUCTION_WORK_ORDER)
  }
  const seen = new Set()
  for (const view of tryViews) {
    if (seen.has(view)) continue
    seen.add(view)
    const dashboard = buildKitSupplyDashboard({ kitView: view })
    const hit = (dashboard.kitting || []).find((r) => r.id === id)
    if (hit) return hit
  }
  return null
}

export function getOutsourcingOrdersForVendor(dashboard, vendor) {
  const v = String(vendor || '')
  return (dashboard?.outsourcing?.orders || []).filter((o) => o.vendor === v)
}
