/**
 * 质检任务按业务类型的路由/文案约定（来料 / 外协回货检共用详情与录入页）
 */

const BUNDLE = {
  来料质检: {
    bizScope: '来料质检',
    listPath: '/quality/incoming-qc',
    listName: 'quality-incoming-qc',
    detailName: 'quality-incoming-qc-detail',
    inspectName: 'quality-incoming-qc-inspect',
    detailTitle: '来料质检详情',
    listTitle: '来料质检',
    sourceType: 'purchase_receipt',
  },
  外协回货检: {
    bizScope: '外协回货检',
    listPath: '/quality/outsourcing-qc',
    listName: 'quality-outsourcing-qc',
    detailName: 'quality-outsourcing-qc-detail',
    inspectName: 'quality-outsourcing-qc-inspect',
    detailTitle: '外协回货检详情',
    listTitle: '外协回货检',
    sourceType: 'outsourcing_receipt',
  },
}

export function getQcTaskRouteBundle(bizScope) {
  return BUNDLE[bizScope] || BUNDLE['来料质检']
}

export function isInboundQcBizScope(bizScope) {
  return bizScope === '来料质检' || bizScope === '外协回货检'
}
