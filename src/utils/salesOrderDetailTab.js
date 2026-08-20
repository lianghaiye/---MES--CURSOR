const STORAGE_PREFIX = 'sales-order-detail-tab:'

export const SALES_ORDER_DETAIL_TABS = [
  'overview',
  'shipping',
  'inbound',
  'purchase',
  'production',
  'outsourcing',
  'attachments',
  'ebom-info',
  'price-change',
  'approval',
]

const LEGACY_TAB_MAP = {
  'bom-version': 'ebom-info',
  delivery: 'shipping',
  outbound: 'shipping',
}

export function normalizeSalesOrderDetailTab(tab) {
  if (!tab) return 'overview'
  const mapped = LEGACY_TAB_MAP[tab] || tab
  return SALES_ORDER_DETAIL_TABS.includes(mapped) ? mapped : 'overview'
}

export function readSalesOrderDetailTab(orderId, queryTab) {
  if (queryTab) return normalizeSalesOrderDetailTab(queryTab)
  if (!orderId) return 'overview'
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + orderId)
    if (stored) return normalizeSalesOrderDetailTab(stored)
  } catch {
    /* ignore */
  }
  return 'overview'
}

export function persistSalesOrderDetailTab(orderId, tab) {
  if (!orderId) return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + orderId, normalizeSalesOrderDetailTab(tab))
  } catch {
    /* ignore */
  }
}
