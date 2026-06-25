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

/** 任务报工列表「核算工时」：批量计件+计时按原报工数折算；时长报工+计时取工人填报时长 */
export function resolveListAccountHours(line = {}, config = {}) {
  const reportType = line.reportType || config.reportType || ''
  const salaryMethod = line.salaryMethod || config.salaryMethod || ''
  if (salaryMethod !== '计时工资') return null

  if (reportType === '时长报工') {
    const hours = line.workHours
    if (hours == null || hours === '' || hours === '—') return null
    const n = Number(hours)
    return Number.isFinite(n) ? round2(n) : null
  }

  if (reportType === '批量计件') {
    const totalQty = (Number(line.goodQty) || 0) + (Number(line.defectQty) || 0)
    return calcAutoDurationHours(config, totalQty)
  }

  return null
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

/** 补贴金额：补贴工数=工数单价×补贴工数（时长+计时时单位为时）；固定金额=固定金额（二者互斥） */
export function resolveSubsidyAmount(line = {}, config = {}) {
  return resolveSubsidyWage(line, config)
}

/** 补贴工资：批量/计件按补贴工数×补贴单价；时长+计时按补贴工时×标准计时单价；固定金额=固定金额 */
export function resolveSubsidyWage(line = {}, config = {}) {
  const method = resolveSubsidyMethod(line)
  if (method === 'fixed') {
    return round2(Number(line.subsidyFixedAmount) || 0)
  }
  const reportType = config.reportType || line.reportType || ''
  const salaryMethod = config.salaryMethod || line.salaryMethod || ''
  if (salaryMethod === '计时工资' && reportType === '时长报工') {
    const hourlyRate =
      Number(line.effectiveStandardHourlyRate) || Number(config.standardHourlyRate) || 0
    const hours = Number(line.subsidyHours) || 0
    return round2(hours * hourlyRate)
  }
  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    const pieceRate = Number(line.effectivePieceRate) || Number(config.pieceRate) || 0
    return round2(getSubsidyPieceQty(line) * pieceRate)
  }
  if (salaryMethod === '计时工资' && reportType === '批量计件') {
    const stdMin = Number(config.standardMinutesPerPiece) || 0
    const hourlyRate =
      Number(line.effectiveStandardHourlyRate) || Number(config.standardHourlyRate) || 0
    const qty = getSubsidyPieceQty(line)
    return round2(((qty * stdMin) / 60) * hourlyRate)
  }
  const unitPrice = getSubsidyUnitPrice(config)
  const qty = getSubsidyPieceQty(line)
  return round2(qty * unitPrice)
}

/** 批量计件+计时工资：补贴工数项（补贴工数 × 补贴单价，计入工时桶） */
export function resolveSubsidyHourlyComponent(line = {}, config = {}) {
  if (resolveSubsidyMethod(line) !== 'qty') return 0
  const unitPrice = getSubsidyUnitPrice(config)
  const qty = getSubsidyPieceQty(line)
  return round2(qty * unitPrice)
}

/** 批量计件+计时工资：补贴固定金额（元） */
export function resolveSubsidyFixedAmount(line = {}) {
  if (resolveSubsidyMethod(line) !== 'fixed') return 0
  return round2(Number(line.subsidyFixedAmount) || 0)
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
  return line.adjustedGoodQty != null
    ? Number(line.adjustedGoodQty) || 0
    : Number(line.goodQty) || 0
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
  return round2(getApprovedGoodQty(line) + getApprovedDefectQty(line) + getSubsidyPieceQty(line))
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
      return {
        id: row.id,
        name,
        qty: Number(row.qty) || 0,
        methodLabel,
        formula,
        amount: 0,
        applied: false,
        rowType,
      }
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
  const defectQty = getApprovedDefectQty(line)
  const pieceRate = Number(config?.pieceRate) || 0
  const hourlyRate = Number(config?.standardHourlyRate) || 0
  const stdMin = Number(config?.standardMinutesPerPiece) || 0
  const prepMin = Number(config?.setupMinutesPerBatch) || 0
  const prepHours = round2(prepMin / 60)
  const reportType = config?.reportType || line.reportType || ''
  const salaryMethod = config?.salaryMethod || line.salaryMethod || ''
  const manualQualityDeduction = resolveManualQualityDeduction(line)
  const breakdownRules = resolveBreakdownWageRules(getApprovedDefectBreakdown(line))
  const defectWageDetails = buildDefectWageDetails(config, breakdownRules)
  const subsidyMethod = resolveSubsidyMethod(line)
  const subsidyQty = getSubsidyPieceQty(line)
  const subsidyFixedAmount = resolveSubsidyFixedAmount(line)

  const { discountWeighted, fixedDeductionQty, fixedDeductionSum } = aggregateDefectBucket(
    breakdownRules,
    config,
  )

  let defectWage = 0
  let qualityDeduction = 0
  let defectDiscountRateDisplay = null

  breakdownRules.forEach((row) => {
    if (!row.rule?.apply || row.rule.mode !== 'discount') return
    if (defectDiscountRateDisplay == null && row.rule.discountRate > 0) {
      defectDiscountRateDisplay = Math.round(row.rule.discountRate * 100)
    }
  })

  let goodWage = 0
  let salaryAmount = 0
  let accountHours = 0
  let prepWage = 0
  let fixedDefectWage = 0
  let subsidyWage = 0

  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    const bucket = round2(goodQty + discountWeighted + fixedDeductionQty + subsidyQty)
    const grossWage = round2(bucket * pieceRate)
    goodWage = round2(goodQty * pieceRate)
    defectWage = round2((discountWeighted + fixedDeductionQty) * pieceRate)
    subsidyWage = subsidyMethod === 'fixed' ? subsidyFixedAmount : round2(subsidyQty * pieceRate)
    qualityDeduction = round2(fixedDeductionSum + manualQualityDeduction)
    salaryAmount = round2(
      grossWage -
        fixedDeductionSum +
        (subsidyMethod === 'fixed' ? subsidyFixedAmount : 0) -
        manualQualityDeduction,
    )
  } else if (salaryMethod === '计时工资' && reportType === '批量计件') {
    prepWage = round2(prepHours * hourlyRate)
    const bucket = round2(subsidyQty + goodQty + fixedDeductionQty + discountWeighted)
    const totalHours = round2(prepHours + (bucket * stdMin) / 60)
    accountHours = totalHours
    goodWage = round2(totalHours * hourlyRate)
    defectWage = round2(((discountWeighted + fixedDeductionQty) * stdMin) / 60) * hourlyRate
    defectWage = round2(defectWage)
    subsidyWage = subsidyMethod === 'fixed' ? subsidyFixedAmount : 0
    qualityDeduction = round2(fixedDeductionSum + manualQualityDeduction)
    salaryAmount = round2(
      goodWage -
        fixedDeductionSum +
        (subsidyMethod === 'fixed' ? subsidyFixedAmount : 0) -
        manualQualityDeduction,
    )
  } else if (salaryMethod === '计时工资' && reportType === '时长报工') {
    const approvedHours = getApprovedWorkHours(line, config)
    accountHours = round2(prepHours + approvedHours)
    goodWage = round2((prepHours + approvedHours) * hourlyRate)
    subsidyWage = resolveSubsidyWage(line, config)
    salaryAmount = round2(goodWage + subsidyWage - manualQualityDeduction)
    defectWage = 0
    defectWageDetails.length = 0
  }

  defectWage = round2(defectWage)
  const defectWageOriginal = round2(
    salaryMethod === '计件工资' && reportType === '批量计件'
      ? (discountWeighted + fixedDeductionQty) * pieceRate
      : defectWage,
  )
  qualityDeduction = round2(qualityDeduction)

  const goodWageFormula =
    salaryMethod === '计件工资' && reportType === '批量计件'
      ? buildPieceBatchFormula({
          goodQty,
          discountWeighted,
          fixedDeductionQty,
          subsidyQty,
          pieceRate,
        })
      : salaryMethod === '计时工资' && reportType === '批量计件'
        ? buildHourlyBatchFormula({
            prepMin,
            subsidyQty,
            goodQty,
            fixedDeductionQty,
            discountWeighted,
            stdMin,
            hourlyRate,
          })
        : salaryMethod === '计时工资' && reportType === '时长报工'
          ? `(${formatFormulaNum(prepHours)}+${formatFormulaNum(getApprovedWorkHours(line, config))})×${formatFormulaNum(hourlyRate)}`
          : ''

  const prepWageFormula =
    prepWage > 0 ? `${formatFormulaNum(prepHours)}×${formatFormulaNum(hourlyRate)}` : ''

  const formulaKeys = resolveWageFormulaKeys(config, breakdownRules)

  return {
    goodWage,
    goodWageFormula,
    unitWage: getUnitWage(config),
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
    adjustedDefectQty: defectQty,
    adjustedWorkHours: getApprovedWorkHours(line, config),
  }
}

/** 汇总不良分项：折扣加权件数、固定扣款不良品数、固定扣款金额合计 */
function aggregateDefectBucket(breakdownRules = [], config = {}) {
  const stdMin = Number(config?.standardMinutesPerPiece) || 0
  const salaryMethod = config?.salaryMethod || ''
  const reportType = config?.reportType || ''
  let discountWeighted = 0
  let fixedDeductionQty = 0
  let fixedDeductionSum = 0

  breakdownRules.forEach((row) => {
    if (!row.rule?.apply) return
    const qty = Number(row.qty) || 0
    if (row.rule.mode === 'discount') {
      discountWeighted += qty * row.rule.discountRate
    } else if (row.rule.mode === 'deduction') {
      fixedDeductionQty += qty
      if (salaryMethod === '计件工资' && reportType === '批量计件') {
        fixedDeductionSum += qty * (row.rule.deductionAmount || 0)
      } else if (salaryMethod === '计时工资' && reportType === '批量计件') {
        fixedDeductionSum += qty * getUnitDeductionAmount(row.rule.deductionAmount, stdMin)
      }
    }
  })

  return {
    discountWeighted: round2(discountWeighted),
    fixedDeductionQty: round2(fixedDeductionQty),
    fixedDeductionSum: round2(fixedDeductionSum),
  }
}

function buildPieceBatchFormula({
  goodQty,
  discountWeighted,
  fixedDeductionQty,
  subsidyQty,
  pieceRate,
}) {
  const parts = [formatFormulaNum(goodQty)]
  if (discountWeighted > 0) parts.push(formatFormulaNum(discountWeighted))
  if (fixedDeductionQty > 0) parts.push(formatFormulaNum(fixedDeductionQty))
  if (subsidyQty > 0) parts.push(formatFormulaNum(subsidyQty))
  return `(${parts.join('+')})×${formatFormulaNum(pieceRate)}`
}

function buildHourlyBatchFormula({
  prepMin,
  subsidyQty,
  goodQty,
  fixedDeductionQty,
  discountWeighted,
  stdMin,
  hourlyRate,
}) {
  const bucketParts = []
  if (subsidyQty > 0) bucketParts.push(formatFormulaNum(subsidyQty))
  bucketParts.push(formatFormulaNum(goodQty))
  if (fixedDeductionQty > 0) bucketParts.push(formatFormulaNum(fixedDeductionQty))
  if (discountWeighted > 0) bucketParts.push(formatFormulaNum(discountWeighted))
  const inner = `${formatFormulaNum(prepMin)}+(${bucketParts.join('+')})×${formatFormulaNum(stdMin)}`
  return `(${inner}÷60)×${formatFormulaNum(hourlyRate)}`
}

export function enrichProcessReportLine(line, config) {
  const effectiveConfig = resolveEffectiveLaborConfig(config, line)
  const wage = calcProcessReportWage(effectiveConfig, line)
  const wageRateMode = resolveWageRateDisplayMode(effectiveConfig)
  const pieceOverridden = line.overridePieceRate != null && line.overridePieceRate !== ''
  const hourlyOverridden =
    line.overrideStandardHourlyRate != null && line.overrideStandardHourlyRate !== ''
  const salaryMethodOverridden = !!line.overrideSalaryMethod
  const effectiveSalaryMethod = effectiveConfig?.salaryMethod || line.salaryMethod || '—'
  const masterSalaryMethod = config?.salaryMethod || '—'
  const effectiveReportType =
    effectiveConfig?.reportType || config?.reportType || line.reportType || '—'
  return {
    ...line,
    reportType: effectiveReportType,
    salaryMethod: effectiveSalaryMethod,
    masterSalaryMethod,
    calcMethod:
      effectiveReportType && effectiveSalaryMethod
        ? `${effectiveReportType}+${effectiveSalaryMethod}`
        : line.calcMethod || '—',
    wageRateMode,
    masterPieceRate: config?.pieceRate ?? 0,
    masterStandardHourlyRate: config?.standardHourlyRate ?? 0,
    effectivePieceRate: effectiveConfig?.pieceRate ?? 0,
    effectiveStandardHourlyRate: effectiveConfig?.standardHourlyRate ?? 0,
    isPieceRateOverridden: pieceOverridden,
    isStandardHourlyRateOverridden: hourlyOverridden,
    isSalaryMethodOverridden: salaryMethodOverridden,
    overridePieceRate: line.overridePieceRate,
    overrideStandardHourlyRate: line.overrideStandardHourlyRate,
    overrideSalaryMethod: line.overrideSalaryMethod,
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
    subsidyAmount: resolveSubsidyAmount(line, effectiveConfig),
    formulaKeys: wage.formulaKeys,
    reportQty: line.goodQty,
    executor: line.reporter,
    reportDuration: line.workHours,
  }
}
