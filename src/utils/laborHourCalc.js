/** 工时与计薪核算（配置时间单位为分钟，时长报工填报单位为小时） */

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

export function getApprovedReportQty(line) {
  if (line.auditStatus === '已审核') {
    return line.adjustedReportQty != null ? Number(line.adjustedReportQty) : Number(line.reportQty) || 0
  }
  return line.adjustedReportQty != null ? Number(line.adjustedReportQty) : Number(line.reportQty) || 0
}

export function getApprovedDuration(line) {
  if (line.adjustedDuration != null && line.adjustedDuration !== '') {
    return Number(line.adjustedDuration) || 0
  }
  return Number(line.reportDuration) || 0
}

/** 批量计件+计时工资：根据数量自动计算时长（小时） */
export function calcAutoDurationHours(config, approvedQty) {
  if (!config) return 0
  const minutes =
    (Number(config.setupMinutesPerBatch) || 0) +
    approvedQty * (Number(config.standardMinutesPerPiece) || 0)
  return round2(minutes / 60)
}

/** 核算工时（小时） */
export function calcAccountHours(config, line) {
  if (!config) return 0
  const approvedQty = getApprovedReportQty(line)
  const approvedDuration = getApprovedDuration(line)
  const prep = Number(config.setupMinutesPerBatch) || 0
  const std = Number(config.standardMinutesPerPiece) || 0

  if (config.reportType === '批量计件') {
    return round2((prep + approvedQty * std) / 60)
  }
  if (config.reportType === '时长报工') {
    return round2(prep / 60 + approvedDuration)
  }
  return 0
}

/** 最终计件数 */
export function calcFinalPieceQty(line) {
  const approvedQty = getApprovedReportQty(line)
  const subsidyQty = Number(line.subsidyReportQty) || 0
  return round2(approvedQty + subsidyQty)
}

/** 计薪（元） */
export function calcSalaryAmount(config, line) {
  if (!config) return 0
  const approvedQty = getApprovedReportQty(line)
  const approvedDuration = getApprovedDuration(line)
  const subsidyQty = Number(line.subsidyReportQty) || 0
  const subsidyHours = Number(line.subsidyHours) || 0
  const prep = Number(config.setupMinutesPerBatch) || 0
  const std = Number(config.standardMinutesPerPiece) || 0
  const hourlyRate = Number(config.standardHourlyRate) || 0
  const pieceRate = Number(config.pieceRate) || 0

  if (config.salaryMethod === '计件工资') {
    const qualifiedQty = approvedQty
    return round2(qualifiedQty * pieceRate + subsidyQty * pieceRate)
  }

  if (config.salaryMethod === '计时工资') {
    let hours = 0
    if (config.reportType === '批量计件') {
      hours = round2((prep + approvedQty * std) / 60 + subsidyHours)
    } else if (config.reportType === '时长报工') {
      hours = round2(prep / 60 + approvedDuration + subsidyHours)
    }
    return round2(hours * hourlyRate)
  }

  return 0
}

/** 汇总明细行并写回计算字段 */
export function enrichLaborLine(line, config) {
  const accountHours = calcAccountHours(config, line)
  const finalPieceQty = calcFinalPieceQty(line)
  const salaryAmount = calcSalaryAmount(config, line)
  const autoDuration =
    config?.reportType === '批量计件' && config?.salaryMethod === '计时工资'
      ? calcAutoDurationHours(config, getApprovedReportQty(line))
      : null

  return {
    ...line,
    reportType: config?.reportType || line.reportType || '',
    salaryMethod: config?.salaryMethod || line.salaryMethod || '',
    calcMethod: config ? `${config.reportType}+${config.salaryMethod}` : line.calcMethod || '',
    accountHours,
    finalPieceQty,
    salaryAmount,
    autoDurationHours: autoDuration,
  }
}

export function summarizeLaborLines(lines = []) {
  const active = lines.filter((l) => l.auditStatus !== '已作废')
  const sum = (key) => round2(active.reduce((s, l) => s + (Number(l[key]) || 0), 0))
  const audited = active.filter((l) => l.auditStatus === '已审核')

  return {
    reportQty: sum('reportQty'),
    reportDuration: sum('reportDuration'),
    adjustedReportQty: sum('adjustedReportQty'),
    adjustedDuration: sum('adjustedDuration'),
    subsidyReportQty: sum('subsidyReportQty'),
    subsidyHours: sum('subsidyHours'),
    finalPieceQty: sum('finalPieceQty'),
    accountHours: sum('accountHours'),
    salaryAmount: sum('salaryAmount'),
    auditedHours: round2(audited.reduce((s, l) => s + (Number(l.accountHours) || 0), 0)),
    auditedReportQty: round2(audited.reduce((s, l) => s + getApprovedReportQty(l), 0)),
    taskCount: active.length,
    participantCount: new Set(active.map((l) => l.executor).filter(Boolean)).size,
  }
}
