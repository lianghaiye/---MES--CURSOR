/** 供应商主数据（编码、名称、类型） */

export const supplierTypeOptions = ['综合供应商', '标准件供应商', '外协供应商', '代理商']

export const supplierMasterList = [
  { code: 'SUP-001', name: '多功能供应商01', type: '综合供应商' },
  { code: 'SUP-002', name: '多功能供应商02', type: '综合供应商' },
  { code: 'SUP-003', name: '采购供应商A', type: '综合供应商' },
  { code: 'SUP-004', name: '采购供应商B', type: '综合供应商' },
  { code: 'SUP-005', name: 'SKF代理商', type: '代理商' },
  { code: 'SUP-006', name: '标准件供应商', type: '标准件供应商' },
  { code: 'SUP-007', name: '华东外协加工中心', type: '外协供应商' },
  { code: 'SUP-008', name: '精密机加外协厂', type: '外协供应商' },
  { code: 'SUP-009', name: '轴承专营代理商', type: '代理商' },
  { code: 'SUP-010', name: '密封件标准件厂', type: '标准件供应商' },
]

export function findSupplierByName(name) {
  if (!name) return null
  return supplierMasterList.find((item) => item.name === name) || null
}

export function toSupplierSelectOption(item) {
  return {
    label: item.name,
    value: item.name,
    code: item.code,
    type: item.type,
  }
}

export function mergeSupplierMasterOptions(existingOptions = []) {
  const map = new Map(supplierMasterList.map((item) => [item.name, toSupplierSelectOption(item)]))
  existingOptions.forEach((opt) => {
    if (!map.has(opt.value)) {
      map.set(opt.value, {
        label: opt.label || opt.value,
        value: opt.value,
        code: opt.code || '',
        type: opt.type || '',
      })
    }
  })
  return [...map.values()]
}
