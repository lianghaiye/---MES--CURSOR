/**
 * 外协发料申请单（由外协订单 issueOrders 扁平化）
 */
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

export const OUTSOURCING_ISSUE_OUTBOUND_STATUS_OPTIONS = ['出库中', '部分出库', '已出库', '已拒绝']

export function outsourcingIssueOutboundStatusColor(status) {
  const map = {
    出库中: 'processing',
    部分出库: 'warning',
    已出库: 'success',
    已拒绝: 'error',
  }
  return map[status] || 'default'
}

export function outsourcingIssueOutboundBadge(status) {
  const map = {
    出库中: 'processing',
    部分出库: 'warning',
    已出库: 'success',
    已拒绝: 'error',
  }
  return map[status] || 'default'
}

function sumLineQty(lines = [], key = 'applyQty') {
  return (lines || []).reduce((s, l) => {
    const v =
      key === 'actualQty' ? Number(l.actualQty) : Number(l.applyQty ?? l.issueQty ?? l.shipQty)
    return s + (Number.isFinite(v) ? v : 0)
  }, 0)
}

function materialSummary(lines = []) {
  const names = (lines || [])
    .map((l) => l.productName || l.itemName || l.productCode || l.itemCode || '')
    .filter(Boolean)
  if (!names.length) return '—'
  if (names.length === 1) return names[0]
  return `${names[0]} 等${names.length}项`
}

/** 扁平化所有外协订单下的发料申请单 */
export function listOutsourcingIssueApplications() {
  const rows = []
  for (const order of outsourcingOrderState.orders || []) {
    for (const io of order.issueOrders || []) {
      const lineItems = io.lineItems || []
      rows.push({
        id: io.id,
        issueOrderNo: io.issueOrderNo || '',
        outsourcingOrderId: io.outsourcingOrderId || order.id,
        outsourcingOrderNo: io.outsourcingOrderNo || order.orderNo || '',
        supplier: io.supplier || order.supplier || '',
        workOrderName: io.workOrderName || order.workOrderName || '',
        salesOrderNo: order.salesOrderNo || '',
        shipWarehouse: io.shipWarehouse || '',
        shipDate: io.shipDate || '',
        outboundStatus: io.outboundStatus || '出库中',
        creator: io.creator || order.creator || '',
        createdAt: io.createdAt || '',
        confirmer: io.confirmer || '',
        confirmedAt: io.confirmedAt || '',
        remark: io.remark || '',
        lineItems,
        productSets: io.productSets || [],
        lineCount: lineItems.length,
        totalQty: sumLineQty(lineItems, 'applyQty'),
        applyQty: sumLineQty(lineItems, 'applyQty'),
        actualQty: sumLineQty(lineItems, 'actualQty'),
        materialSummary: materialSummary(lineItems),
        rawIssueOrder: io,
        rawOutsourcingOrder: order,
      })
    }
  }
  return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/** 外协订单详情：发料申请汇总行 */
export function listIssueApplicationsForOutsourcingOrder(order) {
  if (!order) return []
  return (order.issueOrders || []).map((io) => {
    const lineItems = io.lineItems || []
    return {
      id: io.id,
      issueOrderNo: io.issueOrderNo || '',
      outboundStatus: io.outboundStatus || '出库中',
      applyQty: sumLineQty(lineItems, 'applyQty'),
      actualQty: sumLineQty(lineItems, 'actualQty'),
      shipDate: io.shipDate || '',
      lineCount: lineItems.length,
      totalQty: sumLineQty(lineItems, 'applyQty'),
      creator: io.creator || '',
      createdAt: io.createdAt || '',
    }
  })
}

export function getOutsourcingIssueApplicationById(id) {
  if (!id) return null
  return listOutsourcingIssueApplications().find((r) => r.id === id) || null
}

export function filterOutsourcingIssueApplications(list = [], filters = {}) {
  return (list || []).filter((row) => {
    if (filters.issueOrderNo) {
      const kw = String(filters.issueOrderNo).trim().toLowerCase()
      if (
        kw &&
        !String(row.issueOrderNo || '')
          .toLowerCase()
          .includes(kw)
      )
        return false
    }
    if (filters.outsourcingOrderNo) {
      const kw = String(filters.outsourcingOrderNo).trim().toLowerCase()
      if (
        kw &&
        !String(row.outsourcingOrderNo || '')
          .toLowerCase()
          .includes(kw)
      )
        return false
    }
    if (filters.supplier && row.supplier !== filters.supplier) return false
    if (filters.outboundStatus && row.outboundStatus !== filters.outboundStatus) return false
    if (filters.creator) {
      const kw = String(filters.creator).trim().toLowerCase()
      if (
        kw &&
        !String(row.creator || '')
          .toLowerCase()
          .includes(kw)
      )
        return false
    }
    if (filters.shipWarehouse && row.shipWarehouse !== filters.shipWarehouse) return false
    return true
  })
}

export function listOutsourcingIssueSuppliers() {
  const set = new Set()
  listOutsourcingIssueApplications().forEach((r) => {
    if (r.supplier) set.add(r.supplier)
  })
  return [...set].map((v) => ({ label: v, value: v }))
}
