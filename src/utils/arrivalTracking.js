/**
 * 生产管理 · 到货跟踪（关键件：已到货 / 预计到货）
 */
import dayjs from 'dayjs'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import {
  ensureDemoKeyPartFlags,
  isMasterItemKeyPart,
  keyPartArrivalState,
  listKeyPartArrivals,
} from '@/store/keyPartArrivalStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { calcPoLineRemainInboundQty, calcPoLineReceivedQty } from '@/utils/purchaseLineInbound'
import { adjustStockQty, getStockQty, stockState } from '@/store/stockStore'

const CLOSED_PO_STATUSES = new Set(['草稿', '待提交', '已拒绝', '已作废', '已完成', '已取消'])

const ARRIVAL_TRACK_DEMO_PO_ID = 'po-arrival-track-demo'

function todayStr() {
  return dayjs().format('YYYY-MM-DD')
}

function matchKeyword(row, keyword) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  const blob = [row.supplier, row.docNo, row.orderNo, row.warehouse]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return blob.includes(kw)
}

function matchText(value, query) {
  const q = String(query || '').trim()
  if (!q) return true
  return String(value || '')
    .toLowerCase()
    .includes(q.toLowerCase())
}

export const ARRIVED_RANGE_OPTIONS = [
  { value: 7, label: '近7天' },
  { value: 15, label: '近15天' },
  { value: 30, label: '近30天' },
]

export const DEFAULT_ARRIVED_RANGE_DAYS = 7

function normalizeArrivedRangeDays(days) {
  const n = Number(days)
  if (n === 15 || n === 30) return n
  return DEFAULT_ARRIVED_RANGE_DAYS
}

function isWithinRecentDays(dateText, days) {
  const raw = String(dateText || '').trim()
  if (!raw) return false
  const t = dayjs(raw)
  if (!t.isValid()) return false
  const start = dayjs()
    .startOf('day')
    .subtract(normalizeArrivedRangeDays(days) - 1, 'day')
  return !t.isBefore(start)
}

function isArrivedToday(dateText) {
  const raw = String(dateText || '').trim()
  if (!raw) return false
  const t = dayjs(raw)
  return t.isValid() && t.format('YYYY-MM-DD') === todayStr()
}

function resolveItemStockQty(itemCode, warehouse) {
  const code = String(itemCode || '').trim()
  if (!code) return 0
  const wh = String(warehouse || '').trim()
  if (wh) return Number(getStockQty(wh, code)) || 0
  return (stockState.records || [])
    .filter((r) => String(r.itemCode || '') === code)
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
}

function findPurchaseOrderIdByNo(orderNo) {
  const no = String(orderNo || '').trim()
  if (!no) return ''
  const hit = (purchaseOrderState.orders || []).find((o) => String(o.orderNo || '').trim() === no)
  return hit?.id || ''
}

function resolveInboundOrderId(inboundOrderId, inboundDocNo) {
  const id = String(inboundOrderId || '').trim()
  if (id) return id
  const docNo = String(inboundDocNo || '').trim()
  if (!docNo) return ''
  const hit = (inboundOrderState.orders || []).find((o) => String(o.docNo || '').trim() === docNo)
  return hit?.id || ''
}

/** 已到货：来自关键件入库消息；按近 N 天筛选（默认 7 天） */
export function listArrivedArrivalTrackingRows(filters = {}) {
  void keyPartArrivalState.messages
  void stockState.records
  void inboundOrderState.orders
  void purchaseOrderState.orders
  ensureArrivalTrackingDemoStock()
  const rangeDays = normalizeArrivedRangeDays(filters.rangeDays)
  const list = listKeyPartArrivals().map((m) => {
    const orderNo = m.sourceOrderNo || ''
    return {
      id: m.id,
      trackType: 'arrived',
      itemCode: m.itemCode,
      itemName: m.itemName,
      specModel: m.specModel || '',
      qty: Number(m.qty) || 0,
      stockQty: resolveItemStockQty(m.itemCode, m.warehouse),
      unit: m.unit || '',
      warehouse: m.warehouse || '',
      supplier: m.supplier || '',
      docNo: m.inboundDocNo || '',
      inboundOrderId: resolveInboundOrderId(m.inboundOrderId, m.inboundDocNo),
      orderNo,
      orderId: findPurchaseOrderIdByNo(orderNo),
      arrivedAt: m.confirmedAt || '',
      expectedDate: '',
      remainQty: 0,
      purchaseQty: Number(m.qty) || 0,
      receivedQty: Number(m.qty) || 0,
      status: '已到货',
      statusTone: 'success',
      overdue: false,
    }
  })

  return list.filter((row) => {
    if (!isWithinRecentDays(row.arrivedAt, rangeDays)) return false
    if (!matchText(row.itemCode, filters.itemCode)) return false
    if (!matchText(row.itemName, filters.itemName)) return false
    if (!matchText(row.specModel, filters.specModel)) return false
    if (filters.keyword && !matchKeyword(row, filters.keyword)) return false
    return true
  })
}

function resolveExpectedStatus(deliveryDate, remainQty) {
  if (remainQty <= 1e-9) {
    return { status: '已到齐', statusTone: 'success', overdue: false }
  }
  const d = String(deliveryDate || '').slice(0, 10)
  if (!d) {
    return { status: '待到货', statusTone: 'default', overdue: false }
  }
  const today = todayStr()
  if (d < today) {
    return { status: '已逾期', statusTone: 'error', overdue: true }
  }
  if (d === today) {
    return { status: '今日到期', statusTone: 'warning', overdue: false }
  }
  return { status: '待到货', statusTone: 'processing', overdue: false }
}

/**
 * 预计到货：进行中的采购订单中，关键件且仍有待入数量的明细
 */
export function listExpectedArrivalTrackingRows(filters = {}) {
  ensureExpectedKeyPartDemoLines()
  void purchaseOrderState.orders

  const rows = []
  ;(purchaseOrderState.orders || []).forEach((po) => {
    if (!po || CLOSED_PO_STATUSES.has(po.status)) return
    const isArrivalDemoPo = po.id === ARRIVAL_TRACK_DEMO_PO_ID
    ;(po.lineItems || []).forEach((line) => {
      if (line?.cancelled) return
      const itemCode = String(line.itemCode || line.productCode || '').trim()
      if (!itemCode || !isMasterItemKeyPart(itemCode)) return
      const purchaseQty = Number(line.purchaseQty ?? line.qty) || 0
      let remainQty = calcPoLineRemainInboundQty(po, line)
      let receivedQty = calcPoLineReceivedQty(po, line)
      // 演示单：保证 3 条关键件始终出现在预计到货
      if (isArrivalDemoPo && remainQty <= 1e-9) {
        remainQty = purchaseQty
        receivedQty = 0
      }
      if (remainQty <= 1e-9) return
      const expectedDate = String(line.deliveryDate || po.deliveryDate || '').slice(0, 10)
      const st = resolveExpectedStatus(expectedDate, remainQty)
      rows.push({
        id: `exp-${po.id}-${line.id || itemCode}`,
        trackType: 'expected',
        itemCode,
        itemName: line.itemName || line.productName || '',
        specModel: line.specModel || '',
        qty: remainQty,
        unit: line.unit || line.purchaseUnit || line.inventoryUnit || '',
        warehouse: line.receivingWarehouse || '',
        supplier: po.supplier || '',
        docNo: po.orderNo || '',
        orderId: po.id || '',
        orderNo: po.orderNo || '',
        arrivedAt: '',
        expectedDate,
        remainQty,
        purchaseQty,
        receivedQty,
        status: st.status,
        statusTone: st.statusTone,
        overdue: st.overdue,
        poStatus: po.status || '',
        inboundStatus: po.inboundStatus || '',
      })
    })
  })

  rows.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return String(a.expectedDate || '9999').localeCompare(String(b.expectedDate || '9999'))
  })

  return rows.filter((row) => {
    if (!matchText(row.itemCode, filters.itemCode)) return false
    if (!matchText(row.itemName, filters.itemName)) return false
    if (!matchText(row.specModel, filters.specModel)) return false
    if (filters.keyword && !matchKeyword(row, filters.keyword)) return false
    if (filters.overdueOnly && !row.overdue) return false
    if (filters.status && row.status !== filters.status) return false
    return true
  })
}

export function getArrivalTrackingSummary(filters = {}) {
  const arrived = listArrivedArrivalTrackingRows({
    rangeDays: filters.rangeDays ?? DEFAULT_ARRIVED_RANGE_DAYS,
  })
  const expected = listExpectedArrivalTrackingRows()
  // 今日到货：按关键件入库消息 confirmedAt 为当天统计，不跟近7/15/30 联动
  const todayArrivedCount = listKeyPartArrivals().filter((m) =>
    isArrivedToday(m.confirmedAt),
  ).length
  return {
    arrivedCount: arrived.length,
    todayArrivedCount,
    arrivedRangeDays: normalizeArrivedRangeDays(filters.rangeDays),
    expectedCount: expected.length,
    overdueCount: expected.filter((r) => r.overdue).length,
    dueTodayCount: expected.filter((r) => r.status === '今日到期').length,
  }
}

const EXPECTED_DEMO_LINES = [
  {
    id: 'po-line-kpa-bolt',
    itemCode: 'MAT-BOLT-M12',
    itemName: '六角螺栓 M12',
    specModel: 'M12×40',
    purchaseQty: 500,
    unit: '件',
    deliveryDateOffset: -1,
  },
  {
    id: 'po-line-kpa-bearing',
    itemCode: 'MAT-BEARING-6205',
    itemName: '轴承 6205',
    specModel: '6205-2RS',
    purchaseQty: 80,
    unit: '件',
    deliveryDateOffset: 0,
  },
  {
    id: 'po-line-kpa-unit',
    itemCode: 'WL-BEARING-6205-UNIT',
    itemName: '深沟球轴承 6205（单单位演示）',
    specModel: '6205-2RS',
    purchaseQty: 120,
    unit: '件',
    deliveryDateOffset: 3,
  },
]

/** 演示库存：保证已到货列表「库存数量」有值可看 */
function ensureArrivalTrackingDemoStock() {
  const seeds = [
    { itemCode: 'MAT-BOLT-M12', itemName: '六角螺栓 M12', qty: 860 },
    { itemCode: 'MAT-BEARING-6205', itemName: '轴承 6205', qty: 126 },
    { itemCode: 'WL-BEARING-6205-UNIT', itemName: '深沟球轴承 6205（单单位演示）', qty: 55 },
  ]
  seeds.forEach((s) => {
    const current = Number(getStockQty('原料仓', s.itemCode)) || 0
    if (current > 0) return
    adjustStockQty({
      warehouse: '原料仓',
      itemCode: s.itemCode,
      itemName: s.itemName,
      itemType: '物料',
      unit: '件',
      delta: s.qty,
    })
  })
}

/**
 * 演示：固定维护一张「到货跟踪」专用采购单 + 3 条关键件待入行（可重复调用）
 */
function ensureExpectedKeyPartDemoLines() {
  ensureDemoKeyPartFlags()
  ensureArrivalTrackingDemoStock()

  const orders = purchaseOrderState.orders || []
  let po = orders.find((o) => o.id === ARRIVAL_TRACK_DEMO_PO_ID)
  if (!po) {
    po = {
      id: ARRIVAL_TRACK_DEMO_PO_ID,
      orderNo: 'CG20261102001',
      supplier: '轴承专营店',
      status: '进行中',
      inboundStatus: '待入库',
      deliveryDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
      documentDate: todayStr(),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      lineItems: [],
      remark: '到货跟踪·关键件预计到货演示单',
    }
    orders.unshift(po)
  } else {
    po.status = '进行中'
    po.inboundStatus = po.inboundStatus === '已入库' ? '部分入库' : po.inboundStatus || '待入库'
  }

  if (!Array.isArray(po.lineItems)) po.lineItems = []
  EXPECTED_DEMO_LINES.forEach((d) => {
    const deliveryDate = dayjs().add(d.deliveryDateOffset, 'day').format('YYYY-MM-DD')
    const hit = po.lineItems.find((l) => l.id === d.id)
    if (hit) {
      hit.itemCode = d.itemCode
      hit.itemName = d.itemName
      hit.specModel = d.specModel
      hit.purchaseQty = d.purchaseQty
      hit.qty = d.purchaseQty
      hit.unit = d.unit
      hit.purchaseUnit = d.unit
      hit.deliveryDate = deliveryDate
      hit.receivingWarehouse = '原料仓'
      hit.cancelled = false
      return
    }
    po.lineItems.push({
      id: d.id,
      itemCode: d.itemCode,
      itemName: d.itemName,
      specModel: d.specModel,
      purchaseQty: d.purchaseQty,
      qty: d.purchaseQty,
      unit: d.unit,
      purchaseUnit: d.unit,
      deliveryDate,
      receivingWarehouse: '原料仓',
      cancelled: false,
    })
  })
}
