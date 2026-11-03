/**
 * 消息通知：类型配置 + 站内信 Inbox
 */
import { computed, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { persistJson } from '@/utils/safeStorage'
import { getUser } from '@/utils/auth'
import { MESSAGE_NOTIFY_CATALOG, getMessageTypeByCode } from '@/constants/messageNotifyCatalog'

const STORAGE_KEY = 'i_doms_message_notify'
/** 升版本会重置本地 Inbox 种子（配置仍按类型合并） */
const DATA_VERSION = 3

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm')
}

function uid(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function currentUserId() {
  const u = getUser()
  return String(u?.username || u?.id || u?.userId || 'admin')
}

function currentUserName() {
  const u = getUser()
  return String(u?.displayName || u?.username || 'admin')
}

function buildDefaultConfigs() {
  const map = {}
  MESSAGE_NOTIFY_CATALOG.forEach((t) => {
    map[t.code] = {
      code: t.code,
      enabled: t.defaults.enabled !== false,
      roles: [...(t.defaults.roles || [])],
      docRelations: [...(t.defaults.docRelations || [])],
      deptIds: [...(t.defaults.deptIds || [])],
      userIds: [...(t.defaults.userIds || [])],
      advanceDays: t.defaults.advanceDays ?? null,
    }
  })
  return map
}

function withQuery(path, params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    const s = String(value ?? '').trim()
    if (s) q.set(key, s)
  })
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * 无详情路由的消息类型：落到列表并带上检索参数
 * @param {string} typeCode
 * @param {{ bizNo?: string, itemCode?: string, vars?: object }} payload
 */
export function buildListSearchLinkPath(typeCode, payload = {}) {
  const bizNo = String(payload.bizNo || payload.vars?.bizNo || '').trim()
  const itemCode = String(payload.itemCode || payload.vars?.itemCode || '').trim()
  switch (typeCode) {
    case 'PAY_DUE_SOON':
    case 'PAY_OVERDUE':
      return withQuery('/settlement/payments', { contractNo: bizNo })
    case 'KEY_PART_ARRIVED':
      return withQuery('/production/arrival-tracking', {
        tab: 'arrived',
        keyword: bizNo,
        itemCode,
      })
    case 'WO_PENDING_DISPATCH':
      return withQuery('/production/work-orders', { code: bizNo })
    case 'STOCK_REPLENISH_WARN':
      return withQuery('/planning/replenish-center', { productCode: bizNo })
    case 'INBOUND_PENDING':
      return withQuery('/inventory/pending-inbound', { docNo: bizNo })
    case 'OUTBOUND_PENDING':
      return withQuery('/inventory/pending-outbound', { docNo: bizNo })
    default:
      return ''
  }
}

function resolveMessageLinkPath(typeCode, payload = {}) {
  const type = getMessageTypeByCode(typeCode)
  const catalogPath = type?.linkPath || ''
  const explicit = String(payload.linkPath || '').trim()
  // 显式详情路径（比目录列表更深）直接使用
  if (explicit && explicit !== catalogPath && !explicit.startsWith(`${catalogPath}?`)) {
    return explicit
  }
  const searched = buildListSearchLinkPath(typeCode, payload)
  if (searched) return searched
  return explicit || catalogPath || ''
}

function seedInbox() {
  const uidSelf = currentUserId()
  const name = currentUserName()
  const t = dayjs()
  const at = (n, unit = 'minute') => t.subtract(n, unit).format('YYYY-MM-DD HH:mm')
  const row = (partial) => ({
    userId: uidSelf,
    userName: name,
    readAt: '',
    ...partial,
  })

  // linkPath：有详情路由则直达单据；无详情则落到对应列表/工作台
  return [
    row({
      id: 'msg-seed-1',
      typeCode: 'SO_PENDING_APPROVE',
      title: '销售订单待审核 · 1-20260903-IL01',
      body: '订单 1-20260903-IL01 已提交，请尽快审核。',
      linkPath: '/sales/orders/so-seed-industrial-label',
      bizNo: '1-20260903-IL01',
      createdAt: at(15),
    }),
    row({
      id: 'msg-seed-2',
      typeCode: 'SO_APPROVED',
      title: '销售订单已通过 · 1-20260512-005',
      body: '订单 1-20260512-005 已审核通过。',
      linkPath: '/sales/orders/so-seed-1',
      bizNo: '1-20260512-005',
      createdAt: at(40),
    }),
    row({
      id: 'msg-seed-3',
      typeCode: 'SO_CHANGE_PENDING',
      title: '订单变更待审核 · JGBG20260515001',
      body: '变更单 JGBG20260515001 待审核。',
      linkPath: '/sales/order-changes/spc-seed-1/approve',
      bizNo: 'JGBG20260515001',
      createdAt: at(55),
    }),
    row({
      id: 'msg-seed-4',
      typeCode: 'CT_PENDING_APPROVE',
      title: '合同待审核 · HT-20261012-PEN',
      body: '合同 HT-20261012-PEN 已提交，请审核。',
      linkPath: '/contracts/sc-st-4',
      bizNo: 'HT-20261012-PEN',
      createdAt: at(70),
    }),
    row({
      id: 'msg-seed-5',
      typeCode: 'PO_PENDING_APPROVE',
      title: '采购订单待审核 · CG20260804001',
      body: '采购订单 CG20260804001 待审核。',
      linkPath: '/procurement/purchase-orders/po-1',
      bizNo: 'CG20260804001',
      createdAt: at(90),
    }),
    row({
      id: 'msg-seed-6',
      typeCode: 'OS_PENDING_APPROVE',
      title: '外协订单待审核 · WX-260808001',
      body: '外协订单 WX-260808001 待审核。',
      linkPath: '/procurement/outsourcing-orders/wx-1',
      bizNo: 'WX-260808001',
      createdAt: at(2, 'hour'),
    }),
    row({
      id: 'msg-seed-7',
      typeCode: 'QC_PENDING',
      title: '质检待检 · LLZJ202608280001',
      body: '质检任务 LLZJ202608280001 待检验。',
      linkPath: '/quality/incoming-qc/qctask-ll-1',
      bizNo: 'LLZJ202608280001',
      createdAt: at(150),
    }),
    row({
      id: 'msg-seed-8',
      typeCode: 'ECN_TODO',
      title: 'ECN 待处理 · ECN-2024001',
      body: '变更单 ECN-2024001 需要你处理。',
      linkPath: '/engineering-change/ecn/ecn-001/detail',
      bizNo: 'ECN-2024001',
      createdAt: at(3, 'hour'),
    }),
    row({
      id: 'msg-seed-9',
      typeCode: 'DELIVERY_PENDING_APPROVE',
      title: '发货申请待审 · SH20260513001',
      body: '发货申请 SH20260513001 待审核。',
      linkPath: '/sales/delivery/do-seed-1',
      bizNo: 'SH20260513001',
      createdAt: at(4, 'hour'),
    }),
    row({
      id: 'msg-seed-10',
      typeCode: 'DESIGN_TASK_ASSIGNED',
      title: '设计任务待处理 · SJ-2026-0001',
      body: '设计任务 SJ-2026-0001 已分派给你。',
      linkPath: '/planning/design-task/dt-seed-001/detail',
      bizNo: 'SJ-2026-0001',
      createdAt: at(5, 'hour'),
    }),
    row({
      id: 'msg-seed-11',
      typeCode: 'MATERIAL_REQ_PENDING',
      title: '领料待发料 · ML202607200001',
      body: '领料单 ML202607200001 待发料。',
      linkPath: '/production/material-requisition/mr-seed-001',
      bizNo: 'ML202607200001',
      createdAt: at(6, 'hour'),
    }),
    row({
      id: 'msg-seed-12',
      typeCode: 'REPORT_PENDING_CONFIRM',
      title: '报工待确认 · WO202505280-001',
      body: '工单 WO202505280-001 报工记录待确认。',
      linkPath: '/report-management/report-work/qr-rw-01',
      bizNo: 'WO202505280-001',
      createdAt: at(7, 'hour'),
    }),
    row({
      id: 'msg-seed-13',
      typeCode: 'REWORK_PENDING_PLAN',
      title: '返工待排 · FG20261021001',
      body: '返工单 FG20261021001 待排产。',
      linkPath: '/production/rework-orders/rw-demo-1',
      bizNo: 'FG20261021001',
      createdAt: at(8, 'hour'),
    }),
    row({
      id: 'msg-seed-14',
      typeCode: 'SETTLE_PENDING_CONFIRM',
      title: '对账单待确认 · PS20261001001',
      body: '对账单 PS20261001001 待确认。',
      linkPath: '/settlement/purchase-settles/ps-demo-month-draft',
      bizNo: 'PS20261001001',
      createdAt: at(9, 'hour'),
    }),
    row({
      id: 'msg-seed-15',
      typeCode: 'BOM_ROUTE_REJECTED',
      title: 'BOM/工艺已驳回 · bom-demo-upgrade-child-pending',
      body: 'bom-demo-upgrade-child-pending 已被驳回，请修改后重提。',
      linkPath: '/product-process/bom/bom-demo-upgrade-child-pending',
      bizNo: 'bom-demo-upgrade-child-pending',
      createdAt: at(10, 'hour'),
    }),
    row({
      id: 'msg-seed-16',
      typeCode: 'STOCKTAKE_DIFF_PENDING',
      title: '盘点差异待处理 · PD20260920002',
      body: '盘点单 PD20260920002 存在差异，请处理。',
      linkPath: '/inventory/stocktake/st-seed-pending',
      bizNo: 'PD20260920002',
      createdAt: at(11, 'hour'),
    }),
    // —— 以下无独立详情路由：落到列表并带检索参数 ——
    row({
      id: 'msg-seed-17',
      typeCode: 'PAY_OVERDUE',
      title: '回款已逾期 · HT-20261001-STD',
      body: 'HT-20261001-STD 已逾期，待收 ¥128,000.00。',
      linkPath: buildListSearchLinkPath('PAY_OVERDUE', { bizNo: 'HT-20261001-STD' }),
      bizNo: 'HT-20261001-STD',
      createdAt: at(12, 'hour'),
      readAt: at(30),
    }),
    row({
      id: 'msg-seed-18',
      typeCode: 'PAY_DUE_SOON',
      title: '回款即将到期 · HT-20260915-STD',
      body: 'HT-20260915-STD 节点将于 3 天后到期，待收 ¥56,000.00。',
      linkPath: buildListSearchLinkPath('PAY_DUE_SOON', { bizNo: 'HT-20260915-STD' }),
      bizNo: 'HT-20260915-STD',
      createdAt: at(13, 'hour'),
    }),
    row({
      id: 'msg-seed-19',
      typeCode: 'KEY_PART_ARRIVED',
      title: '关键件到货 · CGRK-20261028012',
      body: '轴承 6205（MAT-BEARING-6205）已入库 40件，单号 CGRK-20261028012。',
      linkPath: buildListSearchLinkPath('KEY_PART_ARRIVED', {
        bizNo: 'CGRK-20261028012',
        itemCode: 'MAT-BEARING-6205',
      }),
      bizNo: 'CGRK-20261028012',
      createdAt: at(14, 'hour'),
    }),
    row({
      id: 'msg-seed-20',
      typeCode: 'WO_PENDING_DISPATCH',
      title: '工单待下发 · WO202505280-001',
      body: '工单 WO202505280-001 待下发。',
      linkPath: buildListSearchLinkPath('WO_PENDING_DISPATCH', { bizNo: 'WO202505280-001' }),
      bizNo: 'WO202505280-001',
      createdAt: at(15, 'hour'),
    }),
    row({
      id: 'msg-seed-21',
      typeCode: 'STOCK_REPLENISH_WARN',
      title: '库存预警 · CP2610001',
      body: '物料/产品 CP2610001 库存低于预警值。',
      linkPath: buildListSearchLinkPath('STOCK_REPLENISH_WARN', { bizNo: 'CP2610001' }),
      bizNo: 'CP2610001',
      createdAt: at(16, 'hour'),
    }),
    row({
      id: 'msg-seed-22',
      typeCode: 'INBOUND_PENDING',
      title: '待入库 · 1-20260715-00001',
      body: '待入库单据 1-20260715-00001 请处理。',
      linkPath: buildListSearchLinkPath('INBOUND_PENDING', { bizNo: '1-20260715-00001' }),
      bizNo: '1-20260715-00001',
      createdAt: at(17, 'hour'),
    }),
    row({
      id: 'msg-seed-23',
      typeCode: 'OUTBOUND_PENDING',
      title: '待出库 · OUT202605130001',
      body: '待出库单据 OUT202605130001 请处理。',
      linkPath: buildListSearchLinkPath('OUTBOUND_PENDING', { bizNo: 'OUT202605130001' }),
      bizNo: 'OUT202605130001',
      createdAt: at(18, 'hour'),
    }),
  ]
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== DATA_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function mergeConfigs(stored) {
  const defaults = buildDefaultConfigs()
  const fromStore = stored && typeof stored === 'object' ? stored : {}
  Object.keys(defaults).forEach((code) => {
    const row = fromStore[code]
    if (!row) return
    defaults[code] = {
      ...defaults[code],
      enabled: row.enabled !== false,
      roles: Array.isArray(row.roles) ? row.roles : defaults[code].roles,
      docRelations: Array.isArray(row.docRelations)
        ? row.docRelations
        : defaults[code].docRelations,
      deptIds: Array.isArray(row.deptIds) ? row.deptIds : defaults[code].deptIds,
      userIds: Array.isArray(row.userIds) ? row.userIds : defaults[code].userIds,
      advanceDays:
        row.advanceDays != null && row.advanceDays !== ''
          ? Number(row.advanceDays)
          : defaults[code].advanceDays,
    }
  })
  return defaults
}

const stored = loadFromStorage()

export const messageNotifyState = reactive({
  configs: mergeConfigs(stored?.configs),
  inbox: Array.isArray(stored?.inbox) ? stored.inbox : seedInbox(),
})

function persist() {
  persistJson(STORAGE_KEY, {
    version: DATA_VERSION,
    configs: messageNotifyState.configs,
    inbox: messageNotifyState.inbox,
  })
}

watch(
  () => [messageNotifyState.configs, messageNotifyState.inbox],
  () => persist(),
  { deep: true },
)

export function getMessageConfig(code) {
  return messageNotifyState.configs[code] || buildDefaultConfigs()[code] || null
}

export function updateMessageConfig(code, patch) {
  const prev = getMessageConfig(code)
  if (!prev) return { ok: false, message: '消息类型不存在' }
  messageNotifyState.configs[code] = {
    ...prev,
    ...patch,
    code,
  }
  return { ok: true }
}

export function listMessageConfigs() {
  return MESSAGE_NOTIFY_CATALOG.map((t) => ({
    ...t,
    config: getMessageConfig(t.code),
  }))
}

function fillTemplate(tpl, vars = {}) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null && vars[k] !== '' ? String(vars[k]) : '',
  )
}

/**
 * 解析收件人：角色映射演示用户 + 固定人员 + 单据相关人
 * 演示环境：当前登录用户若匹配任一策略则投递给当前用户（保证可验收）
 */
function resolveRecipients(config, context = {}) {
  const set = new Map()
  const push = (id, name) => {
    const key = String(id || '').trim()
    if (!key) return
    if (!set.has(key)) set.set(key, name || key)
  }

  ;(config.userIds || []).forEach((id) => push(id, id))

  // 单据相关人
  const rel = new Set(config.docRelations || [])
  if (rel.has('creator') && context.creatorId) push(context.creatorId, context.creatorName)
  if (rel.has('salesperson') && context.salespersonId) {
    push(context.salespersonId, context.salespersonName)
  }
  if (rel.has('assignee') && context.assigneeId) push(context.assigneeId, context.assigneeName)
  if (rel.has('currentApprover') && context.currentApproverId) {
    push(context.currentApproverId, context.currentApproverName)
  }

  // 演示：配置了角色/部门时，默认也通知当前登录人，便于本地验收
  if ((config.roles || []).length || (config.deptIds || []).length) {
    push(currentUserId(), currentUserName())
  }

  // 若解析结果为空，仍投给当前用户（避免“发了但谁都收不到”）
  if (!set.size) push(currentUserId(), currentUserName())

  return [...set.entries()].map(([userId, userName]) => ({ userId, userName }))
}

/**
 * 发布站内消息
 * @param {string} typeCode
 * @param {{ bizNo?: string, itemCode?: string, vars?: object, context?: object, linkPath?: string }} payload
 */
export function publishMessage(typeCode, payload = {}) {
  const type = getMessageTypeByCode(typeCode)
  const config = getMessageConfig(typeCode)
  if (!type) return { ok: false, message: '未知消息类型' }
  if (!config?.enabled) return { ok: false, message: '该消息类型已停用' }

  const vars = {
    bizNo: payload.bizNo || '',
    amount: payload.vars?.amount || '',
    extra: payload.vars?.extra || '',
    itemName: payload.vars?.itemName || '',
    qty: payload.vars?.qty || '',
    unit: payload.vars?.unit || '',
    itemCode: payload.itemCode || payload.vars?.itemCode || '',
    ...(payload.vars || {}),
  }
  const title = payload.title || fillTemplate(type.titleTemplate, vars)
  const body = payload.body || fillTemplate(type.bodyTemplate, vars)
  const linkPath = resolveMessageLinkPath(typeCode, { ...payload, vars })
  const recipients = resolveRecipients(config, payload.context || {})
  const createdAt = nowText()
  const rows = recipients.map((r) => ({
    id: uid('msg'),
    typeCode,
    title,
    body,
    linkPath,
    bizNo: payload.bizNo || vars.bizNo || '',
    userId: r.userId,
    userName: r.userName,
    createdAt,
    readAt: '',
  }))
  messageNotifyState.inbox.unshift(...rows)
  return { ok: true, count: rows.length, data: rows }
}

export function listMyInbox({ unreadOnly = false } = {}) {
  const uidSelf = currentUserId()
  return messageNotifyState.inbox
    .filter((m) => {
      const id = String(m.userId || '')
      // 兼容演示种子：当前用户或历史 admin 收件
      return id === uidSelf || id === 'admin' || id === 'admin1'
    })
    .filter((m) => (unreadOnly ? !m.readAt : true))
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export function unreadCount() {
  return listMyInbox({ unreadOnly: true }).length
}

export const unreadMessageCount = computed(() => {
  void messageNotifyState.inbox
  return unreadCount()
})

export function markMessageRead(id) {
  const row = messageNotifyState.inbox.find((m) => m.id === id)
  if (!row) return { ok: false, message: '消息不存在' }
  if (!row.readAt) row.readAt = nowText()
  return { ok: true }
}

export function markAllMyMessagesRead() {
  const uidSelf = currentUserId()
  const now = nowText()
  let n = 0
  messageNotifyState.inbox.forEach((m) => {
    if ((String(m.userId) === uidSelf || String(m.userId) === 'admin') && !m.readAt) {
      m.readAt = now
      n += 1
    }
  })
  return { ok: true, count: n }
}

export function latestUnreadPreview(limit = 1) {
  return listMyInbox({ unreadOnly: true }).slice(0, limit)
}
