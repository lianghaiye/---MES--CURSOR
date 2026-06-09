/** 仓库分类初始数据 */
export function createWarehouseCategorySeed() {
  return [
    {
      id: 'wcat-001',
      code: '3',
      name: '报废仓',
      creator: 'admin',
      createdDept: '机泵',
      createdAt: '2026-03-25 11:53:49',
    },
    {
      id: 'wcat-002',
      code: '1',
      name: '线边仓',
      creator: 'admin',
      createdDept: '机泵',
      createdAt: '2026-03-25 11:54:12',
    },
    {
      id: 'wcat-003',
      code: '2',
      name: '成品仓',
      creator: 'admin',
      createdDept: '生产部',
      createdAt: '2026-03-25 11:54:35',
    },
  ]
}
