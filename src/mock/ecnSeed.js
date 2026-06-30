import { mockProducts } from '@/mock/productInfo'
import {
  ECN_STATUS,
  ECN_TYPE,
  ECN_URGENCY,
  ECN_WIP_HANDLING,
  ECN_CHANGE_REASON,
  ECN_ORIGIN_TYPE,
  ECN_CHANGE_ITEM_TYPE,
} from '@/constants/ecn'
import { getActiveBomForItem } from '@/store/productBomStore'

function productByKeyword(keyword) {
  return mockProducts.find((p) => p.name.includes(keyword)) || mockProducts[0]
}

function recordsFromFlow(flow = []) {
  return flow
    .filter((s) => s.status === '已通过' || s.status === '已驳回')
    .map((s) => ({
      role: s.role,
      name: s.name,
      result: s.status,
      opinion: s.opinion || (s.status === '已通过' ? '同意' : ''),
      time: s.time,
    }))
}

function resolveReviewer(approvalFlow = [], approvalRecords = [], status) {
  if (approvalRecords.length) {
    const last = approvalRecords[approvalRecords.length - 1]
    return { reviewer: last.name, reviewTime: last.time }
  }
  if (!approvalFlow.length) return { reviewer: '', reviewTime: '' }
  if (status === ECN_STATUS.REJECTED) {
    const rejected = approvalFlow.find((s) => s.status === '已驳回')
    return { reviewer: rejected?.name || '', reviewTime: rejected?.time || '' }
  }
  const passed = [...approvalFlow].reverse().find((s) => s.status === '已通过')
  if (passed) return { reviewer: passed.name, reviewTime: passed.time }
  const approving = approvalFlow.find((s) => s.status === '审批中')
  if (approving) return { reviewer: approving.name, reviewTime: '' }
  return { reviewer: '', reviewTime: '' }
}

function buildChangeItems(product, variant = 'modify-impeller') {
  const root = product.name
  if (variant === 'modify-impeller') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
        bomLineId: `${product.id}-impeller`,
        origMaterialCode: 'WL-IM-HT250',
        origMaterialName: '叶轮',
        origSpecModel: product.specModel || '—',
        origMaterial: 'HT250 铸铁',
        origDrawingNo: `DW-${product.code}-IM`,
        origUnitQty: 1,
        origProcessDoc: '机加工艺-叶轮',
        newMaterialCode: 'WL-IM-304',
        newMaterialName: '叶轮',
        newSpecModel: product.specModel || '—',
        newMaterial: '304 不锈钢',
        newDrawingNo: `DW-${product.code}-IM`,
        newUnitQty: 1,
        parentPath: `${root}/泵体总成`,
        parentMaterial: `${root}/泵体总成`,
        relatedProcesses: ['机加工'],
        changeNote: '材质由铸铁升级为不锈钢，同步调整切削参数',
      },
      {
        id: `${product.id}-ci-2`,
        changeType: ECN_CHANGE_ITEM_TYPE.REPLACE,
        bomLineId: `${product.id}-seal`,
        origMaterialCode: 'WL-SE-001',
        origMaterialName: '机械密封',
        origSpecModel: 'GHMB-35',
        origMaterial: '碳化硅/石墨',
        origDrawingNo: `DW-${product.code}-SE`,
        origUnitQty: 1,
        origProcessDoc: '装配工艺-密封',
        newMaterialCode: 'WL-SE-002',
        newMaterialName: '机械密封',
        newSpecModel: '58U-30',
        newMaterial: '碳化硅/石墨（耐腐型）',
        newDrawingNo: `DW-${product.code}-SE-V2`,
        newUnitQty: 1,
        parentPath: `${root}/泵体总成`,
        parentMaterial: `${root}/泵体总成`,
        relatedProcesses: ['总装'],
        changeNote: '配套不锈钢叶轮，密封件升级为耐腐型',
      },
    ]
  }
  if (variant === 'process-route') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
        bomLineId: `${product.id}-shaft`,
        origMaterialCode: 'WL-SH-45',
        origMaterialName: '泵轴',
        origSpecModel: '45#调质',
        origMaterial: '45#钢',
        origDrawingNo: `DW-${product.code}-SH`,
        origUnitQty: 1,
        origProcessDoc: '机加工艺-泵轴 V1.0',
        newMaterialCode: 'WL-SH-45',
        newMaterialName: '泵轴',
        newSpecModel: '45#调质',
        newMaterial: '45#钢',
        newDrawingNo: `DW-${product.code}-SH`,
        newUnitQty: 1,
        parentPath: `${root}/转子部件`,
        parentMaterial: `${root}/转子部件`,
        relatedProcesses: ['精车', '磨削'],
        changeNote: '精车工序增加一次磨削，工艺文件升级至 V1.1',
      },
    ]
  }
  if (variant === 'material-sub') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.REPLACE,
        bomLineId: `${product.id}-bearing`,
        origMaterialCode: 'WL-BR-6205',
        origMaterialName: '深沟球轴承',
        origSpecModel: '6205-2RS',
        origMaterial: 'GCr15',
        origDrawingNo: 'GB/T 276',
        origUnitQty: 2,
        origProcessDoc: '—',
        newMaterialCode: 'WL-BR-6205-SK',
        newMaterialName: '深沟球轴承',
        newSpecModel: '6205-2RS/SKF',
        newMaterial: 'GCr15',
        newDrawingNo: 'GB/T 276',
        newUnitQty: 2,
        parentPath: `${root}/轴承体`,
        parentMaterial: `${root}/轴承体`,
        relatedProcesses: ['压装'],
        changeNote: '国产轴承替换为 SKF 进口件，提升运行稳定性',
      },
    ]
  }
  if (variant === 'drawing') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
        bomLineId: `${product.id}-casing`,
        origMaterialCode: 'WL-CS-001',
        origMaterialName: '泵体蜗壳',
        origSpecModel: product.specModel || '—',
        origMaterial: 'HT200',
        origDrawingNo: `DW-${product.code}-CS-V1.0`,
        origUnitQty: 1,
        origProcessDoc: '铸造工艺-泵体',
        newMaterialCode: 'WL-CS-001',
        newMaterialName: '泵体蜗壳',
        newSpecModel: product.specModel || '—',
        newMaterial: 'HT200',
        newDrawingNo: `DW-${product.code}-CS-V1.1`,
        newUnitQty: 1,
        parentPath: root,
        parentMaterial: root,
        relatedProcesses: ['铸造', '机加工'],
        changeNote: '流道优化，图纸版本 V1.0 → V1.1',
      },
    ]
  }
  if (variant === 'add-part') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.ADD,
        origMaterialCode: '',
        origMaterialName: '',
        origSpecModel: '',
        origMaterial: '',
        origDrawingNo: '',
        origUnitQty: null,
        origProcessDoc: '',
        newMaterialCode: 'WL-TH-001',
        newMaterialName: '温度传感器',
        newSpecModel: 'PT100',
        newMaterial: '304',
        newDrawingNo: 'DW-TH-001',
        newUnitQty: 1,
        parentPath: `${root}/电气附件`,
        parentMaterial: `${root}/电气附件`,
        relatedProcesses: ['电气装配'],
        changeNote: '新增温度监测点，便于远程运维',
      },
    ]
  }
  if (variant === 'remove-part') {
    return [
      {
        id: `${product.id}-ci-1`,
        changeType: ECN_CHANGE_ITEM_TYPE.REMOVE,
        bomLineId: `${product.id}-spacer`,
        origMaterialCode: 'WL-SP-001',
        origMaterialName: '调整垫片',
        origSpecModel: '0.5mm',
        origMaterial: 'Q235',
        origDrawingNo: `DW-${product.code}-SP`,
        origUnitQty: 4,
        origProcessDoc: '—',
        newMaterialCode: '',
        newMaterialName: '',
        newSpecModel: '',
        newMaterial: '',
        newDrawingNo: '',
        newUnitQty: null,
        parentPath: `${root}/联轴器组件`,
        parentMaterial: `${root}/联轴器组件`,
        relatedProcesses: ['装配'],
        changeNote: '结构优化后取消调整垫片',
      },
    ]
  }
  return []
}

function enrichRecord(record, index = 0) {
  const salesOrders = ['1-20260512-005', '1-20260601-018', '1-20260529-002', '1-20260528-001']
  const customers = ['淄博石化', '胜利油田', '华北水务', '山东钢铁']
  const workOrders = ['WO202605270-LH01', 'WO202605088', 'WO202605042', 'WO202604156']
  const approvalRecords = record.approvalRecords || recordsFromFlow(record.approvalFlow)
  const { reviewer, reviewTime } = resolveReviewer(
    record.approvalFlow,
    approvalRecords,
    record.status,
  )
  const activeBom = record.productId ? getActiveBomForItem('product', record.productId) : null
  return {
    salesOrderNo: salesOrders[index % salesOrders.length],
    customerName: customers[index % customers.length],
    workOrderNo: workOrders[index % workOrders.length],
    reviewer: record.reviewer ?? reviewer,
    reviewTime: record.reviewTime ?? reviewTime,
    approvalRecords,
    bomId: record.bomId || activeBom?.id || '',
    ...record,
  }
}

export function buildMockEcnRecords() {
  const p1 = productByKeyword('ISG50-160')
  const p2 = productByKeyword('CDL4-40')
  const p3 = productByKeyword('ISW80-65-200')
  const p4 = productByKeyword('QJ200-40')
  const p5 = productByKeyword('IRG100-160')
  const p6 = productByKeyword('ZX100-80-200')
  const p7 = productByKeyword('XBD10-65')
  const p8 = productByKeyword('CQ32-25-145')

  const raw = [
    {
      id: 'ecn-001',
      ecnNo: 'ECN-2024001',
      type: ECN_TYPE.BOM,
      productId: p1.id,
      productCode: p1.code,
      productName: p1.name,
      applicant: '张工',
      status: ECN_STATUS.APPROVING,
      createdAt: '2026-06-25 14:30',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.CUSTOMER,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '客户要求将叶轮材质从铸铁改为不锈钢，提高耐腐蚀性',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p1, 'modify-impeller'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '审批中', opinion: '', time: '' },
        { role: '生产主管', name: '李生产', status: '待审批', opinion: '', time: '' },
        { role: '质量主管', name: '赵质量', status: '待审批', opinion: '', time: '' },
      ],
      approvalRecords: [],
    },
    {
      id: 'ecn-002',
      ecnNo: 'ECN-2024002',
      type: ECN_TYPE.PROCESS,
      productId: p2.id,
      productCode: p2.code,
      productName: p2.name,
      applicant: '李工',
      status: ECN_STATUS.APPROVING,
      createdAt: '2026-06-24 10:15',
      urgency: ECN_URGENCY.URGENT,
      changeReason: ECN_CHANGE_REASON.DESIGN,
      originType: ECN_ORIGIN_TYPE.WORK_ORDER,
      description: '多级泵泵轴精加工工艺优化，提升表面粗糙度要求',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p2, 'process-route'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已通过', opinion: '同意，请同步更新工艺卡片', time: '2026-06-24 10:00' },
        { role: '生产主管', name: '李生产', status: '审批中', opinion: '', time: '' },
        { role: '质量主管', name: '赵质量', status: '待审批', opinion: '', time: '' },
      ],
      approvalRecords: [
        {
          role: '工艺主管',
          name: '王工艺',
          result: '已通过',
          opinion: '同意，请同步更新工艺卡片',
          time: '2026-06-24 10:00',
        },
      ],
    },
    {
      id: 'ecn-003',
      ecnNo: 'ECN-2024003',
      type: ECN_TYPE.MATERIAL,
      productId: p3.id,
      productCode: p3.code,
      productName: p3.name,
      applicant: '王工',
      status: ECN_STATUS.APPROVED,
      createdAt: '2026-06-23 09:20',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.DESIGN,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '轴承升级为进口 SKF 件，降低故障率',
      wipHandling: ECN_WIP_HANDLING.SWITCH_NOW,
      changeItems: buildChangeItems(p3, 'material-sub'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已通过', opinion: '同意', time: '2026-06-23 09:30' },
        { role: '生产主管', name: '李生产', status: '已通过', opinion: '同意，注意采购交期', time: '2026-06-23 11:00' },
        { role: '质量主管', name: '赵质量', status: '已通过', opinion: '同意变更', time: '2026-06-23 14:20' },
      ],
      approvalRecords: [
        { role: '工艺主管', name: '王工艺', result: '已通过', opinion: '同意', time: '2026-06-23 09:30' },
        { role: '生产主管', name: '李生产', result: '已通过', opinion: '同意，注意采购交期', time: '2026-06-23 11:00' },
        { role: '质量主管', name: '赵质量', result: '已通过', opinion: '同意变更', time: '2026-06-23 14:20' },
      ],
      reviewer: '赵质量',
      reviewTime: '2026-06-23 14:20',
    },
    {
      id: 'ecn-004',
      ecnNo: 'ECN-2024004',
      type: ECN_TYPE.DRAWING,
      productId: p4.id,
      productCode: p4.code,
      productName: p4.name,
      applicant: '赵工',
      status: ECN_STATUS.APPROVED,
      createdAt: '2026-06-22 16:40',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.DESIGN,
      originType: ECN_ORIGIN_TYPE.WORK_ORDER,
      description: '潜水电泵泵体流道优化，更新铸造图纸',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p4, 'drawing'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已通过', opinion: '同意', time: '2026-06-22 17:00' },
        { role: '生产主管', name: '李生产', status: '已通过', opinion: '同意', time: '2026-06-22 17:05' },
        { role: '质量主管', name: '赵质量', status: '已通过', opinion: '同意归档', time: '2026-06-22 17:10' },
      ],
      approvalRecords: [
        { role: '工艺主管', name: '王工艺', result: '已通过', opinion: '同意', time: '2026-06-22 17:00' },
        { role: '生产主管', name: '李生产', result: '已通过', opinion: '同意', time: '2026-06-22 17:05' },
        { role: '质量主管', name: '赵质量', result: '已通过', opinion: '同意归档', time: '2026-06-22 17:10' },
      ],
      reviewer: '赵质量',
      reviewTime: '2026-06-22 17:10',
    },
    {
      id: 'ecn-005',
      ecnNo: 'ECN-2024005',
      type: ECN_TYPE.BOM,
      productId: p5.id,
      productCode: p5.code,
      productName: p5.name,
      applicant: '孙工',
      status: ECN_STATUS.REJECTED,
      createdAt: '2026-06-21 11:00',
      urgency: ECN_URGENCY.CRITICAL,
      changeReason: ECN_CHANGE_REASON.DESIGN,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '取消联轴器调整垫片，简化装配结构',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p5, 'remove-part'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已驳回', opinion: '强度不足，不建议取消垫片', time: '2026-06-21 16:00' },
        { role: '生产主管', name: '李生产', status: '待审批', opinion: '', time: '' },
        { role: '质量主管', name: '赵质量', status: '待审批', opinion: '', time: '' },
      ],
      approvalRecords: [
        {
          role: '工艺主管',
          name: '王工艺',
          result: '已驳回',
          opinion: '强度不足，不建议取消垫片',
          time: '2026-06-21 16:00',
        },
      ],
      rejectReason: '强度不足，不建议取消垫片',
    },
    {
      id: 'ecn-006',
      ecnNo: 'ECN-2024006',
      type: ECN_TYPE.BOM,
      productId: p6.id,
      productCode: p6.code,
      productName: p6.name,
      applicant: '张工',
      status: ECN_STATUS.DRAFT,
      createdAt: '2026-06-26 09:00',
      urgency: ECN_URGENCY.URGENT,
      changeReason: ECN_CHANGE_REASON.CUSTOMER,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '客户要求增加温度监测功能',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p6, 'add-part'),
      approvalFlow: [],
      approvalRecords: [],
    },
    {
      id: 'ecn-007',
      ecnNo: 'ECN-2024007',
      type: ECN_TYPE.PROCESS,
      productId: p7.id,
      productCode: p7.code,
      productName: p7.name,
      applicant: '李工',
      status: ECN_STATUS.DRAFT,
      createdAt: '2026-06-26 11:20',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.DESIGN,
      originType: ECN_ORIGIN_TYPE.WORK_ORDER,
      description: '消防泵试压工序增加保压时间记录',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p7, 'process-route'),
      approvalFlow: [],
      approvalRecords: [],
    },
    {
      id: 'ecn-008',
      ecnNo: 'ECN-2024008',
      type: ECN_TYPE.MATERIAL,
      productId: p8.id,
      productCode: p8.code,
      productName: p8.name,
      applicant: '王工',
      status: ECN_STATUS.APPROVED,
      createdAt: '2026-06-20 08:30',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.CUSTOMER,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '耐腐蚀泵叶轮材质升级，满足化工介质要求',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p8, 'modify-impeller'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已通过', opinion: '同意', time: '2026-06-20 09:00' },
        { role: '生产主管', name: '李生产', status: '已通过', opinion: '同意', time: '2026-06-20 10:30' },
        { role: '质量主管', name: '赵质量', status: '已通过', opinion: '同意', time: '2026-06-20 15:00' },
      ],
      approvalRecords: [
        { role: '工艺主管', name: '王工艺', result: '已通过', opinion: '同意', time: '2026-06-20 09:00' },
        { role: '生产主管', name: '李生产', result: '已通过', opinion: '同意', time: '2026-06-20 10:30' },
        { role: '质量主管', name: '赵质量', result: '已通过', opinion: '同意', time: '2026-06-20 15:00' },
      ],
      reviewer: '赵质量',
      reviewTime: '2026-06-20 15:00',
    },
    {
      id: 'ecn-009',
      ecnNo: 'ECN-2024009',
      type: ECN_TYPE.BOM,
      productId: p1.id,
      productCode: p1.code,
      productName: p1.name,
      applicant: '张工',
      status: ECN_STATUS.EXECUTED,
      createdAt: '2026-06-18 10:00',
      executedAt: '2026-06-19 16:30',
      executor: '张工',
      urgency: ECN_URGENCY.NORMAL,
      changeReason: ECN_CHANGE_REASON.CUSTOMER,
      originType: ECN_ORIGIN_TYPE.SALES_ORDER,
      description: '叶轮材质 HT200 升级为 304不锈钢，机加工切削参数同步调整',
      wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
      changeItems: buildChangeItems(p1, 'modify-impeller'),
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '已通过', opinion: '同意', time: '2026-06-18 11:00' },
        { role: '生产主管', name: '李生产', status: '已通过', opinion: '同意', time: '2026-06-18 14:00' },
        { role: '质量主管', name: '赵质量', status: '已通过', opinion: '同意', time: '2026-06-18 16:00' },
      ],
      approvalRecords: [
        { role: '工艺主管', name: '王工艺', result: '已通过', opinion: '同意', time: '2026-06-18 11:00' },
        { role: '生产主管', name: '李生产', result: '已通过', opinion: '同意', time: '2026-06-18 14:00' },
        { role: '质量主管', name: '赵质量', result: '已通过', opinion: '同意', time: '2026-06-18 16:00' },
      ],
      reviewer: '赵质量',
      reviewTime: '2026-06-18 16:00',
    },
  ]

  return raw.map((row, index) =>
    enrichRecord(
      {
        approvalStep: 0,
        approvalTotal: 3,
        reason: row.description || row.changeReason,
        relatedProcess: '',
        notifyDepartments: true,
        impact: { products: 1, bomLines: row.changeItems?.length || 1, wipOrders: 2, inventoryWarnings: 0 },
        attachments: [],
        updateItems: [],
        wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
        rejectReason: '',
        ...row,
      },
      index,
    ),
  )
}
