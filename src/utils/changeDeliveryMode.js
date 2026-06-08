import {
  normalizeDeliveryMode,
  DELIVERY_MODE_WHOLE,
  DELIVERY_MODE_SCATTER,
} from '@/utils/salesDeliveryMode'
import { calcSalesLineAvailableQty, calcSalesLineShippedQty } from '@/utils/salesLineShipped'
import { findAssemblyOrdersBySalesProduct } from '@/store/assemblyWorkOrderStore'

function cloneSalesLine(line) {
  return JSON.parse(JSON.stringify(line))
}

function scaleLineQty(line, qty) {
  const oldQty = Number(line.salesQty ?? line.qty) || 1
  const ratio = qty / oldQty
  line.salesQty = qty
  line.qty = qty
  if (line.totalPriceExTax != null) {
    line.totalPriceExTax = Math.round((Number(line.totalPriceExTax) || 0) * ratio * 100) / 100
  }
  if (line.totalPriceInTax != null) {
    line.totalPriceInTax = Math.round((Number(line.totalPriceInTax) || 0) * ratio * 100) / 100
  }
}

export function buildEligibleDeliveryModeLines(order) {
  if (!order?.lineItems?.length) return []
  return order.lineItems
    .map((line) => {
      const orderQty = Number(line.salesQty ?? line.qty) || 0
      const shippedQty = calcSalesLineShippedQty(order, line)
      const availableQty = calcSalesLineAvailableQty(order, line)
      return {
        lineId: line.id,
        productName: line.productName,
        productCode: line.productCode,
        specModel: line.specModel,
        orderQty,
        shippedQty,
        availableQty,
        currentMode: normalizeDeliveryMode(line, order),
        line,
      }
    })
    .filter((row) => row.availableQty > 0)
}

export function formatProductOptionLabel(row) {
  const spec = row.specModel ? ` / ${row.specModel}` : ''
  return `${row.productName}${spec}`
}

export function validateChangeDeliveryRows(order, rows) {
  if (!rows.length) {
    return { ok: false, message: '请至少添加一条变更记录' }
  }

  const usedLineIds = new Set()

  for (const row of rows) {
    if (!row.lineId) {
      return { ok: false, message: '请选择产品' }
    }
    if (usedLineIds.has(row.lineId)) {
      return { ok: false, message: '同一产品不可重复选择' }
    }
    usedLineIds.add(row.lineId)

    const meta = buildEligibleDeliveryModeLines(order).find((l) => l.lineId === row.lineId)
    if (!meta) {
      return { ok: false, message: `产品「${row.productName || ''}」不可变更` }
    }

    if (!row.newMode) {
      return { ok: false, message: `请选择「${meta.productName}」的变更交付方式` }
    }
    if (row.newMode === meta.currentMode) {
      return { ok: false, message: `「${meta.productName}」变更交付方式不能与当前相同` }
    }

    const changeQty = Number(row.changeQty)
    if (!changeQty || changeQty <= 0) {
      return { ok: false, message: `「${meta.productName}」变更数量须大于 0` }
    }
    if (changeQty > meta.availableQty + 1e-9) {
      return {
        ok: false,
        message: `「${meta.productName}」变更数量不能超过可变更数量 ${meta.availableQty}`,
      }
    }
  }

  return { ok: true }
}

/** 收集确认前提醒（不阻断） */
export function collectDeliveryModeChangeWarnings(order, rows) {
  const warnings = []
  const wholeToScatterProducts = []
  const scatterToWholeProducts = []

  for (const row of rows) {
    const meta = buildEligibleDeliveryModeLines(order).find((l) => l.lineId === row.lineId)
    if (!meta) continue

    if (meta.currentMode === DELIVERY_MODE_WHOLE && row.newMode === DELIVERY_MODE_SCATTER) {
      const assemblyOrders = findAssemblyOrdersBySalesProduct(order.orderNo, meta.productName)
      if (assemblyOrders.length) {
        wholeToScatterProducts.push(meta.productName)
      }
    }

    if (meta.currentMode === DELIVERY_MODE_SCATTER && row.newMode === DELIVERY_MODE_WHOLE) {
      const assemblyOrders = findAssemblyOrdersBySalesProduct(order.orderNo, meta.productName)
      if (!assemblyOrders.length) {
        scatterToWholeProducts.push(meta.productName)
      }
    }
  }

  if (wholeToScatterProducts.length) {
    warnings.push(
      `产品：${wholeToScatterProducts.join('，')} 已生成组装工单，变更后请联系车间主任关停工单。`,
    )
  }
  if (scatterToWholeProducts.length) {
    warnings.push('若产品需要组装后出库，请联系车间主任增加相应工单。')
  }

  return warnings
}

function applySingleLineChange(lineItems, lineIndex, change) {
  const line = lineItems[lineIndex]
  const shippedQty = change.shippedQty
  const orderQty = Number(line.salesQty ?? line.qty) || 0
  const changeQty = Number(change.changeQty) || 0
  const availableQty = orderQty - shippedQty
  const stayOldQty = shippedQty + (availableQty - changeQty)
  const newLineId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  if (stayOldQty <= 0) {
    line.deliveryMode = change.newMode
    return [{ type: 'update', lineId: line.id, deliveryMode: change.newMode, qty: orderQty }]
  }

  scaleLineQty(line, stayOldQty)

  const newLine = cloneSalesLine(line)
  newLine.id = newLineId
  scaleLineQty(newLine, changeQty)
  newLine.shippedQty = 0
  newLine.issueQty = 0
  newLine.deliveryMode = change.newMode

  lineItems.splice(lineIndex + 1, 0, newLine)

  return [
    { type: 'update', lineId: line.id, deliveryMode: line.deliveryMode, qty: stayOldQty },
    {
      type: 'create',
      lineId: newLineId,
      sourceLineId: line.id,
      deliveryMode: change.newMode,
      qty: changeQty,
      line: newLine,
    },
  ]
}

/** 应用变更到销售明细，返回计划同步指令 */
export function applyDeliveryModeChanges(order, rows) {
  const lineItems = order.lineItems || []
  const planOps = []

  rows.forEach((row) => {
    const lineIndex = lineItems.findIndex((l) => l.id === row.lineId)
    if (lineIndex === -1) return

    const meta = buildEligibleDeliveryModeLines(order).find((l) => l.lineId === row.lineId)
    const ops = applySingleLineChange(lineItems, lineIndex, {
      ...row,
      shippedQty: meta?.shippedQty ?? calcSalesLineShippedQty(order, lineItems[lineIndex]),
    })
    planOps.push(...ops)
  })

  return planOps
}
