/** 报工人员 mock（与小程序一致） */

export const personnelList = [
  { id: 'u1', name: '张三', dept: '焊接车间' },
  { id: 'u2', name: '李四', dept: '焊接车间' },
  { id: 'u3', name: '王五', dept: '冲压车间' },
  { id: 'u4', name: '赵六', dept: '机加车间' },
  { id: 'u5', name: '钱七', dept: '机加车间' },
  { id: 'u6', name: '孙八', dept: '装配车间' },
  { id: 'u7', name: '周九', dept: '装配车间' },
  { id: 'u8', name: '吴十', dept: '质检组' },
]

export function searchPersonnel(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return [...personnelList]
  return personnelList.filter(
    (p) => p.name.toLowerCase().includes(kw) || p.dept.toLowerCase().includes(kw),
  )
}

export const personnelOptions = personnelList.map((p) => ({
  label: `${p.name}（${p.dept}）`,
  value: p.name,
}))
