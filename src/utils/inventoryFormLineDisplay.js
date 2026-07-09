/** 已选物品的明细行：列表内只读展示，编辑走弹窗 */

export function isFilledInventoryLine(record) {
  return Boolean(record?.itemCode)
}

export function warehouseOptionLabel(value, options = []) {
  if (!value) return '—'
  const hit = options.find((o) => o.value === value)
  return hit?.label ?? value
}
