import { cell } from './exportFieldHelpers'

export const inOutDetailExportFields = [
  { key: 'docNo', title: '出入库单号', getValue: (row) => cell(row, 'docNo') },
  { key: 'businessType', title: '业务类型', getValue: (row) => cell(row, 'businessType') },
  { key: 'docType', title: '单据类型', getValue: (row) => cell(row, 'docType') },
  { key: 'docStatus', title: '单据状态', getValue: (row) => cell(row, 'docStatus') },
  { key: 'ioStatus', title: '出入库状态', getValue: (row) => cell(row, 'ioStatus') },
  { key: 'itemType', title: '物品类型', getValue: (row) => cell(row, 'itemType') },
  { key: 'itemName', title: '物品名称', getValue: (row) => cell(row, 'itemName') },
  { key: 'specAttr', title: '规格属性', getValue: (row) => cell(row, 'specAttr') },
  {
    key: 'qty',
    title: '数量',
    getValue: (row) => (row.qty === 0 ? '0' : row.qty != null ? String(row.qty) : ''),
  },
  {
    key: 'stockAfter',
    title: '变动后库存数',
    getValue: (row) =>
      row.stockAfter === 0 ? '0' : row.stockAfter != null ? String(row.stockAfter) : '',
  },
  { key: 'unit', title: '单位', getValue: (row) => cell(row, 'unit') },
  {
    key: 'barcodeBatchNo',
    title: '条码编号/批次号',
    getValue: (row) => cell(row, 'barcodeBatchNo'),
  },
  { key: 'productionDate', title: '生产日期', getValue: (row) => cell(row, 'productionDate') },
  { key: 'postingDate', title: '过账日期', getValue: (row) => cell(row, 'postingDate') },
  { key: 'expiryDate', title: '过期日期', getValue: (row) => cell(row, 'expiryDate') },
  { key: 'operator', title: '操作人', getValue: (row) => cell(row, 'operator') },
  { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
]
