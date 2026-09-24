/** 工作台发布范围：演示租户列表（后续可接真实租户 API） */

export const WORKBENCH_TENANTS = [
  { id: 'tenant-demo', name: '演示工厂' },
  { id: 'tenant-zb', name: '淄博泵业' },
  { id: 'tenant-jn', name: '济南机电' },
  { id: 'tenant-qd', name: '青岛铸造' },
]

export const WORKBENCH_TENANT_STORAGE_KEY = 'i_doms_current_tenant_id'

export function listWorkbenchTenants() {
  return WORKBENCH_TENANTS.map((t) => ({ ...t }))
}

export function getCurrentTenantId() {
  try {
    const fromStore = localStorage.getItem(WORKBENCH_TENANT_STORAGE_KEY)
    if (fromStore && WORKBENCH_TENANTS.some((t) => t.id === fromStore)) return fromStore
  } catch {
    /* ignore */
  }
  return WORKBENCH_TENANTS[0].id
}

export function setCurrentTenantId(tenantId) {
  if (!WORKBENCH_TENANTS.some((t) => t.id === tenantId)) return false
  localStorage.setItem(WORKBENCH_TENANT_STORAGE_KEY, tenantId)
  return true
}

export function getTenantName(tenantId) {
  return WORKBENCH_TENANTS.find((t) => t.id === tenantId)?.name || tenantId || '—'
}
