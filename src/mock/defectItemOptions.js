/** 不良品项 - 责任归属选项 */
export const defectResponsibilityOptions = ['非工人责任', '工人责任', '部分责任']

export const defectResponsibilitySelectOptions = defectResponsibilityOptions.map((v) => ({
  label: v,
  value: v,
}))

/** 公司级 - 不良品工资计算方式 */
export const defectWageCalculationOptions = [
  '打折计工资',
  '固定扣款金额',
  '不计工资',
  '全额计工资',
]

export const defectWageCalculationSelectOptions = defectWageCalculationOptions.map((v) => ({
  label: v,
  value: v,
}))

/** 不良品项 - 工资计算方式 */
export const defectItemWageCalculationOptions = [
  '全额计工资',
  '打折计工资',
  '固定扣款金额',
  '不计工资',
]

export const defectItemWageCalculationSelectOptions = defectItemWageCalculationOptions.map((v) => ({
  label: v,
  value: v,
}))
