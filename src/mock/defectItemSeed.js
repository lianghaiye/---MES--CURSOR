/** 不良品项种子数据 */
export function normalizeDefectItem(item = {}) {
  const affectWageDiscount = Boolean(item.affectWageDiscount)
  let wageCalculationMethod = item.wageCalculationMethod || ''
  const wageDiscountRate =
    item.wageDiscountRate != null && item.wageDiscountRate !== ''
      ? Number(item.wageDiscountRate)
      : null

  if (affectWageDiscount && !wageCalculationMethod) {
    wageCalculationMethod =
      wageDiscountRate != null ? '打折计工资' : '全额计工资'
  }
  if (!affectWageDiscount) {
    wageCalculationMethod = ''
  }

  return {
    id: item.id,
    code: item.code || '',
    name: item.name || '',
    affectWageDiscount,
    responsibility: item.responsibility || '',
    wageCalculationMethod,
    wageDiscountRate:
      affectWageDiscount && wageCalculationMethod === '打折计工资' ? wageDiscountRate : null,
    description: item.description || '',
    createdAt: item.createdAt || '',
  }
}

export function createDefectItemSeed() {
  return [
    normalizeDefectItem({
      id: 'di-1',
      code: 'qita',
      name: '其他',
      affectWageDiscount: false,
      responsibility: '非工人责任',
      description: '其他未归类不良',
      createdAt: '2025-12-31',
    }),
    normalizeDefectItem({
      id: 'di-2',
      code: 'BL202512310001',
      name: '有气孔',
      affectWageDiscount: true,
      responsibility: '工人责任',
      wageCalculationMethod: '打折计工资',
      wageDiscountRate: 80,
      description: '铸件气孔，按工人责任折扣',
      createdAt: '2025-12-31',
    }),
    normalizeDefectItem({
      id: 'di-3',
      code: 'BL202512310002',
      name: '有沙眼',
      affectWageDiscount: true,
      responsibility: '工人责任',
      wageCalculationMethod: '打折计工资',
      wageDiscountRate: 75,
      createdAt: '2025-12-31',
    }),
    normalizeDefectItem({
      id: 'di-4',
      code: 'BL202512310003',
      name: '焊渣',
      affectWageDiscount: false,
      responsibility: '工人责任',
      createdAt: '2026-01-05',
    }),
    normalizeDefectItem({
      id: 'di-5',
      code: 'BL202512310004',
      name: '气孔',
      affectWageDiscount: true,
      responsibility: '部分责任',
      wageCalculationMethod: '打折计工资',
      wageDiscountRate: 60,
      createdAt: '2026-01-05',
    }),
    normalizeDefectItem({
      id: 'di-6',
      code: 'BL202512310005',
      name: '尺寸超差',
      affectWageDiscount: true,
      responsibility: '工人责任',
      wageCalculationMethod: '打折计工资',
      wageDiscountRate: 50,
      description: '加工尺寸超差，影响计件工资',
      createdAt: '2026-01-05',
    }),
    normalizeDefectItem({
      id: 'di-7',
      code: 'BL202512310006',
      name: '表面划伤',
      affectWageDiscount: true,
      responsibility: '非工人责任',
      wageCalculationMethod: '全额计工资',
      createdAt: '2026-01-08',
    }),
    normalizeDefectItem({
      id: 'di-8',
      code: 'BL202512310007',
      name: '硬度不合格',
      affectWageDiscount: false,
      responsibility: '非工人责任',
      createdAt: '2026-01-10',
    }),
  ]
}

/** 工序名称 → 不良品项 id 映射（MOCK 刷入） */
export const PROCESS_DEFECT_ITEM_MAP = {
  点焊: ['di-4', 'di-5', 'di-6'],
  打磨: ['di-6', 'di-7'],
  装配: ['di-1', 'di-7'],
  车削: ['di-2', 'di-3', 'di-6'],
  铣削: ['di-3', 'di-6'],
  热处理: ['di-8', 'di-1'],
  粗车: ['di-2', 'di-3'],
  精车: ['di-6', 'di-7'],
  焊接: ['di-4', 'di-5'],
}

export const PROCESS_REPORT_MODE_MAP = {
  点焊: '批量计件',
  打磨: '批量计件',
  装配: '时长报工',
  车削: '批量计件',
  铣削: '批量计件',
  热处理: '时长报工',
  粗车: '批量计件',
  精车: '批量计件',
  焊接: '批量计件',
  机加工: '批量计件',
  调试: '时长报工',
  检验: '时长报工',
  领料: '批量计件',
}
