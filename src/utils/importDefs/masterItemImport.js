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
import { addProduct, generateProductCode, productInfoState } from '@/store/productInfoStore'
import { addMaterial, generateMaterialCode, materialInfoState } from '@/store/materialInfoStore'

const SHEET_NAME = '产品信息'
const HEADERS = [
  '物品类型',
  '编码',
  '名称',
  '规格型号',
  '材质',
  '图号',
  '类别',
  '产品属性',
  '物料类型',
  '供应型态',
  '库存单位',
  '标准单价',
  '重量',
  '技术参数',
  '配套要求',
  '默认工作中心',
  '默认采购供应商',
  '默认外协供应商',
  '备注',
]

const SAMPLE_ROWS = [
  [
    '产品',
    'CP260IMPORT01',
    '导入演示泵',
    'ISG50-160',
    '钢',
    'TZ-9001',
    '离心泵',
    '标准产品',
    '零部件',
    '自制件',
    '台',
    '1280',
    '12.5',
    'Q=50 H=32',
    '',
    '默认工厂',
    '',
    '',
    '模板示例，可删',
  ],
  [
    '物料',
    '010049901',
    '导入演示轴承',
    '6205',
    '',
    '',
    '轴承',
    '',
    '零部件',
    '外购件',
    '个',
    '35',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
]

function codeExists(code) {
  if (!code) return false
  const inProduct = productInfoState.products.some((p) => p.code === code)
  const inMaterial = materialInfoState.materials.some((m) => m.code === code)
  return inProduct || inMaterial
}

function resolveKind(raw) {
  const text = String(raw || '').trim()
  if (['物料', '材料', 'material'].includes(text.toLowerCase()) || text === '物料')
    return 'material'
  if (['产品物料', '产品+物料'].includes(text)) return 'both'
  return 'product'
}

function toNumber(val, fallback = 0) {
  if (val === '' || val == null) return fallback
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

function buildRecord(row, kind) {
  const code = cellOf(row, '编码', '产品编号', '物料编码', 'code')
  const name = cellOf(row, '名称', '产品名称', '物料名称', 'name')
  const now = dayjs().format('YYYY-MM-DD')
  const base = {
    code: code || undefined,
    name,
    specModel: cellOf(row, '规格型号', 'specModel'),
    material: cellOf(row, '材质', 'material'),
    drawingNo: cellOf(row, '图号', 'drawingNo'),
    categoryName: cellOf(row, '类别', 'categoryName'),
    productAttribute: cellOf(row, '产品属性', 'productAttribute') || '标准产品',
    materialType: cellOf(row, '物料类型', 'materialType') || '零部件',
    supplyForm:
      cellOf(row, '供应型态', 'supplyForm') || (kind === 'material' ? '外购件' : '自制件'),
    inventoryUnit: cellOf(row, '库存单位', 'inventoryUnit') || '件',
    unitPrice: toNumber(cellOf(row, '标准单价', 'unitPrice')),
    weight: toNumber(cellOf(row, '重量', 'weight')),
    techParams: cellOf(row, '技术参数', 'techParams'),
    matchingRequirements: cellOf(row, '配套要求', 'matchingRequirements'),
    remark: cellOf(row, '备注', 'remark'),
    production: {
      defaultWorkCenter: cellOf(row, '默认工作中心') || '默认工厂',
      defaultSupplier: cellOf(row, '默认采购供应商', '默认供应商'),
      defaultOutsourceSupplier: cellOf(row, '默认外协供应商'),
      defaultProcessRoute: '',
    },
    isProductMaterial: kind === 'both',
    canSell: kind !== 'material',
    canPurchase: kind !== 'product',
    creator: '导入',
    createdAt: now,
    updatedAt: now,
  }
  return base
}

export const masterItemImportDef = {
  moduleKey: 'master-item',
  moduleName: '产品信息',
  templateFileName: () => buildImportFileName('产品信息导入模板'),
  errorFileName: () => buildImportFileName('产品信息导入错误'),
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
            ['1. 物品类型填写：产品 / 物料 / 产品物料'],
            ['2. 编码留空时系统自动生成；若填写则不可与现有编码重复'],
            ['3. 名称为必填'],
            ['4. 校验通过的行直接入库；失败行写入错误信息文件'],
          ],
        },
      ],
      masterItemImportDef.templateFileName(),
    )
  },

  async runImport(file) {
    const started = Date.now()
    const { sheets } = await parseExcelFile(file)
    const rows = pickSheet(sheets, [SHEET_NAME, 'Sheet1'])
    const successRows = []
    const failRows = []

    rows.forEach((row, index) => {
      const lineNo = index + 2
      const name = cellOf(row, '名称', '产品名称', '物料名称', 'name')
      const code = cellOf(row, '编码', '产品编号', '物料编码', 'code')
      const kindRaw = cellOf(row, '物品类型', '类型', 'itemKind')
      if (!name) {
        failRows.push({ ...row, __error: `第${lineNo}行：名称为必填` })
        return
      }
      if (code && codeExists(code)) {
        failRows.push({ ...row, __error: `第${lineNo}行：编码已存在` })
        return
      }
      const kind = resolveKind(kindRaw)
      try {
        const payload = buildRecord(row, kind)
        if (kind === 'material') {
          if (!payload.code) payload.code = generateMaterialCode()
          addMaterial(payload)
        } else {
          if (!payload.code) payload.code = generateProductCode()
          addProduct(payload)
        }
        successRows.push(payload)
      } catch (err) {
        failRows.push({ ...row, __error: `第${lineNo}行：${err?.message || '写入失败'}` })
      }
    })

    const durationSec = Math.max(1, Math.round((Date.now() - started) / 1000))
    const remark =
      failRows.length > 0
        ? `成功 ${successRows.length} 条，失败 ${failRows.length} 条。请下载附件查看错误说明。`
        : `成功导入 ${successRows.length} 条`

    const history = addImportExportHistory({
      taskType: '导入',
      module: masterItemImportDef.moduleName,
      successCount: successRows.length,
      failCount: failRows.length,
      durationSec,
      remark,
      errorRows: failRows,
      errorHeaders: HEADERS,
      previewRows: successRows.slice(0, 20).map((r) => ({
        编码: r.code,
        名称: r.name,
      })),
    })

    return {
      successCount: successRows.length,
      failCount: failRows.length,
      failRows,
      durationSec,
      remark,
      historyId: history.id,
      downloadErrors: () =>
        downloadErrorWorkbook(failRows, HEADERS, masterItemImportDef.errorFileName()),
    }
  },
}
