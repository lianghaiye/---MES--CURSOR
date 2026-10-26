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
import { flattenMaterials, calcGapQty } from '@/utils/material'
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
  { key: 'kitting', label: '装配齐套看板' },
  { key: 'part-process', label: '零件工序进度' },
  { key: 'outsourcing', label: '外协进度准时率' },
  { key: 'long-lead', label: '长周期件预警' },
  { key: 'material-util', label: '材料利用率' },
]

export const KIT_VIEW_MODE = {
  PLAN: 'plan',
  SALES: 'sales',
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

function kitStatus(rate) {
  if (rate >= KIT_READY) return { key: 'ready', label: '可装配' }
  if (rate >= KIT_BASIC) return { key: 'basic', label: '基本齐套' }
  return { key: 'shortage', label: '缺料' }
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

function collectWorkItemPartLines(plan, wi) {
  const lines = []
  if (!plan || !wi) return lines
  const tree = buildDisplayMaterialTree(wi, plan)
  const flat = []
  flattenMaterials(tree, flat)
  flat.forEach((m) => {
    if (String(m.id || '').startsWith('top-') && m.children?.length) return
    const demand = num(m.demandQty ?? m.planQty)
    if (demand <= 0) return
    const available = num(m.availableStock ?? m.stockQty)
    const gap = m.gapQty != null ? num(m.gapQty) : calcGapQty(demand, available)
    const inTransit = num(m.inTransitQty ?? m.inTransitStockQty)
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
      specMaterialText: [spec, material].filter(Boolean).join(' ') || '—',
      supplyType: m.supplyType || '',
      demandQty: demand,
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
    })
  })
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
  productCount,
}) {
  const total = lines.length
  const missingLines = lines.filter((l) => num(l.gapQty) > 0)
  const missing = missingLines.length
  const complete = Math.max(0, total - missing)
  const rate = total > 0 ? complete / total : 1
  const status = kitStatus(rate)
  return {
    id,
    docNo,
    docNoLabel: docNoLabel || '计划单号',
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
    kitRate: rate,
    kitRatePct: Math.round(rate * 1000) / 10,
    missingCount: missing,
    statusKey: status.key,
    statusLabel: status.label,
    planIds: planIds || [],
    salesOrderNo: salesOrderNo || '',
    workItemId: workItemId || '',
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
function buildKittingByPlan(plans) {
  const rows = []
  plans.forEach((plan) => {
    const planNo = plan.orderNo || plan.salesOrderNo || plan.id
    const salesOrderNo = plan.salesOrderNo || plan.orderNo || ''
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
        }),
      )
      return
    }
    workItems.forEach((wi) => {
      const lines = collectWorkItemPartLines(plan, wi)
      const qty = num(wi.planQty ?? wi.orderQty ?? wi.salesQty)
      const unit = resolveWorkItemUnit(wi)
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
          planAssemblyDate:
            wi.deliveryDate || resolvePlanAssemblyDate(plan) || plan.planAssemblyDate || '',
          lines,
          planIds: [plan.id],
          salesOrderNo,
          workItemId: wi.id,
          productCount: workItems.length,
        }),
      )
    })
  })
  return rows
}

function buildKittingBySales(plans) {
  const map = new Map()
  plans.forEach((plan) => {
    const so = String(plan.salesOrderNo || plan.orderNo || plan.id).trim() || plan.id
    if (!map.has(so)) {
      map.set(so, {
        salesOrderNo: so,
        customerName: plan.customerName || '',
        plans: [],
        lines: [],
        qty: 0,
        units: new Set(),
        workItems: [],
        assemblyDates: [],
      })
    }
    const g = map.get(so)
    g.plans.push(plan)
    g.customerName = g.customerName || plan.customerName || ''
    const lines = collectPlanPartLines(plan)
    g.lines.push(...lines)
    ;(plan.workItems || []).forEach((wi) => {
      g.qty += num(wi.planQty ?? wi.orderQty ?? wi.salesQty)
      g.units.add(resolveWorkItemUnit(wi))
      g.workItems.push(wi)
    })
    const ad = resolvePlanAssemblyDate(plan) || plan.planAssemblyDate
    if (ad) g.assemblyDates.push(ad)
  })

  return [...map.values()].map((g) => {
    const byCode = new Map()
    g.lines.forEach((line) => {
      const key = line.itemCode || line.id
      const prev = byCode.get(key)
      if (!prev) {
        byCode.set(key, { ...line })
        return
      }
      prev.demandQty += num(line.demandQty)
      prev.availableQty += num(line.availableQty)
      prev.gapQty = Math.max(num(prev.gapQty), num(line.gapQty))
      prev.inTransitQty += num(line.inTransitQty)
      prev.tone = shortageTone(prev.gapQty, prev.inTransitQty)
      const st = shortageStatus(prev.gapQty, prev.inTransitQty)
      prev.statusKey = st.key
      prev.statusLabel = st.label
      prev.statusColor = st.color
    })
    const merged = [...byCode.values()]
    const dates = g.assemblyDates.filter(Boolean).sort()
    const first = g.workItems[0]
    const productCount = g.workItems.length
    const productName =
      productCount > 1
        ? `${first?.productName || '—'} 等${productCount}个产品`
        : first?.productName || '—'
    const unit = g.units.size === 1 ? [...g.units][0] : ''
    return summarizeKitGroup({
      id: `so-${g.salesOrderNo}`,
      docNo: g.salesOrderNo,
      docNoLabel: '销售订单号',
      customerName: g.customerName,
      productName,
      productCode: first?.productCode || '',
      specModel: first?.specModel || first?.model || '',
      material: first?.material || '',
      drawingNo: first?.drawingNo || '',
      externalWorkNo: resolveExternalWorkNo(first || {}),
      qty: g.qty,
      unit,
      qtyText: unit ? formatQtyWithUnit(g.qty, unit) : formatQty(g.qty),
      planAssemblyDate: dates[0] || '',
      lines: merged,
      planIds: g.plans.map((p) => p.id),
      salesOrderNo: g.salesOrderNo,
      productCount,
    })
  })
}

function filterKitRows(rows, keyword) {
  return rows.filter((r) =>
    matchKeyword(
      [
        r.docNo,
        r.customerName,
        r.productName,
        r.productCode,
        r.salesOrderNo,
        r.specModel,
        r.material,
        r.drawingNo,
        r.externalWorkNo,
      ].join(' '),
      keyword,
    ),
  )
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

function buildOutsourcingDashboard(keyword) {
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
  vendors = vendors.filter((v) => matchKeyword([v.vendor, v.collabType].join(' '), keyword))

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
    .filter((r) =>
      matchKeyword([r.orderNo, r.vendor, r.salesOrderNo, r.processName].join(' '), keyword),
    )

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

function buildPartProcessRows(plans, keyword) {
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
        workOrderNo: wo?.orderNo || wo?.workOrderNo || '—',
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
  return rows.filter((r) =>
    matchKeyword(
      [r.itemCode, r.itemName, r.salesOrderNo, r.planNo, r.workOrderNo, r.currentProcess].join(' '),
      keyword,
    ),
  )
}

function buildLongLeadRows(plans, keyword) {
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
  return rows.filter((r) =>
    matchKeyword(
      [r.itemCode, r.itemName, r.salesOrderNo, r.planNo, r.customerName].join(' '),
      keyword,
    ),
  )
}

function buildMaterialUtilRows(keyword) {
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

  return rows.filter((r) => matchKeyword([r.workOrderNo, r.salesOrderNo].join(' '), keyword))
}

/**
 * @param {{ keyword?: string, kitView?: 'plan'|'sales' }} filters
 */
export function buildKitSupplyDashboard(filters = {}) {
  const keyword = filters.keyword || ''
  const kitView = filters.kitView === KIT_VIEW_MODE.SALES ? KIT_VIEW_MODE.SALES : KIT_VIEW_MODE.PLAN
  const plans = [...(productionPlanState.plans || [])]

  const kittingAll =
    kitView === KIT_VIEW_MODE.SALES ? buildKittingBySales(plans) : buildKittingByPlan(plans)
  const kitting = filterKitRows(kittingAll, keyword)

  return {
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    kitView,
    kitting,
    outsourcing: buildOutsourcingDashboard(keyword),
    partProcess: buildPartProcessRows(plans, keyword),
    longLead: buildLongLeadRows(plans, keyword),
    materialUtil: buildMaterialUtilRows(keyword),
  }
}

export function getKitShortageDetail(dashboard, rowId) {
  const row = (dashboard?.kitting || []).find((r) => r.id === rowId)
  return row?.shortageLines || []
}

export function getOutsourcingOrdersForVendor(dashboard, vendor) {
  const v = String(vendor || '')
  return (dashboard?.outsourcing?.orders || []).filter((o) => o.vendor === v)
}
