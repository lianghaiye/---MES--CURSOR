/** 工序报工 - 工时与工资计算公式说明 */
export const PROCESS_REPORT_WAGE_FORMULAS = [
  {
    key: 'batch-piece-discount',
    title: '批量计件 + 计件工资（不良品折扣率）',
    formula:
      '计薪 = 良品数 × 单件计件单价 + Σ(某原因不良品数 × 单件计件单价 × 该原因折扣率) + 补贴工资 − 质量扣款',
  },
  {
    key: 'batch-piece-deduction',
    title: '批量计件 + 计件工资（不良品固定扣款）',
    formula:
      '计薪 = 良品数 × 单件计件单价 + Σ(某原因不良品数 × 单件计件单价 − 某原因不良品数 × 固定扣款金额) + 补贴工资 − 质量扣款',
  },
  {
    key: 'batch-hourly-discount',
    title: '批量计件 + 计时工资（不良品折扣率）',
    formula:
      '计薪 = (整批准备工时 ÷ 60 + 补贴工数 × 补贴单价 + (良品数 + Σ(不良品数 × 折扣率)) × 单件标准工时 ÷ 60) × 标准工时单价 + 补贴固定金额 − 质量扣款',
    note: '整批准备工时、单件标准工时单位为分钟。补贴方式为补贴工数时计入「补贴工数 × 补贴单价」；补贴方式为固定金额时计入「补贴固定金额」。',
  },
  {
    key: 'batch-hourly-deduction',
    title: '批量计件 + 计时工资（不良品固定扣款）',
    formula:
      '计薪 = (整批准备工时 ÷ 60 + 补贴工数 × 补贴单价 + 总件数 × 单件标准工时 ÷ 60) × 标准工时单价 − Σ(某原因不良品数 × 单位扣款额) + 补贴固定金额 − 质量扣款',
    note: '单位扣款额 = 每件扣款金额 ÷ (单件标准工时 ÷ 60)。总件数 = 良品数 + 不良品数。补贴规则同上。',
  },
  {
    key: 'duration-hourly',
    title: '时长报工 + 计时工资',
    formula: '计薪 = (整批准备工时 ÷ 60 + 工作时长) × 标准工时单价 + 补贴工资 − 质量扣款',
    note: '计时工资暂不支持不良品扣算。',
  },
  {
    key: 'subsidy-wage',
    title: '补贴工资',
    formula: '补贴工数：补贴工资 = 补贴工数 × 补贴单价；固定金额：补贴工资 = 固定金额',
  },
  {
    key: 'unit-deduction',
    title: '单位扣款额',
    formula: '单位扣款额 = 每件扣款金额 ÷ (单件标准工时 ÷ 60)',
  },
  {
    key: 'total-qty',
    title: '总件数',
    formula: '总件数 = 良品数 + 不良品数',
  },
]

/** 根据报工配置解析当前任务适用的公式说明 key */
export function resolveWageFormulaKeys(config = {}, breakdownRules = []) {
  const reportType = config.reportType || ''
  const salaryMethod = config.salaryMethod || ''
  const keys = ['subsidy-wage']
  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    keys.push('batch-piece-discount', 'batch-piece-deduction')
    return keys
  }
  if (salaryMethod === '计时工资' && reportType === '批量计件') {
    const hasDeduction = breakdownRules.some((r) => r.rule?.apply && r.rule.mode === 'deduction')
    const hasDiscount = breakdownRules.some((r) => r.rule?.apply && r.rule.mode === 'discount')
    if (hasDiscount || !hasDeduction) keys.push('batch-hourly-discount')
    if (hasDeduction) keys.push('batch-hourly-deduction', 'unit-deduction', 'total-qty')
    return keys
  }
  if (salaryMethod === '计时工资' && reportType === '时长报工') {
    keys.push('duration-hourly')
    return keys
  }
  return keys
}
