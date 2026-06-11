import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'

/** 快速报工 - 产品与工艺路线 mock（与小程序数据结构一致） */

export const productList = [
  {
    id: 'prod-1',
    name: '货架支架',
    code: 'SJ-2024-A',
    spec: '1200×600mm',
    routes: [
      {
        id: 'route-1',
        name: '标准焊接工艺 v2',
        processes: ['点焊', '打磨', '装配'],
      },
    ],
    bom: [
      { materialName: '钢板', spec: 'Q235 2mm', unitQty: 0.8, unit: 'kg' },
      { materialName: '焊丝', spec: 'ER50-6 φ1.2', unitQty: 0.05, unit: 'kg' },
      { materialName: '螺栓', spec: 'M6×20', unitQty: 8, unit: '个' },
    ],
  },
  {
    id: 'prod-2',
    name: '电机外壳',
    code: 'DJ-2024-B',
    spec: 'φ180mm',
    routes: [
      {
        id: 'route-2a',
        name: '冲压工艺 v1',
        processes: ['冲压', '去毛刺', '喷涂'],
      },
      {
        id: 'route-2b',
        name: '精加工路线',
        processes: ['冲压', '机加工', '检验'],
      },
    ],
    bom: [
      { materialName: '冷轧板', spec: 'SPCC 1.5mm', unitQty: 1.2, unit: 'kg' },
      { materialName: '防锈油', spec: '通用型', unitQty: 0.02, unit: 'L' },
    ],
  },
  {
    id: 'prod-3',
    name: '法兰盘',
    code: 'FL-2024-C',
    spec: 'DN100',
    routes: [
      {
        id: 'route-3',
        name: '机加标准路线',
        processes: ['粗车', '精车', '钻孔'],
      },
    ],
    bom: [
      { materialName: '圆钢', spec: '45# φ120', unitQty: 2.5, unit: 'kg' },
      { materialName: '切削液', spec: '水溶性', unitQty: 0.1, unit: 'L' },
    ],
  },
  {
    id: 'prod-4',
    name: '密封圈',
    code: 'SEAL-2024-D',
    spec: 'NBR-70',
    routes: [
      {
        id: 'route-4',
        name: '硫化成型路线',
        processes: ['混炼', '硫化', '检验'],
      },
    ],
    bom: [
      { materialName: '橡胶料', spec: 'NBR混炼胶', unitQty: 0.15, unit: 'kg' },
      { materialName: '脱模剂', spec: '硅系', unitQty: 0.005, unit: 'L' },
    ],
  },
]

export function searchProducts(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return [...productList]
  return productList.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      p.code.toLowerCase().includes(kw) ||
      (p.spec && p.spec.toLowerCase().includes(kw)),
  )
}

function mapPickableToProduct(item) {
  if (!item) return null
  return {
    id: item.itemId,
    name: item.name,
    code: item.code,
    spec: item.specModel || '',
    itemType: item.itemType,
    routes: [],
    bom: [],
  }
}

export function getProductById(id) {
  const fromMock = productList.find((p) => p.id === id)
  if (fromMock) return fromMock
  const item = buildWarehousePickableItems().find((it) => it.itemId === id)
  return mapPickableToProduct(item)
}

export function getProductByCode(code) {
  const fromMock = productList.find((p) => p.code === code)
  if (fromMock) return fromMock
  const item = buildWarehousePickableItems().find((it) => it.code === code)
  return mapPickableToProduct(item)
}

export function getProductByName(name) {
  const fromMock = productList.find((p) => p.name === name)
  if (fromMock) return fromMock
  const item = buildWarehousePickableItems().find((it) => it.name === name)
  return mapPickableToProduct(item)
}

export function getRouteById(product, routeId) {
  if (!product?.routes) return null
  return product.routes.find((r) => r.id === routeId) || null
}

export function buildProcessesFromRoute(route, finishedQty = 0) {
  if (!route?.processes) return []
  const qty = Number(finishedQty) || 0
  return route.processes.map((name, i) => ({
    id: `proc-${i}-${Date.now()}`,
    name,
    qty,
    deleted: false,
    manual: false,
    operators: [],
  }))
}

export function calcMaterialList(product, finishedQty) {
  if (!product?.bom?.length) return []
  const qty = Number(finishedQty) || 0
  return product.bom.map((item, i) => ({
    id: `mat-${i}`,
    materialName: item.materialName,
    spec: item.spec,
    qty: Math.round(item.unitQty * qty * 1000) / 1000,
    unit: item.unit,
  }))
}
