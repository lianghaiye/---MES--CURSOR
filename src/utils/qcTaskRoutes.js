/**
 * 质检任务按业务类型的路由/文案约定
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
  生产过程检: {
    bizScope: '生产过程检',
    listPath: '/quality/process-qc',
    listName: 'quality-process-qc',
    detailName: 'quality-process-qc-detail',
    inspectName: 'quality-process-qc-inspect',
    detailTitle: '生产过程检详情',
    listTitle: '生产过程检',
    sourceType: 'work_order',
  },
  成品检: {
    bizScope: '成品检',
    listPath: '/quality/finished-qc',
    listName: 'quality-finished-qc',
    detailName: 'quality-finished-qc-detail',
    inspectName: 'quality-finished-qc-inspect',
    detailTitle: '成品检详情',
    listTitle: '成品检',
    sourceType: 'work_order',
  },
}

export function getQcTaskRouteBundle(bizScope) {
  return BUNDLE[bizScope] || BUNDLE['来料质检']
}

export function isInboundQcBizScope(bizScope) {
  return bizScope === '来料质检' || bizScope === '外协回货检'
}

export function isProcessQcBizScope(bizScope) {
  return bizScope === '生产过程检' || bizScope === '成品检'
}
