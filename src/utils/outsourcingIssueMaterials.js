/**
 * 外协发料：按产品 BOM 展开下级物料，并按套数汇总
 */
import { getProductBomById, getOwnActiveBomForItem } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'
import {
  calcWxLineAppliedIssueQty,
  calcWxLineIssuedQty,
  calcWxLineRemainIssueQty,
  isWxLineIssueFull,
} from '@/utils/outsourcingInbound'

/** 产品色条调色板（与物料行同源） */
export const WX_ISSUE_PRODUCT_COLORS = [
  { key: 'c0', bar: '#F5222D', bg: 'rgba(245, 34, 45, 0.06)' },
  { key: 'c1', bar: '#1677FF', bg: 'rgba(22, 119, 255, 0.06)' },
  { key: 'c2', bar: '#52C41A', bg: 'rgba(82, 196, 26, 0.06)' },
  { key: 'c3', bar: '#722ED1', bg: 'rgba(114, 46, 209, 0.06)' },
  { key: 'c4', bar: '#13C2C2', bg: 'rgba(19, 194, 194, 0.06)' },
  { key: 'c5', bar: '#EB2F96', bg: 'rgba(235, 47, 150, 0.06)' },
]

export const WX_ISSUE_SHARED_COLOR = {
  key: 'shared',
  bar: '#FA8C16',
  bg: 'rgba(250, 140, 22, 0.1)',
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function findProductMaster(code) {
  if (!code) return null
  return (productInfoState.products || []).find((p) => p.code === code) || null
}

/** 解析外协产品行关联 BOM */
export function resolveOutsourcingLineBom(line = {}) {
  if (line.bomId) {
    const byId = getProductBomById(line.bomId)
    if (byId) return byId
  }
  const code = line.productCode || line.itemCode || ''
  const master = findProductMaster(code)
  if (master?.id) {
    const own = getOwnActiveBomForItem('product', master.id)
    if (own) return own
  }
  return null
}

export function resolveOutsourcingLineBomLabel(line = {}) {
  if (line.bom || line.bomLabel) return line.bom || line.bomLabel
  const bom = resolveOutsourcingLineBom(line)
  return formatBomInfoLabel(bom) || ''
}

/**
 * 展开单产品下级物料（单位用量 × 套数）
 * 优先 componentLines / issueBomLines，其次 BOM lineItems
 */
export function resolveMaterialsForOutsourcingProduct(line, setQty = 1) {
  const qty = Number(setQty) || 0
  if (qty <= 0) return []

  const fromInline = line.componentLines || line.issueBomLines
  if (Array.isArray(fromInline) && fromInline.length) {
    return fromInline.map((mat, index) => {
      const unitUsage = Number(mat.unitUsage ?? mat.unitQty) || 1
      return {
        id: `${line.id}-mat-${mat.id || mat.itemCode || index}`,
        itemCode: mat.itemCode || mat.materialCode || mat.productCode || '',
        itemName: mat.itemName || mat.productName || mat.name || '',
        specModel: mat.specModel || '',
        material: mat.material || '',
        drawingNo: mat.drawingNo || '',
        variantSummary: mat.variantSummary || '',
        blankSizeText: mat.blankSizeText || '',
        barcodeType: mat.barcodeType || '',
        unit: mat.unit || '件',
        unitUsage,
        issueQty: roundQty(unitUsage * qty),
        shipWarehouse: mat.shipWarehouse || line.shipWarehouse || undefined,
        remark: '',
        sourceProductLineId: line.id,
      }
    })
  }

  const bom = resolveOutsourcingLineBom(line)
  if (!bom?.lineItems?.length) return []

  return bom.lineItems.map((mat, index) => {
    const unitUsage = Number(mat.unitQty ?? mat.unitUsage) || 1
    return {
      id: `${line.id}-mat-${mat.id || mat.materialCode || index}`,
      itemCode: mat.materialCode || mat.itemCode || '',
      itemName: mat.itemName || '',
      specModel: mat.specModel || '',
      material: mat.material || '',
      drawingNo: mat.drawingNo || '',
      variantSummary: mat.variantSummary || '',
      blankSizeText: mat.blankSizeText || '',
      barcodeType: mat.barcodeType || '',
      unit: mat.unit || '件',
      unitUsage,
      issueQty: roundQty(unitUsage * qty),
      shipWarehouse: mat.shipWarehouse || line.shipWarehouse || undefined,
      remark: '',
      sourceProductLineId: line.id,
    }
  })
}

/** 多产品物料合并；共用物料标 shared */
export function mergeOutsourcingIssueMaterials(rows = [], productColorMap = new Map()) {
  const map = new Map()
  for (const row of rows) {
    const key = row.itemCode || `${row.itemName}-${row.specModel}`
    if (!key) continue
    const source = {
      lineId: row.sourceProductLineId,
      productName: row.sourceProductName || '',
      productCode: row.sourceProductCode || '',
      colorKey: productColorMap.get(row.sourceProductLineId)?.key || '',
      colorBar: productColorMap.get(row.sourceProductLineId)?.bar || '',
      setQty: row.sourceSetQty ?? 0,
      unitUsage: row.unitUsage,
      qty: row.issueQty,
    }
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        ...row,
        id: `wx-mat-${key}`,
        sourceProducts: [source],
      })
      continue
    }
    existing.issueQty = roundQty(Number(existing.issueQty) + Number(row.issueQty))
    existing.sourceProducts = [...existing.sourceProducts, source]
    if (!existing.shipWarehouse && row.shipWarehouse) {
      existing.shipWarehouse = row.shipWarehouse
    }
  }

  return [...map.values()].map((row) => {
    const shared = (row.sourceProducts || []).length > 1
    const color = shared
      ? WX_ISSUE_SHARED_COLOR
      : productColorMap.get(row.sourceProducts?.[0]?.lineId) || WX_ISSUE_PRODUCT_COLORS[0]
    return {
      ...row,
      shared,
      colorKey: color.key,
      colorBar: color.bar,
      colorBg: color.bg,
      sourceProductText: (row.sourceProducts || [])
        .map((s) => s.productName || s.productCode || s.lineId)
        .join('、'),
    }
  })
}

/**
 * 物料发货进度：计划=Σ(单位用量×产品计划)；
 * 已申请/已出库优先取发料单累计，并与「产品套数占用×用量」取较大值，避免漏记。
 */
export function calcOutsourcingMaterialIssueProgress(order, itemCode) {
  const code = String(itemCode || '').trim()
  if (!order || !code) {
    return { planQty: 0, appliedIssueQty: 0, issuedQty: 0, remainingQty: 0 }
  }

  let planQty = 0
  let appliedFromSets = 0
  let issuedFromSets = 0

  for (const line of order.lineItems || []) {
    const mats = resolveMaterialsForOutsourcingProduct(line, 1)
    const hit = mats.find((m) => String(m.itemCode || '') === code)
    if (!hit) continue
    const unitUsage = Number(hit.unitUsage) || 0
    planQty += unitUsage * (Number(line.planQty) || 0)
    appliedFromSets += unitUsage * calcWxLineAppliedIssueQty(order, line)
    issuedFromSets += unitUsage * calcWxLineIssuedQty(order, line)
  }

  let appliedFromOrders = 0
  let issuedFromOrders = 0
  for (const io of order.issueOrders || []) {
    for (const l of io.lineItems || []) {
      const lineCode = String(l.productCode || l.itemCode || '').trim()
      if (lineCode !== code) continue
      appliedFromOrders += Number(l.applyQty ?? l.issueQty) || 0
      issuedFromOrders += Number(l.actualQty) || 0
    }
  }

  const plan = roundQty(planQty)
  const appliedIssueQty = roundQty(Math.max(appliedFromSets, appliedFromOrders))
  const issuedQty = roundQty(Math.max(issuedFromSets, issuedFromOrders))
  const remainingQty = roundQty(Math.max(0, plan - appliedIssueQty))
  return { planQty: plan, appliedIssueQty, issuedQty, remainingQty }
}

export function enrichOutsourcingMaterialIssueProgress(order, rows = []) {
  return (rows || []).map((row) => {
    const progress = calcOutsourcingMaterialIssueProgress(order, row.itemCode)
    return {
      ...row,
      planQty: progress.planQty,
      appliedIssueQty: progress.appliedIssueQty,
      issuedQty: progress.issuedQty,
      remainingQty: progress.remainingQty,
    }
  })
}

/** 构建弹窗上方外协产品行 */
export function buildOutsourcingIssueProductRows(order) {
  if (!order) return []
  return (order.lineItems || [])
    .filter((l) => (Number(l.planQty) || 0) > 0)
    .map((line, index) => {
      const planQty = Number(line.planQty) || 0
      const issuedQty = calcWxLineIssuedQty(order, line)
      const appliedIssueQty = calcWxLineAppliedIssueQty(order, line)
      const remainQty = calcWxLineRemainIssueQty(order, line)
      const locked = isWxLineIssueFull(order, line)
      const color = WX_ISSUE_PRODUCT_COLORS[index % WX_ISSUE_PRODUCT_COLORS.length]
      const bomLabel = resolveOutsourcingLineBomLabel(line)
      const hasBom = Boolean(
        (line.componentLines || line.issueBomLines)?.length || resolveOutsourcingLineBom(line),
      )
      return {
        id: line.id,
        orderNo: order.orderNo || '',
        productName: line.productName || line.itemName || '',
        productCode: line.productCode || line.itemCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        bom: bomLabel,
        planQty,
        issuedQty,
        appliedIssueQty,
        remainQty,
        unit: line.unit || '',
        shipWarehouse: line.shipWarehouse || undefined,
        locked,
        hasBom,
        selected: !locked && remainQty > 0,
        setQty: locked ? 0 : remainQty,
        colorKey: color.key,
        colorBar: color.bar,
        colorBg: color.bg,
        raw: line,
      }
    })
}

/** 由已选产品+套数生成物料明细 */
export function buildOutsourcingIssueMaterialRows(productRows = [], order = null) {
  const selected = (productRows || []).filter(
    (p) => p.selected && !p.locked && (Number(p.setQty) || 0) > 0,
  )
  const colorMap = new Map(
    (productRows || []).map((p) => [p.id, { key: p.colorKey, bar: p.colorBar, bg: p.colorBg }]),
  )
  const raw = []
  for (const p of selected) {
    const mats = resolveMaterialsForOutsourcingProduct(p.raw || p, p.setQty)
    for (const m of mats) {
      raw.push({
        ...m,
        sourceProductName: p.productName,
        sourceProductCode: p.productCode,
        sourceSetQty: p.setQty,
      })
    }
  }
  const merged = mergeOutsourcingIssueMaterials(raw, colorMap)
  return enrichOutsourcingMaterialIssueProgress(order, merged)
}
