/** 退货列表「产品信息」展示：单行显示名称；多行显示【首项名称】等N项 */
export function formatReturnProductInfo(record) {
  const lines = record?.lineItems || []
  if (!lines.length) return '—'
  const firstName = String(lines[0].productName || lines[0].itemName || '').trim() || '—'
  if (lines.length === 1) return firstName
  return `【${firstName}】等${lines.length}项`
}
