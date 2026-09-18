/**
 * 盘点/调拨明细：同物料编码相邻时，合并产品信息列（自由+按单分行仍保留）
 */

export const INVENTORY_PRODUCT_MERGE_KEYS = new Set([
  'itemName',
  'itemCode',
  'specModel',
  'material',
  'variantSummary',
])

export function isDedicatedInventoryLine(line) {
  return Boolean(line?.dedicated || line?.salesOrderId || line?.salesOrderNo)
}

/** 同编码聚拢：自由在前、按单在后 */
export function sortInventoryLinesByItemCode(rows = []) {
  return [...rows].sort((a, b) => {
    const codeCmp = String(a.itemCode || '').localeCompare(String(b.itemCode || ''), 'zh-CN')
    if (codeCmp !== 0) return codeCmp
    return Number(isDedicatedInventoryLine(a)) - Number(isDedicatedInventoryLine(b))
  })
}

/** 连续相同 itemCode 的 rowspan：首行 span=n，其余 0 */
export function buildItemCodeRowSpans(rows = []) {
  const spans = new Array(rows.length).fill(1)
  let i = 0
  while (i < rows.length) {
    const key = String(rows[i]?.itemCode || '')
    let j = i + 1
    while (j < rows.length) {
      if (String(rows[j]?.itemCode || '') !== key) break
      j += 1
    }
    const span = j - i
    spans[i] = span
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}

/**
 * 为产品信息列挂 customCell rowspan
 * @param {Array} columns
 * @param {number[]} rowSpans
 */
export function withProductMergeColumns(columns, rowSpans) {
  return (columns || []).map((col) => {
    const mergeKey = col.key || col.dataIndex
    if (!INVENTORY_PRODUCT_MERGE_KEYS.has(mergeKey)) return col
    return {
      ...col,
      customCell: (_record, index) => ({
        rowSpan: rowSpans[index] ?? 1,
      }),
    }
  })
}
