/** SKU 编码规则：分隔符与模板解析 */

export const SKU_CODE_SEPARATORS = [
  { value: '-', label: '- (短横线)' },
  { value: '_', label: '_ (下划线)' },
  { value: '.', label: '. (点号)' },
  { value: '', label: '无分隔符' },
]

export function detectSkuCodeSeparator(pattern = '') {
  if (!pattern) return '-'
  if (pattern.includes('-')) return '-'
  if (pattern.includes('_')) return '_'
  if (pattern.includes('.')) return '.'
  return ''
}

export function buildSkuCodePattern(variantAxes = [], separator = '-') {
  const tokens = ['{SPU_CODE}', ...variantAxes.map((a) => `{${a.code || a.key.toUpperCase()}}`)]
  return tokens.join(separator)
}

export function buildSkuCodePreview(pattern = '', options = {}) {
  const { spuCode = 'F0001', variantAxes = [], sampleValues = {} } = options
  let code = String(pattern || '{SPU_CODE}')
  code = code.replace(/\{SPU_CODE\}/g, spuCode || 'SPU')
  ;(variantAxes || []).forEach((axis) => {
    const token = `{${axis.code || axis.key.toUpperCase()}}`
    const sample =
      sampleValues[axis.key] ||
      axis.enumValues?.[0]?.code ||
      axis.enumValues?.[0]?.name ||
      axis.code ||
      axis.key
    code = code.split(token).join(String(sample))
  })
  return code.replace(/\{[^}]+\}/g, 'X')
}

export function getSkuCodeSegments(variantAxes = [], spuCode = '') {
  return [
    {
      key: 'SPU_CODE',
      token: '{SPU_CODE}',
      label: '族编码',
      sample: spuCode || 'F0001',
      color: 'blue',
    },
    ...(variantAxes || []).map((axis) => ({
      key: axis.key,
      token: `{${axis.code || axis.key.toUpperCase()}}`,
      label: `${axis.label || axis.key}编码`,
      sample: axis.code || axis.key.toUpperCase(),
      color: 'green',
    })),
  ]
}
