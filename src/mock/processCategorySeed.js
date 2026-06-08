/** 工序分类初始数据（机泵行业） */
export function createProcessCategorySeed() {
  const names = ['机械', '组装', '拆解', '系统工序']
  return names.map((name, index) => ({
    id: `pcat-${String(index + 1).padStart(3, '0')}`,
    name,
    status: '使用中',
    remark: '',
    createdAt: '2025-11-11',
    updatedAt: '2025-11-11',
  }))
}
