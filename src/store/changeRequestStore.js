import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { ECN_STATUS, ECN_WIP_HANDLING } from '@/constants/ecn'

export function createChangeRequestStore(options) {
  const { storageKey, dataVersion, buildMockRecords, docNoField, docNoPrefix, idPrefix } = options

  let docSeq = 400

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.version === dataVersion && Array.isArray(parsed.items)) {
          docSeq = parsed.docSeq ?? docSeq
          return parsed.items
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }

  const state = reactive({
    items: loadFromStorage() || buildMockRecords(),
  })

  function persist() {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: dataVersion, docSeq, items: state.items }),
    )
  }

  watch(() => state.items, persist, { deep: true })

  function generateDocNo() {
    docSeq += 1
    return `${docNoPrefix}-${dayjs().format('YYYY')}${String(docSeq).slice(-3)}`
  }

  function findById(id) {
    return state.items.find((e) => e.id === id) || null
  }

  function filterList(filters = {}) {
    return state.items.filter((row) => {
      const docNo = String(filters.docNo || filters.documentNo || '').trim()
      if (docNo && !String(row[docNoField] || '').includes(docNo)) return false

      const salesOrderNo = String(filters.salesOrderNo || '').trim()
      if (salesOrderNo && !String(row.salesOrderNo || '').includes(salesOrderNo)) return false

      const workOrderNo = String(filters.workOrderNo || '').trim()
      if (workOrderNo && !String(row.workOrderNo || '').includes(workOrderNo)) return false

      if (filters.status && row.status !== filters.status) return false
      if (filters.type && row.type !== filters.type) return false
      const productName = String(filters.productName || '').trim()
      if (productName && !row.productName?.includes(productName)) return false
      const customerName = String(filters.customerName || '').trim()
      if (customerName && !row.customerName?.includes(customerName)) return false
      if (filters.createdRange?.length === 2) {
        const [start, end] = filters.createdRange
        const created = dayjs(row.createdAt)
        if (
          created.isBefore(dayjs(start).startOf('day')) ||
          created.isAfter(dayjs(end).endOf('day'))
        ) {
          return false
        }
      }
      return true
    })
  }

  function add(payload) {
    const item = {
      id: `${idPrefix}-${Date.now()}`,
      [docNoField]: generateDocNo(),
      status: payload.status || ECN_STATUS.DRAFT,
      approvalStep: 0,
      approvalTotal: 3,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      salesOrderNo: payload.salesOrderNo || '',
      customerName: payload.customerName || '',
      workOrderNo: payload.workOrderNo || '',
      reviewer: '',
      reviewTime: '',
      approvalFlow: [
        { role: '工艺主管', name: '王工艺', status: '审批中', opinion: '', time: '' },
        { role: '生产主管', name: '李生产', status: '待审批', opinion: '', time: '' },
        { role: '质量主管', name: '赵质量', status: '待审批', opinion: '', time: '' },
      ],
      approvalRecords: [],
      updateItems: payload.updateItems || [],
      wipHandling: payload.wipHandling || ECN_WIP_HANDLING.EBOM_ONLY,
      rejectReason: '',
      impact: payload.impact || { products: 1, bomLines: 3, wipOrders: 12, inventoryWarnings: 2 },
      attachments: payload.attachments || [],
      ...payload,
    }
    state.items.unshift(item)
    return item
  }

  function saveDraft(payload) {
    return add({ ...payload, status: ECN_STATUS.DRAFT })
  }

  function deleteById(id) {
    const row = findById(id)
    if (!row) return { ok: false, message: '变更单不存在' }
    if (row.status !== ECN_STATUS.DRAFT) {
      return { ok: false, message: '仅草稿状态可删除' }
    }
    const idx = state.items.findIndex((e) => e.id === id)
    if (idx >= 0) state.items.splice(idx, 1)
    return { ok: true }
  }

  function ensureApprovalFlow(row) {
    if (row.approvalFlow?.length) {
      row.approvalFlow.forEach((step, idx) => {
        if (idx === 0) step.status = '审批中'
        else if (step.status === '审批中' || step.status === '待审批') step.status = '待审批'
      })
      return
    }
    row.approvalFlow = [
      { role: '工艺主管', name: '王工艺', status: '审批中', opinion: '', time: '' },
      { role: '生产主管', name: '李生产', status: '待审批', opinion: '', time: '' },
      { role: '质量主管', name: '赵质量', status: '待审批', opinion: '', time: '' },
    ]
    row.approvalStep = 0
    row.approvalTotal = 3
  }

  function submitForApproval(id) {
    const row = findById(id)
    if (!row) return { ok: false, message: '变更单不存在' }
    if (row.status !== ECN_STATUS.DRAFT) {
      return { ok: false, message: '仅草稿可提交审批' }
    }
    row.status = ECN_STATUS.APPROVING
    ensureApprovalFlow(row)
    row.submittedAt = dayjs().format('YYYY-MM-DD HH:mm')
    return { ok: true, record: row }
  }

  function appendApprovalRecord(row, step, approved, opinion) {
    if (!step) return
    const record = {
      role: step.role,
      name: step.name,
      result: approved ? '已通过' : '已驳回',
      opinion: opinion || (approved ? '同意' : '驳回'),
      time: dayjs().format('YYYY-MM-DD HH:mm'),
    }
    if (!Array.isArray(row.approvalRecords)) row.approvalRecords = []
    row.approvalRecords.push(record)
  }

  function approve(id, opinion, approved = true) {
    const row = findById(id)
    if (!row) return { ok: false, message: '变更单不存在' }
    const step = row.approvalFlow?.find((s) => s.status === '审批中' || s.status === '待审批')
    if (step) {
      step.status = approved ? '已通过' : '已驳回'
      step.opinion = opinion || (approved ? '同意' : '驳回')
      step.time = dayjs().format('YYYY-MM-DD HH:mm')
      appendApprovalRecord(row, step, approved, opinion)
      row.reviewer = step.name
      row.reviewTime = step.time
    }
    if (!approved) {
      row.status = ECN_STATUS.REJECTED
      row.rejectReason = opinion || '审批驳回'
      return { ok: true }
    }
    const next = row.approvalFlow?.find((s) => s.status === '待审批')
    if (next) {
      next.status = '审批中'
      row.status = ECN_STATUS.APPROVING
      row.approvalStep = row.approvalFlow.filter((s) => s.status === '已通过').length
    } else {
      row.status = ECN_STATUS.APPROVED
      row.approvalStep = row.approvalTotal
    }
    return { ok: true }
  }

  function startExecution(id, payload = {}) {
    const row = findById(id)
    if (!row) return { ok: false, message: '变更单不存在' }
    if (row.status !== ECN_STATUS.APPROVED && row.status !== ECN_STATUS.EXECUTING) {
      return { ok: false, message: '当前状态不可执行' }
    }
    Object.assign(row, payload)
    row.status = ECN_STATUS.EXECUTING
    return { ok: true }
  }

  function completeExecution(id) {
    const row = findById(id)
    if (!row) return { ok: false, message: '变更单不存在' }
    row.status = ECN_STATUS.EXECUTED
    row.executedAt = dayjs().format('YYYY-MM-DD HH:mm')
    return { ok: true }
  }

  return {
    state,
    docNoField,
    generateDocNo,
    findById,
    filterList,
    add,
    saveDraft,
    deleteById,
    submitForApproval,
    approve,
    startExecution,
    completeExecution,
  }
}
