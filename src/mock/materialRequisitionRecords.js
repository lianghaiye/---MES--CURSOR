/** 库存扣减执行记录（演示种子） */

export const MATERIAL_DEDUCT_STATUS = {
  SUCCESS: '成功',
  FAILED: '失败',
  PARTIAL: '部分成功',
  VOIDED: '已作废',
  PENDING: '待确认',
  /** 领料展示行：同单展示但不在本单扣库存 */
  SKIPPED: '无需扣减',
}

export const MATERIAL_DEDUCT_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待确认', value: MATERIAL_DEDUCT_STATUS.PENDING },
  { label: '成功', value: MATERIAL_DEDUCT_STATUS.SUCCESS },
  { label: '部分成功', value: MATERIAL_DEDUCT_STATUS.PARTIAL },
  { label: '失败', value: MATERIAL_DEDUCT_STATUS.FAILED },
  { label: '无需扣减', value: MATERIAL_DEDUCT_STATUS.SKIPPED },
  { label: '已作废', value: MATERIAL_DEDUCT_STATUS.VOIDED },
]

/** 兼容旧种子/缓存中的状态文案 */
export function normalizeMaterialDeductStatus(status) {
  if (status === '待扣减') return MATERIAL_DEDUCT_STATUS.PENDING
  if (status === '已撤销') return MATERIAL_DEDUCT_STATUS.VOIDED
  return status
}

/** 领料方式：用于库存扣减记录区分工单号 / 领料单号展示 */
export const MATERIAL_DEDUCT_REQ_MODES = {
  WORK_ORDER: 'work-order',
  QUICK: 'quick',
  SALES_ORDER: 'sales-order',
  BATCH: 'batch-work-order',
}

/** 扣减来源：列表筛选 / 展示 */
export const MATERIAL_DEDUCT_SOURCES = {
  WORK_ORDER: 'work_order',
  QUICK: 'quick',
  BACKFLUSH: 'backflush',
  MANUAL: 'manual',
}

export const MATERIAL_DEDUCT_SOURCE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '工单', value: MATERIAL_DEDUCT_SOURCES.WORK_ORDER },
  { label: '快速领料', value: MATERIAL_DEDUCT_SOURCES.QUICK },
  { label: '倒冲（历史）', value: MATERIAL_DEDUCT_SOURCES.BACKFLUSH },
  { label: '手工', value: MATERIAL_DEDUCT_SOURCES.MANUAL },
]

export const MATERIAL_DEDUCT_SOURCE_LABELS = {
  [MATERIAL_DEDUCT_SOURCES.WORK_ORDER]: '工单',
  [MATERIAL_DEDUCT_SOURCES.QUICK]: '快速领料',
  [MATERIAL_DEDUCT_SOURCES.BACKFLUSH]: '倒冲',
  [MATERIAL_DEDUCT_SOURCES.MANUAL]: '手工',
}

export function resolveDeductSource(record) {
  if (!record) return MATERIAL_DEDUCT_SOURCES.WORK_ORDER
  if (record.deductSource) return record.deductSource
  if (isQuickMaterialDeduct(record)) return MATERIAL_DEDUCT_SOURCES.QUICK
  return MATERIAL_DEDUCT_SOURCES.WORK_ORDER
}

export function resolveDeductSourceLabel(record) {
  return MATERIAL_DEDUCT_SOURCE_LABELS[resolveDeductSource(record)] || '工单'
}

export function isQuickMaterialDeduct(record) {
  return record?.requisitionMode === MATERIAL_DEDUCT_REQ_MODES.QUICK || record?.mode === 'quick'
}

export function isBackflushDeduct(record) {
  return resolveDeductSource(record) === MATERIAL_DEDUCT_SOURCES.BACKFLUSH
}

/** 列表/详情主单号：快速领料展示领料单号，其余展示工单号 */
export function resolveInventoryDeductDocNo(record) {
  if (!record) return ''
  if (isQuickMaterialDeduct(record)) {
    return record.reqNo || record.requisitionNo || record.workOrderNo || ''
  }
  return record.workOrderNo || record.reqNo || ''
}

function line(
  id,
  code,
  name,
  planQty,
  actualQty,
  status,
  failReason = '',
  warehouseStockQty = 999,
  extra = {},
) {
  const isBackflush = Boolean(extra.isBackflush || extra.issueMode === '倒冲')
  const issueMode = extra.issueMode || (isBackflush ? '倒冲' : '领料')
  return {
    id,
    materialCode: code,
    materialName: name,
    specModel: extra.specModel ?? '',
    material: extra.material ?? '',
    drawingNo: extra.drawingNo ?? '',
    variantSummary: extra.variantSummary ?? '',
    variantValues: extra.variantValues ? { ...extra.variantValues } : {},
    blankSize: extra.blankSize ?? null,
    blankSizeText: extra.blankSizeText ?? '',
    blankSizeMode: extra.blankSizeMode ?? '',
    isBackflush,
    issueMode,
    deductible: extra.deductible != null ? Boolean(extra.deductible) : true,
    planQty,
    actualQty,
    status,
    failReason,
    warehouseStockQty,
  }
}

export function createMaterialRequisitionSeed() {
  const S = MATERIAL_DEDUCT_STATUS
  return [
    {
      id: 'dr-001',
      workOrderNo: 'WO-2026-0720-031',
      deductNo: 'DR-20260720-001',
      productName: '离心泵',
      productSpec: 'KQ100-200',
      material: 'HT250',
      drawingNo: 'DWG-KQ100-200',
      reportQty: 10,
      deductTime: '2026-07-20 09:15:32',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 6,
      materialTotal: 6,
      status: S.SUCCESS,
      stockPhase: 'actual',
      lines: [
        line('dr-001-1', 'M-001', '泵体铸件', 10, 10, S.SUCCESS, '', 999, {
          specModel: 'HT250',
          material: 'HT250',
          drawingNo: 'DWG-PB-001',
          variantSummary: '口径 DN100',
        }),
        line('dr-001-2', 'M-002', '叶轮', 10, 10, S.SUCCESS, '', 999, {
          specModel: 'φ280',
          material: 'ZG230-450',
          drawingNo: 'DWG-YL-002',
          variantSummary: '闭式叶轮',
        }),
        line('dr-001-3', 'M-003', '机械密封', 10, 10, S.SUCCESS, '', 999, {
          specModel: '104-55',
          material: '碳化硅',
          drawingNo: 'DWG-MF-003',
        }),
        line('dr-001-4', 'M-004', '轴承 6308', 20, 20, S.SUCCESS, '', 999, {
          specModel: '6308',
          material: 'GCr15',
          drawingNo: 'DWG-ZC-004',
        }),
        line('dr-001-5', 'M-005', '轴', 10, 10, S.SUCCESS, '', 999, {
          specModel: 'φ45×480',
          material: '45#钢',
          drawingNo: 'DWG-ZHOU-005',
          blankSizeMode: 'length',
          blankSize: { length: 480, lengthUnit: 'mm' },
          blankSizeText: '长 480 mm',
        }),
        line('dr-001-6', 'M-006', '联轴器', 10, 10, S.SUCCESS, '', 999, {
          specModel: 'ML3',
          material: '45#钢',
          drawingNo: 'DWG-LZQ-006',
        }),
      ],
    },
    {
      id: 'dr-002',
      workOrderNo: 'WO-2026-0720-028',
      deductNo: 'DR-20260720-002',
      productName: '排污泵',
      productSpec: 'WQ80-15',
      material: 'QT450',
      drawingNo: 'DWG-WQ80-15',
      reportQty: 5,
      deductTime: '2026-07-20 10:22:18',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 4,
      materialTotal: 4,
      status: S.SUCCESS,
      stockPhase: 'actual',
      lines: [
        line('dr-002-1', 'M-011', '泵壳', 5, 5, S.SUCCESS, '', 999, {
          specModel: 'M-011',
          material: 'HT250',
          drawingNo: 'DWG-M-011',
        }),
        line('dr-002-2', 'M-012', '切割叶轮', 5, 5, S.SUCCESS, '', 999, {
          specModel: 'M-012',
          material: 'HT250',
          drawingNo: 'DWG-M-012',
        }),
        line('dr-002-3', 'M-013', '电机座', 5, 5, S.SUCCESS, '', 999, {
          specModel: 'M-013',
          material: 'HT250',
          drawingNo: 'DWG-M-013',
        }),
        line('dr-002-4', 'M-014', '电缆组件', 5, 5, S.SUCCESS, '', 999, {
          specModel: 'M-014',
          material: 'HT250',
          drawingNo: 'DWG-M-014',
        }),
      ],
    },
    {
      id: 'dr-003',
      workOrderNo: 'WO-2026-0719-055',
      deductNo: 'DR-20260719-018',
      productName: '多级泵',
      productSpec: 'DL100-20',
      material: 'ZG230-450',
      drawingNo: 'DWG-DL100-20',
      reportQty: 8,
      deductTime: '2026-07-19 16:40:05',
      warehouseName: '半成品仓',
      warehouseCode: 'WH-02',
      materialDone: 3,
      materialTotal: 5,
      status: S.FAILED,
      stockPhase: 'actual',
      lines: [
        line('dr-003-1', 'M-021', '中段', 8, 8, S.SUCCESS, '', 999, {
          specModel: 'M-021',
          material: 'HT250',
          drawingNo: 'DWG-M-021',
        }),
        line('dr-003-2', 'M-022', '导叶', 16, 16, S.SUCCESS, '', 999, {
          specModel: 'M-022',
          material: 'HT250',
          drawingNo: 'DWG-M-022',
        }),
        line('dr-003-3', 'M-023', '平衡盘', 8, 8, S.SUCCESS, '', 999, {
          specModel: 'M-023',
          material: 'HT250',
          drawingNo: 'DWG-M-023',
        }),
        line('dr-003-4', 'M-024', '密封环', 16, 0, S.FAILED, '库存不足', 0, {
          specModel: 'M-024',
          material: 'HT250',
          drawingNo: 'DWG-M-024',
        }),
        line('dr-003-5', 'M-025', '轴套', 8, 0, S.FAILED, '库存不足', 0, {
          specModel: 'M-025',
          material: 'HT250',
          drawingNo: 'DWG-M-025',
        }),
      ],
    },
    {
      id: 'dr-004',
      workOrderNo: 'WO-2026-0720-019',
      deductNo: 'DR-20260720-003',
      productName: '管道泵',
      productSpec: 'ISG50-160',
      material: 'HT200',
      drawingNo: 'DWG-ISG50-160',
      reportQty: 12,
      deductTime: '',
      warehouseName: '库线边仓',
      warehouseCode: 'CKGL#20251114#004',
      materialDone: 0,
      materialTotal: 7,
      status: S.PENDING,
      stockPhase: 'prelock',
      lines: [
        line('dr-004-1', 'M-031', '泵体', 12, 0, S.PENDING, '', 999, {
          specModel: 'ISG50',
          material: 'HT200',
          drawingNo: 'DWG-ISG-031',
        }),
        line('dr-004-2', 'M-032', '叶轮', 12, 0, S.PENDING, '', 999, {
          specModel: 'φ160',
          material: 'ZG230-450',
          drawingNo: 'DWG-ISG-032',
        }),
        line('dr-004-3', 'WL-PIPE-Q235-50', '无缝钢管 Q235 φ50×3', 60, 0, S.PENDING, '', 999, {
          specModel: 'φ50×3',
          material: 'Q235',
          drawingNo: '',
          blankSizeMode: 'length',
          blankSize: { length: 5000, lengthUnit: 'mm' },
          blankSizeText: '长 5000 mm',
        }),
        line('dr-004-4', 'WL-PLATE-Q235-10', '钢板 Q235 10mm', 14.4, 0, S.PENDING, '', 999, {
          specModel: '10mm',
          material: 'Q235',
          drawingNo: '',
          blankSizeMode: 'plate',
          blankSize: { length: 1200, width: 1000, lengthUnit: 'mm', widthUnit: 'mm' },
          blankSizeText: '长 1200 mm × 宽 1000 mm',
        }),
        line('dr-004-5', 'M-035', '底座', 12, 0, S.PENDING, '', 999, {
          specModel: 'M-035',
          material: 'HT250',
          drawingNo: 'DWG-M-035',
        }),
        line('dr-004-6', 'M-036', '联轴器', 12, 0, S.PENDING, '', 999, {
          specModel: 'M-036',
          material: 'HT250',
          drawingNo: 'DWG-M-036',
        }),
        line('dr-004-7', 'M-037', '防护罩', 12, 0, S.PENDING, '', 0, {
          specModel: 'M-037',
          material: 'HT250',
          drawingNo: 'DWG-M-037',
        }),
      ],
    },
    {
      id: 'dr-005',
      workOrderNo: 'WO-2026-0718-041',
      deductNo: 'DR-20260718-022',
      productName: '渣浆泵',
      productSpec: 'ZJ100',
      material: '高铬合金',
      drawingNo: 'DWG-ZJ100',
      reportQty: 6,
      deductTime: '2026-07-18 14:05:11',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 0,
      materialTotal: 5,
      status: S.VOIDED,
      stockPhase: 'released',
      lines: [
        line('dr-005-1', 'M-041', '护板', 6, 0, S.VOIDED, '', 999, {
          specModel: 'M-041',
          material: 'HT250',
          drawingNo: 'DWG-M-041',
        }),
        line('dr-005-2', 'M-042', '叶轮', 6, 0, S.VOIDED, '', 999, {
          specModel: 'M-042',
          material: 'HT250',
          drawingNo: 'DWG-M-042',
        }),
        line('dr-005-3', 'M-043', '泵壳', 6, 0, S.VOIDED, '', 999, {
          specModel: 'M-043',
          material: 'HT250',
          drawingNo: 'DWG-M-043',
        }),
        line('dr-005-4', 'M-044', '轴封组件', 6, 0, S.VOIDED, '', 999, {
          specModel: 'M-044',
          material: 'HT250',
          drawingNo: 'DWG-M-044',
        }),
        line('dr-005-5', 'M-045', '托架', 6, 0, S.VOIDED, '', 999, {
          specModel: 'M-045',
          material: 'HT250',
          drawingNo: 'DWG-M-045',
        }),
      ],
    },
    {
      id: 'dr-006',
      workOrderNo: 'WO-2026-0720-022',
      deductNo: 'DR-20260720-004',
      productName: '消防泵',
      productSpec: 'XBD5.0/20',
      material: 'QT500',
      drawingNo: 'DWG-XBD5.0-20',
      reportQty: 3,
      deductTime: '2026-07-20 11:08:44',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 2,
      materialTotal: 4,
      status: S.PARTIAL,
      stockPhase: 'actual',
      lines: [
        line('dr-006-1', 'M-051', '泵组主机', 3, 3, S.SUCCESS, '', 999, {
          specModel: 'XBD5.0/20',
          material: 'QT500',
          drawingNo: 'DWG-XBD-051',
          variantSummary: '扬程 50m',
        }),
        line('dr-006-2', 'M-052', '控制柜', 3, 3, S.SUCCESS, '', 999, {
          specModel: 'XL-21',
          material: '冷轧板',
          drawingNo: 'DWG-KZ-052',
        }),
        line('dr-006-3', 'M-053', '压力传感器', 6, 0, S.FAILED, '库存不足', 0, {
          specModel: 'M-053',
          material: '不锈钢',
          drawingNo: 'DWG-M-053',
        }),
        line('dr-006-4', 'M-054', '管路附件包', 3, 0, S.FAILED, '库存不足', 0, {
          specModel: 'M-054',
          material: '组合件',
          drawingNo: 'DWG-M-054',
        }),
      ],
    },
    {
      id: 'dr-007',
      workOrderNo: 'WO-2026-0719-062',
      deductNo: 'DR-20260719-021',
      productName: '离心泵',
      productSpec: 'KQ80-160',
      material: 'HT250',
      drawingNo: 'DWG-KQ80-160',
      reportQty: 15,
      deductTime: '2026-07-19 11:30:00',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 8,
      materialTotal: 8,
      status: S.SUCCESS,
      stockPhase: 'actual',
      lines: [
        line('dr-007-1', 'M-061', '泵体', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-061',
          material: 'HT250',
          drawingNo: 'DWG-M-061',
        }),
        line('dr-007-2', 'M-062', '叶轮', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-062',
          material: 'HT250',
          drawingNo: 'DWG-M-062',
        }),
        line('dr-007-3', 'M-063', '机械密封', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-063',
          material: 'HT250',
          drawingNo: 'DWG-M-063',
        }),
        line('dr-007-4', 'M-064', '轴承', 30, 30, S.SUCCESS, '', 999, {
          specModel: 'M-064',
          material: 'HT250',
          drawingNo: 'DWG-M-064',
        }),
        line('dr-007-5', 'M-065', '轴', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-065',
          material: 'HT250',
          drawingNo: 'DWG-M-065',
        }),
        line('dr-007-6', 'M-066', '联轴器', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-066',
          material: 'HT250',
          drawingNo: 'DWG-M-066',
        }),
        line('dr-007-7', 'M-067', '底座', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-067',
          material: 'HT250',
          drawingNo: 'DWG-M-067',
        }),
        line('dr-007-8', 'M-068', '垫片套装', 15, 15, S.SUCCESS, '', 999, {
          specModel: 'M-068',
          material: 'HT250',
          drawingNo: 'DWG-M-068',
        }),
      ],
    },
    {
      id: 'dr-008',
      workOrderNo: '',
      reqNo: 'LL20260720015',
      requisitionMode: 'quick',
      deductSource: 'quick',
      deductNo: 'DR-20260720-005',
      productName: '快速领料（辅料）',
      productSpec: '—',
      material: '—',
      drawingNo: '',
      reportQty: 4,
      deductTime: '',
      warehouseName: '半成品仓',
      warehouseCode: 'WH-02',
      materialDone: 0,
      materialTotal: 3,
      status: S.PENDING,
      stockPhase: 'prelock',
      lines: [
        line('dr-008-1', 'M-071', '泵头总成', 4, 0, S.PENDING, '', 999, {
          specModel: 'M-071',
          material: 'HT250',
          drawingNo: 'DWG-M-071',
        }),
        line('dr-008-2', 'M-072', '电机总成', 4, 0, S.PENDING, '', 999, {
          specModel: 'M-072',
          material: 'HT250',
          drawingNo: 'DWG-M-072',
        }),
        line('dr-008-3', 'M-073', '电缆', 4, 0, S.PENDING, '', 999, {
          specModel: 'M-073',
          material: 'HT250',
          drawingNo: 'DWG-M-073',
        }),
      ],
    },
    {
      id: 'dr-bf-001',
      workOrderNo: 'WO202505280-003',
      workOrderId: 'wo-init-3',
      requisitionMode: 'work-order',
      deductSource: 'work_order',
      deductNo: 'DR-20260728-BF01',
      productName: '定子铁芯组件',
      productSpec: 'CP2510003',
      material: '',
      drawingNo: '',
      reportQty: 18,
      deductTime: '',
      warehouseName: '库线边仓',
      warehouseCode: 'CKGL#20251114#004',
      materialDone: 0,
      materialTotal: 2,
      status: S.PENDING,
      stockPhase: 'prelock',
      remark: '工单完工扣减（报工 18；领料 3 展示 / 倒冲 2 预扣）',
      lines: [
        line('dr-bf-001-0', 'M-061', '定子冲片', 18, 0, S.PENDING, '', 999, {
          specModel: 'Φ180',
          material: '硅钢',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-bf-001-0b', 'M-062', '定子线圈', 18, 0, S.PENDING, '', 999, {
          specModel: 'QZ-2.0',
          material: '铜',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-bf-001-0c', 'M-063', '绝缘漆', 9, 0, S.PENDING, '', 999, {
          specModel: 'H级',
          material: '树脂',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-bf-001-1', 'MAT-STD-100', '标准螺栓组', 144, 0, S.PENDING, '', 200, {
          specModel: 'M12×40',
          material: '钢',
          isBackflush: true,
          issueMode: '倒冲',
          deductible: true,
        }),
        line('dr-bf-001-2', 'MAT-STD-WASHER', '平垫圈 M12', 144, 0, S.PENDING, '', 300, {
          specModel: 'M12',
          material: '钢',
          isBackflush: true,
          issueMode: '倒冲',
          deductible: true,
        }),
      ],
    },
    {
      id: 'dr-wo-004',
      workOrderNo: 'WO20260715-004',
      workOrderId: 'wo-init-4',
      requisitionMode: 'work-order',
      deductSource: 'work_order',
      deductNo: 'DR-20260715-004',
      productName: '泵体铸件',
      productSpec: 'CP2510004',
      material: 'HT250',
      drawingNo: 'DWG-PB-004',
      reportQty: 10,
      deductTime: '2026-07-15 16:40:12',
      confirmedAt: '2026-07-15 16:40:12',
      warehouseName: '库线边仓',
      warehouseCode: 'CKGL#20251114#004',
      materialDone: 2,
      materialTotal: 2,
      status: S.SUCCESS,
      stockPhase: 'actual',
      remark: '工单完工扣减已确认（领料无需扣减 / 倒冲实扣成功）',
      lines: [
        line('dr-wo-004-1', 'M-001', '泵体铸件毛坯', 10, 0, S.SKIPPED, '', 999, {
          specModel: 'HT250',
          material: 'HT250',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-wo-004-2', 'M-003', '机械密封', 10, 0, S.SKIPPED, '', 999, {
          specModel: '104-55',
          material: '碳化硅',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-wo-004-3', 'MAT-STD-100', '标准螺栓组', 60, 60, S.SUCCESS, '', 200, {
          specModel: 'M12×40',
          material: '钢',
          isBackflush: true,
          issueMode: '倒冲',
          deductible: true,
        }),
        line('dr-wo-004-4', 'MAT-STD-WASHER', '平垫圈 M12', 60, 60, S.SUCCESS, '', 300, {
          specModel: 'M12',
          material: '钢',
          isBackflush: true,
          issueMode: '倒冲',
          deductible: true,
        }),
      ],
    },
    {
      id: 'dr-wo-005',
      workOrderNo: 'WO20260801-005',
      workOrderId: 'wo-init-5',
      requisitionMode: 'work-order',
      deductSource: 'work_order',
      deductNo: 'DR-20260801-005',
      productName: '叶轮组件',
      productSpec: 'CP2510005',
      material: '',
      drawingNo: '',
      reportQty: 6,
      deductTime: '2026-08-01 11:05:44',
      confirmedAt: '2026-08-01 11:05:44',
      warehouseName: '原料仓',
      warehouseCode: 'WH-01',
      materialDone: 0,
      materialTotal: 1,
      status: S.PARTIAL,
      stockPhase: 'actual',
      remark: '工单完工扣减：倒冲螺栓库存不足失败，领料行无需扣减',
      lines: [
        line('dr-wo-005-1', 'M-012', '切割叶轮', 6, 0, S.SKIPPED, '', 999, {
          specModel: 'WQ-φ220',
          material: 'HT250',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-wo-005-2', 'M-005', '轴', 6, 0, S.SKIPPED, '', 999, {
          specModel: 'φ45×480',
          material: '45#钢',
          blankSizeMode: 'length',
          blankSize: { length: 480, lengthUnit: 'mm' },
          blankSizeText: '长 480 mm',
          issueMode: '领料',
          deductible: false,
        }),
        line('dr-wo-005-3', 'MAT-STD-100', '标准螺栓组', 72, 0, S.FAILED, '库存不足', 20, {
          specModel: 'M12×40',
          material: '钢',
          isBackflush: true,
          issueMode: '倒冲',
          deductible: true,
        }),
      ],
    },
  ]
}

/** 统计卡片演示数值（与原型图一致；列表为抽样记录） */
export const MATERIAL_REQUISITION_STATS_SEED = {
  todayCount: 47,
  todaySuccess: 44,
  todayFailed: 3,
  pendingAudit: 5,
  failInsufficient: 3,
  revokedMonth: 2,
}
