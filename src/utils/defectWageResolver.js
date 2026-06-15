import { defectItemState, getDefectItemById } from '@/store/defectItemStore'

function ruleFromItemMethod(item, ratePercent, fixedAmount) {
  if (item.wageCalculationMethod === '打折计工资') {
    return {
      apply: true,
      mode: 'discount',
      discountRate: (ratePercent ?? 0) / 100,
      deductionAmount: 0,
    }
  }
  if (item.wageCalculationMethod === '固定扣款金额') {
    return {
      apply: true,
      mode: 'deduction',
      discountRate: 0,
      deductionAmount: fixedAmount ?? 0,
    }
  }
  if (item.wageCalculationMethod === '全额计工资') {
    return { apply: true, mode: 'discount', discountRate: 1, deductionAmount: 0 }
  }
  if (item.wageCalculationMethod === '不计工资') {
    return { apply: true, mode: 'discount', discountRate: 0, deductionAmount: 0 }
  }
  return { apply: false }
}

/** 解析单条不良原因的折扣率/扣款规则 */
export function resolveDefectWageRule(defectItem) {
  if (!defectItem) return { apply: false }

  if (defectItem.affectWageDiscount) {
    return ruleFromItemMethod(
      defectItem,
      defectItem.wageDiscountRate,
      defectItem.fixedDeductionAmount,
    )
  }

  const company = defectItemState.companyWageSettings
  if (!company?.enabled) return { apply: false }

  const rule = (company.rules || []).find((r) => r.responsibility === defectItem.responsibility)
  if (!rule) return { apply: false }

  return ruleFromItemMethod(rule, rule.defaultDiscountRate, rule.fixedDeductionAmount)
}

export function resolveBreakdownWageRules(breakdown = []) {
  return breakdown
    .filter((row) => Number(row.qty) > 0)
    .map((row) => {
      const item = getDefectItemById(row.id)
      return {
        ...row,
        qty: Number(row.qty) || 0,
        rule: resolveDefectWageRule(item),
      }
    })
}
