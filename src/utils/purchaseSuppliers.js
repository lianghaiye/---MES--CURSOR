/** 产品主数据 · 采购供应商明细（多选） */

import { SUPPLIER_ROLE } from '@/constants/supplierMaster'
import { getAllSupplierOptions } from '@/utils/supplierSelect'

export const PURCHASE_CURRENCY_OPTIONS = [
  { label: 'CNY', value: 'CNY' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]

/** 控制策略：按订购数量 / 按收到数量 */
export const PURCHASE_CONTROL_STRATEGY = {
  ORDER_QTY: '订购数量',
  RECEIVED_QTY: '收到数量',
}

export const PURCHASE_CONTROL_STRATEGY_OPTIONS = [
  { label: '订购数量', value: PURCHASE_CONTROL_STRATEGY.ORDER_QTY },
  { label: '收到数量', value: PURCHASE_CONTROL_STRATEGY.RECEIVED_QTY },
]

export function createEmptyPurchaseSupplier(partial = {}) {
  return {
    id: partial.id || `ps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    supplierName: partial.supplierName || '',
    /** 供应商类型文案：外协 / 采购 / 外协/采购，取自供应商档案 */
    supplierType: partial.supplierType || '',
    unitPriceExTax:
      partial.unitPriceExTax != null && partial.unitPriceExTax !== ''
        ? Number(partial.unitPriceExTax)
        : null,
    currency: partial.currency || 'CNY',
    leadTimeDays:
      partial.leadTimeDays != null && partial.leadTimeDays !== ''
        ? Number(partial.leadTimeDays)
        : null,
  }
}

/** 含税单价 = 不含税 × (1 + 进项税率%) */
export function calcPurchasePriceInclTax(unitPriceExTax, inputTaxRate) {
  const ex = Number(unitPriceExTax)
  if (!Number.isFinite(ex)) return null
  const rate = Number(inputTaxRate)
  const r = Number.isFinite(rate) ? rate : 0
  return Number((ex * (1 + r / 100)).toFixed(2))
}

const ROLE_ORDER = [SUPPLIER_ROLE.OUTSOURCE, SUPPLIER_ROLE.PURCHASE]

/** 仅保留外协/采购角色，忽略「综合供应商」等旧分类文案 */
function normalizeRoleLabelParts(raw) {
  const parts = String(raw || '')
    .split(/[/、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const roles = ROLE_ORDER.filter(
    (role) => parts.includes(role) || parts.some((p) => p.includes(role)),
  )
  return roles
}

/** 从供应商档案解析类型：取自「供应商类型」勾选（外协/采购），不是旧分类 */
export function resolveSupplierTypeLabel(supplierName) {
  const name = String(supplierName || '').trim()
  if (!name) return ''
  const hit = getAllSupplierOptions().find((opt) => opt.value === name || opt.label === name)
  if (!hit) return ''
  if (Array.isArray(hit.supplierRoles) && hit.supplierRoles.length) {
    return ROLE_ORDER.filter((role) => hit.supplierRoles.includes(role)).join('/')
  }
  return normalizeRoleLabelParts(hit.type).join('/')
}

export function supplierTypeHasRole(typeLabel, role) {
  const parts = String(typeLabel || '')
    .split(/[/、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.includes(role)
}

/**
 * 从历史扁平字段 / 已存明细反推供应商行
 */
function resolveRowSupplierType(r) {
  const name = String(r?.supplierName || '').trim()
  if (!name) return ''
  // 始终按档案重算，避免历史误存的「综合供应商」等分类文案
  return resolveSupplierTypeLabel(name) || normalizeRoleLabelParts(r.supplierType).join('/')
}

export function hydratePurchaseSuppliers(source = {}) {
  if (Array.isArray(source.purchaseSuppliers) && source.purchaseSuppliers.length) {
    return source.purchaseSuppliers.map((r) =>
      createEmptyPurchaseSupplier({
        ...r,
        supplierType: resolveRowSupplierType(r),
      }),
    )
  }
  const production = source.production || {}
  if (Array.isArray(production.purchaseSuppliers) && production.purchaseSuppliers.length) {
    return production.purchaseSuppliers.map((r) =>
      createEmptyPurchaseSupplier({
        ...r,
        supplierType: resolveRowSupplierType(r),
      }),
    )
  }

  const rows = []
  const purchaseName = String(production.defaultSupplier || source.defaultSupplier || '').trim()
  const outsourceName = String(production.defaultOutsourceSupplier || '').trim()
  const price = source.purchaseUnitPrice

  if (purchaseName) {
    rows.push(
      createEmptyPurchaseSupplier({
        supplierName: purchaseName,
        supplierType: resolveSupplierTypeLabel(purchaseName) || SUPPLIER_ROLE.PURCHASE,
        unitPriceExTax: Number(price) > 0 ? Number(price) : null,
        currency: 'CNY',
      }),
    )
  }
  if (outsourceName && outsourceName !== purchaseName) {
    rows.push(
      createEmptyPurchaseSupplier({
        supplierName: outsourceName,
        supplierType: resolveSupplierTypeLabel(outsourceName) || SUPPLIER_ROLE.OUTSOURCE,
        currency: 'CNY',
      }),
    )
  }
  if (!rows.length && Number(price) > 0) {
    rows.push(
      createEmptyPurchaseSupplier({
        unitPriceExTax: Number(price),
        currency: 'CNY',
      }),
    )
  }
  return rows
}

/**
 * 首行采购类 → defaultSupplier / purchaseUnitPrice
 * 首行外协类 → defaultOutsourceSupplier（兼容 BOM 等旧读取）
 */
export function syncPurchaseSupplierDefaults(rows = []) {
  const list = rows || []
  const purchaseRow = list.find(
    (r) =>
      String(r.supplierName || '').trim() &&
      supplierTypeHasRole(
        r.supplierType || resolveSupplierTypeLabel(r.supplierName),
        SUPPLIER_ROLE.PURCHASE,
      ),
  )
  const outsourceRow = list.find(
    (r) =>
      String(r.supplierName || '').trim() &&
      supplierTypeHasRole(
        r.supplierType || resolveSupplierTypeLabel(r.supplierName),
        SUPPLIER_ROLE.OUTSOURCE,
      ),
  )
  const first = list.find((r) => String(r.supplierName || '').trim())
  const priceRow =
    list.find((r) => Number(r.unitPriceExTax) > 0 && String(r.supplierName || '').trim()) ||
    purchaseRow ||
    first

  return {
    defaultSupplier: purchaseRow
      ? String(purchaseRow.supplierName).trim()
      : first
        ? String(first.supplierName).trim()
        : undefined,
    defaultOutsourceSupplier: outsourceRow ? String(outsourceRow.supplierName).trim() : undefined,
    purchaseUnitPrice:
      priceRow && Number(priceRow.unitPriceExTax) > 0 ? Number(priceRow.unitPriceExTax) : undefined,
  }
}

export function formatPurchaseSuppliersSummary(rows = []) {
  const names = (rows || []).map((r) => String(r.supplierName || '').trim()).filter(Boolean)
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  return `${names[0]} 等${names.length}家`
}
