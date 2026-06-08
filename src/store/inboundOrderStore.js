import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_inbound_orders'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
    }
  } catch {
    /* ignore */
  }
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: inboundOrderState.orders }))
}

export function generateInboundNo() {
  const seq = inboundOrderState.orders.length + 1
  return `IN${dayjs().format('YYYYMMDD')}${String(seq).padStart(4, '0')}`
}

export const inboundOrderState = reactive({
  orders: loadFromStorage(),
})

watch(
  () => inboundOrderState.orders,
  () => persist(),
  { deep: true },
)

export function addInboundOrder(order) {
  inboundOrderState.orders.unshift(order)
  return order
}

export function getInboundOrderById(id) {
  return inboundOrderState.orders.find((o) => o.id === id) || null
}

export function getInboundOrdersBySource(sourceOrderNo) {
  return inboundOrderState.orders.filter((o) => o.sourceOrderNo === sourceOrderNo)
}

export function createInboundFromScrap(scrap, partial = {}) {
  const order = {
    id: `ib-scrap-${Date.now()}`,
    docNo: generateInboundNo(),
    inboundType: partial.inboundType || '生产退库',
    status: '待处理',
    warehouse: partial.warehouse || scrap.warehouse || '半成品仓',
    warehouseKeeper: partial.warehouseKeeper || scrap.warehouseKeeper || '张三',
    sourceOrderNo: scrap.scrapNo,
    sourceType: '报废单',
    creator: partial.creator || '管理员',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    remark: partial.remark || '',
    lineItems: [
      {
        id: `ib-line-${Date.now()}`,
        itemName: scrap.itemName,
        itemCode: scrap.itemCode,
        specModel: scrap.specModel,
        material: scrap.material,
        qty: scrap.qty || 1,
        unit: scrap.unit || '件',
      },
    ],
    ...partial,
  }
  addInboundOrder(order)
  return order
}
