/**
 * 工单报工二维码 token（演示：base64url JSON；上线换服务端 HMAC/JWT）
 */

export const WORK_ORDER_QR_SCOPE = {
  ORDER: 'order',
  PROCESS: 'process',
}

export const WORK_ORDER_QR_MODE = {
  ORDER: 'order',
  PROCESS: 'process',
  BOTH: 'both',
}

export const WORK_ORDER_QR_MODE_OPTIONS = [
  { label: '整单一个', value: WORK_ORDER_QR_MODE.ORDER },
  { label: '每工序一个', value: WORK_ORDER_QR_MODE.PROCESS },
  { label: '两种都打', value: WORK_ORDER_QR_MODE.BOTH },
]

const QR_PREF_KEY = 'work-order-print-qr-prefs'

function toBase64Url(str) {
  const b64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(str)))
      : Buffer.from(str, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(token) {
  const b64 = String(token || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const raw = b64 + pad
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(raw)))
  }
  return Buffer.from(raw, 'base64').toString('utf8')
}

/** 签发 token */
export function issueWorkOrderQrToken({
  scope,
  workOrderId,
  processSeq,
  processTaskId,
  processName,
} = {}) {
  const id = String(workOrderId || '').trim()
  if (!id) return ''
  const sc =
    scope === WORK_ORDER_QR_SCOPE.PROCESS ? WORK_ORDER_QR_SCOPE.PROCESS : WORK_ORDER_QR_SCOPE.ORDER
  const payload = {
    v: 1,
    scope: sc,
    workOrderId: id,
    iat: Math.floor(Date.now() / 1000),
  }
  if (sc === WORK_ORDER_QR_SCOPE.PROCESS) {
    const seq = Number(processSeq)
    if (Number.isFinite(seq) && seq > 0) payload.processSeq = seq
    if (processTaskId) payload.processTaskId = String(processTaskId)
    if (processName) payload.processName = String(processName)
  }
  return toBase64Url(JSON.stringify(payload))
}

/** 解析 token；非法返回 null */
export function parseWorkOrderQrToken(token) {
  try {
    const text = fromBase64Url(token)
    const data = JSON.parse(text)
    if (!data || data.v !== 1) return null
    if (!data.workOrderId) return null
    if (data.scope !== WORK_ORDER_QR_SCOPE.ORDER && data.scope !== WORK_ORDER_QR_SCOPE.PROCESS) {
      return null
    }
    return data
  } catch {
    return null
  }
}

/** 小程序扫码落地 path（普通二维码内容；生产可换小程序码 scene） */
export function buildWorkOrderQrScanPath(token) {
  const t = encodeURIComponent(String(token || ''))
  return `pages/process-report/scan-entry?token=${t}`
}

export function loadWorkOrderQrPrintPrefs() {
  try {
    const raw = localStorage.getItem(QR_PREF_KEY)
    if (!raw) return { qrEnabled: false, qrMode: WORK_ORDER_QR_MODE.ORDER }
    const parsed = JSON.parse(raw)
    return {
      qrEnabled: Boolean(parsed.qrEnabled),
      qrMode: [
        WORK_ORDER_QR_MODE.ORDER,
        WORK_ORDER_QR_MODE.PROCESS,
        WORK_ORDER_QR_MODE.BOTH,
      ].includes(parsed.qrMode)
        ? parsed.qrMode
        : WORK_ORDER_QR_MODE.ORDER,
    }
  } catch {
    return { qrEnabled: false, qrMode: WORK_ORDER_QR_MODE.ORDER }
  }
}

export function saveWorkOrderQrPrintPrefs({ qrEnabled, qrMode }) {
  try {
    localStorage.setItem(
      QR_PREF_KEY,
      JSON.stringify({
        qrEnabled: Boolean(qrEnabled),
        qrMode: qrMode || WORK_ORDER_QR_MODE.ORDER,
      }),
    )
  } catch {
    /* ignore */
  }
}
