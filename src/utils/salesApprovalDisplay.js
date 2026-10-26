/** 销售订单审批信息展示：按时间排成提交 → 审核节点 */

export function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回' || result === '已拒绝' || result === '已作废') return 'error'
  if (result === '待审核') return 'warning'
  if (result === '已提交') return 'processing'
  return 'default'
}

export function approvalTimelineColor(result) {
  if (result === '已通过') return 'green'
  if (result === '已驳回' || result === '已拒绝' || result === '已作废') return 'red'
  if (result === '待审核') return 'orange'
  if (result === '已提交') return 'blue'
  return 'gray'
}

/** 变更单状态标签（订单变更 / 合同变更） */
export function changeDocStatusColor(status) {
  if (status === '已通过' || status === '已生效') return 'success'
  if (status === '已驳回' || status === '已拒绝' || status === '已作废') return 'error'
  if (status === '待审核' || status === '待审') return 'warning'
  return 'default'
}

function nodeRank(item) {
  if (item?.result === '已提交') return 0
  if (item?.result === '待审核') return 2
  return 1
}

function sortByTimeAsc(list) {
  return [...(list || [])].sort((a, b) => {
    const byTime = String(a.time || '').localeCompare(String(b.time || ''))
    if (byTime !== 0) return byTime
    return nodeRank(a) - nodeRank(b)
  })
}

/** 订单审批时间线：缺提交节点时用创建人/创建时间补一条 */
export function buildSalesOrderApprovalTimeline(order) {
  const chronological = sortByTimeAsc(order?.approvalRecords || [])
  const hasSubmit = chronological.some(
    (r) => r.result === '已提交' || String(r.role || '').includes('提交'),
  )
  if (!hasSubmit && (order?.creator || chronological.length)) {
    chronological.unshift({
      name: order.creator || '—',
      role: '提交审核',
      result: '已提交',
      time: order.createdAt || chronological[0]?.time || '',
      opinion: '',
    })
  }
  return chronological.map((item) => ({
    ...item,
    step: item.step || (item.result === '已提交' ? '提交' : '审核'),
    displayName: item.name && item.name !== '—' ? item.name : '',
  }))
}

export function latestOrderApprovalResult(order) {
  const list = buildSalesOrderApprovalTimeline(order)
  const decided = [...list].reverse().find((r) => r.result === '已通过' || r.result === '已驳回')
  return decided?.result || (list.length ? '审批中' : '暂无')
}

/** 合同变更审批时间线（与订单变更卡片结构一致） */
export function buildContractChangeApprovalGroups(changes = []) {
  return (changes || [])
    .filter((c) => c && c.status && c.status !== '草稿')
    .map((change) => {
      const items = [
        {
          name: change.creator || '—',
          role: '合同变更申请',
          step: '提交',
          result: '已提交',
          time: change.submittedAt || change.createdAt || '—',
          opinion: change.reason || '',
        },
      ]
      if (change.status === '已生效' || change.status === '已驳回') {
        items.push({
          name: change.approvedBy || '—',
          role: '合同变更审核',
          step: '审核',
          result: change.status === '已生效' ? '已通过' : '已驳回',
          time: change.approvedAt || change.rejectedAt || '—',
          opinion: change.rejectReason || change.opinion || '',
        })
      } else if (change.status === '已作废') {
        items.push({
          name: change.approvedBy || change.creator || '—',
          role: '合同变更',
          step: '作废',
          result: '已作废',
          time: change.updatedAt || change.cancelledAt || '—',
          opinion: '',
        })
      } else {
        items.push({
          name: '',
          role: '合同变更审核',
          step: '审核',
          result: '待审核',
          pending: true,
          time: '',
          opinion: '',
        })
      }
      return {
        id: change.id,
        changeNo: change.changeNo,
        status: change.status,
        reasonType: change.reason || '',
        items,
      }
    })
}
