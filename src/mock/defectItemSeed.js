/** 不良品项种子数据 */
export function createDefectItemSeed() {
  return [
    { id: 'di-1', code: 'qita', name: '其他', createdAt: '2025-12-31' },
    { id: 'di-2', code: 'BL202512310001', name: '有气孔', createdAt: '2025-12-31' },
    { id: 'di-3', code: 'BL202512310002', name: '有沙眼', createdAt: '2025-12-31' },
    { id: 'di-4', code: 'BL202512310003', name: '焊渣', createdAt: '2026-01-05' },
    { id: 'di-5', code: 'BL202512310004', name: '气孔', createdAt: '2026-01-05' },
    { id: 'di-6', code: 'BL202512310005', name: '尺寸超差', createdAt: '2026-01-05' },
    { id: 'di-7', code: 'BL202512310006', name: '表面划伤', createdAt: '2026-01-08' },
    { id: 'di-8', code: 'BL202512310007', name: '硬度不合格', createdAt: '2026-01-10' },
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
  点焊: '按件数',
  打磨: '按件数',
  装配: '按时长',
  车削: '按件数',
  铣削: '按件数',
  热处理: '按时长',
  粗车: '按件数',
  精车: '按件数',
  焊接: '按件数',
}
