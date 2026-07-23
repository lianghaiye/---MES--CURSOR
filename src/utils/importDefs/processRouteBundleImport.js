import {
  buildImportFileName,
  cellOf,
  downloadErrorWorkbook,
  downloadTemplateWorkbook,
  parseExcelFile,
  pickSheet,
} from '@/utils/excelImport'
import { addImportExportHistory } from '@/store/importExportHistoryStore'
import {
  addProcessConfig,
  getProcessByCode,
  getProcessByName,
  processConfigState,
  RESOURCE_TYPES,
  REPORT_MODES,
  TASK_EXECUTION_MODES,
} from '@/store/processConfigStore'
import { getActiveCategoryNames } from '@/store/processCategoryStore'
import { addProcessRoute, getProcessRouteByCode } from '@/store/processRouteStore'
import { createEmptyGrid } from '@/utils/processRouteGrid'

const PROCESS_HEADERS = [
  '工序编码',
  '工序名称',
  '工序分类',
  '资源类型',
  '岗位',
  '报工方式',
  '任务执行方式',
  '备注',
]

const ROUTE_HEADERS = ['路线编码', '路线名称', '状态', '应用范围', '备注']

const STEP_HEADERS = ['路线编码', '步骤序号', '并行行号', '工序编码', '工序名称']

function resolveReportMode(raw) {
  const text = String(raw || '').trim()
  if (REPORT_MODES.includes(text)) return text
  if (text.includes('时长')) return '时长报工'
  return '批量计件'
}

function resolveTaskMode(raw) {
  const text = String(raw || '').trim()
  const byLabel = TASK_EXECUTION_MODES.find((m) => m.label === text || m.value === text)
  if (byLabel) return byLabel.value
  if (text.includes('协作') || text.includes('多人')) return 'collaborative'
  return 'single_claim'
}

function resolveResourceType(raw, category) {
  const text = String(raw || '').trim()
  if (RESOURCE_TYPES.includes(text)) return text
  if (category === '组装') return '工人小组'
  return '工人'
}

function buildProcessGrid(stepRows) {
  if (!stepRows.length) return createEmptyGrid(1, 1)
  let maxStep = 1
  let maxRow = 1
  stepRows.forEach((s) => {
    maxStep = Math.max(maxStep, s.stepNo)
    maxRow = Math.max(maxRow, s.rowNo)
  })
  const grid = createEmptyGrid(maxStep, maxRow)
  stepRows.forEach((s) => {
    const process =
      (s.processCode && getProcessByCode(s.processCode)) ||
      (s.processName && getProcessByName(s.processName))
    if (!process) return
    grid[s.stepNo - 1][s.rowNo - 1] = {
      processId: process.id,
      processName: process.name,
      processFileId: '',
    }
  })
  return grid
}

export const processRouteBundleImportDef = {
  moduleKey: 'process-route-bundle',
  moduleName: '工序与工艺路线',
  templateFileName: () => buildImportFileName('工序工艺路线导入模板'),
  errorFileName: () => buildImportFileName('工序工艺路线导入错误'),
  errorHeaders: ['Sheet', '关键键', ...PROCESS_HEADERS.slice(0, 3), '错误说明'],

  downloadTemplate() {
    downloadTemplateWorkbook(
      [
        {
          name: '工序',
          headers: PROCESS_HEADERS,
          rows: [
            [
              'GX90000001',
              '导入演示粗车',
              '机械',
              '工人',
              '机加工岗',
              '批量计件',
              '单人领工',
              '示例',
            ],
            ['GX90000002', '导入演示精车', '机械', '工人', '机加工岗', '批量计件', '单人领工', ''],
            [
              'GX90000003',
              '导入演示总装',
              '组装',
              '工人小组',
              '装配工岗',
              '时长报工',
              '多人协作',
              '',
            ],
          ],
        },
        {
          name: '工艺路线',
          headers: ROUTE_HEADERS,
          rows: [['RT900001', '导入演示机加路线', '使用中', '全部产品', '示例路线']],
        },
        {
          name: '路线步骤',
          headers: STEP_HEADERS,
          rows: [
            ['RT900001', '1', '1', 'GX90000001', '导入演示粗车'],
            ['RT900001', '2', '1', 'GX90000002', '导入演示精车'],
            ['RT900001', '3', '1', 'GX90000003', '导入演示总装'],
          ],
        },
        {
          name: '填写说明',
          headers: ['说明'],
          rows: [
            ['1. 请先填写「工序」，再填写「工艺路线」与「路线步骤」'],
            ['2. 路线步骤中的工序编码须在本文件工序 Sheet 或系统已有工序中存在'],
            ['3. 应用范围一期支持：全部产品'],
            ['4. 步骤序号为工序先后；并行行号表示同一步的并行工序（从 1 起）'],
            ['5. 校验通过的行直接入库；失败行写入错误信息文件'],
          ],
        },
      ],
      processRouteBundleImportDef.templateFileName(),
    )
  },

  async runImport(file) {
    const started = Date.now()
    const { sheets } = await parseExcelFile(file)
    const processRows = pickSheet(sheets, ['工序', '工序库'])
    const routeRows = pickSheet(sheets, ['工艺路线', '路线'])
    const stepAllRows = pickSheet(sheets, ['路线步骤', '步骤'])

    const successCount = { process: 0, route: 0 }
    const failRows = []
    const activeCats = getActiveCategoryNames()
    const fallbackCat = activeCats[0] || '机械'

    // 1) 工序
    processRows.forEach((row, index) => {
      const lineNo = index + 2
      const name = cellOf(row, '工序名称', '名称', 'name')
      const code = cellOf(row, '工序编码', '编码', 'code')
      const category = cellOf(row, '工序分类', '分类', 'category') || fallbackCat
      if (!name) {
        failRows.push({
          Sheet: '工序',
          关键键: code || `行${lineNo}`,
          工序编码: code,
          工序名称: name,
          工序分类: category,
          __error: `工序第${lineNo}行：工序名称为必填`,
        })
        return
      }
      if (code && getProcessByCode(code)) {
        failRows.push({
          Sheet: '工序',
          关键键: code,
          工序编码: code,
          工序名称: name,
          工序分类: category,
          __error: `工序第${lineNo}行：工序编码已存在`,
        })
        return
      }
      if (!activeCats.includes(category)) {
        failRows.push({
          Sheet: '工序',
          关键键: code || name,
          工序编码: code,
          工序名称: name,
          工序分类: category,
          __error: `工序第${lineNo}行：工序分类「${category}」不可用`,
        })
        return
      }
      const payload = {
        code,
        name,
        category,
        resourceType: resolveResourceType(cellOf(row, '资源类型'), category),
        position: cellOf(row, '岗位', 'position') || '机加工岗',
        reportMode: resolveReportMode(cellOf(row, '报工方式', 'reportMode')),
        taskExecutionMode: resolveTaskMode(cellOf(row, '任务执行方式')),
        remark: cellOf(row, '备注'),
        operations: { opStart: true, opFinish: true },
        defaultExecutors: [],
        defectItemIds: [],
      }
      const res = addProcessConfig(payload)
      if (!res.ok) {
        failRows.push({
          Sheet: '工序',
          关键键: code || name,
          工序编码: code,
          工序名称: name,
          工序分类: category,
          __error: `工序第${lineNo}行：${res.message}`,
        })
        return
      }
      successCount.process += 1
    })

    // 2) 按路线分组步骤
    const stepsByRoute = new Map()
    stepAllRows.forEach((row, index) => {
      const lineNo = index + 2
      const routeCode = cellOf(row, '路线编码', '工艺路线编码')
      const processCode = cellOf(row, '工序编码')
      const processName = cellOf(row, '工序名称')
      const stepNo = Number(cellOf(row, '步骤序号', '序号')) || 0
      const rowNo = Number(cellOf(row, '并行行号', '行号')) || 1
      if (!routeCode) {
        failRows.push({
          Sheet: '路线步骤',
          关键键: `行${lineNo}`,
          __error: `路线步骤第${lineNo}行：路线编码必填`,
        })
        return
      }
      if (!stepNo || stepNo < 1) {
        failRows.push({
          Sheet: '路线步骤',
          关键键: routeCode,
          __error: `路线步骤第${lineNo}行：步骤序号无效`,
        })
        return
      }
      const process =
        (processCode && getProcessByCode(processCode)) ||
        (processName && getProcessByName(processName))
      if (!process) {
        failRows.push({
          Sheet: '路线步骤',
          关键键: routeCode,
          工序编码: processCode,
          工序名称: processName,
          __error: `路线步骤第${lineNo}行：工序不存在（${processCode || processName || '空'}）`,
        })
        return
      }
      if (!stepsByRoute.has(routeCode)) stepsByRoute.set(routeCode, [])
      stepsByRoute.get(routeCode).push({
        stepNo,
        rowNo: Math.max(1, rowNo),
        processCode: process.code,
        processName: process.name,
      })
    })

    // 3) 工艺路线
    routeRows.forEach((row, index) => {
      const lineNo = index + 2
      const code = cellOf(row, '路线编码', '编码', 'code')
      const name = cellOf(row, '路线名称', '名称', 'name')
      if (!name) {
        failRows.push({
          Sheet: '工艺路线',
          关键键: code || `行${lineNo}`,
          __error: `工艺路线第${lineNo}行：路线名称必填`,
        })
        return
      }
      if (code && getProcessRouteByCode(code)) {
        failRows.push({
          Sheet: '工艺路线',
          关键键: code,
          __error: `工艺路线第${lineNo}行：路线编码已存在`,
        })
        return
      }
      const steps = stepsByRoute.get(code) || []
      if (!steps.length) {
        failRows.push({
          Sheet: '工艺路线',
          关键键: code || name,
          __error: `工艺路线第${lineNo}行：未找到对应路线步骤`,
        })
        return
      }
      const applyScope = cellOf(row, '应用范围') || '全部产品'
      if (applyScope !== '全部产品') {
        failRows.push({
          Sheet: '工艺路线',
          关键键: code || name,
          __error: `工艺路线第${lineNo}行：一期仅支持应用范围「全部产品」`,
        })
        return
      }
      const grid = buildProcessGrid(steps)
      const payload = {
        code: code || undefined,
        name,
        status: cellOf(row, '状态') || '使用中',
        applyScope: '全部产品',
        remark: cellOf(row, '备注'),
        grid,
      }
      const res = addProcessRoute(payload)
      if (!res.ok) {
        failRows.push({
          Sheet: '工艺路线',
          关键键: code || name,
          __error: `工艺路线第${lineNo}行：${res.message}`,
        })
        return
      }
      successCount.route += 1
    })

    const totalSuccess = successCount.process + successCount.route
    const durationSec = Math.max(1, Math.round((Date.now() - started) / 1000))
    const remark =
      failRows.length > 0
        ? `工序成功 ${successCount.process}，路线成功 ${successCount.route}，失败 ${failRows.length}。请下载附件查看错误说明。`
        : `工序成功 ${successCount.process}，路线成功 ${successCount.route}`

    const history = addImportExportHistory({
      taskType: '导入',
      module: processRouteBundleImportDef.moduleName,
      successCount: totalSuccess,
      failCount: failRows.length,
      durationSec,
      remark,
      errorRows: failRows,
      errorHeaders: ['Sheet', '关键键', '工序编码', '工序名称', '工序分类'],
      previewRows: processConfigState.processes.slice(0, 5).map((p) => ({
        工序编码: p.code,
        工序名称: p.name,
      })),
    })

    return {
      successCount: totalSuccess,
      failCount: failRows.length,
      failRows,
      durationSec,
      remark,
      historyId: history.id,
      detail: successCount,
      downloadErrors: () =>
        downloadErrorWorkbook(
          failRows,
          ['Sheet', '关键键', '工序编码', '工序名称', '工序分类'],
          processRouteBundleImportDef.errorFileName(),
        ),
    }
  },
}
