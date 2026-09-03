/**
 * 质检任务 mock（来料质检等）
 */
import dayjs from 'dayjs'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import {
  cloneUniversalSystemTemplateFields,
  QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
} from '@/mock/qcSystemTemplateFields'
import { mockQcTemplates } from '@/mock/qcTemplates'

const SYSTEM_FIELDS = () =>
  cloneUniversalSystemTemplateFields().map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
  }))

function cloneFields(fields = []) {
  return (fields || []).map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
    optionResults: f.optionResults ? { ...f.optionResults } : undefined,
  }))
}

function findTpl(code) {
  return mockQcTemplates.find((t) => t.code === code) || null
}

function lineWithTemplate(partial = {}, templateCode) {
  const tpl = findTpl(templateCode)
  const fields = tpl ? cloneFields(tpl.fields) : SYSTEM_FIELDS()
  const methodField = fields.find((f) => f.code === 'QC_INSPECT_METHOD')
  return line({
    ...partial,
    templateId: tpl?.id || '',
    templateCode: tpl?.code || QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
    templateName: tpl?.name || '系统通用模板',
    templateFields: fields,
    inspectMethod: partial.inspectMethod || methodField?.defaultValue || '抽检',
  })
}

function line(partial = {}) {
  return {
    id: partial.id || `qtl-mock-${Math.random().toString(36).slice(2, 8)}`,
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    productCode: partial.productCode || partial.itemCode || '',
    productName: partial.productName || partial.itemName || '',
    specModel: partial.specModel || '',
    material: partial.material || '',
    variantSummary: partial.variantSummary || '',
    unit: partial.unit || '件',
    purchaseQty: partial.purchaseQty,
    receiptQty: partial.receiptQty ?? partial.inspectQty ?? 0,
    inspectQty: partial.inspectQty ?? partial.receiptQty ?? 0,
    inspectMethod: partial.inspectMethod || '',
    receivingWarehouse: partial.receivingWarehouse || '',
    sourceLineId: partial.sourceLineId || '',
    lineQcResult: partial.lineQcResult || '',
    treatmentPlan: partial.treatmentPlan || '',
    fieldValues: Array.isArray(partial.fieldValues) ? [...partial.fieldValues] : [],
    templateId: partial.templateId || '',
    templateCode: partial.templateCode || '',
    templateName: partial.templateName || '',
    ...partial,
    templateFields: Array.isArray(partial.templateFields)
      ? cloneFields(partial.templateFields)
      : partial.templateFields || [],
  }
}

function task(partial = {}) {
  const bizScope = partial.bizScope || '来料质检'
  const lineItems = Array.isArray(partial.lineItems) ? partial.lineItems.map((l) => line(l)) : []
  const names = [...new Set(lineItems.map((l) => l.templateName).filter(Boolean))]
  const multiTemplate = names.length > 1
  const fields = Array.isArray(partial.templateFields)
    ? partial.templateFields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }))
    : multiTemplate
      ? []
      : lineItems[0]?.templateFields?.length
        ? cloneFields(lineItems[0].templateFields)
        : SYSTEM_FIELDS()
  return {
    id: partial.id,
    qcNo: partial.qcNo,
    bizScope,
    qcStatus: partial.qcStatus || '待质检',
    qcResult: partial.qcResult || '',
    multiTemplate: partial.multiTemplate != null ? partial.multiTemplate : multiTemplate,
    templateId:
      partial.templateId || (multiTemplate ? '' : lineItems[0]?.templateId || 'qct-sys-universal'),
    templateCode:
      partial.templateCode ||
      (multiTemplate
        ? [...new Set(lineItems.map((l) => l.templateCode).filter(Boolean))].join('、')
        : lineItems[0]?.templateCode || QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE),
    templateName:
      partial.templateName ||
      (multiTemplate ? '多模板' : lineItems[0]?.templateName || '系统通用模板'),
    gatePolicy: partial.gatePolicy || 'hard',
    inspectMethod: partial.inspectMethod || (multiTemplate ? '' : '抽检'),
    inspectDate: partial.inspectDate || dayjs().format('YYYY-MM-DD'),
    sourceType: partial.sourceType || 'purchase_receipt',
    sourceDocNo: partial.sourceDocNo || '',
    sourceDocId: partial.sourceDocId || '',
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    specModel: partial.specModel || '',
    unit: partial.unit || '件',
    supplier: partial.supplier || '',
    inboundOrderNo: partial.inboundOrderNo || '',
    inboundOrderId: partial.inboundOrderId || '',
    inboundOrderIds: Array.isArray(partial.inboundOrderIds) ? [...partial.inboundOrderIds] : [],
    entryChannel: partial.entryChannel || '',
    inspector: partial.inspector || '',
    inspectedAt: partial.inspectedAt || '',
    creator: partial.creator || 'admin1',
    remark: partial.remark || '',
    treatmentPlan: partial.treatmentPlan || '',
    lineItems,
    templateFields: fields,
    createdAt: partial.createdAt || '2026-08-28 10:00:00',
    updatedAt: partial.updatedAt || partial.createdAt || '2026-08-28 10:00:00',
  }
}

/** 来料质检演示单据 */
export const mockIncomingQcTasks = [
  task({
    id: 'qctask-ll-1',
    qcNo: 'LLZJ202608280001',
    qcStatus: '待质检',
    sourceDocNo: 'CGSH-260820-003',
    sourceDocId: 'prct-mock-sh-1',
    supplier: '多功能供应商01',
    creator: 'admin1',
    itemCode: 'MJ-MF-001',
    itemName: '机械密封件',
    specModel: 'Φ45',
    unit: '套',
    remark: '急料，优先检验',
    createdAt: '2026-08-28 09:20:00',
    updatedAt: '2026-08-28 09:20:00',
    lineItems: [
      lineWithTemplate(
        {
          id: 'qtl-ll-1-1',
          sourceLineId: 'prct-mock-sh-1-l1',
          itemCode: 'MJ-MF-001',
          itemName: '机械密封件',
          specModel: 'Φ45',
          material: '碳化硅',
          unit: '套',
          purchaseQty: 30,
          receiptQty: 20,
          inspectQty: 20,
          receivingWarehouse: '原材料仓',
        },
        'QCT-USR-LL-001',
      ),
      lineWithTemplate(
        {
          id: 'qtl-ll-1-2',
          sourceLineId: 'prct-mock-sh-1-l2',
          itemCode: 'ZC-6312',
          itemName: '轴承 6312',
          specModel: '6312-2RS',
          material: 'GCr15',
          unit: '件',
          purchaseQty: 50,
          receiptQty: 40,
          inspectQty: 40,
          receivingWarehouse: '原材料仓',
        },
        'QCT-USR-LL-002',
      ),
    ],
  }),
  task({
    id: 'qctask-ll-2',
    qcNo: 'LLZJ202608270002',
    qcStatus: '检验中',
    inspectMethod: '全检',
    sourceDocNo: 'CGSH-260819-011',
    sourceDocId: 'prct-mock-sh-2',
    supplier: '采购供应商A',
    creator: 'admin1',
    entryChannel: 'miniprogram',
    itemCode: 'OJ-50',
    itemName: 'O型圈',
    specModel: 'Φ50',
    unit: '件',
    inspector: '质检员A',
    remark: '',
    createdAt: '2026-08-27 14:10:00',
    updatedAt: '2026-08-27 16:40:00',
    lineItems: [
      lineWithTemplate(
        {
          id: 'qtl-ll-2-1',
          sourceLineId: 'prct-mock-sh-2-l1',
          itemCode: 'OJ-50',
          itemName: 'O型圈',
          specModel: 'Φ50',
          material: '丁腈橡胶',
          variantSummary: '材质:NBR',
          unit: '件',
          purchaseQty: 200,
          receiptQty: 200,
          inspectQty: 200,
          receivingWarehouse: '辅料仓',
          inspectMethod: '全检',
        },
        QC_SYSTEM_UNIVERSAL_TEMPLATE_CODE,
      ),
    ],
  }),
  task({
    id: 'qctask-ll-3',
    qcNo: 'LLZJ202608260003',
    qcStatus: '已完成',
    qcResult: QC_TASK_RESULT.PASS,
    inspectMethod: '抽检',
    sourceDocNo: 'CGSH-260807-016',
    sourceDocId: 'prct-2',
    supplier: '多功能供应商01',
    creator: '采购员李华',
    entryChannel: 'web',
    inboundOrderNo: '',
    inboundOrderId: '',
    itemCode: 'FL-DN50',
    itemName: '法兰 DN50',
    specModel: 'DN50-PN16',
    unit: '片',
    inspector: '质检员B',
    inspectedAt: '2026-08-26 11:30:00',
    createdAt: '2026-08-26 08:50:00',
    updatedAt: '2026-08-26 11:30:00',
    lineItems: [
      line({
        id: 'qtl-ll-3-1',
        sourceLineId: 'prct-2-l1',
        itemCode: 'FL-DN50',
        itemName: '法兰 DN50',
        specModel: 'DN50-PN16',
        material: '304',
        unit: '片',
        purchaseQty: 80,
        receiptQty: 100,
        inspectQty: 16,
        receivingWarehouse: '原材料仓',
        lineQcResult: QC_TASK_RESULT.PASS,
      }),
    ],
  }),
  task({
    id: 'qctask-ll-4',
    qcNo: 'LLZJ202608250004',
    qcStatus: '已完成',
    qcResult: QC_TASK_RESULT.FAIL,
    inspectMethod: '全检',
    sourceDocNo: 'CGSH-260817-002',
    sourceDocId: 'prct-mock-sh-4',
    supplier: '铸造件供应商B',
    creator: 'admin1',
    entryChannel: 'miniprogram',
    itemCode: 'ZG-HT200',
    itemName: '铸铁泵体毛坯',
    specModel: 'IS80-65-160',
    unit: '件',
    inspector: '质检员A',
    inspectedAt: '2026-08-25 17:05:00',
    treatmentPlan: '退货',
    remark: '气孔超标',
    createdAt: '2026-08-25 10:00:00',
    updatedAt: '2026-08-25 17:05:00',
    lineItems: [
      line({
        id: 'qtl-ll-4-1',
        sourceLineId: 'prct-mock-sh-4-l1',
        itemCode: 'ZG-HT200',
        itemName: '铸铁泵体毛坯',
        specModel: 'IS80-65-160',
        material: 'HT200',
        unit: '件',
        purchaseQty: 12,
        receiptQty: 12,
        inspectQty: 12,
        receivingWarehouse: '毛坯仓',
        lineQcResult: QC_TASK_RESULT.FAIL,
        treatmentPlan: '退货',
      }),
    ],
  }),
  task({
    id: 'qctask-ll-5',
    qcNo: 'LLZJ202608240005',
    qcStatus: '已完成',
    qcResult: QC_TASK_RESULT.PARTIAL,
    inspectMethod: '抽检',
    sourceDocNo: 'CGSH-260816-009',
    sourceDocId: 'prct-mock-sh-5',
    supplier: '标准件供应商C',
    creator: '采购员王芳',
    entryChannel: 'web',
    inboundOrderNo: 'CGRK-260824-008',
    itemCode: 'DX-18',
    itemName: '螺栓 M18',
    specModel: 'M18×60',
    unit: '件',
    inspector: '质检员C',
    inspectedAt: '2026-08-24 15:20:00',
    treatmentPlan: '让步接收',
    remark: '部分批次表面锈蚀，让步入库',
    createdAt: '2026-08-24 09:15:00',
    updatedAt: '2026-08-24 15:20:00',
    lineItems: [
      line({
        id: 'qtl-ll-5-1',
        sourceLineId: 'prct-mock-sh-5-l1',
        itemCode: 'DX-18',
        itemName: '螺栓 M18',
        specModel: 'M18×60',
        material: '8.8级',
        unit: '件',
        purchaseQty: 500,
        receiptQty: 500,
        inspectQty: 50,
        receivingWarehouse: '标准件仓',
        lineQcResult: QC_TASK_RESULT.PASS,
      }),
      line({
        id: 'qtl-ll-5-2',
        sourceLineId: 'prct-mock-sh-5-l2',
        itemCode: 'DX-16',
        itemName: '螺栓 M16',
        specModel: 'M16×50',
        material: '8.8级',
        unit: '件',
        purchaseQty: 300,
        receiptQty: 300,
        inspectQty: 30,
        receivingWarehouse: '标准件仓',
        lineQcResult: QC_TASK_RESULT.FAIL,
        treatmentPlan: '让步接收',
      }),
    ],
  }),
  task({
    id: 'qctask-ll-6',
    qcNo: 'LLZJ202608230006',
    qcStatus: '已终止',
    sourceDocNo: 'CGSH-260815-001',
    sourceDocId: 'prct-mock-sh-6',
    supplier: '钢材供应商D',
    creator: 'admin1',
    itemCode: 'YG-20',
    itemName: '圆钢 Φ20',
    specModel: 'Φ20×6000',
    unit: '根',
    remark: '收货单作废，质检单同步终止',
    createdAt: '2026-08-23 11:00:00',
    updatedAt: '2026-08-23 13:40:00',
    lineItems: [
      line({
        id: 'qtl-ll-6-1',
        sourceLineId: 'prct-mock-sh-6-l1',
        itemCode: 'YG-20',
        itemName: '圆钢 Φ20',
        specModel: 'Φ20×6000',
        material: '45#',
        unit: '根',
        purchaseQty: 40,
        receiptQty: 40,
        inspectQty: 40,
        receivingWarehouse: '钢材仓',
      }),
    ],
  }),
]

export function cloneMockIncomingQcTasks() {
  return JSON.parse(JSON.stringify(mockIncomingQcTasks))
}
