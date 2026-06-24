import dayjs from 'dayjs'

/** 版本展示：V{四位年}.{次版本}，如 V2026.1 */
export function formatBomVersion(year, sub) {
  return `V${year}.${sub}`
}

export function getBomVersionYear(date = dayjs()) {
  return date.year()
}

/** 解析 V2026.1 或旧格式 V.2026.1 */
export function parseBomVersion(versionStr) {
  if (!versionStr) return null
  const m = String(versionStr).match(/^V\.?(\d{4})\.(\d+)$/)
  if (!m) return null
  return { year: Number(m[1]), sub: Number(m[2]) }
}

/** 同一年份下取下一档次版本号 */
export function nextSubVersionForYear(versionStrings, year = getBomVersionYear()) {
  const subs = (versionStrings || [])
    .map(parseBomVersion)
    .filter((v) => v && v.year === year)
    .map((v) => v.sub)
  return (subs.length ? Math.max(...subs) : 0) + 1
}

export function normalizeVersionDisplay(versionStr) {
  const parsed = parseBomVersion(versionStr)
  return parsed ? formatBomVersion(parsed.year, parsed.sub) : versionStr || ''
}
