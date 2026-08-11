import dayjs from 'dayjs'

/** 列表/详情展示用：精确到分钟，不显示秒 */
export function formatDateTimeMinute(val) {
  if (val === undefined || val === null) return '—'
  const s = String(val).trim()
  if (!s) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = dayjs(s)
  if (d.isValid()) return d.format('YYYY-MM-DD HH:mm')
  return s.replace(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}):\d{2}/, '$1')
}

/** 审批时间：优先 approvedAt，否则取审批记录时间 */
export function resolveApprovalTime(record) {
  if (record?.approvedAt) return formatDateTimeMinute(record.approvedAt)
  const records = record?.approvalRecords || []
  const hit = records.find((r) => r?.time) || records[0]
  return formatDateTimeMinute(hit?.time)
}
