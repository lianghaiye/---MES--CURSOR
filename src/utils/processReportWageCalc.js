import { calcAutoDurationHours } from '@/utils/laborHourCalc'
import { getApprovedDefectBreakdown } from '@/utils/defectBreakdown'
import { getDefectItemById } from '@/store/defectItemStore'
import { resolveBreakdownWageRules } from '@/utils/defectWageResolver'
import { resolveWageFormulaKeys } from '@/constants/processReportWageFormulas'
import {
  resolveEffectiveLaborConfig,
  resolveWageRateDisplayMode,
} from '@/utils/laborConfigResolver'

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

const DEFAULT_SUBSIDY_UNIT_PRICE = 3

export function getSubsidyUnitPrice(config = {}) {
  return Number(config.subsidyUnitPrice) || DEFAULT_SUBSIDY_UNIT_PRICE
}

export function resolveSubsidyMethod(line = {}) {
  if (line.subsidyMethod === 'qty' || line.subsidyMethod === 'fixed') return line.subsidyMethod
  if (Number(line.subsidyFixedAmount) > 0) return 'fixed'
  if (Number(line.subsidyReportQty) > 0 || Number(line.subsidyHours) > 0) return 'qty'
  return 'fixed'
}

/** 补贴金额：补贴工数×单价 或 固定金额 */
export function resolveSubsidyWage(line = {}, config = {}, salaryMethod = '', pieceRate = 0, hourlyRate = 0) {
  const method = resolveSubsidyMethod(line)
  if (method === 'fixed') {
    return round2(Number(line.subsidyFixedAmount) || 0)
  }
  const unitPrice = getSubsidyUnitPrice(config)
  const qty = Number(line.subsidyReportQty) || 0
  if (qty > 0) {
    return round2(qty * unitPrice)
  }
  const subsidyHours = Number(line.subsidyHours) || 0
  if (subsidyHours > 0 && salaryMethod !== '计件工资') {
    return round2(subsidyHours * hourlyRate)
  }
  if (qty > 0 && salaryMethod === '计件工资') {
    return round2(qty * pieceRate)
  }
  return 0
}

export function resolveManualQualityDeduction(line = {}) {
  return round2(Number(line.manualQualityDeduction) || 0)
}


/** 公式中数量/单价展示：去掉多余尾零 */
export function formatFormulaNum(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '0'
  return Number(num.toFixed(4)).toString()
}

export function getApprovedGoodQty(line = {}) {
  return line.adjustedGoodQty != null ? Number(line.adjustedGoodQty) || 0 : Number(line.goodQty) || 0
}

export function getApprovedDefectQty(line = {}) {
  return line.adjustedDefectQty != null
    ? Number(line.adjustedDefectQty) || 0
    : Number(line.defectQty) || 0
}

export function getApprovedWorkHours(line = {}, config = null) {
  if (line.adjustedWorkHours != null && line.adjustedWorkHours !== '') {
    return Number(line.adjustedWorkHours) || 0
  }
  if (
    config?.reportType === '批量计件' &&
    config?.salaryMethod === '计时工资' &&
    line.adjustedGoodQty != null
  ) {
    return calcAutoDurationHours(config, getApprovedGoodQty(line))
  }
  return Number(line.workHours) || 0
}

export function getSubsidyPieceQty(line = {}) {
  const method = resolveSubsidyMethod(line)
  if (method === 'fixed') return 0
  return Number(line.subsidyReportQty) || 0
}

/** 最终计件数 = 良品数 + 不良品数 + 补贴数（均优先取调整值） */
export function calcFinalPieceQty(line = {}) {
  return round2(
    getApprovedGoodQty(line) + getApprovedDefectQty(line) + getSubsidyPieceQty(line),
  )
}

/** 单件折算单价：计件=件单价；计时+批量=标准工时折算单价 */
export function getUnitWage(config = {}) {
  const pieceRate = Number(config.pieceRate) || 0
  const hourlyRate = Number(config.standardHourlyRate) || 0
  const stdMin = Number(config.standardMinutesPerPiece) || 0
  const salaryMethod = config.salaryMethod || ''
  const reportType = config.reportType || ''

  if (salaryMethod === '计件工资') return pieceRate
  if (salaryMethod === '计时工资' && reportType === '批量计件') {
    return round2((stdMin / 60) * hourlyRate)
  }
  return 0
}

/** 计时+批量固定扣款：单位扣款额 = 每件扣款金额 ÷ (单件标准工时 ÷ 60) */
export function getUnitDeductionAmount(fixedDeductionAmount, stdMin) {
  const hoursPerPiece = (Number(stdMin) || 0) / 60
  if (!hoursPerPiece) return 0
  return round2((Number(fixedDeductionAmount) || 0) / hoursPerPiece)
}

function buildMethodLabel(item, rule) {
  if (!rule?.apply) return '不折算'
  const method = item?.wageCalculationMethod || ''
  if (method === '打折计工资') {
    const rate = Math.round((rule.discountRate || 0) * 100)
    return `折扣率${rate}%`
  }
  if (method === '固定扣款金额') {
    const amt = formatFormulaNum(rule.deductionAmount || 0)
    return `固定扣款-${amt}元/件`
  }
  if (method === '全额计工资') return '全额计工资'
  if (method === '不计工资') return '不计工资'
  return '不折算'
}

function calcPieceDefectAmount(pieceRate, row) {
  const qty = Number(row.qty) || 0
  const rule = row.rule
  if (!rule?.apply || qty <= 0) return 0
  if (rule.mode === 'discount') {
    return round2(qty * pieceRate * rule.discountRate)
  }
  if (rule.mode === 'deduction') {
    return round2(qty * pieceRate - qty * (rule.deductionAmount || 0))
  }
  return 0
}

function calcHourlyBatchDefectWage(unitWage, row) {
  const qty = Number(row.qty) || 0
  const rule = row.rule
  if (!rule?.apply || qty <= 0 || rule.mode !== 'discount') return 0
  return round2(qty * unitWage * rule.discountRate)
}

function buildPieceDefectFormula(pieceRate, row) {
  const qty = formatFormulaNum(row.qty)
  const unit = formatFormulaNum(pieceRate)
  const rule = row.rule
  if (!rule?.apply) return '—'
  if (rule.mode === 'discount') {
    const rate = Math.round((rule.discountRate || 0) * 100)
    return `${qty}×${unit}×${rate}%`
  }
  if (rule.mode === 'deduction') {
    const deduct = formatFormulaNum(rule.deductionAmount || 0)
    return `${qty}×${unit}-${qty}×${deduct}`
  }
  return '—'
}

function buildHourlyDiscountFormula(unitWage, row) {
  const qty = formatFormulaNum(row.qty)
  const unit = formatFormulaNum(unitWage)
  const rule = row.rule
  if (!rule?.apply || rule.mode !== 'discount') return '—'
  const rate = Math.round((rule.discountRate || 0) * 100)
  return `${qty}×${unit}×${rate}%`
}

function buildHourlyDeductionFormula(stdMin, row) {
  const qty = formatFormulaNum(row.qty)
  const rule = row.rule
  if (!rule?.apply || rule.mode !== 'deduction') return '—'
  const unitDed = formatFormulaNum(getUnitDeductionAmount(rule.deductionAmount, stdMin))
  return `扣款：${qty}×${unitDed}`
}

/** 按不良原因生成工资折算明细（含公式） */
export function buildDefectWageDetails(config, breakdownRules = []) {
  const pieceRate = Number(config?.pieceRate) || 0
  const stdMin = Number(config.standardMinutesPerPiece) || 0
  const unitWage = getUnitWage(config)
  const salaryMethod = config?.salaryMethod || ''
  const reportType = config?.reportType || ''
  const isPieceBatch = salaryMethod === '计件工资' && reportType === '批量计件'
  const isHourlyBatch = salaryMethod === '计时工资' && reportType === '批量计件'
  const isDurationHourly = salaryMethod === '计时工资' && reportType === '时长报工'

  return breakdownRules.map((row) => {
    const item = getDefectItemById(row.id)
    const name = row.name || item?.name || '—'
    const methodLabel = buildMethodLabel(item, row.rule)
    let amount = 0
    let formula = '—'
    let rowType = 'none'

    if (!row.rule?.apply) {
      return { id: row.id, name, qty: Number(row.qty) || 0, methodLabel, formula, amount: 0, applied: false, rowType }
    }

    if (isPieceBatch) {
      amount = calcPieceDefectAmount(pieceRate, row)
      formula = buildPieceDefectFormula(pieceRate, row)
      rowType = row.rule.mode === 'deduction' ? 'piece-deduction' : 'piece-discount'
    } else if (isHourlyBatch) {
      if (row.rule.mode === 'discount') {
        amount = calcHourlyBatchDefectWage(unitWage, row)
        formula = buildHourlyDiscountFormula(unitWage, row)
        rowType = 'hourly-discount'
      } else if (row.rule.mode === 'deduction') {
        const unitDed = getUnitDeductionAmount(row.rule.deductionAmount, stdMin)
        amount = round2(-(Number(row.qty) || 0) * unitDed)
        formula = buildHourlyDeductionFormula(stdMin, row)
        rowType = 'hourly-deduction'
      }
    } else if (isDurationHourly) {
      rowType = 'unsupported'
    }

    return {
      id: row.id,
      name,
      qty: Number(row.qty) || 0,
      method: item?.wageCalculationMethod || '',
      methodLabel,
      formula,
      amount,
      applied: true,
      rowType,
    }
  })
}

/** 工序报工任务行工资核算 */
export function calcProcessReportWage(config, line = {}) {
  const goodQty = getApprovedGoodQty(line)
  const pieceRate = Number(config?.pieceRate) || 0
  const hourlyRate = Number(config?.standardHourlyRate) || 0
  const stdMin = Number(config?.standardMinutesPerPiece) || 0
  const prepMin = Number(config?.setupMinutesPerBatch) || 0
  const prepHours = round2(prepMin / 60)
  const reportType = config?.reportType || line.reportType || ''
  const salaryMethod = config?.salaryMethod || line.salaryMethod || ''
  const subsidyWage = resolveSubsidyWage(line, config, salaryMethod, pieceRate, hourlyRate)
  const manualQualityDeduction = resolveManualQualityDeduction(line)
  const breakdownRules = resolveBreakdownWageRules(getApprovedDefectBreakdown(line))
  const defectWageDetails = buildDefectWageDetails(config, breakdownRules)

  const unitWage = getUnitWage(config)

  let defectWage = 0
  let defectWageOriginal = 0
  let qualityDeduction = 0
  let defectDiscountRateDisplay = null
  let discountWeightedDefect = 0

  breakdownRules.forEach((row) => {
    if (!row.rule?.apply) return
    if (row.rule.mode === 'discount') {
      discountWeightedDefect += (Number(row.qty) || 0) * row.rule.discountRate
      if (defectDiscountRateDisplay == null && row.rule.discountRate > 0) {
        defectDiscountRateDisplay = Math.round(row.rule.discountRate * 100)
      }
    } else if (row.rule.mode === 'deduction') {
      // fixed deduction handled in hourly batch loop
    }
  })

  defectWageDetails.forEach((detail) => {
    if (!detail.applied) return
    if (detail.rowType === 'hourly-deduction') {
      qualityDeduction += Math.abs(detail.amount)
      return
    }
    defectWage += detail.amount
    if (detail.rowType === 'piece-discount' || detail.rowType === 'hourly-discount') {
      defectWageOriginal += round2(detail.qty * (salaryMethod === '计件工资' ? pieceRate : unitWage))
    } else if (detail.rowType === 'piece-deduction') {
      defectWageOriginal += round2(detail.qty * pieceRate)
    }
  })

  let goodWage = 0
  let salaryAmount = 0
  let accountHours = 0
  let prepWage = 0
  let fixedDefectWage = 0
  const subsidyHours = Number(line.subsidyHours) || 0

  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    goodWage = round2(goodQty * pieceRate)
    salaryAmount = round2(goodWage + defectWage + subsidyWage - manualQualityDeduction)
  } else if (salaryMethod === '计时工资' && reportType === '批量计件') {
    goodWage = round2(goodQty * unitWage)
    prepWage = round2(prepHours * hourlyRate)

    let equivalentQty = goodQty
    qualityDeduction = 0
    fixedDefectWage = 0
    breakdownRules.forEach((row) => {
      if (!row.rule?.apply) return
      const qty = Number(row.qty) || 0
      if (row.rule.mode === 'discount') {
        equivalentQty += qty * row.rule.discountRate
      } else if (row.rule.mode === 'deduction') {
        equivalentQty += qty
        fixedDefectWage += round2(qty * unitWage)
        qualityDeduction += qty * getUnitDeductionAmount(row.rule.deductionAmount, stdMin)
      }
    })
    equivalentQty = round2(equivalentQty)
    fixedDefectWage = round2(fixedDefectWage)
    qualityDeduction = round2(qualityDeduction)

    accountHours = round2(prepHours + subsidyHours + (equivalentQty * stdMin) / 60)
    defectWage = round2(discountWeightedDefect * unitWage)
    salaryAmount = round2(
      prepWage + subsidyWage + goodWage + defectWage + fixedDefectWage - qualityDeduction - manualQualityDeduction,
    )
  } else if (salaryMethod === '计时工资' && reportType === '时长报工') {
    const approvedHours = getApprovedWorkHours(line, config)
    accountHours = round2(prepHours + approvedHours + subsidyHours)
    goodWage = round2((prepHours + approvedHours) * hourlyRate)
    salaryAmount = round2(goodWage + subsidyWage - manualQualityDeduction)
    defectWage = 0
    defectWageDetails.length = 0
  }

  defectWage = round2(defectWage)
  defectWageOriginal = round2(defectWageOriginal)
  qualityDeduction = round2(qualityDeduction + manualQualityDeduction)

  const goodWageFormula =
    salaryMethod === '计件工资' && reportType === '批量计件'
      ? `${formatFormulaNum(goodQty)}×${formatFormulaNum(pieceRate)}`
      : salaryMethod === '计时工资' && reportType === '批量计件'
        ? `${formatFormulaNum(goodQty)}×${formatFormulaNum(unitWage)}`
        : salaryMethod === '计时工资' && reportType === '时长报工'
          ? `(${formatFormulaNum(prepHours)}+${formatFormulaNum(getApprovedWorkHours(line, config))})×${formatFormulaNum(hourlyRate)}`
          : ''

  const prepWageFormula =
    prepWage > 0
      ? `${formatFormulaNum(prepHours)}×${formatFormulaNum(hourlyRate)}`
      : ''

  const formulaKeys = resolveWageFormulaKeys(config, breakdownRules)

  return {
    goodWage,
    goodWageFormula,
    unitWage,
    defectWage,
    defectWageOriginal,
    defectDiscountRateDisplay,
    defectWageDetails,
    qualityDeduction,
    defectConvertedWage: defectWage,
    prepWage,
    prepWageFormula,
    fixedDefectWage,
    subsidyWage,
    salaryAmount: round2(Math.max(0, salaryAmount)),
    accountHours,
    formulaKeys,
    finalPieceQty: calcFinalPieceQty(line),
    adjustedGoodQty: goodQty,
    adjustedDefectQty: getApprovedDefectQty(line),
    adjustedWorkHours: getApprovedWorkHours(line, config),
  }
}

export function enrichProcessReportLine(line, config) {
  const effectiveConfig = resolveEffectiveLaborConfig(config, line)
  const wage = calcProcessReportWage(effectiveConfig, line)
  const wageRateMode = resolveWageRateDisplayMode(config)
  const pieceOverridden =
    line.overridePieceRate != null && line.overridePieceRate !== ''
  const hourlyOverridden =
    line.overrideStandardHourlyRate != null && line.overrideStandardHourlyRate !== ''
  return {
    ...line,
    reportType: config?.reportType || line.reportType || '—',
    salaryMethod: config?.salaryMethod || line.salaryMethod || '—',
    calcMethod:
      config?.reportType && config?.salaryMethod
        ? `${config.reportType}+${config.salaryMethod}`
        : line.calcMethod || '—',
    wageRateMode,
    masterPieceRate: config?.pieceRate ?? 0,
    masterStandardHourlyRate: config?.standardHourlyRate ?? 0,
    effectivePieceRate: effectiveConfig?.pieceRate ?? 0,
    effectiveStandardHourlyRate: effectiveConfig?.standardHourlyRate ?? 0,
    isPieceRateOverridden: pieceOverridden,
    isStandardHourlyRateOverridden: hourlyOverridden,
    overridePieceRate: line.overridePieceRate,
    overrideStandardHourlyRate: line.overrideStandardHourlyRate,
    adjustedGoodQty: wage.adjustedGoodQty,
    adjustedDefectQty: wage.adjustedDefectQty,
    adjustedWorkHours: wage.adjustedWorkHours,
    finalPieceQty: wage.finalPieceQty,
    accountHours: wage.accountHours,
    salaryAmount: wage.salaryAmount,
    goodWage: wage.goodWage,
    goodWageFormula: wage.goodWageFormula,
    unitWage: wage.unitWage,
    defectWage: wage.defectWage,
    defectWageOriginal: wage.defectWageOriginal,
    defectDiscountRateDisplay: wage.defectDiscountRateDisplay,
    defectWageDetails: wage.defectWageDetails,
    defectConvertedWage: wage.defectConvertedWage,
    qualityDeduction: wage.qualityDeduction,
    prepWage: wage.prepWage,
    prepWageFormula: wage.prepWageFormula,
    fixedDefectWage: wage.fixedDefectWage,
    subsidyWage: wage.subsidyWage,
    formulaKeys: wage.formulaKeys,
    reportQty: line.goodQty,
    executor: line.reporter,
    reportDuration: line.workHours,
  }
}
