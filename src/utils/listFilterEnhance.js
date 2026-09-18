/**
 * 列表页筛选区统一：
 * - 一行 5 个
 * - 收起：最多 9 个条件，搜索/重置/展开收起钉在第二行末尾
 * - 展开：条件按序铺满；第 10 个条件占第二行末格，按钮落在最后一行末尾
 *
 * 折叠态存在 WeakMap，避免 Vue 重渲染清掉 ant-row 上的 class 导致「点了没用」。
 */
const ENHANCED = 'data-list-filter-enhanced'
const COLLAPSED = 'is-filter-collapsed'
/** 收起时可见条件数（第 10 格留给按钮） */
const MAX_VISIBLE = 9

/** @type {WeakMap<Element, boolean>} true=收起 */
const collapsedMap = new WeakMap()

function isActionItem(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.classList.contains('ant-col-24') && el.querySelector?.('.filter-actions-item')) return true
  if (
    el.querySelector?.('.filter-actions-item, .filter-footer, .list-filter-footer, .filter-actions')
  )
    return true
  const hasControl = el.querySelector?.(
    '.ant-input, .ant-select, .ant-picker, .ant-input-number, .ant-input-affix-wrapper, textarea, .ant-input-group, .ant-checkbox-wrapper, .ant-checkbox',
  )
  const hasBtn = el.querySelector?.('button, .ant-btn')
  if (el.classList.contains('ant-form-item')) {
    const label = el.querySelector('.ant-form-item-label')
    if (!hasControl && hasBtn) return true
    if (!label && hasBtn && !hasControl) return true
  }
  return !hasControl && !!hasBtn
}

function findResetButton(actionRoot) {
  if (!actionRoot) return null
  const buttons = Array.from(actionRoot.querySelectorAll('button, .ant-btn')).filter(
    (b) => !b.classList?.contains('list-filter-auto-toggle'),
  )
  return (
    buttons.find((b) => /重置|清空/.test((b.textContent || '').replace(/\s+/g, ''))) ||
    buttons.find((b) => /查询|搜索/.test((b.textContent || '').replace(/\s+/g, ''))) ||
    null
  )
}

function setToggleLabel(toggle, collapsed) {
  toggle.innerHTML = ''
  const text = document.createTextNode(collapsed ? '展开' : '收起')
  const icon = document.createElement('span')
  icon.className = 'list-filter-auto-toggle-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = collapsed ? '▾' : '▴'
  toggle.appendChild(text)
  toggle.appendChild(icon)
}

function getCollapsed(container) {
  return collapsedMap.get(container) === true
}

function setCollapsed(container, collapsed) {
  collapsedMap.set(container, Boolean(collapsed))
  container.classList.toggle(COLLAPSED, Boolean(collapsed))
}

function ensureToggle(actionRoot, container) {
  let toggle = actionRoot.querySelector('.list-filter-auto-toggle')
  if (!toggle) {
    toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'list-filter-auto-toggle'
    // 插在 a-space 后面，避免塞进 Space item 被 Vue 补丁清掉
    const space = actionRoot.querySelector('.ant-space')
    if (space?.parentElement) {
      space.insertAdjacentElement('afterend', toggle)
    } else {
      const anchor = findResetButton(actionRoot)
      if (anchor?.parentElement) {
        const item = anchor.closest('.ant-space-item') || anchor
        item.insertAdjacentElement('afterend', toggle)
      } else {
        actionRoot.appendChild(toggle)
      }
    }
  }
  const collapsed = getCollapsed(container)
  setToggleLabel(toggle, collapsed)
  toggle.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCollapsed(container, !getCollapsed(container))
    setToggleLabel(toggle, getCollapsed(container))
    applyVisibility(container)
  }
  return toggle
}

function fieldChildren(container) {
  return Array.from(container.children).filter((c) => c.nodeType === 1)
}

function applyVisibility(container) {
  const cols = fieldChildren(container)
  const fieldCols = cols.filter((c) => !isActionItem(c))
  const collapsed = getCollapsed(container)
  // 每次按 WeakMap 回写 class，抵消 Vue class patch 清掉的情况
  container.classList.toggle(COLLAPSED, collapsed)
  fieldCols.forEach((col, idx) => {
    if (collapsed && idx >= MAX_VISIBLE) col.style.display = 'none'
    else col.style.display = ''
  })
}

function enhanceContainer(container) {
  if (!container) return
  if (container.closest?.('.list-filter-bar')) return

  const cols = fieldChildren(container)
  const fieldCols = cols.filter((c) => !isActionItem(c))
  const actionCols = cols.filter((c) => isActionItem(c))
  const already = container.getAttribute(ENHANCED) === '1'

  container.classList.add('list-filter-grid-row')
  container.setAttribute(ENHANCED, '1')

  // ≤9 个条件：全部展示，不出现展开/收起
  if (fieldCols.length <= MAX_VISIBLE) {
    collapsedMap.delete(container)
    container.classList.remove(COLLAPSED)
    const stale = container.querySelector('.list-filter-auto-toggle')
    if (stale) stale.remove()
    fieldCols.forEach((col) => {
      col.style.display = ''
    })
    return
  }

  // ≥10 个条件：显示「展开 ▾ / 收起 ▴」（首次默认收起）
  if (!already || !collapsedMap.has(container)) {
    collapsedMap.set(container, true)
  }
  setCollapsed(container, getCollapsed(container))
  const actionRoot = actionCols[0] || container
  ensureToggle(actionRoot, container)
  applyVisibility(container)
}

export function enhanceListFilterBars(root = document) {
  const scope = root?.querySelectorAll ? root : document

  // 标准：filter-card > form.horizontal-form > .ant-row
  scope
    .querySelectorAll?.('.filter-card .filter-form.horizontal-form > .ant-row')
    .forEach((row) => {
      enhanceContainer(row)
    })

  // 内联：filter-card > form.filter-form 直接挂 a-form-item（无 a-row）
  scope.querySelectorAll?.('.filter-card .filter-form').forEach((form) => {
    if (form.querySelector(':scope > .ant-row')) return
    if (form.querySelector(':scope > .list-filter-bar')) return
    const items = Array.from(form.children).filter(
      (c) => c.nodeType === 1 && c.classList.contains('ant-form-item'),
    )
    if (items.length < 2) return
    form.classList.add('list-filter-inline-grid')
    enhanceContainer(form)
  })
}

export function startListFilterBarObserver() {
  enhanceListFilterBars(document)
  let timer = null
  const obs = new MutationObserver(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => enhanceListFilterBars(document), 80)
  })
  obs.observe(document.body, { childList: true, subtree: true })
  return obs
}
