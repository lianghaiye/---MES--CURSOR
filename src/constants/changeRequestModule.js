import { ecnStoreApi } from '@/store/ecnStore'
import { ecrStoreApi } from '@/store/ecrStore'

export const CHANGE_MODULE = {
  ECN: 'ecn',
  ECR: 'ecr',
}

export const CHANGE_REQUEST_MODULES = {
  [CHANGE_MODULE.ECN]: {
    kind: CHANGE_MODULE.ECN,
    listPath: '/engineering-change/ecn-list',
    newPath: '/engineering-change/ecn/new',
    approvePath: (id) => `/engineering-change/ecn/${id}/approve`,
    executePath: (id) => `/engineering-change/ecn/${id}/execute`,
    detailPath: (id) => `/engineering-change/ecn/${id}/detail`,
    detailRouteName: 'engineering-change-ecn-detail',
    docNoLabel: 'ECN单号',
    docNoField: 'ecnNo',
    docNoFilterPlaceholder: 'ECN单号/销售单号/工单编号',
    createButtonLabel: '新增ECN变更',
    columnSettingsKey: 'ecn-list-v2',
    createPageTitle: '提交工程变更申请',
    approvePageTitle: '审批工程变更',
    executePageTitle: '执行工程变更',
    submitButtonLabel: '提交ECN审批',
    submitSuccessMessage: '已提交ECN审批',
    createKeepAliveName: 'EcnCreateView',
    store: ecnStoreApi,
  },
  [CHANGE_MODULE.ECR]: {
    kind: CHANGE_MODULE.ECR,
    listPath: '/engineering-change/ecr-request',
    newPath: '/engineering-change/ecr/new',
    approvePath: (id) => `/engineering-change/ecr/${id}/approve`,
    executePath: (id) => `/engineering-change/ecr/${id}/execute`,
    detailPath: (id) => `/engineering-change/ecr/${id}/detail`,
    detailRouteName: 'engineering-change-ecr-detail',
    docNoLabel: 'ECR单号',
    docNoField: 'ecrNo',
    docNoFilterPlaceholder: 'ECR单号/销售单号/工单编号',
    createButtonLabel: '新增变更',
    columnSettingsKey: 'ecr-list-v1',
    createPageTitle: '提交工程变更申请',
    approvePageTitle: '审批工程变更',
    executePageTitle: '执行工程变更',
    submitButtonLabel: '提交ECR审批',
    submitSuccessMessage: '已提交ECR审批',
    createKeepAliveName: 'EcrCreateView',
    store: ecrStoreApi,
  },
}

export function resolveChangeRequestModule(routeOrKind) {
  const kind =
    typeof routeOrKind === 'string'
      ? routeOrKind
      : routeOrKind?.meta?.changeModule || CHANGE_MODULE.ECN
  return CHANGE_REQUEST_MODULES[kind] || CHANGE_REQUEST_MODULES[CHANGE_MODULE.ECN]
}

export function getDocNo(record, moduleConfig) {
  if (!record) return '—'
  return record[moduleConfig.docNoField] || '—'
}
