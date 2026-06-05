/** EBOM 树节点展示字段（Ant Tree） */
export function materialToTreeNode(mat, extra = {}) {
  return {
    key: mat.id,
    name: mat.name,
    code: mat.code,
    spec: mat.spec,
    material: mat.material,
    type: mat.type,
    unitUsage: mat.unitUsage,
    unit: mat.unit,
    demandQty: mat.demandQty,
    supplyType: mat.supplyType,
    childBom: mat.bom || mat.childBom || '',
    children: (mat.children || []).map((child) => materialToTreeNode(child)),
    ...extra,
  }
}

export function collectExpandableKeys(nodes, out = []) {
  nodes.forEach((n) => {
    out.push(n.key)
    if (n.children?.length) collectExpandableKeys(n.children, out)
  })
  return out
}

export function enrichTreeTitles(node) {
  return {
    ...node,
    title: node.name,
    children: node.children?.map(enrichTreeTitles),
  }
}

export function supplyTypeColor(type) {
  if (type === '自制件') return 'blue'
  if (type === '外购件') return 'default'
  if (type === '组装') return 'orange'
  return 'default'
}
