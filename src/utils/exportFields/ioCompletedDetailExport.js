import { cell } from './exportFieldHelpers'

/** @param {boolean} isOutbound */
export function buildIoCompletedDetailExportFields(isOutbound) {
  const docNoTitle = isOutbound ? '出库单号' : '入库单号'
  const docTypeTitle = isOutbound ? '出库类型' : '入库类型'
  const qtyTitle = isOutbound ? '出库数量' : '入库数量'

  return [
    { key: 'docNo', title: docNoTitle, getValue: (row) => cell(row, 'docNo') },
    { key: 'docType', title: docTypeTitle, getValue: (row) => cell(row, 'docType') },
    { key: 'docStatus', title: '单据状态', getValue: (row) => cell(row, 'docStatus') },
    { key: 'warehouse', title: '仓库', getValue: (row) => cell(row, 'warehouse') },
    { key: 'itemType', title: '物品类型', getValue: (row) => cell(row, 'itemType') },
    { key: 'itemName', title: '物品名称', getValue: (row) => cell(row, 'itemName') },
    { key: 'itemCode', title: '物品编码', getValue: (row) => cell(row, 'itemCode') },
    { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
    { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
    { key: 'variantSummary', title: '变体属性', getValue: (row) => cell(row, 'variantSummary') },
    { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
    {
      key: 'qty',
      title: qtyTitle,
      getValue: (row) => (row.qty === 0 ? '0' : row.qty != null ? String(row.qty) : ''),
    },
    {
      key: 'stockAfter',
      title: '变动后库存',
      getValue: (row) =>
        row.stockAfter === 0
          ? '0'
          : row.stockAfter != null && row.stockAfter !== ''
            ? String(row.stockAfter)
            : '',
    },
    { key: 'unit', title: '单位', getValue: (row) => cell(row, 'unit') },
    {
      key: 'barcodeBatchNo',
      title: '条码/批次号',
      getValue: (row) => cell(row, 'barcodeBatchNo'),
    },
    { key: 'postingDate', title: '过账日期', getValue: (row) => cell(row, 'postingDate') },
    { key: 'operator', title: '操作人', getValue: (row) => cell(row, 'operator') },
    { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
    { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
    { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
  ]
}

export const ioCompletedDetailExportFields = buildIoCompletedDetailExportFields(true)
