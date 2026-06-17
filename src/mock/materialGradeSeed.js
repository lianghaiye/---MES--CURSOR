/** 材质（材料牌号）种子数据 */
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
      code: 'CZ202512310001',
      name: '铸铁',
      description: '灰铸铁件常用材质',
      createdAt: '2025-12-31',
    }),
    normalizeMaterialGrade({
      id: 'mg-2',
      code: 'CZ202512310002',
      name: '不锈钢',
      description: '304/316 等不锈钢材质',
      createdAt: '2025-12-31',
    }),
    normalizeMaterialGrade({
      id: 'mg-3',
      code: 'CZ202512310003',
      name: '碳钢',
      description: 'Q235 等碳素结构钢',
      createdAt: '2026-01-05',
    }),
    normalizeMaterialGrade({
      id: 'mg-4',
      code: 'CZ202512310004',
      name: '黄铜',
      description: '铜锌合金',
      createdAt: '2026-01-05',
    }),
    normalizeMaterialGrade({
      id: 'mg-5',
      code: 'CZ202512310005',
      name: '青铜',
      description: '铜锡合金',
      createdAt: '2026-01-10',
    }),
    normalizeMaterialGrade({
      id: 'mg-6',
      code: 'CZ202512310006',
      name: '铝合金',
      description: '6061 等铝合金',
      createdAt: '2026-01-10',
    }),
    normalizeMaterialGrade({
      id: 'mg-7',
      code: 'CZ202512310007',
      name: '钢',
      description: '通用钢材',
      createdAt: '2026-01-15',
    }),
  ]
}
