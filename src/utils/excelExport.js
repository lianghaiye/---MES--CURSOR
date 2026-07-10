import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export function buildExportFileName(prefix) {
  return `${prefix}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
}

/**
 * @param {object} params
 * @param {Array<object>} params.rows
 * @param {Array<{ title: string, getValue: (row: object) => unknown }>} params.fields
 * @param {string} params.fileName
 * @param {string} [params.sheetName]
 */
export function exportRowsToExcel({ rows, fields, fileName, sheetName = 'Sheet1' }) {
  const activeFields = fields.filter(Boolean)
  const headers = activeFields.map((f) => f.title)
  const data = rows.map((row) =>
    activeFields.map((f) => {
      const raw = f.getValue(row)
      if (raw == null) return ''
      return raw
    }),
  )
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}
