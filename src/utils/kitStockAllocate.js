/**
 * 齐套库存：规则预占（按优先级）+ 手动锁定保留
 *
 * 分层：可用池 = 物理库存 − 手动锁定合计
 * 自动：按工单紧急度 ↓ / 计划日期 ↑ / 单号 排队，依次吃掉可用池
 * 手动锁定优先保留；剩余池再按优先级自动分；有手动操作后整池重算
 */
import dayjs from 'dayjs'
import { stockState } from '@/store/stockStore'
import { listActiveKitLocks, getManualLockQty } from '@/store/kitStockAllocationStore'
import { urgencyRank, urgencyLabel, normalizeUrgency, URGENCY } from '@/constants/urgency'

export { urgencyRank, urgencyLabel, normalizeUrgency, URGENCY }

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

function getOnHandQty(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return 0
  return round3(
    (stockState.records || [])
      .filter((r) => r.itemCode === code)
      .reduce((s, r) => s + (Number(r.qty) || 0), 0),
  )
}

function planDateTs(v) {
  if (!v) return Number.MAX_SAFE_INTEGER
  const d = dayjs(v)
  return d.isValid() ? d.valueOf() : Number.MAX_SAFE_INTEGER
}

function createdAtTs(v) {
  if (!v) return Number.MAX_SAFE_INTEGER
  const d = dayjs(v)
  return d.isValid() ? d.valueOf() : Number.MAX_SAFE_INTEGER
}

/** 优先级：紧急度高 → 计划日期早 → 工单创建时间早 */
export function compareKitDemandPriority(a, b) {
  const ua = urgencyRank(a.urgency)
  const ub = urgencyRank(b.urgency)
  if (ua !== ub) return ub - ua
  const da = planDateTs(a.planDate)
  const db = planDateTs(b.planDate)
  if (da !== db) return da - db
  const ca = createdAtTs(a.createdAt)
  const cb = createdAtTs(b.createdAt)
  if (ca !== cb) return ca - cb
  return String(a.docNo || '').localeCompare(String(b.docNo || ''), 'zh')
}

/**
 * @typedef {object} KitDemand
 * @property {string} key
 * @property {string} itemCode
 * @property {number} demandQty
 * @property {string} [planDate]
 * @property {string} [docNo]
 * @property {string} [customerName]
 * @property {string} [urgency]
 * @property {string} [createdAt]
 * @property {string} [productName]
 * @property {string} [unit]
 */

/**
 * 按物料分组做优先级占用
 * @param {KitDemand[]} demands
 * @param {{ physicalByCode?: Map<string, number>|Record<string, number> }} [options]
 */
export function allocateKitStockByPriority(demands = [], options = {}) {
  const list = (demands || []).filter((d) => d?.key && d?.itemCode && num(d.demandQty) > 0)
  const locks = listActiveKitLocks()
  const physicalOpt = options.physicalByCode

  /** @type {Map<string, number>} */
  const physicalMap = new Map()
  const codes = new Set(list.map((d) => d.itemCode))
  codes.forEach((code) => {
    let phy = 0
    if (physicalOpt instanceof Map && physicalOpt.has(code)) phy = num(physicalOpt.get(code))
    else if (physicalOpt && typeof physicalOpt === 'object' && code in physicalOpt) {
      phy = num(physicalOpt[code])
    } else {
      phy = getOnHandQty(code)
      // 台账为 0 时，回退需求行上携带的实物量（取同物料最大值）
      if (phy <= 0) {
        phy = list
          .filter((d) => d.itemCode === code)
          .reduce((m, d) => Math.max(m, num(d.physicalQty)), 0)
      }
    }
    physicalMap.set(code, round3(phy))
  })

  /** key → 分配结果 */
  const byKey = new Map()
  /** itemCode → 占用流水（按优先级顺序） */
  const byItem = new Map()

  codes.forEach((code) => {
    const physical = physicalMap.get(code) || 0
    const itemLocks = locks.filter((l) => l.itemCode === code)
    const flows = []
    const itemDemands = list.filter((d) => d.itemCode === code).sort(compareKitDemandPriority)

    // 先按优先级落实有效手动量（合计不超过实物），再分自动池
    let manualBudget = physical
    const effectiveManual = new Map()
    itemDemands.forEach((d) => {
      const demandQty = round3(num(d.demandQty))
      const lockWant = round3(
        itemLocks.filter((l) => l.targetKey === d.key).reduce((s, l) => s + num(l.qty), 0) ||
          getManualLockQty(d.key, code),
      )
      const manualQty = round3(Math.min(demandQty, lockWant, manualBudget))
      effectiveManual.set(d.key, manualQty)
      manualBudget = round3(Math.max(0, manualBudget - manualQty))
    })
    const manualTotal = round3([...effectiveManual.values()].reduce((s, v) => s + v, 0))
    let free = round3(Math.max(0, physical - manualTotal))

    itemDemands.forEach((d, rank) => {
      const demandQty = round3(num(d.demandQty))
      const manualQty = effectiveManual.get(d.key) || 0
      const needAuto = round3(Math.max(0, demandQty - manualQty))
      const autoQty = round3(Math.min(needAuto, free))
      free = round3(Math.max(0, free - autoQty))
      const allocatedQty = round3(manualQty + autoQty)
      const gapQty = round3(Math.max(0, demandQty - allocatedQty))

      const inTransitQty = round3(num(d.inTransitQty))
      const row = {
        key: d.key,
        itemCode: code,
        demandQty,
        physicalQty: physical,
        manualAllocatedQty: manualQty,
        autoAllocatedQty: autoQty,
        allocatedQty,
        gapQty,
        inTransitQty,
        priorityRank: rank + 1,
        planDate: d.planDate || '',
        docNo: d.docNo || '',
        customerName: d.customerName || '',
        productName: d.productName || '',
        urgency: normalizeUrgency(d.urgency),
        urgencyLabel: urgencyLabel(d.urgency),
        createdAt: d.createdAt || '',
        method: manualQty > 0 && autoQty > 0 ? 'mixed' : manualQty > 0 ? 'manual' : 'auto',
      }
      byKey.set(d.key, row)
      flows.push(row)
    })

    // 他单占用 / 被谁挡住：对每个需求汇总更高优先级已占量，并回写缺料状态
    flows.forEach((row, idx) => {
      const higher = flows.slice(0, idx)
      row.othersAllocatedQty = round3(higher.reduce((s, h) => s + h.allocatedQty, 0))
      row.blockedBy = higher
        .filter((h) => h.allocatedQty > 0)
        .map((h) => ({
          key: h.key,
          docNo: h.docNo,
          productName: h.productName,
          customerName: h.customerName,
          urgency: h.urgency,
          qty: h.allocatedQty,
          method: h.method,
          planDate: h.planDate,
          priorityRank: h.priorityRank,
        }))
      row.freeAfter = free
      const st = resolveShortageStatus(row.gapQty, row.inTransitQty, row)
      row.statusKey = st.key
      row.statusLabel = st.label
      row.statusColor = st.color
    })

    byItem.set(code, {
      itemCode: code,
      physicalQty: physical,
      manualTotalQty: manualTotal,
      autoPoolQty: round3(Math.max(0, physical - manualTotal)),
      freeQty: free,
      flows,
    })
  })

  return { byKey, byItem, physicalMap }
}

/**
 * 将优先级占用结果写回齐套行的物料明细，并按新缺口重算齐套率
 * @param {Array} kittingRows summarizeKitGroup 结果
 */
export function applyKitPriorityAllocationToRows(kittingRows = []) {
  const demands = []
  ;(kittingRows || []).forEach((row) => {
    const planDate = row.planAssemblyDate || ''
    const docNo = row.docNo || ''
    const customerName = row.customerName || ''
    const urgency = normalizeUrgency(row.urgency)
    const createdAt = row.createdAt || ''
    ;(row.allLines || row.shortageLines || []).forEach((line) => {
      if (!line?.id || !line.itemCode) return
      demands.push({
        key: line.id,
        itemCode: line.itemCode,
        demandQty: num(line.demandQty),
        physicalQty: num(line.physicalQty ?? line.stockQty ?? line.availableQty),
        inTransitQty: num(line.inTransitQty),
        planDate,
        docNo,
        customerName,
        urgency,
        createdAt,
        productName: row.productName || line.productName || '',
        unit: line.unit || '',
      })
    })
  })

  const snap = allocateKitStockByPriority(demands)

  ;(kittingRows || []).forEach((row) => {
    const lines = row.allLines || []
    lines.forEach((line) => {
      const hit = snap.byKey.get(line.id)
      const physical =
        hit?.physicalQty ?? num(line.physicalQty ?? line.stockQty ?? line.availableQty)
      if (!hit) {
        line.physicalQty = physical
        line.allocatedQty = 0
        line.autoAllocatedQty = 0
        line.manualAllocatedQty = 0
        line.othersAllocatedQty = 0
        line.blockedBy = []
        line.priorityRank = null
        line.allocMethod = ''
        // 无竞争时仍按原可用口径
        line.availableQty = num(line.availableQty ?? physical)
        line.gapQty = Math.max(0, num(line.demandQty) - num(line.availableQty))
      } else {
        line.physicalQty = physical
        line.allocatedQty = hit.allocatedQty
        line.autoAllocatedQty = hit.autoAllocatedQty
        line.manualAllocatedQty = hit.manualAllocatedQty
        line.othersAllocatedQty = hit.othersAllocatedQty
        line.blockedBy = hit.blockedBy || []
        line.priorityRank = hit.priorityRank
        line.allocMethod = hit.method
        // 本单可用 = 分到的占用；缺口 = 需求 − 本单占用
        line.availableQty = hit.allocatedQty
        line.gapQty = hit.gapQty
      }

      const inTransit = num(line.inTransitQty)
      const st = resolveShortageStatus(line.gapQty, inTransit, line)
      line.tone = st.tone
      line.statusKey = st.key
      line.statusLabel = st.label
      line.statusColor = st.color
      line.etaText = line.etaText || '—'
    })

    const total = lines.length
    const missingLines = lines.filter((l) => num(l.gapQty) > 0)
    const missing = missingLines.length
    const complete = Math.max(0, total - missing)
    const rate = total > 0 ? complete / total : 1
    row.kitRate = rate
    row.kitRatePct = Math.round(rate * 1000) / 10
    row.missingCount = missing
    row.shortageLines = missingLines
    row.allLines = lines
    const readyLabel =
      row.readyStatusLabel || (row.statusKey === 'ready' ? row.statusLabel : '可装配')
    const status = resolveKitStatus(rate, readyLabel)
    row.statusKey = status.key
    row.statusLabel = status.label
  })

  return { rows: kittingRows, snapshot: snap }
}

function resolveShortageStatus(gapQty, inTransitQty, line) {
  const gap = num(gapQty)
  const transit = num(inTransitQty)
  if (gap <= 0) {
    return { key: 'ok', label: '已齐套', color: 'success', tone: 'ok' }
  }
  const blocked = num(line?.othersAllocatedQty) > 0
  if (blocked && transit <= 0) {
    return {
      key: 'blocked',
      label: '被高优先占用',
      color: 'orange',
      tone: 'warn',
    }
  }
  if (transit >= gap) {
    return { key: 'pending', label: '待到货', color: 'warning', tone: 'warn' }
  }
  if (transit > 0) {
    return { key: 'partial', label: '部分缺口', color: 'warning', tone: 'warn' }
  }
  return { key: 'severe', label: '严重缺料', color: 'error', tone: 'danger' }
}

function resolveKitStatus(rate, readyLabel = '可装配') {
  if (rate >= 1) return { key: 'ready', label: readyLabel || '可装配' }
  if (rate >= 0.8) return { key: 'basic', label: '基本齐套' }
  return { key: 'shortage', label: '缺料' }
}

/** 某物料的占用流水（只读明细） */
export function getKitItemAllocationFlows(itemCode, snapshot) {
  const code = String(itemCode || '').trim()
  if (!code) return null
  if (snapshot?.byItem?.has(code)) return snapshot.byItem.get(code)
  const { byItem } = allocateKitStockByPriority(
    // 仅查单物料时由调用方传入 demands；此处返回空壳
    [],
  )
  return byItem.get(code) || null
}
