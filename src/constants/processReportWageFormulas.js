/** 工序报工 - 工时与工资计算公式说明 */
export const PROCESS_REPORT_WAGE_FORMULAS = [
  {
    key: 'batch-piece',
    title: '批量计件 + 计件工资',
    formula:
      '计薪 = (良品数 + Σ(折扣率不良品数×折扣率) + 固定扣款不良品数 + 补贴工数) × 单件单价 − Σ(固定扣款不良品数×单位扣款额) + 补贴固定金额 − 质量扣款',
  },
  {
    key: 'batch-hourly',
    title: '批量计件 + 计时工资',
    formula:
      '计薪 = {整批准备工时 + (补贴工数 + 良品数 + 固定扣款不良品数 + Σ(折扣率不良品数×折扣率)) × 单件标准工时 ÷ 60} × 标准工时单价 − Σ(固定扣款不良品数×单位扣款额) + 补贴固定金额 − 质量扣款',
    note: '整批准备工时、单件标准工时单位为分钟。',
  },
  {
    key: 'duration-hourly',
    title: '时长报工 + 计时工资',
    formula: '计薪 = (整批准备工时 ÷ 60 + 工作时长) × 标准工时单价 + 补贴工资 − 质量扣款',
    note: '计时工资暂不支持不良品扣算。',
  },
]

/** 根据报工配置解析当前任务适用的公式说明 key */
export function resolveWageFormulaKeys(config = {}, breakdownRules = []) {
  void breakdownRules
  const reportType = config.reportType || ''
  const salaryMethod = config.salaryMethod || ''
  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    return ['batch-piece']
  }
  if (salaryMethod === '计时工资' && reportType === '批量计件') {
    return ['batch-hourly']
  }
  if (salaryMethod === '计时工资' && reportType === '时长报工') {
    return ['duration-hourly']
  }
  return []
}
