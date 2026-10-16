/**
 * 报表中心 P0：从前端 store 聚合表格行（含金额）
 */
import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { qcTaskState } from '@/store/qcTaskStore'
import { materialRequisitionState } from '@/store/materialRequisitionStore'
import { MATERIAL_DEDUCT_STATUS } from '@/mock/materialRequisitionRecords'
import { laborHourState } from '@/store/laborHourStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { SALES_ORDER_STATUS, normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'
import { normalizeInboundStatus } from '@/mock/inboundOptions'
import { normalizeOutboundStatus } from '@/mock/outboundOptions'

function inRange(dateText, range) {
  if (!range?.[0] || !range?.[1]) return true
  if (!dateText) return false
  const d = dayjs(dateText)
  if (!d.isValid()) return false
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return !d.isBefore(start) && !d.isAfter(end)
}

function money(n) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0
}

function qty(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

function includesKw(hay, kw) {
  if (!kw) return true
  return String(hay || '')
    .toLowerCase()
    .includes(String(kw).trim().toLowerCase())
}

/** 已审核及之后状态（以审核通过日为统计口径） */
function isSalesApproved(order) {
  const st = normalizeSalesOrderProgressStatus(order?.progressStatus)
  return (
    Boolean(order?.approvedAt) ||
    st === SALES_ORDER_STATUS.IN_PROGRESS ||
    st === SALES_ORDER_STATUS.COMPLETED ||
    st === SALES_ORDER_STATUS.VOIDED
  )
}

function salesApprovedAt(order) {
  // 统计口径优先审核通过日；历史数据缺失时回退单据日，避免报表空白
  return order?.approvedAt || order?.documentDate || order?.createdAt || ''
}

function lineSalesQty(line) {
  return qty(line?.salesQty ?? line?.qty)
}

function lineAmountInTax(line) {
  return money(line?.totalPriceInTax ?? line?.amountInTax)
}

function orderAmountInTax(order) {
  return money(order?.amountInTax ?? order?.orderAmount)
}

function orderTotalQty(order) {
  if (Number.isFinite(Number(order?.totalQty)) && Number(order.totalQty) > 0) {
    return qty(order.totalQty)
  }
  return (order?.lineItems || []).reduce((s, l) => s + lineSalesQty(l), 0)
}

function buildSalesOrderExec(filters) {
  const rows = []
  for (const order of salesOrderState.orders || []) {
    if (!isSalesApproved(order)) continue
    const t = salesApprovedAt(order)
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${order.orderNo} ${order.customerName} ${order.salesperson}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const amount = orderAmountInTax(order)
    const salesQty = orderTotalQty(order)
    rows.push({
      orderNo: order.orderNo,
      customerName: order.customerName || '—',
      salesperson: order.salesperson || '—',
      approvedAt: t,
      progressStatus: order.progressStatus || '—',
      deliveryStatus: order.deliveryStatus || '—',
      businessType: order.businessType || '—',
      salesQty,
      amountInTax: amount,
    })
  }
  return rows
}

function buildSalesLineSummary(filters) {
  const map = new Map()
  for (const order of salesOrderState.orders || []) {
    if (!isSalesApproved(order)) continue
    const t = salesApprovedAt(order)
    if (!inRange(t, filters.dateRange)) continue
    for (const line of order.lineItems || []) {
      const code = line.productCode || line.itemCode || '—'
      const name = line.productName || line.itemName || '—'
      const key = `${code}::${name}::${order.customerName || ''}`
      if (filters.keyword) {
        const hay = `${code} ${name} ${order.customerName} ${order.orderNo}`
        if (!includesKw(hay, filters.keyword)) continue
      }
      const prev = map.get(key) || {
        productCode: code,
        productName: name,
        customerName: order.customerName || '—',
        salesQty: 0,
        amountInTax: 0,
        orderCount: 0,
        orderNos: new Set(),
      }
      prev.salesQty += lineSalesQty(line)
      prev.amountInTax = money(prev.amountInTax + lineAmountInTax(line))
      prev.orderNos.add(order.orderNo)
      prev.orderCount = prev.orderNos.size
      map.set(key, prev)
    }
  }
  return [...map.values()].map((row) => {
    const rest = { ...row }
    delete rest.orderNos
    return rest
  })
}

function buildSalesDeliveryAchieve(filters) {
  const rows = []
  const deliveries = deliveryOrderState.orders || []
  for (const order of salesOrderState.orders || []) {
    if (!isSalesApproved(order)) continue
    const approvedAt = salesApprovedAt(order)
    if (!inRange(approvedAt, filters.dateRange) && filters.dateBasis !== 'delivery') {
      // 默认按审核通过日筛订单；仍可带出发货对照
    }
    if (filters.dateBasis !== 'delivery' && !inRange(approvedAt, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${order.orderNo} ${order.customerName}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const related = deliveries.filter(
      (d) => d.salesOrderId === order.id || d.salesOrderNo === order.orderNo,
    )
    if (filters.dateBasis === 'delivery') {
      const hit = related.some((d) =>
        inRange(d.deliveryDate || d.shippedAt || d.createdAt, filters.dateRange),
      )
      if (!hit && related.length) continue
      if (!related.length && !inRange(approvedAt, filters.dateRange)) continue
    }
    const planQty = orderTotalQty(order)
    const shippedQty = related.reduce((s, d) => {
      const lines = d.lineItems || d.lines || []
      if (lines.length) {
        return s + lines.reduce((a, l) => a + qty(l.shipQty ?? l.qty ?? l.deliveryQty), 0)
      }
      return s + qty(d.totalQty)
    }, 0)
    const amount = orderAmountInTax(order)
    const shippedAmount = related.reduce((s, d) => s + money(d.amountInTax ?? d.totalAmount), 0)
    rows.push({
      orderNo: order.orderNo,
      customerName: order.customerName || '—',
      approvedAt,
      deliveryStatus: order.deliveryStatus || '—',
      planQty,
      shippedQty,
      unshippedQty: Math.max(0, planQty - shippedQty),
      amountInTax: amount,
      shippedAmountInTax: money(shippedAmount),
      deliveryCount: related.length,
    })
  }
  return rows
}

function buildWorkOrderProgress(filters) {
  const list = [...(workOrderState.orders || []), ...(assemblyWorkOrderState.orders || [])]
  const rows = []
  for (const wo of list) {
    const t = wo.planStartDate || wo.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${wo.code || wo.workOrderNo} ${wo.name} ${wo.productName} ${wo.salesOrderNo}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const planQty = qty(wo.planQty ?? wo.expectedQty ?? wo.qty)
    const doneQty = qty(wo.completedQty ?? wo.finishQty ?? wo.goodQty)
    const progress = planQty > 0 ? Math.min(100, Math.round((doneQty / planQty) * 100)) : 0
    rows.push({
      workOrderNo: wo.code || wo.workOrderNo || wo.id,
      orderCategory: wo.orderCategory || '生产工单',
      productName: wo.productName || '—',
      salesOrderNo: wo.salesOrderNo || '—',
      status: wo.status || '—',
      planStartDate: wo.planStartDate || '—',
      planEndDate: wo.planEndDate || '—',
      planQty,
      doneQty,
      progress: `${progress}%`,
    })
  }
  return rows
}

function materialUnitPrice(code) {
  if (!code) return 0
  const m = (materialInfoState.materials || []).find((x) => x.code === code)
  return money(m?.unitPrice ?? m?.purchasePrice ?? 0)
}

/** 已确认消耗：成功 / 部分成功 / 下料结算 */
function isConsumedDeductStatus(status) {
  return (
    status === MATERIAL_DEDUCT_STATUS.SUCCESS ||
    status === MATERIAL_DEDUCT_STATUS.PARTIAL ||
    status === MATERIAL_DEDUCT_STATUS.CUT_SETTLE
  )
}

function buildMaterialCostByWorkOrder() {
  /** @type {Map<string, { materialQty: number, materialCost: number, materialSkuCount: number, codes: Set<string> }>} */
  const map = new Map()
  const bump = (key, lineQty, lineCost, materialCode) => {
    if (!key) return
    let prev = map.get(key)
    if (!prev) {
      prev = { materialQty: 0, materialCost: 0, materialSkuCount: 0, codes: new Set() }
      map.set(key, prev)
    }
    prev.materialQty = money(prev.materialQty + lineQty)
    prev.materialCost = money(prev.materialCost + lineCost)
    if (materialCode) prev.codes.add(materialCode)
    prev.materialSkuCount = prev.codes.size
  }

  for (const rec of materialRequisitionState.records || []) {
    if (!isConsumedDeductStatus(rec.status)) continue
    const woId = rec.workOrderId || ''
    const woNo = rec.workOrderNo || ''
    if (!woId && !woNo) continue
    for (const line of rec.lines || []) {
      const st = line.status || rec.status
      if (
        st === MATERIAL_DEDUCT_STATUS.SKIPPED ||
        st === MATERIAL_DEDUCT_STATUS.VOIDED ||
        st === MATERIAL_DEDUCT_STATUS.FAILED ||
        st === MATERIAL_DEDUCT_STATUS.PENDING
      ) {
        continue
      }
      if (!isConsumedDeductStatus(st)) continue
      const q = qty(line.actualQty) > 0 ? qty(line.actualQty) : qty(line.planQty)
      if (q <= 0) continue
      const code = line.materialCode || ''
      const unit = money(line.unitPrice) > 0 ? money(line.unitPrice) : materialUnitPrice(code)
      const cost = money(q * unit)
      if (woId) bump(woId, q, cost, code)
      if (woNo && woNo !== woId) bump(woNo, q, cost, code)
    }
  }
  return map
}

function buildLaborCostByWorkOrder() {
  /** @type {Map<string, { workerCount: number, laborHours: number, laborCost: number, workers: Set<string> }>} */
  const map = new Map()
  const bump = (key, order) => {
    if (!key) return
    let prev = map.get(key)
    if (!prev) {
      prev = { workerCount: 0, laborHours: 0, laborCost: 0, workers: new Set() }
      map.set(key, prev)
    }
    for (const line of order.lines || []) {
      if (line.auditStatus === '已作废' || line.taskStatus === '已作废') continue
      const executor = line.executor || line.operator || ''
      if (executor) prev.workers.add(executor)
    }
    prev.workerCount = prev.workers.size
    prev.laborHours = money(prev.laborHours + qty(order.accountHours ?? order.auditedTotalHours))
    prev.laborCost = money(prev.laborCost + qty(order.estimatedSalary ?? order.salaryAmount))
  }

  for (const order of laborHourState.orders || []) {
    bump(order.workOrderId, order)
    bump(order.workOrderCode, order)
  }
  return map
}

function pickWoCost(wo, materialMap, laborMap) {
  const id = wo.id || ''
  const code = wo.code || wo.workOrderNo || ''
  const mat = materialMap.get(id) ||
    materialMap.get(code) || {
      materialQty: 0,
      materialCost: 0,
      materialSkuCount: 0,
      codes: new Set(),
    }
  const lab = laborMap.get(id) ||
    laborMap.get(code) || {
      workerCount: 0,
      laborHours: 0,
      laborCost: 0,
      workers: new Set(),
    }
  return { mat, lab }
}

function buildWorkOrderCost(filters) {
  const materialMap = buildMaterialCostByWorkOrder()
  const laborMap = buildLaborCostByWorkOrder()
  const list = [...(workOrderState.orders || []), ...(assemblyWorkOrderState.orders || [])]
  const rows = []
  for (const wo of list) {
    const t = wo.planStartDate || wo.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${wo.code || wo.workOrderNo} ${wo.name} ${wo.productName} ${wo.salesOrderNo}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const { mat, lab } = pickWoCost(wo, materialMap, laborMap)
    const materialCost = money(mat.materialCost)
    const laborCost = money(lab.laborCost)
    rows.push({
      workOrderNo: wo.code || wo.workOrderNo || wo.id,
      orderCategory: wo.orderCategory || '生产工单',
      productName: wo.productName || '—',
      salesOrderNo: wo.salesOrderNo || wo.sourceOrderNo || '—',
      status: wo.status || '—',
      planStartDate: wo.planStartDate || '—',
      planQty: qty(wo.planQty ?? wo.expectedQty ?? wo.qty),
      doneQty: qty(wo.completedQty ?? wo.finishQty ?? wo.goodQty),
      materialSkuCount: mat.materialSkuCount || 0,
      materialQty: money(mat.materialQty),
      materialCost,
      workerCount: lab.workerCount || 0,
      laborHours: money(lab.laborHours),
      laborCost,
      totalCost: money(materialCost + laborCost),
    })
  }
  return rows
}

function buildSalesOrderCost(filters) {
  const materialMap = buildMaterialCostByWorkOrder()
  const laborMap = buildLaborCostByWorkOrder()
  const workOrders = [...(workOrderState.orders || []), ...(assemblyWorkOrderState.orders || [])]
  const rows = []

  for (const order of salesOrderState.orders || []) {
    if (!isSalesApproved(order)) continue
    const t = salesApprovedAt(order)
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${order.orderNo} ${order.customerName} ${order.salesperson}`
      if (!includesKw(hay, filters.keyword)) continue
    }

    const related = workOrders.filter((wo) => {
      const soNo = wo.salesOrderNo || wo.sourceOrderNo || ''
      const soId = wo.salesOrderId || ''
      return (
        (order.orderNo && soNo === order.orderNo) ||
        (order.id && soId && soId === order.id) ||
        (order.salesOrderId && soId && soId === order.salesOrderId)
      )
    })

    const materialCodes = new Set()
    const workers = new Set()
    let materialQty = 0
    let materialCost = 0
    let laborHours = 0
    let laborCost = 0
    let woPlanQty = 0
    let woDoneQty = 0

    for (const wo of related) {
      const { mat, lab } = pickWoCost(wo, materialMap, laborMap)
      materialQty = money(materialQty + qty(mat.materialQty))
      materialCost = money(materialCost + qty(mat.materialCost))
      laborHours = money(laborHours + qty(lab.laborHours))
      laborCost = money(laborCost + qty(lab.laborCost))
      woPlanQty = money(woPlanQty + qty(wo.planQty ?? wo.expectedQty ?? wo.qty))
      woDoneQty = money(woDoneQty + qty(wo.completedQty ?? wo.finishQty ?? wo.goodQty))
      if (mat.codes) for (const c of mat.codes) materialCodes.add(c)
      if (lab.workers) for (const w of lab.workers) workers.add(w)
    }

    const amountInTax = orderAmountInTax(order)
    const totalCost = money(materialCost + laborCost)
    rows.push({
      orderNo: order.orderNo,
      customerName: order.customerName || '—',
      salesperson: order.salesperson || '—',
      approvedAt: t,
      progressStatus: order.progressStatus || '—',
      salesQty: orderTotalQty(order),
      amountInTax,
      workOrderCount: related.length,
      woPlanQty,
      woDoneQty,
      materialSkuCount: materialCodes.size,
      materialQty,
      materialCost,
      workerCount: workers.size,
      laborHours,
      laborCost,
      totalCost,
      grossProfit: money(amountInTax - totalCost),
    })
  }
  return rows
}

function buildPurchaseOrderExec(filters) {
  const rows = []
  for (const order of purchaseOrderState.orders || []) {
    const t = order.documentDate || order.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${order.orderNo} ${order.supplier} ${order.purchaser}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const lines = order.lineItems || []
    const purchaseQty = lines.reduce((s, l) => s + qty(l.purchaseQty ?? l.qty), 0)
    const amount = money(
      order.totalAmountInTax ??
        order.amountInTax ??
        lines.reduce((s, l) => s + money(l.totalPriceInTax), 0),
    )
    rows.push({
      orderNo: order.orderNo,
      supplier: order.supplier || '—',
      purchaser: order.purchaser || order.creator || '—',
      documentDate: t,
      status: order.status || '—',
      inboundStatus: order.inboundStatus || '—',
      purchaseQty,
      amountInTax: amount,
    })
  }
  return rows
}

function buildOutsourcingOrderExec(filters) {
  const rows = []
  for (const order of outsourcingOrderState.orders || []) {
    const t = order.documentDate || order.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    if (filters.keyword) {
      const hay = `${order.orderNo} ${order.supplier} ${order.purchaser}`
      if (!includesKw(hay, filters.keyword)) continue
    }
    const lines = order.lineItems || []
    const qtyTotal = lines.reduce((s, l) => s + qty(l.qty ?? l.purchaseQty), 0)
    const amount = money(
      order.totalAmountInTax ??
        order.amountInTax ??
        lines.reduce((s, l) => s + money(l.totalPriceInTax), 0),
    )
    rows.push({
      orderNo: order.orderNo,
      supplier: order.supplier || '—',
      purchaser: order.purchaser || order.creator || '—',
      documentDate: t,
      status: order.status || '—',
      returnStatus: order.returnStatus || order.inboundStatus || '—',
      qty: qtyTotal,
      amountInTax: amount,
    })
  }
  return rows
}

function buildInventoryIoBalance(filters) {
  /** 入库：确认入库日；出库：确认/审核日 */
  const inboundMap = new Map()
  for (const order of inboundOrderState.orders || []) {
    const st = normalizeInboundStatus(order.status)
    if (st !== '已入库' && st !== '部分入库') continue
    const t = order.confirmedAt || order.inboundDate || ''
    if (!inRange(t, filters.dateRange)) continue
    for (const line of order.lineItems || []) {
      if (st === '部分入库' && (line.lineStatus || '') !== '已入库') continue
      const code = line.itemCode || '—'
      const wh = line.warehouse || order.warehouse || '—'
      const key = `${wh}::${code}`
      if (filters.keyword) {
        const hay = `${wh} ${code} ${line.itemName}`
        if (!includesKw(hay, filters.keyword)) continue
      }
      const prev = inboundMap.get(key) || {
        warehouse: wh,
        itemCode: code,
        itemName: line.itemName || '—',
        inboundQty: 0,
        outboundQty: 0,
        inboundAmount: 0,
        outboundAmount: 0,
      }
      const q = qty(line.qty)
      prev.inboundQty += q
      prev.inboundAmount = money(
        prev.inboundAmount + money(line.totalPriceInTax ?? line.amount ?? 0),
      )
      if (!prev.itemName || prev.itemName === '—') prev.itemName = line.itemName || '—'
      inboundMap.set(key, prev)
    }
  }

  for (const order of outboundState.orders || []) {
    const st = normalizeOutboundStatus(order.status)
    if (st !== '已出库' && st !== '部分出库') continue
    const t = order.confirmedAt || order.auditDate || order.outboundTime || order.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    for (const line of order.lineItems || []) {
      const code = line.itemCode || '—'
      const wh = line.warehouse || order.warehouse || '—'
      const key = `${wh}::${code}`
      if (filters.keyword) {
        const hay = `${wh} ${code} ${line.itemName}`
        if (!includesKw(hay, filters.keyword)) continue
      }
      const prev = inboundMap.get(key) || {
        warehouse: wh,
        itemCode: code,
        itemName: line.itemName || '—',
        inboundQty: 0,
        outboundQty: 0,
        inboundAmount: 0,
        outboundAmount: 0,
      }
      const q = qty(line.shipQty ?? line.qty)
      prev.outboundQty += q
      prev.outboundAmount = money(
        prev.outboundAmount + money(line.totalPriceInTax ?? line.amount ?? 0),
      )
      if (!prev.itemName || prev.itemName === '—') prev.itemName = line.itemName || '—'
      inboundMap.set(key, prev)
    }
  }

  return [...inboundMap.values()].map((r) => ({
    ...r,
    balanceQty: money(r.inboundQty - r.outboundQty),
    balanceAmount: money(r.inboundAmount - r.outboundAmount),
  }))
}

function buildQcTaskStats(filters) {
  const map = new Map()
  for (const task of qcTaskState.tasks || []) {
    const t = task.completedAt || task.qcAt || task.createdAt || ''
    if (!inRange(t, filters.dateRange)) continue
    const scope = task.bizScope || task.qcType || '未分类'
    if (filters.keyword && !includesKw(`${scope} ${task.qcNo} ${task.itemName}`, filters.keyword)) {
      continue
    }
    const prev = map.get(scope) || {
      bizScope: scope,
      total: 0,
      pending: 0,
      done: 0,
      pass: 0,
      fail: 0,
      inspectQty: 0,
    }
    prev.total += 1
    const st = task.qcStatus || task.status || ''
    if (st === '待质检') prev.pending += 1
    if (st === '已完成') prev.done += 1
    const result = task.qcResult || ''
    if (result.includes('通过') || result === '合格') prev.pass += 1
    if (result.includes('不通过') || result === '不合格') prev.fail += 1
    prev.inspectQty += qty(task.inspectQty ?? task.qty)
    map.set(scope, prev)
  }
  return [...map.values()].map((r) => ({
    ...r,
    passRate: r.done ? `${Math.round((r.pass / r.done) * 100)}%` : '—',
  }))
}

const COLUMN_MAP = {
  'sales-order-exec': [
    { title: '销售单号', key: 'orderNo' },
    { title: '客户', key: 'customerName' },
    { title: '业务员', key: 'salesperson' },
    { title: '审核通过日', key: 'approvedAt' },
    { title: '订单状态', key: 'progressStatus' },
    { title: '发货状态', key: 'deliveryStatus' },
    { title: '业务类型', key: 'businessType' },
    { title: '销售数量', key: 'salesQty', align: 'right' },
    { title: '含税金额', key: 'amountInTax', align: 'right' },
  ],
  'sales-line-summary': [
    { title: '产品编码', key: 'productCode' },
    { title: '产品名称', key: 'productName' },
    { title: '客户', key: 'customerName' },
    { title: '订单数', key: 'orderCount', align: 'right' },
    { title: '销售数量', key: 'salesQty', align: 'right' },
    { title: '含税金额', key: 'amountInTax', align: 'right' },
  ],
  'sales-delivery-achieve': [
    { title: '销售单号', key: 'orderNo' },
    { title: '客户', key: 'customerName' },
    { title: '审核通过日', key: 'approvedAt' },
    { title: '发货状态', key: 'deliveryStatus' },
    { title: '应发数量', key: 'planQty', align: 'right' },
    { title: '实发数量', key: 'shippedQty', align: 'right' },
    { title: '未发数量', key: 'unshippedQty', align: 'right' },
    { title: '订单含税金额', key: 'amountInTax', align: 'right' },
    { title: '发货金额', key: 'shippedAmountInTax', align: 'right' },
    { title: '发货单数', key: 'deliveryCount', align: 'right' },
  ],
  'sales-order-cost': [
    { title: '销售单号', key: 'orderNo' },
    { title: '客户', key: 'customerName' },
    { title: '业务员', key: 'salesperson' },
    { title: '审核通过日', key: 'approvedAt' },
    { title: '订单状态', key: 'progressStatus' },
    { title: '销售数量', key: 'salesQty', align: 'right' },
    { title: '销售含税金额', key: 'amountInTax', align: 'right' },
    { title: '关联工单数', key: 'workOrderCount', align: 'right' },
    { title: '工单计划数', key: 'woPlanQty', align: 'right' },
    { title: '工单完工数', key: 'woDoneQty', align: 'right' },
    { title: '物料种数', key: 'materialSkuCount', align: 'right' },
    { title: '物料消耗数量', key: 'materialQty', align: 'right' },
    { title: '物料成本', key: 'materialCost', align: 'right' },
    { title: '工人数', key: 'workerCount', align: 'right' },
    { title: '核算工时', key: 'laborHours', align: 'right' },
    { title: '人工成本', key: 'laborCost', align: 'right' },
    { title: '成本合计', key: 'totalCost', align: 'right' },
    { title: '毛利', key: 'grossProfit', align: 'right' },
  ],
  'work-order-progress': [
    { title: '工单号', key: 'workOrderNo' },
    { title: '工单类型', key: 'orderCategory' },
    { title: '产品', key: 'productName' },
    { title: '销售单号', key: 'salesOrderNo' },
    { title: '状态', key: 'status' },
    { title: '计划开工', key: 'planStartDate' },
    { title: '计划完工', key: 'planEndDate' },
    { title: '计划数', key: 'planQty', align: 'right' },
    { title: '完工数', key: 'doneQty', align: 'right' },
    { title: '进度', key: 'progress', align: 'right' },
  ],
  'work-order-cost': [
    { title: '工单号', key: 'workOrderNo' },
    { title: '工单类型', key: 'orderCategory' },
    { title: '产品', key: 'productName' },
    { title: '销售单号', key: 'salesOrderNo' },
    { title: '状态', key: 'status' },
    { title: '计划开工', key: 'planStartDate' },
    { title: '计划数', key: 'planQty', align: 'right' },
    { title: '完工数', key: 'doneQty', align: 'right' },
    { title: '物料种数', key: 'materialSkuCount', align: 'right' },
    { title: '物料消耗数量', key: 'materialQty', align: 'right' },
    { title: '物料成本', key: 'materialCost', align: 'right' },
    { title: '工人数', key: 'workerCount', align: 'right' },
    { title: '核算工时', key: 'laborHours', align: 'right' },
    { title: '人工成本', key: 'laborCost', align: 'right' },
    { title: '成本合计', key: 'totalCost', align: 'right' },
  ],
  'purchase-order-exec': [
    { title: '采购单号', key: 'orderNo' },
    { title: '供应商', key: 'supplier' },
    { title: '采购员', key: 'purchaser' },
    { title: '单据日期', key: 'documentDate' },
    { title: '订单状态', key: 'status' },
    { title: '入库状态', key: 'inboundStatus' },
    { title: '采购数量', key: 'purchaseQty', align: 'right' },
    { title: '含税金额', key: 'amountInTax', align: 'right' },
  ],
  'outsourcing-order-exec': [
    { title: '外协单号', key: 'orderNo' },
    { title: '外协厂', key: 'supplier' },
    { title: '外协员', key: 'purchaser' },
    { title: '单据日期', key: 'documentDate' },
    { title: '订单状态', key: 'status' },
    { title: '回货/入库', key: 'returnStatus' },
    { title: '数量', key: 'qty', align: 'right' },
    { title: '含税金额', key: 'amountInTax', align: 'right' },
  ],
  'inventory-io-balance': [
    { title: '仓库', key: 'warehouse' },
    { title: '物料编码', key: 'itemCode' },
    { title: '物料名称', key: 'itemName' },
    { title: '入库数量', key: 'inboundQty', align: 'right' },
    { title: '出库数量', key: 'outboundQty', align: 'right' },
    { title: '结存数量', key: 'balanceQty', align: 'right' },
    { title: '入库金额', key: 'inboundAmount', align: 'right' },
    { title: '出库金额', key: 'outboundAmount', align: 'right' },
    { title: '结存金额', key: 'balanceAmount', align: 'right' },
  ],
  'qc-task-stats': [
    { title: '质检类型', key: 'bizScope' },
    { title: '任务数', key: 'total', align: 'right' },
    { title: '待质检', key: 'pending', align: 'right' },
    { title: '已完成', key: 'done', align: 'right' },
    { title: '合格', key: 'pass', align: 'right' },
    { title: '不合格', key: 'fail', align: 'right' },
    { title: '合格率', key: 'passRate', align: 'right' },
    { title: '检验数量', key: 'inspectQty', align: 'right' },
  ],
}

const BUILDERS = {
  'sales-order-exec': buildSalesOrderExec,
  'sales-line-summary': buildSalesLineSummary,
  'sales-delivery-achieve': buildSalesDeliveryAchieve,
  'sales-order-cost': buildSalesOrderCost,
  'work-order-progress': buildWorkOrderProgress,
  'work-order-cost': buildWorkOrderCost,
  'purchase-order-exec': buildPurchaseOrderExec,
  'outsourcing-order-exec': buildOutsourcingOrderExec,
  'inventory-io-balance': buildInventoryIoBalance,
  'qc-task-stats': buildQcTaskStats,
}

export function getReportColumns(reportKey) {
  return (COLUMN_MAP[reportKey] || []).map((c) => ({
    title: c.title,
    dataIndex: c.key,
    key: c.key,
    align: c.align || 'left',
    ellipsis: true,
    width: c.width,
  }))
}

export function buildReportRows(reportKey, filters = {}) {
  const fn = BUILDERS[reportKey]
  if (!fn) return []
  return fn(filters || {})
}

export function summarizeReportRows(reportKey, rows = []) {
  const list = rows || []
  const sumKeys = {
    'sales-order-exec': ['salesQty', 'amountInTax'],
    'sales-line-summary': ['salesQty', 'amountInTax', 'orderCount'],
    'sales-delivery-achieve': [
      'planQty',
      'shippedQty',
      'unshippedQty',
      'amountInTax',
      'shippedAmountInTax',
    ],
    'work-order-progress': ['planQty', 'doneQty'],
    'work-order-cost': [
      'planQty',
      'doneQty',
      'materialSkuCount',
      'materialQty',
      'materialCost',
      'workerCount',
      'laborHours',
      'laborCost',
      'totalCost',
    ],
    'purchase-order-exec': ['purchaseQty', 'amountInTax'],
    'outsourcing-order-exec': ['qty', 'amountInTax'],
    'inventory-io-balance': [
      'inboundQty',
      'outboundQty',
      'balanceQty',
      'inboundAmount',
      'outboundAmount',
      'balanceAmount',
    ],
    'qc-task-stats': ['total', 'pending', 'done', 'pass', 'fail', 'inspectQty'],
  }
  const keys = sumKeys[reportKey] || []
  const sums = {}
  for (const k of keys) {
    sums[k] = money(list.reduce((s, r) => s + qty(r[k]), 0))
  }
  return { count: list.length, sums }
}
