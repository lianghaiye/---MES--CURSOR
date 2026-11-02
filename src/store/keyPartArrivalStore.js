/**
 * 关键件到货消息（站内提醒，非业务单据）
 * 入库确认后，命中主数据「关键件标识」的明细写入本列表；工作台待办展示今日到货数。
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { persistJson } from '@/utils/safeStorage'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'

const STORAGE_KEY = 'i_doms_key_part_arrivals'
const DATA_VERSION = 1
const FLAG_SEED_KEY = 'i_doms_key_part_flag_seed_v1'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function uid(prefix = 'kpa') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildSeedMessages() {
  const base = dayjs()
  return [
    {
      id: 'kpa-seed-1',
      itemCode: 'MAT-BOLT-M12',
      itemName: '六角螺栓 M12',
      specModel: 'M12×40',
      qty: 200,
      unit: '件',
      warehouse: '原料仓',
      supplier: '紧固件供应商',
      inboundOrderId: 'ib-type-stocktake-1',
      inboundDocNo: 'PDYK-20260920001',
      inboundLineId: 'ib-type-stocktake-1-l1',
      sourceOrderNo: 'PO20261028001',
      confirmedAt: base.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      confirmer: 'admin1',
      readAt: '',
    },
    {
      id: 'kpa-seed-2',
      itemCode: 'MAT-BEARING-6205',
      itemName: '轴承 6205',
      specModel: '6205-2RS',
      qty: 40,
      unit: '件',
      warehouse: '原料仓',
      supplier: '轴承专营店',
      inboundOrderId: '',
      inboundDocNo: 'CGRK-20261028012',
      inboundLineId: 'kpa-seed-2-line',
      sourceOrderNo: 'PO20261025008',
      confirmedAt: base.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      confirmer: 'admin1',
      readAt: '',
    },
    {
      id: 'kpa-seed-3',
      itemCode: 'WL-BEARING-6205-UNIT',
      itemName: '深沟球轴承 6205（单单位演示）',
      specModel: '6205-2RS',
      qty: 50,
      unit: '件',
      warehouse: '原料仓',
      supplier: '轴承专营店',
      inboundOrderId: 'ib-unit-demo-single',
      inboundDocNo: '1-20260718-U001',
      inboundLineId: 'ib-unit-demo-single-l1',
      sourceOrderNo: 'PO20260718001',
      confirmedAt: base.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      confirmer: 'admin1',
      readAt: base.subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]
}

const DEMO_KEY_PART_DEFS = [
  { code: 'MAT-BOLT-M12', name: '六角螺栓 M12', specModel: 'M12×40' },
  { code: 'MAT-BEARING-6205', name: '轴承 6205', specModel: '6205-2RS' },
  { code: 'WL-BEARING-6205-UNIT', name: '深沟球轴承 6205（单单位演示）', specModel: '6205-2RS' },
]

/** 演示：补物料并打开关键件标识（可重复调用，保证关键件开关始终打开） */
export function ensureDemoKeyPartFlags() {
  const materials = materialInfoState.materials || []
  DEMO_KEY_PART_DEFS.forEach((def) => {
    let row = materials.find((m) => String(m.code || '') === def.code)
    if (!row) {
      row = {
        id: `mat-keypart-${def.code}`,
        code: def.code,
        name: def.name,
        specModel: def.specModel,
        inventoryUnit: '件',
        materialType: '标准件',
        production: { isKeyPart: true },
      }
      materials.unshift(row)
    } else if (!row.production?.isKeyPart) {
      row.production = { ...(row.production || {}), isKeyPart: true }
    }
  })
  ;(productInfoState.products || []).forEach((p) => {
    if (String(p.code || '') !== 'CP2610001') return
    if (!p.production?.isKeyPart) {
      p.production = { ...(p.production || {}), isKeyPart: true }
    }
  })
  try {
    localStorage.setItem(FLAG_SEED_KEY, '1')
  } catch {
    /* ignore */
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version === DATA_VERSION && Array.isArray(parsed.messages)) {
      return parsed.messages
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  persistJson(STORAGE_KEY, {
    version: DATA_VERSION,
    messages: keyPartArrivalState.messages,
  })
}

export const keyPartArrivalState = reactive({
  messages: loadFromStorage() || buildSeedMessages(),
})

ensureDemoKeyPartFlags()

watch(
  () => keyPartArrivalState.messages,
  () => persist(),
  { deep: true },
)

/** 主数据是否关键件（物料优先，再查产品） */
export function isMasterItemKeyPart(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return false
  const mat = (materialInfoState.materials || []).find((m) => String(m.code || '') === code)
  if (mat) {
    return Boolean(mat.production?.isKeyPart || mat.isKeyPart)
  }
  const prod = (productInfoState.products || []).find((p) => String(p.code || '') === code)
  if (prod) {
    return Boolean(prod.production?.isKeyPart || prod.isKeyPart)
  }
  return false
}

export function countUnreadKeyPartArrivals() {
  return (keyPartArrivalState.messages || []).filter((m) => !m.readAt).length
}

/** 今日关键件到货条数（按 confirmedAt 日期 = 当天） */
export function countTodayKeyPartArrivals() {
  const today = dayjs().format('YYYY-MM-DD')
  return (keyPartArrivalState.messages || []).filter((m) => {
    const t = String(m.confirmedAt || '').trim()
    if (!t) return false
    const d = dayjs(t)
    return d.isValid() && d.format('YYYY-MM-DD') === today
  }).length
}

export function listKeyPartArrivals({ unreadOnly = false } = {}) {
  const list = [...(keyPartArrivalState.messages || [])]
  list.sort((a, b) => String(b.confirmedAt || '').localeCompare(String(a.confirmedAt || '')))
  if (unreadOnly) return list.filter((m) => !m.readAt)
  return list
}

export function markKeyPartArrivalRead(id) {
  const row = keyPartArrivalState.messages.find((m) => m.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (!row.readAt) row.readAt = nowText()
  return { ok: true }
}

export function markAllKeyPartArrivalsRead() {
  const now = nowText()
  let n = 0
  keyPartArrivalState.messages.forEach((m) => {
    if (!m.readAt) {
      m.readAt = now
      n += 1
    }
  })
  return { ok: true, count: n }
}

/**
 * 入库确认后写入关键件到货消息
 * @param {object} order 入库单
 * @param {object[]} lines 本次确认的明细
 * @param {{ operator?: string }} [opts]
 */
export function recordKeyPartArrivalsFromInbound(order, lines, opts = {}) {
  if (!order || !Array.isArray(lines) || !lines.length) return { ok: true, created: 0 }
  const operator = opts.operator || 'admin1'
  const confirmedAt = nowText()
  let created = 0

  for (const line of lines) {
    const itemCode = String(line.itemCode || line.productCode || '').trim()
    if (!itemCode) continue
    if (!isMasterItemKeyPart(itemCode)) continue

    const lineId = String(line.id || '')
    const docNo = String(order.docNo || '')
    const dup = keyPartArrivalState.messages.some(
      (m) =>
        m.inboundDocNo === docNo &&
        ((lineId && m.inboundLineId === lineId) ||
          (!lineId && m.itemCode === itemCode && m.confirmedAt === confirmedAt)),
    )
    if (dup) continue

    const qty =
      line.dedicatedInboundQty != null
        ? Number(line.dedicatedInboundQty) || 0
        : Number(line.qty) || 0
    if (qty <= 0) continue

    keyPartArrivalState.messages.unshift({
      id: uid(),
      itemCode,
      itemName: line.itemName || line.productName || '',
      specModel: line.specModel || '',
      qty,
      unit: line.unit || line.inventoryUnit || '',
      warehouse: line.warehouse || order.warehouse || '',
      supplier: order.supplier || '',
      inboundOrderId: order.id || '',
      inboundDocNo: docNo,
      inboundLineId: lineId,
      sourceOrderNo: order.sourceOrderNo || order.purchaseOrderNo || '',
      confirmedAt,
      confirmer: operator,
      readAt: '',
    })
    created += 1
  }

  return { ok: true, created }
}
