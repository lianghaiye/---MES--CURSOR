import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export const IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024
export const IMPORT_ACCEPT = '.xls,.xlsx'

export function buildImportFileName(prefix) {
  return `${prefix}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
}

/**
 * @param {Array<{ name: string, headers: string[], rows?: Array<Array<string|number>> }>} sheets
 * @param {string} fileName
 */
export function downloadTemplateWorkbook(sheets, fileName) {
  const wb = XLSX.utils.book_new()
  sheets.forEach((sheet) => {
    const aoa = [sheet.headers, ...(sheet.rows || [])]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  })
  XLSX.writeFile(wb, fileName)
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{ sheetNames: string[], sheets: Record<string, Array<Record<string, string>>> }>}
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const sheets = {}
        wb.SheetNames.forEach((name) => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
            defval: '',
            raw: false,
          })
          sheets[name] = rows.map((row) => {
            const next = {}
            Object.keys(row).forEach((key) => {
              next[String(key).trim()] = row[key] == null ? '' : String(row[key]).trim()
            })
            return next
          })
        })
        resolve({ sheetNames: wb.SheetNames, sheets })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function validateImportFile(file) {
  if (!file) return { ok: false, message: '请先选择文件' }
  const name = String(file.name || '').toLowerCase()
  if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    return { ok: false, message: '仅支持上传 .xls 或 .xlsx 文件' }
  }
  if (file.size > IMPORT_MAX_FILE_SIZE) {
    return { ok: false, message: '文件大小不能超过 5MB' }
  }
  return { ok: true }
}

/**
 * 失败行导出：保留原列，末尾追加「错误说明」
 * @param {Array<Record<string, string>>} failRows - 每行含 __error
 * @param {string[]} preferredHeaders - 优先列顺序
 */
export function downloadErrorWorkbook(failRows, preferredHeaders = [], fileName) {
  if (!failRows?.length) return
  const keys = new Set()
  preferredHeaders.forEach((h) => keys.add(h))
  failRows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      if (k !== '__error') keys.add(k)
    })
  })
  const headers = [...keys, '错误说明']
  const data = failRows.map((row) => [
    ...[...keys].map((h) => row[h] ?? ''),
    row.__error || '校验失败',
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '错误信息')
  XLSX.writeFile(wb, fileName || buildImportFileName('导入错误信息'))
}

export function pickSheet(sheets, candidates = []) {
  if (!sheets) return []
  for (const name of candidates) {
    if (sheets[name]) return sheets[name]
  }
  const first = Object.keys(sheets)[0]
  return first ? sheets[first] : []
}

export function cellOf(row, ...aliases) {
  if (!row) return ''
  for (const key of aliases) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim()
  }
  const lowerMap = {}
  Object.keys(row).forEach((k) => {
    lowerMap[k.trim().toLowerCase()] = row[k]
  })
  for (const key of aliases) {
    const hit = lowerMap[String(key).trim().toLowerCase()]
    if (hit != null && String(hit).trim() !== '') return String(hit).trim()
  }
  return ''
}
