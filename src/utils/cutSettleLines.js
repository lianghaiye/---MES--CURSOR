/** 下料结算：头+行展平为列表明细行 */

function includesKw(text, kw) {
  if (!kw) return true
  return String(text ?? '')
    .toLowerCase()
    .includes(String(kw).toLowerCase())
}

/** 结算单展开为「一单一料」列表行 */
export function flattenCutSettleLines(records = []) {
  const rows = []
  for (const r of records || []) {
    const lines = r.lines || []
    if (!lines.length) {
      rows.push({
        rowKey: `${r.id}::header`,
        settleId: r.id,
        lineId: '',
        status: r.status,
        docNo: r.docNo,
        outboundDocNo: r.outboundDocNo || '',
        outboundId: r.outboundId || '',
        outboundTime: r.outboundTime || r.createdAt || '',
        shipWarehouse: r.shipWarehouse || '',
        receiveWarehouse: r.receiveWarehouse || '',
        itemName: '',
        itemCode: '',
        specModel: '',
        drawingNo: '',
        material: '',
        blankSizeText: '',
        demandMeters: null,
        actualConsumeMeters: null,
        remnantLength: null,
        unit: '',
        workOrderNo: '',
        pickedBatchNo: '',
        pickedLength: null,
      })
      continue
    }
    lines.forEach((line) => {
      rows.push({
        rowKey: `${r.id}::${line.id}`,
        settleId: r.id,
        lineId: line.id,
        status: r.status,
        docNo: r.docNo,
        outboundDocNo: r.outboundDocNo || '',
        outboundId: r.outboundId || '',
        outboundTime: r.outboundTime || r.createdAt || '',
        shipWarehouse: line.shipWarehouse || r.shipWarehouse || '',
        receiveWarehouse: r.receiveWarehouse || line.warehouse || '',
        itemName: line.itemName || '',
        itemCode: line.itemCode || '',
        specModel: line.specModel || '',
        drawingNo: line.drawingNo || '',
        material: line.material || '',
        blankSizeText: line.blankSizeText || '',
        demandMeters: line.demandMeters,
        actualConsumeMeters: line.actualConsumeMeters,
        remnantLength: line.remnantLength,
        unit: line.unit || line.stockUnit || '',
        workOrderNo: line.workOrderNo || '',
        pickedBatchNo: line.pickedBatchNo || line.issuedBatchNo || '',
        pickedLength: line.pickedLength,
      })
    })
  }
  return rows
}

export function filterCutSettleLineRows(rows = [], filters = {}) {
  const f = filters || {}
  const timeFrom = f.outboundTimeRange?.[0]
  const timeTo = f.outboundTimeRange?.[1]
  return rows.filter((row) => {
    if (!includesKw(row.docNo, f.docNo)) return false
    if (!includesKw(row.workOrderNo, f.workOrderNo)) return false
    if (!includesKw(row.outboundDocNo, f.outboundDocNo)) return false
    if (!includesKw(row.itemName, f.itemName)) return false
    if (!includesKw(row.itemCode, f.itemCode)) return false
    if (!includesKw(row.specModel, f.specModel)) return false
    if (!includesKw(row.drawingNo, f.drawingNo)) return false
    if (!includesKw(row.material, f.material)) return false
    if (!includesKw(row.blankSizeText, f.blankSizeText)) return false
    if (timeFrom || timeTo) {
      const t = String(row.outboundTime || '')
      if (!t) return false
      if (timeFrom && t < timeFrom) return false
      if (timeTo && t > `${timeTo} 23:59:59`) return false
    }
    return true
  })
}
