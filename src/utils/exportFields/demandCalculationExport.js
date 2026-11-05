import { cell, numCell } from './exportFieldHelpers'

/** 需求计算导出字段 */
export const demandCalculationExportFields = [
  { key: 'serialNo', title: '序号', getValue: (row) => cell(row, 'serialNo') },
  { key: 'code', title: '物品编码', getValue: (row) => cell(row, 'code') },
  { key: 'name', title: '名称', getValue: (row) => cell(row, 'name') },
  { key: 'spec', title: '规格型号', getValue: (row) => cell(row, 'spec') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'specAttr', title: '变体属性', getValue: (row) => cell(row, 'specAttr') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  { key: 'supplyType', title: '供应型态', getValue: (row) => cell(row, 'supplyType') },
  { key: 'demandQty', title: '需求数', getValue: (row) => numCell(row.demandQty) },
  { key: 'stockQty', title: '库存数', getValue: (row) => numCell(row.stockQty) },
  { key: 'inTransitQty', title: '在途/在制数', getValue: (row) => numCell(row.inTransitQty) },
  { key: 'gapQty', title: '缺口数', getValue: (row) => numCell(row.gapQty) },
  { key: 'conclusion', title: '结论', getValue: (row) => cell(row, 'conclusion') },
  { key: 'supplier', title: '供应商', getValue: (row) => cell(row, 'supplier') },
  { key: 'leadTimeDays', title: '供应期/天', getValue: (row) => cell(row, 'leadTimeDays') },
  { key: 'arrivalDate', title: '到货日期', getValue: (row) => cell(row, 'arrivalDate') },
]
