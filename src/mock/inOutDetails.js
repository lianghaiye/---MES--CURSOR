import dayjs from 'dayjs'
import { mockOutboundOrders } from './outboundOrders'

export function createInOutDetailLine(partial = {}) {
  return {
    id: `iod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    headerId: '',
    docNo: '',
    businessType: '入库单',
    docType: '其它入库',
    docStatus: '已审核',
    ioStatus: '待入库',
    itemType: '物料',
    itemName: '',
    specAttr: '',
    qty: 0,
    stockAfter: 0,
    unit: '件',
    barcodeBatchNo: '',
    productionDate: '',
    postingDate: '',
    expiryDate: '',
    operator: '',
    remark: '',
    ...partial,
  }
}

const seedLines = [
  createInOutDetailLine({
    id: 'iod-001',
    headerId: 'ib-001',
    docNo: '1-20260609-00001',
    businessType: '入库单',
    docType: '报废入库',
    docStatus: '已过账',
    ioStatus: '全部入库',
    itemType: '物料',
    itemName: '测试物料A',
    specAttr: 'HT250',
    qty: 10,
    stockAfter: 120,
    unit: '个',
    barcodeBatchNo: 'BC20260609001',
    productionDate: '2026-05-01',
    postingDate: '2026-06-09',
    expiryDate: '2027-06-01',
    operator: 'admin1',
    remark: '',
  }),
  createInOutDetailLine({
    id: 'iod-002',
    headerId: 'ob-so-seed-1',
    docNo: 'OUT202605130001',
    businessType: '出库单',
    docType: '销售出库',
    docStatus: '已过账',
    ioStatus: '',
    itemType: '产成品',
    itemName: '清水离心泵 ISG50-160',
    specAttr: '50*30',
    qty: -2,
    stockAfter: 18,
    unit: '台',
    barcodeBatchNo: 'BC20260608088',
    productionDate: '2026-04-15',
    postingDate: '2026-06-08',
    expiryDate: '2028-04-15',
    operator: '张三',
    remark: '销售发货',
  }),
  createInOutDetailLine({
    id: 'iod-003',
    headerId: 'ib-003',
    docNo: '1-20260607-00005',
    businessType: '入库单',
    docType: '其它入库',
    docStatus: '已审核',
    ioStatus: '部分入库',
    itemType: '物料',
    itemName: '标准螺栓组',
    specAttr: 'M16',
    qty: 50,
    stockAfter: 350,
    unit: '套',
    barcodeBatchNo: 'MAT-STD-100',
    productionDate: '2026-03-20',
    postingDate: '2026-06-07',
    expiryDate: '2026-12-20',
    operator: '李四',
    remark: '',
  }),
  createInOutDetailLine({
    id: 'iod-004',
    headerId: 'ob-4',
    docNo: 'OUT202605280004',
    businessType: '出库单',
    docType: '投料出库',
    docStatus: '已过账',
    ioStatus: '',
    itemType: '物料',
    itemName: '铸铁叶轮 HT250',
    specAttr: 'φ200',
    qty: -5,
    stockAfter: 45,
    unit: '件',
    barcodeBatchNo: 'WL100001-B01',
    productionDate: '2026-02-10',
    postingDate: '2026-06-06',
    expiryDate: '2027-02-10',
    operator: 'admin1',
    remark: '工单领料',
  }),
  createInOutDetailLine({
    id: 'iod-005',
    headerId: 'ib-005',
    docNo: '1-20260605-00008',
    businessType: '入库单',
    docType: '采购入库',
    docStatus: '待审核',
    ioStatus: '待入库',
    itemType: '物料',
    itemName: '进口轴承',
    specAttr: '6205',
    qty: 20,
    stockAfter: 20,
    unit: '个',
    barcodeBatchNo: 'MAT-EXT-001',
    productionDate: '2026-05-28',
    postingDate: '',
    expiryDate: '2028-05-28',
    operator: '',
    remark: '',
  }),
  createInOutDetailLine({
    id: 'iod-006',
    headerId: 'ib-006',
    docNo: '1-20260604-00002',
    businessType: '入库单',
    docType: '成品入库',
    docStatus: '已审核',
    ioStatus: '全部入库',
    itemType: '产成品',
    itemName: '计量螺杆泵 G70',
    specAttr: 'G70',
    qty: 3,
    stockAfter: 15,
    unit: '台',
    barcodeBatchNo: 'CP2610793',
    productionDate: '2026-06-01',
    postingDate: '2026-06-04',
    expiryDate: '2029-06-01',
    operator: '王五',
    remark: '',
  }),
]

function expandSeed() {
  const list = [...seedLines]
  const names = ['泵体', '电机壳', '密封圈', '联轴器', '底座']
  const types = ['其它入库', '采购入库', '销售出库', '投料出库', '报废入库']
  for (let i = 0; i < 45; i += 1) {
    const isInbound = i % 3 !== 1
    const ioStatus = isInbound ? ['待入库', '部分入库', '全部入库'][i % 3] : ''
    const outboundOrder = mockOutboundOrders[i % mockOutboundOrders.length]
    list.push(
      createInOutDetailLine({
        id: `iod-seed-${i + 10}`,
        headerId: isInbound ? `ib-seed-${i + 10}` : outboundOrder.id,
        docNo: isInbound
          ? `1-202605${String((i % 28) + 1).padStart(2, '0')}-${String(10000 + i).slice(-5)}`
          : outboundOrder.docNo,
        businessType: isInbound ? '入库单' : '出库单',
        docType: isInbound ? types[i % types.length] : outboundOrder.outboundType,
        docStatus: ['草稿', '待审核', '已审核', '已过账'][i % 4],
        ioStatus,
        itemType: i % 2 === 0 ? '物料' : '产成品',
        itemName: names[i % names.length] + (i > 4 ? `-${i}` : ''),
        specAttr: i % 2 === 0 ? '标准' : '',
        qty: isInbound ? (i % 5) + 1 : -((i % 5) + 1),
        stockAfter: 50 + i * 3,
        unit: i % 4 === 0 ? '台' : '个',
        barcodeBatchNo: `BC202605${String(i).padStart(4, '0')}`,
        productionDate: dayjs('2026-01-01').add(i, 'day').format('YYYY-MM-DD'),
        postingDate: dayjs('2026-05-01').add(i, 'day').format('YYYY-MM-DD'),
        expiryDate: dayjs('2027-01-01').add(i, 'day').format('YYYY-MM-DD'),
        operator: i % 3 === 0 ? '' : ['admin1', '张三', '李四'][i % 3],
        remark: i % 7 === 0 ? '备注示例' : '',
      }),
    )
  }
  return list
}

export const mockInOutDetails = expandSeed()

export function filterInOutDetails(list, filters = {}) {
  return list.filter((row) => {
    if (filters.businessType && row.businessType !== filters.businessType) return false
    if (filters.docType && row.docType !== filters.docType) return false
    if (filters.itemName && !row.itemName.includes(filters.itemName)) return false
    if (filters.barcodeBatchNo && !(row.barcodeBatchNo || '').includes(filters.barcodeBatchNo))
      return false
    if (filters.docNo && !row.docNo.includes(filters.docNo)) return false
    if (filters.itemType && row.itemType !== filters.itemType) return false
    if (filters.docStatus && row.docStatus !== filters.docStatus) return false
    if (filters.ioStatus && row.ioStatus !== filters.ioStatus) return false
    return true
  })
}
