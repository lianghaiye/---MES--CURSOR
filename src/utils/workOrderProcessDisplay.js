/** 工序投料摘要（列表/打印展示） */
export function formatProcessFeedingSummary(process) {
  if (!process?.hasFeeding) return '—'
  const items = (process.feedingMaterials || [])
    .filter((m) => m.materialName || m.materialId)
    .map((m) => {
      const name = m.materialName || m.materialId || '物料'
      if (m.qty == null || m.qty === '') return name
      return `${name}×${m.qty}`
    })
  return items.length ? items.join('；') : '—'
}

export function formatProcessExecutors(process) {
  const list = process?.executors || []
  return list.length ? list.join('、') : '—'
}

export function createEmptyWorkOrderProcessExtras() {
  return {
    processContent: '',
    finishDate: '',
    inspection: '',
    remark: '',
  }
}
