import { isBomActive } from '@/mock/productBomOptions'

export function buildBomOperationLogs(bom) {
  if (!bom) return []
  return [
    {
      id: 'log-1',
      operatedAt: bom.updatedAt || bom.createdAt,
      operator: bom.operator || 'admin',
      action: '查看',
      remark: '打开 BOM 详情',
    },
    {
      id: 'log-2',
      operatedAt: bom.createdAt,
      operator: bom.creator || 'admin',
      action: isBomActive(bom) ? '审核发布' : '创建',
      remark: `版本 ${bom.version || '—'}`,
    },
  ]
}
