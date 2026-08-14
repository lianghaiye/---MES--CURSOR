/**
 * 列表页筛选区统一：一行 5 个；超过 10 个（两行）时在重置/清空后插入展开/收起
 */
const ENHANCED = 'data-list-filter-enhanced'
const COLLAPSED = 'is-filter-collapsed'
const MAX_VISIBLE = 10

function isActionItem(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.classList.contains('ant-col-24')) return true
  if (el.querySelector?.('.filter-actions-item, .filter-footer, .list-filter-footer')) return true
  const hasControl = el.querySelector?.(
    '.ant-input, .ant-select, .ant-picker, .ant-input-number, .ant-input-affix-wrapper, textarea, .ant-input-group',
  )
  const hasBtn = el.querySelector?.('button, .ant-btn')
  // 表单项无 label 且只有按钮 → 操作区
  if (el.classList.contains('ant-form-item')) {
    const label = el.querySelector('.ant-form-item-label')
    if (!hasControl && hasBtn) return true
    if (!label && hasBtn && !hasControl) return true
  }
  return !hasControl && !!hasBtn
}

function findResetButton(actionRoot) {
  if (!actionRoot) return null
  const buttons = Array.from(actionRoot.querySelectorAll('button, .ant-btn'))
  return (
    buttons.find((b) => /重置|清空/.test((b.textContent || '').replace(/\s+/g, ''))) ||
    buttons.find((b) => /查询|搜索/.test((b.textContent || '').replace(/\s+/g, ''))) ||
    null
  )
}

function ensureToggle(actionRoot, container) {
  let toggle = actionRoot.querySelector('.list-filter-auto-toggle')
  if (!toggle) {
    toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'ant-btn ant-btn-link ant-btn-sm list-filter-auto-toggle'
    const anchor = findResetButton(actionRoot)
    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement('afterend', toggle)
    } else {
      actionRoot.appendChild(toggle)
    }
  }
  const collapsed = container.classList.contains(COLLAPSED)
  toggle.textContent = collapsed ? '展开' : '收起'
  toggle.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    container.classList.toggle(COLLAPSED)
    const nowCollapsed = container.classList.contains(COLLAPSED)
    toggle.textContent = nowCollapsed ? '展开' : '收起'
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
  const collapsed = container.classList.contains(COLLAPSED)
  fieldCols.forEach((col, idx) => {
    if (collapsed && idx >= MAX_VISIBLE) col.style.display = 'none'
    else col.style.display = ''
  })
}

function enhanceContainer(container) {
  if (!container || container.getAttribute(ENHANCED) === '1') return
  if (container.closest?.('.list-filter-bar')) return

  const cols = fieldChildren(container)
  const fieldCols = cols.filter((c) => !isActionItem(c))
  const actionCols = cols.filter((c) => isActionItem(c))

  container.classList.add('list-filter-grid-row')
  container.setAttribute(ENHANCED, '1')

  if (fieldCols.length <= MAX_VISIBLE) {
    applyVisibility(container)
    return
  }

  container.classList.add(COLLAPSED)
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
