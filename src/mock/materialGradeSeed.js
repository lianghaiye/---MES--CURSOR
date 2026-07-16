/** 材质（材料牌号）种子数据 — 短码便于拼入 SKU */
export function normalizeMaterialGrade(item = {}) {
  return {
    id: item.id,
    code: item.code || '',
    name: item.name || '',
    description: item.description || '',
    createdAt: item.createdAt || '',
  }
}

export function createMaterialGradeSeed() {
  return [
    normalizeMaterialGrade({
      id: 'mg-1',
      code: 'ZT',
      name: '铸铁',
      description: '灰铸铁件常用材质',
      createdAt: '2025-12-31',
    }),
    normalizeMaterialGrade({
      id: 'mg-2',
      code: 'BXG',
      name: '不锈钢',
      description: '304/316 等不锈钢材质',
      createdAt: '2025-12-31',
    }),
    normalizeMaterialGrade({
      id: 'mg-3',
      code: 'TG',
      name: '碳钢',
      description: 'Q235 等碳素结构钢',
      createdAt: '2026-01-05',
    }),
    normalizeMaterialGrade({
      id: 'mg-4',
      code: 'HT',
      name: '黄铜',
      description: '铜锌合金',
      createdAt: '2026-01-05',
    }),
    normalizeMaterialGrade({
      id: 'mg-5',
      code: 'QT',
      name: '青铜',
      description: '铜锡合金',
      createdAt: '2026-01-10',
    }),
    normalizeMaterialGrade({
      id: 'mg-6',
      code: 'LHJ',
      name: '铝合金',
      description: '6061 等铝合金',
      createdAt: '2026-01-10',
    }),
    normalizeMaterialGrade({
      id: 'mg-7',
      code: 'G',
      name: '钢',
      description: '通用钢材',
      createdAt: '2026-01-15',
    }),
  ]
}
