/** 库存明细「查看批次」件码演示种子（一物一码） */

export function cloneStockPieceSeed() {
  const batchNo = 'B-260718-301'
  const batchId = 'bat-inv-bearing-piece'
  const warehouse = '原料仓'
  const itemCode = 'MAT-EXT-001'
  const itemName = '进口轴承'
  const unit = '套'
  const pieces = []

  // 在库 30 件（FIFO 件序）
  for (let i = 1; i <= 30; i += 1) {
    pieces.push({
      id: `pc-seed-bearing-${String(i).padStart(3, '0')}`,
      serialNo: `${batchNo}-${String(i).padStart(3, '0')}`,
      batchId,
      batchNo,
      warehouse,
      itemCode,
      itemName,
      pieceQty: 1,
      unit,
      status: '在库',
      sourceDocNo: 'RK20260718001',
      sourceType: '采购入库',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      workOrderNo: '',
      index: i,
      remnant: false,
      remnantFromSerialNo: '',
      createdAt: '2026-07-18T10:00:00.000Z',
      updatedAt: '2026-07-18T10:00:00.000Z',
      issuedAt: '',
      issueDocNo: '',
    })
  }

  // 同批历史已出库 6 件（流水补充）
  for (let i = 31; i <= 36; i += 1) {
    pieces.push({
      id: `pc-seed-bearing-${String(i).padStart(3, '0')}`,
      serialNo: `${batchNo}-${String(i).padStart(3, '0')}`,
      batchId,
      batchNo,
      warehouse,
      itemCode,
      itemName,
      pieceQty: 1,
      unit,
      status: '已出库',
      sourceDocNo: 'RK20260718001',
      sourceType: '采购入库',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      workOrderNo: 'SCGD20260802001',
      index: i,
      remnant: false,
      remnantFromSerialNo: '',
      createdAt: '2026-07-18T10:00:00.000Z',
      updatedAt: '2026-08-04T09:30:00.000Z',
      issuedAt: '2026-08-04T09:30:00.000Z',
      issueDocNo: 'OUT20260804066',
    })
  }

  // 第二批在库 6 件
  const batchNo2 = 'B-260805-302'
  const batchId2 = 'bat-inv-bearing-fifo-2'
  for (let i = 1; i <= 6; i += 1) {
    pieces.push({
      id: `pc-seed-bearing2-${String(i).padStart(3, '0')}`,
      serialNo: `${batchNo2}-${String(i).padStart(3, '0')}`,
      batchId: batchId2,
      batchNo: batchNo2,
      warehouse,
      itemCode,
      itemName,
      pieceQty: 1,
      unit,
      status: '在库',
      sourceDocNo: 'RK20260805001',
      sourceType: '采购入库',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      workOrderNo: '',
      index: i,
      remnant: false,
      remnantFromSerialNo: '',
      createdAt: '2026-08-05T13:00:00.000Z',
      updatedAt: '2026-08-05T13:00:00.000Z',
      issuedAt: '',
      issueDocNo: '',
    })
  }

  return pieces
}
