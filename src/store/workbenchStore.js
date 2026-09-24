/**
 * 工作台内容与收藏（localStorage 持久化）
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { persistJson, safeSetItem } from '@/utils/safeStorage'
import {
  buildFavoriteCatalogFromMenus,
  createDefaultFavorites,
  createDefaultVisibleProcessIds,
  createMockFeedbacks,
  createMockGuides,
  createMockReleases,
  createMockScenarios,
  createMockWorkOrderProgressRows,
} from '@/mock/workbench'

import { getCurrentTenantId } from '@/mock/tenants'

const STORAGE_KEY = 'i_doms_workbench'
const SEED_VERSION_KEY = 'i_doms_workbench_seed_v'
const REACTION_KEY = 'i_doms_workbench_release_reactions'
const CURRENT_SEED_VERSION = '4'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function buildSeed() {
  return {
    favorites: createDefaultFavorites(),
    visibleProcessIds: createDefaultVisibleProcessIds(),
    scenarios: createMockScenarios(),
    releases: createMockReleases(),
    guides: createMockGuides(),
    feedbacks: createMockFeedbacks(),
    workOrderRows: createMockWorkOrderProgressRows(),
    refreshedAt: nowText(),
  }
}

function upgradeVisibleProcessIds(ids) {
  const oldDefault = ['mold', 'pour', 'grind', 'sand', 'unpack']
  if (!Array.isArray(ids) || !ids.length) return createDefaultVisibleProcessIds()
  const isOldDefault =
    ids.length === oldDefault.length && ids.every((id, i) => id === oldDefault[i])
  if (isOldDefault) return createDefaultVisibleProcessIds()
  return [...ids]
}

function normalizeRelease(row = {}) {
  const contentHtml =
    row.contentHtml || (row.content ? `<p>${String(row.content).replace(/\n/g, '<br/>')}</p>` : '')
  let status = row.status
  if (!status) {
    status = row.enabled === false ? 'draft' : 'published'
  }
  return {
    id: row.id,
    versionTag: row.versionTag || '',
    title: row.title || '未命名发布',
    publishDate: row.publishDate || dayjs().format('YYYY-MM-DD'),
    publishedAt: row.publishedAt || '',
    publisher: row.publisher || '系统管理员',
    contentHtml,
    status: status === 'published' ? 'published' : 'draft',
    scopeType: row.scopeType === 'tenants' ? 'tenants' : 'all',
    tenantIds: Array.isArray(row.tenantIds) ? [...row.tenantIds] : [],
    likeCount: Number(row.likeCount || 0),
    dislikeCount: Number(row.dislikeCount || 0),
    sort: row.sort || 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function loadReactions() {
  try {
    const raw = localStorage.getItem(REACTION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveReactions(map) {
  safeSetItem(REACTION_KEY, JSON.stringify(map || {}))
}

function initState() {
  const stored = loadFromStorage()
  if (!stored) return buildSeed()

  const base = {
    favorites: Array.isArray(stored.favorites) ? stored.favorites : createDefaultFavorites(),
    visibleProcessIds: upgradeVisibleProcessIds(stored.visibleProcessIds),
    scenarios: Array.isArray(stored.scenarios) ? stored.scenarios : createMockScenarios(),
    releases: (Array.isArray(stored.releases) ? stored.releases : createMockReleases()).map(
      normalizeRelease,
    ),
    guides: Array.isArray(stored.guides) ? stored.guides : createMockGuides(),
    feedbacks: Array.isArray(stored.feedbacks) ? stored.feedbacks : createMockFeedbacks(),
    workOrderRows: Array.isArray(stored.workOrderRows)
      ? stored.workOrderRows
      : createMockWorkOrderProgressRows(),
    refreshedAt: stored.refreshedAt || nowText(),
  }

  if (shouldReseed()) {
    const hasQty = (base.workOrderRows || []).some((r) => r.planQty != null)
    if (!hasQty) base.workOrderRows = createMockWorkOrderProgressRows()
    base.visibleProcessIds = upgradeVisibleProcessIds(base.visibleProcessIds)
    // v4：场景/新手改为外站链接；月度发布升级为站内消息结构
    base.scenarios = createMockScenarios()
    base.guides = createMockGuides()
    base.releases = createMockReleases()
  }

  return base
}

export const workbenchState = reactive(initState())

function persist() {
  persistJson(STORAGE_KEY, {
    favorites: workbenchState.favorites,
    visibleProcessIds: workbenchState.visibleProcessIds,
    scenarios: workbenchState.scenarios,
    releases: workbenchState.releases,
    guides: workbenchState.guides,
    feedbacks: workbenchState.feedbacks,
    workOrderRows: workbenchState.workOrderRows,
    refreshedAt: workbenchState.refreshedAt,
  })
  safeSetItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

watch(workbenchState, () => persist(), { deep: true })

export function listFavoriteCatalog() {
  return buildFavoriteCatalogFromMenus()
}

export function listFavorites() {
  return [...(workbenchState.favorites || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function addFavorite(catalogKeyOrItem) {
  const catalog = listFavoriteCatalog()
  const hit =
    typeof catalogKeyOrItem === 'object' && catalogKeyOrItem
      ? catalogKeyOrItem
      : catalog.find((c) => c.key === catalogKeyOrItem)
  if (!hit?.path && !hit?.key) return { ok: false, message: '未找到可收藏入口' }
  const key = hit.key || hit.path
  if ((workbenchState.favorites || []).some((f) => f.key === key || f.path === hit.path)) {
    return { ok: false, message: '该入口已在收藏中' }
  }
  const sort = (workbenchState.favorites || []).reduce((m, f) => Math.max(m, f.sort || 0), 0) + 1
  workbenchState.favorites.push({
    key,
    title: hit.title,
    module: hit.module,
    parentLabel: hit.parentLabel || '',
    level: hit.level || 2,
    path: hit.path,
    icon: hit.icon || 'file',
    id: uid('fav'),
    sort,
  })
  return { ok: true, message: `已收藏「${hit.title}」` }
}

export function removeFavorite(idOrKey) {
  const idx = (workbenchState.favorites || []).findIndex(
    (f) => f.id === idOrKey || f.key === idOrKey || f.path === idOrKey,
  )
  if (idx < 0) return { ok: false, message: '收藏不存在' }
  const [removed] = workbenchState.favorites.splice(idx, 1)
  return { ok: true, message: `已取消收藏「${removed.title}」` }
}

export function listVisibleProcessIds() {
  void workbenchState.visibleProcessIds
  const ids = workbenchState.visibleProcessIds
  return Array.isArray(ids) && ids.length ? [...ids] : createDefaultVisibleProcessIds()
}

export function saveVisibleProcessIds(ids = []) {
  const next = (ids || []).filter(Boolean)
  if (!next.length) return { ok: false, message: '请至少选择一道工序' }
  workbenchState.visibleProcessIds = next
  return { ok: true, message: '工序展示已更新' }
}

export function refreshWorkbenchData() {
  workbenchState.workOrderRows = createMockWorkOrderProgressRows()
  workbenchState.refreshedAt = nowText()
  return { ok: true, message: '已刷新', refreshedAt: workbenchState.refreshedAt }
}

function sortEnabled(list) {
  return [...(list || [])]
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function listEnabledScenarios() {
  return sortEnabled(workbenchState.scenarios)
}

export function listAllScenarios() {
  return [...(workbenchState.scenarios || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function saveScenario(partial = {}) {
  if (partial.id) {
    const idx = workbenchState.scenarios.findIndex((s) => s.id === partial.id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    Object.assign(workbenchState.scenarios[idx], partial, { updatedAt: nowText() })
    return { ok: true, message: '已保存' }
  }
  const row = {
    id: uid('sc'),
    title: partial.title || '未命名方案',
    summary: partial.summary || '',
    link: partial.link || '',
    sort: partial.sort ?? workbenchState.scenarios.length + 1,
    enabled: partial.enabled !== false,
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  workbenchState.scenarios.push(row)
  return { ok: true, message: '已新增', row }
}

export function removeScenario(id) {
  const idx = workbenchState.scenarios.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }
  workbenchState.scenarios.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

export function listEnabledReleases(tenantId = getCurrentTenantId()) {
  void workbenchState.releases
  return [...(workbenchState.releases || [])]
    .filter((item) => item.status === 'published')
    .filter((item) => {
      if (item.scopeType !== 'tenants') return true
      return (item.tenantIds || []).includes(tenantId)
    })
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function listAllReleases() {
  return [...(workbenchState.releases || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function getReleaseById(id) {
  void workbenchState.releases
  return (workbenchState.releases || []).find((r) => r.id === id) || null
}

export function saveRelease(partial = {}) {
  const payload = {
    versionTag: partial.versionTag || '',
    title: partial.title || '未命名发布',
    publishDate: partial.publishDate || dayjs().format('YYYY-MM-DD'),
    publisher: partial.publisher || '系统管理员',
    contentHtml: partial.contentHtml || '',
    scopeType: partial.scopeType === 'tenants' ? 'tenants' : 'all',
    tenantIds: Array.isArray(partial.tenantIds) ? [...partial.tenantIds] : [],
    sort: partial.sort,
  }
  if (payload.scopeType === 'tenants' && !payload.tenantIds.length) {
    return { ok: false, message: '请选择可见租户' }
  }
  if (partial.id) {
    const idx = workbenchState.releases.findIndex((s) => s.id === partial.id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    const prev = workbenchState.releases[idx]
    Object.assign(workbenchState.releases[idx], payload, {
      status: partial.status || prev.status || 'draft',
      publishedAt: partial.publishedAt !== undefined ? partial.publishedAt : prev.publishedAt,
      likeCount: prev.likeCount || 0,
      dislikeCount: prev.dislikeCount || 0,
      updatedAt: nowText(),
    })
    workbenchState.releases[idx] = normalizeRelease(workbenchState.releases[idx])
    return { ok: true, message: '已保存' }
  }
  const row = normalizeRelease({
    id: uid('rel'),
    ...payload,
    status: 'draft',
    publishedAt: '',
    likeCount: 0,
    dislikeCount: 0,
    sort: partial.sort ?? workbenchState.releases.length + 1,
    createdAt: nowText(),
    updatedAt: nowText(),
  })
  workbenchState.releases.push(row)
  return { ok: true, message: '已保存为草稿', row }
}

export function publishRelease(id) {
  const idx = workbenchState.releases.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }
  const row = workbenchState.releases[idx]
  if (!String(row.title || '').trim()) return { ok: false, message: '请先填写标题' }
  if (
    !String(row.contentHtml || '')
      .replace(/<[^>]+>/g, '')
      .trim()
  ) {
    return { ok: false, message: '请先填写正文' }
  }
  if (row.scopeType === 'tenants' && !(row.tenantIds || []).length) {
    return { ok: false, message: '请选择可见租户' }
  }
  row.status = 'published'
  row.publishedAt = nowText()
  row.publishDate = row.publishDate || dayjs().format('YYYY-MM-DD')
  row.updatedAt = nowText()
  return { ok: true, message: '已发布，工作台可见' }
}

export function unpublishRelease(id) {
  const idx = workbenchState.releases.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }
  workbenchState.releases[idx].status = 'draft'
  workbenchState.releases[idx].updatedAt = nowText()
  return { ok: true, message: '已撤回发布' }
}

export function removeRelease(id) {
  const idx = workbenchState.releases.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }
  workbenchState.releases.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

export function getReleaseReaction(releaseId) {
  const map = loadReactions()
  return map[releaseId] || ''
}

export function reactRelease(releaseId, type) {
  const idx = workbenchState.releases.findIndex((s) => s.id === releaseId)
  if (idx < 0) return { ok: false, message: '消息不存在' }
  if (type !== 'like' && type !== 'dislike') return { ok: false, message: '无效操作' }
  const row = workbenchState.releases[idx]
  const map = loadReactions()
  const prev = map[releaseId] || ''
  if (prev === type) {
    map[releaseId] = ''
    if (type === 'like') row.likeCount = Math.max(0, (row.likeCount || 0) - 1)
    else row.dislikeCount = Math.max(0, (row.dislikeCount || 0) - 1)
    saveReactions(map)
    return { ok: true, message: '已取消' }
  }
  if (prev === 'like') row.likeCount = Math.max(0, (row.likeCount || 0) - 1)
  if (prev === 'dislike') row.dislikeCount = Math.max(0, (row.dislikeCount || 0) - 1)
  map[releaseId] = type
  if (type === 'like') row.likeCount = (row.likeCount || 0) + 1
  else row.dislikeCount = (row.dislikeCount || 0) + 1
  saveReactions(map)
  return { ok: true, message: type === 'like' ? '感谢点赞' : '已反馈' }
}

export function listEnabledGuides() {
  return sortEnabled(workbenchState.guides)
}

export function listAllGuides() {
  return [...(workbenchState.guides || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

export function saveGuide(partial = {}) {
  if (partial.id) {
    const idx = workbenchState.guides.findIndex((s) => s.id === partial.id)
    if (idx < 0) return { ok: false, message: '记录不存在' }
    Object.assign(workbenchState.guides[idx], partial, { updatedAt: nowText() })
    return { ok: true, message: '已保存' }
  }
  const row = {
    id: uid('gd'),
    title: partial.title || '未命名指南',
    summary: partial.summary || '',
    link: partial.link || '',
    sort: partial.sort ?? workbenchState.guides.length + 1,
    enabled: partial.enabled !== false,
    createdAt: nowText(),
    updatedAt: nowText(),
  }
  workbenchState.guides.push(row)
  return { ok: true, message: '已新增', row }
}

export function removeGuide(id) {
  const idx = workbenchState.guides.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }
  workbenchState.guides.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

export function listFeedbacks() {
  return [...(workbenchState.feedbacks || [])].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

export function submitFeedback(content, creator = '当前用户') {
  const text = String(content || '').trim()
  if (!text) return { ok: false, message: '请填写反馈内容' }
  const row = {
    id: uid('fb'),
    content: text,
    creator,
    createdAt: nowText(),
    status: '待处理',
    reply: '',
  }
  workbenchState.feedbacks.unshift(row)
  return { ok: true, message: '反馈已提交，感谢你的意见', row }
}

export function updateFeedback(id, patch = {}) {
  const idx = workbenchState.feedbacks.findIndex((f) => f.id === id)
  if (idx < 0) return { ok: false, message: '反馈不存在' }
  Object.assign(workbenchState.feedbacks[idx], patch, { updatedAt: nowText() })
  return { ok: true, message: '已更新' }
}

export function removeFeedback(id) {
  const idx = workbenchState.feedbacks.findIndex((f) => f.id === id)
  if (idx < 0) return { ok: false, message: '反馈不存在' }
  workbenchState.feedbacks.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

export function listWorkOrderProgressRows(tabKey = 'notStarted') {
  void workbenchState.workOrderRows
  return (workbenchState.workOrderRows || []).filter((row) => (row.tabKeys || []).includes(tabKey))
}
