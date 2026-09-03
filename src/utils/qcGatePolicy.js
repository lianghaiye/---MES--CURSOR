import { getQcGatePolicyByBizScope, getQcDefaultGatePolicy } from '@/store/functionParamStore'

export const QC_GATE_POLICY = {
  INHERIT: 'inherit',
  SOFT: 'soft',
  HARD: 'hard',
}

export const QC_GATE_POLICY_OPTIONS = [
  { value: QC_GATE_POLICY.INHERIT, label: '跟随上级配置' },
  { value: QC_GATE_POLICY.SOFT, label: '弱管控（预警放行）' },
  { value: QC_GATE_POLICY.HARD, label: '强管控（阻断下游）' },
]

export function normalizeQcGatePolicy(value) {
  const v = String(value || '').trim()
  if (v === QC_GATE_POLICY.SOFT || v === QC_GATE_POLICY.HARD || v === QC_GATE_POLICY.INHERIT) {
    return v
  }
  return QC_GATE_POLICY.INHERIT
}

/**
 * 解析最终管控策略：功能参数按业务类型 → 系统默认
 * processPolicy / templatePolicy 仅兼容旧数据，新配置不再写入
 */
export function resolveQcGatePolicy({ processPolicy, templatePolicy, bizScope } = {}) {
  const chain = [processPolicy, templatePolicy].map(normalizeQcGatePolicy)
  for (const p of chain) {
    if (p === QC_GATE_POLICY.SOFT || p === QC_GATE_POLICY.HARD) return p
  }
  if (bizScope) {
    const scoped = normalizeQcGatePolicy(getQcGatePolicyByBizScope(bizScope))
    if (scoped === QC_GATE_POLICY.SOFT || scoped === QC_GATE_POLICY.HARD) return scoped
  }
  return normalizeQcGatePolicy(getQcDefaultGatePolicy()) || QC_GATE_POLICY.SOFT
}

export function isHardQcGate(policy) {
  return resolveQcGatePolicy({ processPolicy: policy }) === QC_GATE_POLICY.HARD
}
