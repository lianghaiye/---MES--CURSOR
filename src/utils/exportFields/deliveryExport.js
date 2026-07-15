import { formatOutboundQtyInt, formatShipWeight, formatAmountExTax } from '@/utils/deliveryOrder'
import { cell } from './exportFieldHelpers'

export const deliveryExportFields = [
  { key: 'deliveryStatus', title: '发货状态', getValue: (row) => cell(row, 'deliveryStatus') },
  { key: 'deliveryCode', title: '发货单号', getValue: (row) => cell(row, 'deliveryCode') },
  { key: 'sourceOrderNo', title: '源单号', getValue: (row) => cell(row, 'sourceOrderNo') },
  { key: 'customerName', title: '客户', getValue: (row) => cell(row, 'customerName') },
  {
    key: 'applyShipQty',
    title: '申请发货数量',
    getValue: (row) => formatOutboundQtyInt(row.applyShipQty),
  },
  {
    key: 'actualOutboundQty',
    title: '实际出库数量',
    getValue: (row) => formatOutboundQtyInt(row.actualOutboundQty),
  },
  {
    key: 'shipWeight',
    title: '发货重量',
    getValue: (row) => formatShipWeight(row.shipWeight),
  },
  {
    key: 'totalAmountExTax',
    title: '发货总金额（不含税）',
    getValue: (row) => formatAmountExTax(row.totalAmountExTax),
  },
  { key: 'shipmentMethod', title: '交货方式', getValue: (row) => cell(row, 'shipmentMethod') },
  { key: 'logisticsNo', title: '物流单号', getValue: (row) => cell(row, 'logisticsNo') },
  { key: 'contactPerson', title: '客户联系人', getValue: (row) => cell(row, 'contactPerson') },
  { key: 'contactPhone', title: '联系方式', getValue: (row) => cell(row, 'contactPhone') },
  { key: 'deliveryAddress', title: '交货地址', getValue: (row) => cell(row, 'deliveryAddress') },
  { key: 'driverName', title: '司机姓名', getValue: (row) => cell(row, 'driverName') },
  { key: 'driverPhone', title: '司机联系方式', getValue: (row) => cell(row, 'driverPhone') },
  { key: 'plateNo', title: '车牌号', getValue: (row) => cell(row, 'plateNo') },
]
