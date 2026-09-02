import { PUSH_STATUS, TASK_STATUS } from '@/utils/mobileLaborWagePush'

/** 协作成果模式：独立计时 / 共享成果 */
export const COLLAB_OUTCOME = {
  INDEPENDENT: 'independent',
  SHARED: 'shared',
}

const SLOT_TASK_NO_RE = /^(T\d+)-\d{2}$/

/** 从任务编号解析协作组号（去掉 -01 槽位） */
export function resolveCollaborationGroupKey(line = {}) {
  if (line.taskGroupId) return String(line.taskGroupId)
  const taskNo = String(line.taskNo || '')
  const m = taskNo.match(SLOT_TASK_NO_RE)
  if (m) return `tg-no-${m[1]}`
  return ''
}

export function resolveCollabOutcomeMode(line = {}) {
  if (line.outcomeMode === COLLAB_OUTCOME.SHARED) return COLLAB_OUTCOME.SHARED
  if (line.resourceType === '工人小组') return COLLAB_OUTCOME.SHARED
  if (line.taskExecutionMode === 'collaborative') return COLLAB_OUTCOME.INDEPENDENT
  if (resolveCollaborationGroupKey(line)) return COLLAB_OUTCOME.INDEPENDENT
  return ''
}

/** 核算/列表：仅「工人 + 多人协作」拆任务时展示拆分序号，如 1/3 */
export function formatSplitSlotLabel(line = {}) {
  const resourceType = line.resourceType || ''
  if (resourceType === '工人小组') return ''
  const mode = resolveCollabOutcomeMode(line)
  const isWorkerSplit =
    line.taskExecutionMode === 'collaborative' ||
    mode === COLLAB_OUTCOME.INDEPENDENT ||
    (resourceType === '工人' && !!resolveCollaborationGroupKey(line))
  if (!isWorkerSplit) return ''
  return formatCollabSlotLabel(line)
}

/** @deprecated 业务上无「协作类型」字段，请用资源类型 + 执行模式 */
export function formatCollabTypeLabel(line = {}) {
  const mode = resolveCollabOutcomeMode(line)
  if (mode === COLLAB_OUTCOME.SHARED) return '多人协作·小组'
  if (mode === COLLAB_OUTCOME.INDEPENDENT) return '多人协作·工人'
  return ''
}

/** 协作槽位，如 1/3 */
export function formatCollabSlotLabel(line = {}) {
  const slot = Number(line.collaborationSlot)
  const total = Number(line.collaborationTotal)
  if (Number.isFinite(slot) && slot > 0 && Number.isFinite(total) && total > 0) {
    return `${slot}/${total}`
  }
  const taskNo = String(line.taskNo || '')
  const m = taskNo.match(/-(\d{2})$/)
  if (m) return `${Number(m[1])}`
  return ''
}

function sameNumber(a, b) {
  return Number(a) === Number(b)
}

function pickCommonOrSum(values, { preferCommon = true } = {}) {
  const nums = values.map((v) => Number(v) || 0)
  if (!nums.length) return 0
  if (preferCommon && nums.every((n) => sameNumber(n, nums[0]))) return nums[0]
  return nums.reduce((s, n) => s + n, 0)
}

function aggregateTaskStatus(children) {
  const active = children.filter((l) => l.taskStatus !== '已作废')
  if (!active.length) return TASK_STATUS.REPORTED
  if (active.every((l) => l.taskStatus === TASK_STATUS.AUDITED)) return TASK_STATUS.AUDITED
  if (active.some((l) => l.taskStatus === TASK_STATUS.AUDITED)) return '部分审核'
  if (active.every((l) => l.taskStatus === TASK_STATUS.REPORTED)) return TASK_STATUS.REPORTED
  return '部分完成'
}

function aggregatePushStatus(children) {
  const statuses = children.map((l) => l.pushStatus || PUSH_STATUS.NOT_PUSHED)
  const allNot = statuses.every((s) => s === PUSH_STATUS.NOT_PUSHED)
  if (allNot) return PUSH_STATUS.NOT_PUSHED
  const allPushed = statuses.every((s) => s === PUSH_STATUS.PUSHED || s === PUSH_STATUS.AUTO_PUSHED)
  if (allPushed) {
    return statuses.every((s) => s === PUSH_STATUS.AUTO_PUSHED)
      ? PUSH_STATUS.AUTO_PUSHED
      : PUSH_STATUS.PUSHED
  }
  return '部分推送'
}

function formatMemberNames(children) {
  return children
    .map((c) => c.reporter || c.executor || '')
    .filter(Boolean)
    .join('、')
}

/**
 * 将扁平报工行聚合成主从树：多人协作组 → 主行 + children；单人行保持扁平
 * @param {object[]} lines
 * @returns {object[]}
 */
export function buildProcessReportCollabTree(lines = []) {
  const groups = new Map()
  const singles = []

  lines.forEach((line, index) => {
    const groupKey = resolveCollaborationGroupKey(line)
    const outcomeMode = resolveCollabOutcomeMode(line)
    if (!groupKey || !outcomeMode) {
      singles.push({ ...line, isGroup: false, rowIndex: index })
      return
    }
    if (!groups.has(groupKey)) groups.set(groupKey, [])
    groups.get(groupKey).push({ ...line, isGroup: false, isCollabChild: true, rowIndex: index })
  })

  const tree = []
  const usedGroupKeys = new Set()

  // 保持原相对顺序：遇到组内首条时插入主行
  lines.forEach((line) => {
    const groupKey = resolveCollaborationGroupKey(line)
    const outcomeMode = resolveCollabOutcomeMode(line)
    if (!groupKey || !outcomeMode) {
      const flat = singles.find((s) => s.id === line.id)
      if (flat && !flat.__emitted) {
        flat.__emitted = true
        tree.push(flat)
      }
      return
    }
    if (usedGroupKeys.has(groupKey)) return
    usedGroupKeys.add(groupKey)

    const children = groups.get(groupKey) || []
    if (children.length <= 1) {
      const only = children[0] || { ...line, isGroup: false }
      delete only.isCollabChild
      tree.push(only)
      return
    }

    const shared = outcomeMode === COLLAB_OUTCOME.SHARED
    const first = children[0]
    const memberNames = formatMemberNames(children)
    const baseTaskNo =
      String(first.taskNo || '').match(SLOT_TASK_NO_RE)?.[1] ||
      first.taskGroupTaskNo ||
      first.taskNo

    const goodQty = shared
      ? Number(first.goodQty) || 0
      : pickCommonOrSum(children.map((c) => c.goodQty))
    const defectQty = shared
      ? Number(first.defectQty) || 0
      : pickCommonOrSum(children.map((c) => c.defectQty))
    const listAccountHours = children.reduce((s, c) => s + (Number(c.listAccountHours) || 0), 0)
    const salaryAmount = children.reduce((s, c) => s + (Number(c.salaryAmount) || 0), 0)
    const workHours = shared
      ? Number(first.workHours ?? first.listAccountHours) || 0
      : pickCommonOrSum(
          children.map((c) => c.workHours ?? c.listAccountHours),
          { preferCommon: true },
        )

    tree.push({
      ...first,
      id: `collab-group-${groupKey}`,
      isGroup: true,
      isCollabParent: true,
      isCollabChild: false,
      outcomeMode,
      taskGroupId: groupKey,
      taskNo: baseTaskNo,
      reporter: memberNames,
      operator: first.operator || first.reporter || '',
      team: first.team || '—',
      memberCount: children.length,
      memberNames,
      collabLabel: shared
        ? `多人协作·小组 ${children.length}人`
        : `多人协作·工人 ${children.length}人`,
      taskStatus: aggregateTaskStatus(children),
      pushStatus: aggregatePushStatus(children),
      goodQty,
      defectQty,
      workHours,
      listAccountHours: Math.round(listAccountHours * 100) / 100,
      salaryAmount: Math.round(salaryAmount * 100) / 100,
      childIds: children.map((c) => c.id),
      children: children.map((c, i) => ({
        ...c,
        isGroup: false,
        isCollabChild: true,
        isCollabParent: false,
        outcomeMode,
        taskGroupId: groupKey,
        collabSlotLabel: `${i + 1}/${children.length}`,
        collabChildIndex: i + 1,
        parentGroupId: `collab-group-${groupKey}`,
      })),
    })
  })

  return tree
}

/** 扁平化树中的叶子行（真实报工记录） */
export function flattenProcessReportTreeLeaves(tree = []) {
  const leaves = []
  tree.forEach((row) => {
    if (row.isGroup && row.children?.length) {
      leaves.push(...row.children)
    } else if (!row.isGroup) {
      leaves.push(row)
    }
  })
  return leaves
}

export function findLineInProcessReportTree(tree = [], id) {
  for (const row of tree) {
    if (row.id === id) return row
    if (row.children?.length) {
      const hit = row.children.find((c) => c.id === id)
      if (hit) return hit
    }
  }
  return null
}

/** 解析操作目标对应的真实记录 ID 列表 */
export function resolveProcessReportActionIds(row) {
  if (!row) return []
  if (row.isGroup) return [...(row.childIds || row.children?.map((c) => c.id) || [])]
  return row.id ? [row.id] : []
}
