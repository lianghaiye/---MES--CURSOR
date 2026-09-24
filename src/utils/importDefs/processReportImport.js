import dayjs from 'dayjs'
import {
  buildImportFileName,
  cellOf,
  downloadErrorWorkbook,
  downloadTemplateWorkbook,
  parseExcelFile,
  pickSheet,
} from '@/utils/excelImport'
import { addImportExportHistory } from '@/store/importExportHistoryStore'
import { importProcessReportRecords } from '@/store/processReportStore'

const SHEET_NAME = '报工记录'
const HEADERS = [
  '报工方式',
  '工单号',
  '产品编码',
  '产品名称',
  '工序名称',
  '报工人',
  '良品数',
  '不良品数',
  '报工日期',
  '开始时间',
  '结束时间',
  '班组',
  '报工类型',
  '状态',
  '备注',
]

const SAMPLE_ROWS = [
  [
    '任务报工',
    'WO202605270-IMP01',
    'LH-MAT-01',
    '导入演示泵壳',
    '机加工',
    '张三',
    '10',
    '1',
    dayjs().format('YYYY-MM-DD'),
    '08:00',
    '12:00',
    '机加车间',
    '批量计件',
    '待审核',
    '模板示例，可删',
  ],
  [
    '快速报工',
    '',
    'LH-MAT-02',
    '导入演示叶轮',
    '装配',
    '李四',
    '5',
    '0',
    dayjs().format('YYYY-MM-DD'),
    '13:00',
    '17:00',
    '',
    '批量计件',
    '待审核',
    '',
  ],
]

function toNumber(val, fallback = 0) {
  if (val === '' || val == null) return fallback
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

function resolveSource(raw) {
  const text = String(raw || '').trim()
  if (['快速报工', 'quick', '快速'].includes(text)) return 'quick'
  return 'workorder'
}

function resolveStatus(raw) {
  const text = String(raw || '').trim()
  if (['已审核', '已拒绝', '待审核'].includes(text)) return text
  return '待审核'
}

function buildPayload(row) {
  const source = resolveSource(cellOf(row, '报工方式', 'source'))
  const productCode = cellOf(row, '产品编码', 'productCode')
  const productName = cellOf(row, '产品名称', 'productName')
  const processName = cellOf(row, '工序名称', 'processName')
  const reporter = cellOf(row, '报工人', '执行人', 'reporter')
  const goodQty = toNumber(cellOf(row, '良品数', 'goodQty'))
  const defectQty = toNumber(cellOf(row, '不良品数', 'defectQty'))
  const reportDate = cellOf(row, '报工日期', 'reportDate') || dayjs().format('YYYY-MM-DD')
  const startTime = cellOf(row, '开始时间', 'startTime')
  const endTime = cellOf(row, '结束时间', 'endTime')
  const createdAt = `${reportDate} ${dayjs().format('HH:mm:ss')}`

  return {
    source,
    workOrderNo: cellOf(row, '工单号', 'workOrderNo') || '',
    workOrderId: '',
    productCode,
    productName,
    processName,
    reporter,
    operator: reporter,
    goodQty,
    defectQty,
    finishedQty: goodQty + defectQty,
    reportMode: cellOf(row, '报工类型', 'reportMode') || '批量计件',
    team: cellOf(row, '班组', 'team'),
    status: resolveStatus(cellOf(row, '状态', 'status')),
    remark: cellOf(row, '备注', 'remark'),
    startTime,
    endTime,
    taskStartTime: startTime ? `${reportDate} ${startTime}` : '',
    taskEndTime: endTime ? `${reportDate} ${endTime}` : '',
    createdAt,
    reportDate,
  }
}

export const processReportImportDef = {
  moduleKey: 'process-report',
  moduleName: '工序报工',
  templateFileName: () => buildImportFileName('报工记录导入模板'),
  errorFileName: () => buildImportFileName('报工记录导入错误'),
  errorHeaders: HEADERS,

  downloadTemplate() {
    downloadTemplateWorkbook(
      [
        {
          name: SHEET_NAME,
          headers: HEADERS,
          rows: SAMPLE_ROWS,
        },
        {
          name: '填写说明',
          headers: ['说明'],
          rows: [
            ['1. 报工方式填写：任务报工 / 快速报工（默认任务报工）'],
            ['2. 产品编码、产品名称、工序名称、报工人、良品数为必填'],
            ['3. 任务报工建议填写工单号；快速报工可留空'],
            ['4. 状态可选：待审核 / 已审核 / 已拒绝，默认待审核'],
            ['5. 校验通过的行直接入库；失败行写入错误信息文件'],
          ],
        },
      ],
      processReportImportDef.templateFileName(),
    )
  },

  async runImport(file) {
    const started = Date.now()
    const { sheets } = await parseExcelFile(file)
    const rows = pickSheet(sheets, [SHEET_NAME, 'Sheet1'])
    const successPayloads = []
    const failRows = []

    rows.forEach((row, index) => {
      const lineNo = index + 2
      const productCode = cellOf(row, '产品编码', 'productCode')
      const productName = cellOf(row, '产品名称', 'productName')
      const processName = cellOf(row, '工序名称', 'processName')
      const reporter = cellOf(row, '报工人', '执行人', 'reporter')
      const goodRaw = cellOf(row, '良品数', 'goodQty')

      if (!productCode) {
        failRows.push({ ...row, __error: `第${lineNo}行：产品编码为必填` })
        return
      }
      if (!productName) {
        failRows.push({ ...row, __error: `第${lineNo}行：产品名称为必填` })
        return
      }
      if (!processName) {
        failRows.push({ ...row, __error: `第${lineNo}行：工序名称为必填` })
        return
      }
      if (!reporter) {
        failRows.push({ ...row, __error: `第${lineNo}行：报工人为必填` })
        return
      }
      if (goodRaw === '' || goodRaw == null) {
        failRows.push({ ...row, __error: `第${lineNo}行：良品数为必填` })
        return
      }
      if (!Number.isFinite(Number(goodRaw))) {
        failRows.push({ ...row, __error: `第${lineNo}行：良品数须为数字` })
        return
      }

      const source = resolveSource(cellOf(row, '报工方式', 'source'))
      const workOrderNo = cellOf(row, '工单号', 'workOrderNo')
      if (source === 'workorder' && !workOrderNo) {
        failRows.push({ ...row, __error: `第${lineNo}行：任务报工须填写工单号` })
        return
      }

      try {
        successPayloads.push(buildPayload(row))
      } catch (err) {
        failRows.push({ ...row, __error: `第${lineNo}行：${err?.message || '解析失败'}` })
      }
    })

    let imported = []
    if (successPayloads.length) {
      const res = importProcessReportRecords(successPayloads)
      if (!res.ok) {
        successPayloads.forEach((payload, i) => {
          failRows.push({
            产品编码: payload.productCode,
            产品名称: payload.productName,
            工序名称: payload.processName,
            __error: `批量写入失败：${res.message}`,
            __line: i,
          })
        })
      } else {
        imported = res.records || []
      }
    }

    const durationSec = Math.max(1, Math.round((Date.now() - started) / 1000))
    const remark =
      failRows.length > 0
        ? `成功 ${imported.length} 条，失败 ${failRows.length} 条。请下载附件查看错误说明。`
        : `成功导入 ${imported.length} 条`

    const history = addImportExportHistory({
      taskType: '导入',
      module: processReportImportDef.moduleName,
      successCount: imported.length,
      failCount: failRows.length,
      durationSec,
      remark,
      errorRows: failRows,
      errorHeaders: HEADERS,
      previewRows: imported.slice(0, 20).map((r) => ({
        工单号: r.workOrderNo,
        产品编码: r.productCode,
        工序名称: r.processName,
        报工人: r.reporter,
      })),
    })

    return {
      successCount: imported.length,
      failCount: failRows.length,
      failRows,
      durationSec,
      remark,
      historyId: history.id,
      downloadErrors: () =>
        downloadErrorWorkbook(failRows, HEADERS, processReportImportDef.errorFileName()),
    }
  },
}
